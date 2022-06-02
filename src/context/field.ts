import { invariant } from 'outvariant'
import { ResponseTransformer } from '../response'
import { devUtils } from '../utils/internal/devUtils'
import { jsonParse } from '../utils/internal/jsonParse'
import { mergeRight } from '../utils/internal/mergeRight'
import { json } from './json'

type ForbiddenFieldNames = '' | 'data' | 'errors' | 'extensions'

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
  invariant(
    fieldName.trim() !== '',
    devUtils.formatMessage(
      'Failed to set a custom field on a GraphQL response: field name cannot be empty.',
    ),
  )
  invariant(
    fieldName !== 'data',
    devUtils.formatMessage(
      'Failed to set a custom "%s" field on a mocked GraphQL response: forbidden field name. Did you mean to call "ctx.data()" instead?',
      fieldName,
    ),
  )
  invariant(
    fieldName !== 'errors',
    devUtils.formatMessage(
      'Failed to set a custom "%s" field on a mocked GraphQL response: forbidden field name. Did you mean to call "ctx.errors()" instead?',
      fieldName,
    ),
  )
  invariant(
    fieldName !== 'extensions',
    devUtils.formatMessage(
      'Failed to set a custom "%s" field on a mocked GraphQL response: forbidden field name. Did you mean to call "ctx.extensions()" instead?',
      fieldName,
    ),
  )
}
