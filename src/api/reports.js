import { apiRequest } from './client'

function withQuery(path, { startDate, endDate, branchId } = {}) {
  const params = {}
  if (startDate) params.start_date = startDate
  if (endDate) params.end_date = endDate
  if (branchId) params.branch_id = branchId
  const query = new URLSearchParams(params).toString()
  return query ? `${path}?${query}` : path
}

export function getQuickReport(token) {
  return apiRequest('/daily-summary/quick-report', {}, token)
}

export function getTopTenDeals(token) {
  return apiRequest('/daily-summary/top-ten-deals-report', {}, token)
}

// type: 'all' | 'delivery' | 'dining' | 'onway'
export function getSalesSummary(token, type = 'all', range) {
  const path =
    type === 'all' ? '/daily-summary/report' : `/daily-summary/report${type}`
  return apiRequest(withQuery(path, range), {}, token)
}

export function getCategorySales(token, range) {
  return apiRequest(withQuery('/daily-category-sales/report', range), {}, token)
}

export function getCategorySalesByQuantity(token, range) {
  return apiRequest(
    withQuery('/daily-category-sales-by-item-quantity/report', range),
    {},
    token
  )
}
