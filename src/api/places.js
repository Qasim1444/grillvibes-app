import { apiRequest } from './client'

export function getPlaces(token) {
  return apiRequest('/places', {}, token)
}
