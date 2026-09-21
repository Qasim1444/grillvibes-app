import { apiRequest } from './client'

export function getPosBootstrap(token) {
  return apiRequest('/pos/bootstrap', {}, token)
}

export function getKdsStations(token) {
  return apiRequest('/kds/stations', {}, token)
}

export function quotePromo(token, { code, subtotal, customerId }) {
  const params = new URLSearchParams({
    code,
    subtotal: Number(subtotal || 0).toFixed(2),
  })

  if (customerId) {
    params.set('customer_id', String(customerId))
  }

  return apiRequest(`/orders/quote-promo?${params.toString()}`, {}, token)
}
