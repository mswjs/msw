import * as toughCookie from 'tough-cookie'

const { CookieJar } = toughCookie

export const cookieStore = new CookieJar()
