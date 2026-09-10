import { transformSync, types, type NodePath } from '@babel/core'

type Binding = NonNullable<ReturnType<NodePath['scope']['getBinding']>>

/**
 * Remove the virtual network and declarations used exclusively by its setup.
 * Resolve bindings so aliases work and shadowed local variables are preserved.
 */
export function stripNetwork(code: string, id: string) {
  return transformSync(code, {
    filename: id,
    configFile: false,
    babelrc: false,
    sourceMaps: true,
    parserOpts: { plugins: ['jsx'] },
    plugins: [
      {
        visitor: {
          Program(program: NodePath<types.Program>) {
            const unusedCandidates = new Set<Binding>()
            const strippedBindings = new Set<Binding>()

            const collectCandidates = (removedPath: NodePath) => {
              removedPath.traverse({
                ReferencedIdentifier(reference) {
                  const binding = reference.scope.getBinding(
                    reference.node.name,
                  )

                  if (binding) {
                    unusedCandidates.add(binding)
                  }
                },
              })
            }

            const stripBinding = (binding: Binding) => {
              if (strippedBindings.has(binding)) {
                return
              }

              strippedBindings.add(binding)
              unusedCandidates.add(binding)

              for (const reference of binding.referencePaths) {
                if (
                  reference.removed ||
                  reference.findParent((parent) => parent.removed)
                ) {
                  continue
                }

                if (reference.parentPath?.isExportSpecifier()) {
                  reference.parentPath.remove()
                  continue
                }

                let expression = reference

                while (expression.parentPath) {
                  const parent = expression.parentPath

                  if (
                    ((parent.isMemberExpression() ||
                      parent.isOptionalMemberExpression()) &&
                      parent.node.object === expression.node) ||
                    ((parent.isCallExpression() ||
                      parent.isOptionalCallExpression()) &&
                      parent.node.callee === expression.node) ||
                    (parent.isAwaitExpression() &&
                      parent.node.argument === expression.node)
                  ) {
                    expression = parent
                    continue
                  }

                  break
                }

                const declaration = expression.parentPath

                if (
                  declaration?.isVariableDeclarator() &&
                  declaration.node.init === expression.node
                ) {
                  for (const name of Object.keys(
                    types.getBindingIdentifiers(declaration.node.id),
                  )) {
                    const alias = declaration.scope.getBinding(name)

                    if (alias) {
                      stripBinding(alias)
                    }
                  }
                }

                collectCandidates(expression)

                if (expression.parentPath?.isExpressionStatement()) {
                  expression.parentPath.remove()
                } else {
                  expression.replaceWith(
                    types.unaryExpression('void', types.numericLiteral(0)),
                  )
                }
              }
            }

            for (const statement of program.get('body')) {
              if (
                !statement.isImportDeclaration() ||
                statement.node.source.value !== 'virtual:msw'
              ) {
                continue
              }

              for (const specifier of statement.node.specifiers) {
                const binding = program.scope.getBinding(specifier.local.name)

                if (binding) {
                  stripBinding(binding)
                }
              }

              statement.remove()
            }

            let removedDeclaration = true

            while (removedDeclaration) {
              removedDeclaration = false
              program.scope.crawl()

              for (const candidate of unusedCandidates) {
                const binding = candidate.scope.getBinding(
                  candidate.identifier.name,
                )

                if (
                  !binding ||
                  binding.path !== candidate.path ||
                  binding.referenced ||
                  binding.constantViolations.length > 0 ||
                  binding.path.removed
                ) {
                  continue
                }

                const declaration = binding.path

                if (
                  declaration.isImportSpecifier() ||
                  declaration.isImportDefaultSpecifier() ||
                  declaration.isImportNamespaceSpecifier()
                ) {
                  const importDeclaration = declaration.parentPath
                  declaration.remove()

                  if (
                    importDeclaration.isImportDeclaration() &&
                    importDeclaration.node.specifiers.length === 0
                  ) {
                    importDeclaration.remove()
                  }
                } else if (
                  declaration.isVariableDeclarator() ||
                  declaration.isFunctionDeclaration() ||
                  declaration.isClassDeclaration()
                ) {
                  collectCandidates(declaration)
                  declaration.remove()
                } else {
                  continue
                }

                unusedCandidates.delete(candidate)
                removedDeclaration = true
              }
            }
          },
        },
      },
    ],
  })
}
