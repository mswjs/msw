import { ResponseTransformer } from '../response'
import { jsonParse } from '../utils/internal/jsonParse'
import { mergeRight } from '../utils/internal/mergeRight'
import { json } from './json'

const forbiddenFieldNamesList = ['', 'data', 'errors', 'exceptions'] as const
type ForbiddenFieldNames = typeof forbiddenFieldNamesList[number]

/**
 * Set a custom field on the GraphQL mocked response.
 * @example res(ctx.fields('customField', value))
 * @see {@link https://mswjs.io/docs/api/context/field}
 */
export const field = <FieldNameType extends string, FieldValueType>(
  fieldName: FieldNameType extends ForbiddenFieldNames ? never : FieldNameType,
  fieldValue: FieldValueType,
): ResponseTransformer<string> => {
  return (res) => {
    validateFieldName(fieldName)

    const prevBody = jsonParse(res.body) || {}
    const nextBody = mergeRight(prevBody, { [fieldName]: fieldValue })

    return json(nextBody)(res as any) as any
  }
}

function validateFieldName(fieldName: string) {
  if (forbiddenFieldNamesList.includes(fieldName as ForbiddenFieldNames)) {
    throw new Error(
      `ctx.field() first argument must not be an element of ${JSON.stringify(
        forbiddenFieldNamesList,
      )}`,
    )
  }
}
