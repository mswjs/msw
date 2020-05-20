import { parse, OperationDefinitionNode, OperationTypeNode } from 'graphql'

interface ParsedQueryPayload {
  operationName: string | undefined
}

export function parseQuery(
  query: string,
  definitionOperation: OperationTypeNode = 'query',
): ParsedQueryPayload {
  const ast = parse(query)

  const operationDef = ast.definitions.find(
    (def) =>
      def.kind === 'OperationDefinition' &&
      def.operation === definitionOperation,
  ) as OperationDefinitionNode

  return {
    operationName: operationDef?.name?.value,
  }
}
