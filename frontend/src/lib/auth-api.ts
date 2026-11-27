import { API_BASE_URL } from './api-config'
const AUTH_PATH = '/api/v1/auth'

type ApiEnvelope = {
  success?: boolean
  message?: string
  errors?: Array<{ code?: string }>
  data?: unknown
  accessToken?: string
  refreshToken?: string
  user?: Record<string, unknown>
}

export type AuthTokens = {
  accessToken?: string
  refreshToken?: string
}

export class AuthRequestError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function requiresEmailVerification(error: unknown) {
  return error instanceof AuthRequestError && error.status === 403 &&
    (error.code === 'EMAIL_NOT_VERIFIED' || error.message === 'Please verify your email address before logging in')
}

let refreshInFlight: Promise<string | null> | null = null

function findToken(value: unknown, key: 'accessToken' | 'refreshToken'): string | undefined {
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  const snakeCase = key === 'accessToken' ? 'access_token' : 'refresh_token'
  const candidate = record[key] ?? record[snakeCase]
  if (typeof candidate === 'string' && candidate) return candidate
  for (const nested of Object.values(record)) {
    const found = findToken(nested, key)
    if (found) return found
  }
  return undefined
}

function clearSessionTokens() {
  localStorage.removeItem('lasu_access_token')
  localStorage.removeItem('lasu_refresh_token')
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight
  const refreshToken = localStorage.getItem('lasu_refresh_token')
  if (!refreshToken) {
    clearSessionTokens()
    return null
  }

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${AUTH_PATH}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      const result = await response.json().catch(() => ({})) as ApiEnvelope
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) clearSessionTokens()
        return null
      }
      const accessToken = findToken(result, 'accessToken')
      const rotatedRefreshToken = findToken(result, 'refreshToken')
      if (!accessToken) {
        clearSessionTokens()
        return null
      }
      localStorage.setItem('lasu_access_token', accessToken)
      if (rotatedRefreshToken) localStorage.setItem('lasu_refresh_token', rotatedRefreshToken)
      return accessToken
    } catch {
      // A temporary network failure must not destroy an otherwise usable refresh token.
      return null
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  const accessToken = localStorage.getItem('lasu_access_token')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  const response = await fetch(input, { ...init, headers })
  if (response.status !== 401) return response

  const refreshedToken = await refreshAccessToken()
  if (!refreshedToken) return response
  const retryHeaders = new Headers(init.headers)
  retryHeaders.set('Authorization', `Bearer ${refreshedToken}`)
  const retried = await fetch(input, { ...init, headers: retryHeaders })
  if (retried.status === 401) clearSessionTokens()
  return retried
}

export async function getCurrentAccount(): Promise<{ isOrganizer: boolean; isEmailVerified: boolean }> {
  const response = await authenticatedFetch(`${API_BASE_URL}${AUTH_PATH}/me`)
  const result = await response.json().catch(() => ({})) as ApiEnvelope
  if (!response.ok) throw new AuthRequestError(result.message || 'Could not load your account', response.status)
  const account = result.data as { isOrganizer?: boolean; isEmailVerified?: boolean } | undefined
  return { isOrganizer: account?.isOrganizer === true, isEmailVerified: account?.isEmailVerified === true }
}

async function request(path: string, payload?: Record<string, string>, token?: string, canRefresh = true) {
  const bearer = token
  const response = await fetch(`${API_BASE_URL}${AUTH_PATH}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  })
  const result = (await response.json().catch(() => ({}))) as ApiEnvelope
  if (response.status === 401 && canRefresh && path !== '/refresh' && token) {
    const refreshedToken = await refreshAccessToken()
    if (refreshedToken) return request(path, payload, refreshedToken, false)
  }
  if (!response.ok) {
    if (response.status === 401 && token && !canRefresh) clearSessionTokens()
    const code = Array.isArray(result.errors) ? result.errors.find((detail) => detail?.code)?.code : undefined
    throw new AuthRequestError(result.message || `Request failed (${response.status})`, response.status, code)
  }
  return result
}

function readTokens(result: ApiEnvelope, submittedEmail?: string): AuthTokens {
  const data = (result.data && typeof result.data === 'object' ? result.data : {}) as ApiEnvelope
  const accessToken = findToken(result, 'accessToken')
  const refreshToken = findToken(result, 'refreshToken')
  const candidate = result.user || data.user || ('email' in data ? data as Record<string, unknown> : undefined)
  const userEmail = typeof candidate?.email === 'string' ? candidate.email : submittedEmail
  const fullName = typeof candidate?.fullName === 'string'
    ? candidate.fullName
    : typeof candidate?.name === 'string'
      ? candidate.name
      : [candidate?.firstName, candidate?.lastName].filter((part): part is string => typeof part === 'string').join(' ')
  if (accessToken) localStorage.setItem('lasu_access_token', accessToken)
  if (refreshToken) localStorage.setItem('lasu_refresh_token', refreshToken)
  if (submittedEmail || candidate) {
    if (userEmail) localStorage.setItem('lasu_profile_email', userEmail)
    if (fullName) localStorage.setItem('lasu_profile_name', fullName)
    else localStorage.removeItem('lasu_profile_name')
  }
  return { accessToken, refreshToken }
}

export async function login(email: string, password: string) {
  return readTokens(await request('/login', { email, password }), email)
}

export async function register(email: string, password: string) {
  return readTokens(await request('/register', { email, password }), email)
}

export async function verifyEmail(token: string) {
  return request('/verify-email', { token })
}

export async function requestPasswordReset(email: string) {
  return request('/forgot-password', { email })
}

export async function resetPassword(token: string, password: string) {
  return request('/reset-password', { token, password })
}

export async function resendVerificationEmail(email: string) {
  return request('/resend-verification-email', { email })
}

export async function logout() {
  const accessToken = localStorage.getItem('lasu_access_token')
  const refreshToken = localStorage.getItem('lasu_refresh_token')
  try {
    if (accessToken && refreshToken) {
      await request('/logout', { refreshToken }, accessToken)
    }
  } finally {
    localStorage.removeItem('lasu_access_token')
    localStorage.removeItem('lasu_refresh_token')
    localStorage.removeItem('lasu_profile_email')
    localStorage.removeItem('lasu_profile_name')
  }
}
