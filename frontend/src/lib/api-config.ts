const configuredApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://event-ticketing-iiqa.onrender.com'

export const API_BASE_URL = configuredApiUrl.replace(/\/+$/, '')
export const API_V1_URL = `${API_BASE_URL}/api/v1`
