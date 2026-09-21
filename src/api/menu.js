import { apiRequest } from './client'

export function getFoodCategories(token) {
  return apiRequest('/food-categories', {}, token)
}

export function getFoodItems(token) {
  return apiRequest('/food-items', {}, token)
}
