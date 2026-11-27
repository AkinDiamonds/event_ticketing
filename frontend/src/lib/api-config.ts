const defaultApiUrl = import.meta.env.VITE_LOCAL_API_ORIGIN || 'https://event-ticketing-iiqa.onrender.com'
const configuredApiUrl = import.meta.env.VITE_API_BASE_URL?.trim() || defaultApiUrl

export const API_BASE_URL = configuredApiUrl.replace(/\/+$/, '')
export const API_V1_URL = `${API_BASE_URL}/api/v1`
