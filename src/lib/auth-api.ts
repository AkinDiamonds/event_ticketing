const API_BASE_URL = 'https://event-ticketing-iiqa.onrender.com'
const AUTH_PATH = '/api/v1/auth'

type ApiEnvelope = {
  success?: boolean
  message?: string
  data?: unknown
  accessToken?: string
  refreshToken?: string
  user?: Record<string, unknown>
}

export type AuthTokens = {
  accessToken?: string
  refreshToken?: string
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
    const refreshToken = localStorage.getItem('lasu_refresh_token')
    if (refreshToken) {
      try {
        const refreshed = readTokens(await request('/refresh', { refreshToken }, undefined, false))
        if (refreshed.accessToken) return request(path, payload, refreshed.accessToken, false)
      } catch {
        localStorage.removeItem('lasu_access_token')
        localStorage.removeItem('lasu_refresh_token')
      }
    }
  }
  if (!response.ok) {
    throw new Error(result.message || `Request failed (${response.status})`)
  }
  return result
}

function readTokens(result: ApiEnvelope, submittedEmail?: string): AuthTokens {
  const data = (result.data && typeof result.data === 'object' ? result.data : {}) as ApiEnvelope
  const accessToken = result.accessToken || data.accessToken
  const refreshToken = result.refreshToken || data.refreshToken
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

export async function resendVerification() {
  const token = localStorage.getItem('lasu_access_token')
  if (!token) throw new Error('Sign in first to resend your verification email.')
  return request('/resend-verification', undefined, token)
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
