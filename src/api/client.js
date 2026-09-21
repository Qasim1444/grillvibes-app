// ⚠️ Change this to your real Laravel API domain before running the app.
//
// Dev tips:
// - Testing in Expo Go on a PHYSICAL phone: use your computer's LAN IP,
//   e.g. 'http://192.168.1.20:8000/api' (127.0.0.1 will NOT work from a phone).
// - Testing on an ANDROID EMULATOR: use 'http://10.0.2.2:8000/api'
//   (this is the emulator's special alias for your computer's localhost).
// - Production: your real domain, e.g. 'https://infinicodesystem.site/api'.
const API_ORIGIN = 'https://grillvibes.space'
const BASE_URL = `${API_ORIGIN}/api`

export function assetUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${API_ORIGIN}/${String(path).replace(/^\/+/, '')}`
}

export async function apiRequest(path, options = {}, token) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    const validation = body.errors
      ? Object.values(body.errors).flat().join(' ')
      : ''
    throw new Error(validation || body.message || body.error || 'Something went wrong')
  }

  return body
}
