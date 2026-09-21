import { apiRequest } from './client'

export async function getSettings() {
  const settings = await apiRequest('/settings')
  return Array.isArray(settings) ? settings[0] : settings
}
