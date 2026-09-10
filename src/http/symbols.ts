/**
 * Symbols of the `msw/http` module.
 *
 * @note A standalone module so consumers interested only in a symbol
 * (e.g. `msw/graphql`) don't pull the modules that use it into
 * their graph.
 */

/**
 * Marks a response whose `Content-Type` header was inferred by the
 * library instead of being set explicitly by the developer.
 */
export const kDefaultContentType = Symbol.for('kDefaultContentType')

/**
 * Associates the mocked response body type with the response instance
 * for stricter typing of the response resolvers.
 */
export const bodyType: unique symbol = Symbol('bodyType')
