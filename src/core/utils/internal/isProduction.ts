export function isProduction(): boolean {
  return process && process.env.NODE_ENV === 'production'
}
