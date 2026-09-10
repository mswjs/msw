import type { Node, Program } from 'estree'
import { walk } from 'estree-walker'
import isReference from 'is-reference'
import MagicString from 'magic-string'
import { analyze, extract_identifiers, Scope } from 'periscopic'

type Binding = {
  declaration: Node
  references: Set<Node>
}

function offset(node: Node, key: 'start' | 'end'): number {
  if (key === 'start' && 'start' in node && typeof node.start === 'number') {
    return node.start
  }

  if (key === 'end' && 'end' in node && typeof node.end === 'number') {
    return node.end
  }

  throw new Error(`Missing ${key} offset on ${node.type}`)
}

/** Remove virtual network bindings and their exclusively used dependencies. */
export function stripNetwork(code: string, id: string, parsed: unknown) {
  // Vite returns ESTree at runtime; Rollup and Rolldown expose different AST types.
  const program = parsed as Program
  const analysis = analyze(program)
  const parents = new Map<Node, Node>()
  const scopes = new Map<Node, Scope>()
  const declarations = new Set<Node>()
  const bindings = new Map<Node, Binding>()
  const references = new Map<Node, Binding>()
  const replacements = new Map<Node, string>()
  const candidates = new Set<Binding>()
  const stripped = new Set<Binding>()
  let scope = analysis.scope

  walk(program, {
    enter(node, parent) {
      const nodeScope = analysis.map.get(node)

      if (node.type === 'ClassExpression') {
        scope = new Scope(scope, false)

        if (node.id) {
          scope.declarations.set(node.id.name, node)
        }
      } else if (nodeScope) {
        nodeScope.parent = scope
        scope = nodeScope
      }

      scopes.set(node, scope)

      if (parent) {
        parents.set(node, parent)
      }

      if (node.type === 'ImportNamespaceSpecifier') {
        scope.declarations.set(node.local.name, node)
      }

      if (node.type === 'VariableDeclarator') {
        extract_identifiers(node.id).forEach((identifier) =>
          declarations.add(identifier),
        )
      } else if (
        node.type === 'FunctionDeclaration' ||
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression'
      ) {
        node.params
          .flatMap((parameter) => extract_identifiers(parameter))
          .forEach((identifier) => declarations.add(identifier))

        if ('id' in node && node.id) {
          declarations.add(node.id)
        }
      } else if (
        (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') &&
        node.id
      ) {
        declarations.add(node.id)
      } else if (node.type === 'CatchClause' && node.param) {
        extract_identifiers(node.param).forEach((identifier) =>
          declarations.add(identifier),
        )
      } else if (
        node.type === 'ImportSpecifier' ||
        node.type === 'ImportDefaultSpecifier' ||
        node.type === 'ImportNamespaceSpecifier'
      ) {
        declarations.add(node.local)
      }
    },
    leave(_node, parent) {
      scope = (parent && scopes.get(parent)) || analysis.scope
    },
  })

  const getBinding = (node: Node, name: string) => {
    const owner = scopes.get(node)?.find_owner(name)
    let declaration = owner?.declarations.get(name)

    if (declaration?.type === 'VariableDeclaration') {
      declaration = declaration.declarations.find((declarator) => {
        return extract_identifiers(declarator.id).some(
          (identifier) => identifier.name === name,
        )
      })
    }

    if (!declaration) {
      return
    }

    let binding = bindings.get(declaration)

    if (!binding) {
      binding = { declaration, references: new Set() }
      bindings.set(declaration, binding)
    }

    return binding
  }

  walk(program, {
    enter(node, parent) {
      if (
        node.type !== 'Identifier' ||
        declarations.has(node) ||
        !parent ||
        !isReference(node, parent)
      ) {
        return
      }

      const binding = getBinding(node, node.name)

      if (binding) {
        binding.references.add(node)
        references.set(node, binding)
      }
    },
  })

  const isRemoved = (node: Node): boolean => {
    const parent = parents.get(node)

    return replacements.has(node) || Boolean(parent && isRemoved(parent))
  }

  const replace = (node: Node, content = '') => {
    const parent = parents.get(node)
    const needsStatement =
      parent &&
      (parent.type === 'IfStatement' ||
        parent.type === 'WhileStatement' ||
        parent.type === 'DoWhileStatement' ||
        parent.type === 'ForStatement' ||
        parent.type === 'ForInStatement' ||
        parent.type === 'ForOfStatement' ||
        parent.type === 'LabeledStatement')
    replacements.set(node, content || (needsStatement ? ';' : ''))
    walk(node, {
      enter(child) {
        const binding = references.get(child)

        if (binding) {
          candidates.add(binding)
        }
      },
    })
  }

  const stripBinding = (binding: Binding) => {
    if (stripped.has(binding)) {
      return
    }

    stripped.add(binding)
    candidates.add(binding)

    for (const reference of binding.references) {
      if (isRemoved(reference)) {
        continue
      }

      let expression = reference
      let parent = parents.get(expression)

      if (parent?.type === 'ExportSpecifier') {
        replace(parent)
        continue
      }

      while (
        parent &&
        ((parent.type === 'MemberExpression' && parent.object === expression) ||
          (parent.type === 'CallExpression' && parent.callee === expression) ||
          (parent.type === 'AwaitExpression' &&
            parent.argument === expression) ||
          parent.type === 'ChainExpression')
      ) {
        expression = parent
        parent = parents.get(expression)
      }

      if (parent?.type === 'VariableDeclarator' && parent.init === expression) {
        for (const identifier of extract_identifiers(parent.id)) {
          const alias = getBinding(parent, identifier.name)

          if (alias) {
            stripBinding(alias)
          }
        }
      }

      if (parent?.type === 'ExpressionStatement') {
        replace(parent)
      } else if (parent?.type === 'Property' && parent.shorthand) {
        replace(
          parent,
          `${code.slice(offset(parent.key, 'start'), offset(parent.key, 'end'))}: void 0`,
        )
      } else {
        replace(expression, 'void 0')
      }
    }
  }

  for (const statement of program.body) {
    if (
      statement.type !== 'ImportDeclaration' ||
      statement.source.value !== 'virtual:msw'
    ) {
      continue
    }

    for (const specifier of statement.specifiers) {
      const binding = getBinding(specifier, specifier.local.name)

      if (binding) {
        stripBinding(binding)
      }
    }

    replace(statement)
  }

  let changed = true

  while (changed) {
    changed = false

    for (const binding of candidates) {
      if (
        isRemoved(binding.declaration) ||
        [...binding.references].some((reference) => !isRemoved(reference))
      ) {
        continue
      }

      const declaration = binding.declaration
      const parent = parents.get(declaration)

      if (
        parent?.type === 'ExportNamedDeclaration' ||
        parent?.type === 'ExportDefaultDeclaration'
      ) {
        continue
      }

      if (
        declaration.type === 'VariableDeclarator' ||
        declaration.type === 'FunctionDeclaration' ||
        declaration.type === 'ClassDeclaration' ||
        declaration.type === 'ImportSpecifier' ||
        declaration.type === 'ImportDefaultSpecifier' ||
        declaration.type === 'ImportNamespaceSpecifier'
      ) {
        replace(declaration)
        changed = true
      }
    }
  }

  // Remove list separators together with deleted imports, exports, and declarators.
  const output = new MagicString(code)
  const listEdits: Array<{ start: number; end: number }> = []

  walk(program, {
    enter(node) {
      const items =
        node.type === 'VariableDeclaration'
          ? node.declarations
          : node.type === 'ImportDeclaration' ||
              node.type === 'ExportNamedDeclaration'
            ? node.specifiers
            : undefined

      if (!items?.length || isRemoved(node)) {
        return
      }

      const retained = items.filter((item) => !replacements.has(item))

      if (retained.length === 0) {
        replace(node)
        return
      }

      if (node.type === 'ImportDeclaration') {
        const specifiers = node.specifiers.filter(
          (specifier) => !replacements.has(specifier),
        )
        const direct = specifiers.filter(
          (specifier) => specifier.type !== 'ImportSpecifier',
        )
        const named = specifiers.filter(
          (specifier) => specifier.type === 'ImportSpecifier',
        )
        const clauses = direct.map((specifier) =>
          code.slice(offset(specifier, 'start'), offset(specifier, 'end')),
        )

        if (named.length > 0) {
          clauses.push(
            `{ ${named.map((specifier) => code.slice(offset(specifier, 'start'), offset(specifier, 'end'))).join(', ')} }`,
          )
        }

        if (specifiers.length !== node.specifiers.length) {
          replacements.set(
            node,
            `import ${clauses.join(', ')} from ${code.slice(offset(node.source, 'start'), offset(node, 'end'))}`,
          )
        }

        return
      }

      for (let index = 0; index < items.length; index++) {
        if (!replacements.has(items[index])) {
          continue
        }

        const first = index

        while (index + 1 < items.length && replacements.has(items[index + 1])) {
          index += 1
        }

        const next = items[index + 1]
        const previous = items[first - 1]
        listEdits.push({
          start: next ? offset(items[first], 'start') : offset(previous, 'end'),
          end: next ? offset(next, 'start') : offset(items[index], 'end'),
        })
      }
    },
  })

  const edits = [...replacements]
    .filter(([node]) => {
      const parent = parents.get(node)

      return !parent || !isRemoved(parent)
    })
    .map(([node, content]) => ({
      start: offset(node, 'start'),
      end: offset(node, 'end'),
      content,
    }))

  for (const edit of listEdits) {
    if (
      !edits.some((outer) => outer.start <= edit.start && outer.end >= edit.end)
    ) {
      edits.push({ ...edit, content: '' })
    }
  }

  const combinedEdits = edits.filter(
    (edit) =>
      !listEdits.some((listEdit) => {
        return (
          listEdit.start <= edit.start &&
          listEdit.end >= edit.end &&
          (listEdit.start !== edit.start || listEdit.end !== edit.end)
        )
      }),
  )

  for (const edit of combinedEdits.sort(
    (left, right) => left.start - right.start || right.end - left.end,
  )) {
    output.overwrite(edit.start, edit.end, edit.content)
  }

  return {
    code: output.toString(),
    map: output.generateMap({ source: id, includeContent: true, hires: true }),
  }
}
