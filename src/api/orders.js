import { apiRequest } from './client'

// Core POS calculations, matching the web POS flow.
export function calculateTotals({
  lines,
  discountType,
  discountAmount,
  serviceChargesPercentage,
  promoDiscount = 0,
  redeemPoints = 0,
  loyalty,
}) {
  const subtotal = lines.reduce((sum, l) => sum + Number(l.price) * Number(l.quantity), 0)

  const manualDiscount =
    discountType === 'percentage'
      ? Math.min(subtotal, subtotal * (Number(discountAmount || 0) / 100))
      : Math.min(subtotal, Number(discountAmount || 0))

  const loyaltyDiscount = Math.max(0, Number(redeemPoints || 0)) * Number(loyalty?.currency_per_point || 0)
  const totalDiscount = manualDiscount + Number(promoDiscount || 0) + loyaltyDiscount
  const taxable = Math.max(0, subtotal - totalDiscount)
  const serviceCharges = taxable * (Number(serviceChargesPercentage || 0) / 100)
  const grandTotal = Math.max(0, taxable + serviceCharges)
  const totalQty = lines.reduce((sum, l) => sum + Number(l.quantity), 0)

  return {
    subtotal,
    manualDiscount,
    promoDiscount: Number(promoDiscount || 0),
    loyaltyDiscount,
    totalDiscount,
    taxable,
    serviceCharges,
    grandTotal,
    totalQty,
  }
}

function formatDateTime(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

export function buildOrderPayload({
  lines,
  type,
  placeId,
  customerId,
  status,
  paid,
  discountType,
  discountAmount,
  serviceChargesPercentage,
  promoCode,
  promoDiscount,
  redeemPoints,
  loyalty,
}) {
  const totals = calculateTotals({
    lines,
    discountType,
    discountAmount,
    serviceChargesPercentage,
    promoDiscount,
    redeemPoints,
    loyalty,
  })

  return {
    customer_id: customerId || undefined,
    order_datetime: formatDateTime(new Date()),
    status,
    paid,
    type,
    qty: totals.totalQty,
    subtotal: totals.subtotal,
    discount_type: discountType,
    discount_amount: totals.manualDiscount,
    service_charges: totals.serviceCharges,
    service_charges_percentage: Number(serviceChargesPercentage || 0),
    grand_total: totals.grandTotal,
    place_id: placeId,
    promo_code: promoCode || undefined,
    redeem_points: Number(redeemPoints || 0) || undefined,
    order_items: lines.map((l) => ({
      fooditems_id: l.fooditems_id,
      category_id: l.foodcategory_id,
      quantity: l.quantity,
      discount_amount: 0,
      sub_total: Number(l.price) * Number(l.quantity),
      add_note: l.note || '',
      kds_station_id: l.kds_station_id || null,
    })),
  }
}

export function createOrder(token, payload) {
  return apiRequest('/orders', { method: 'POST', body: JSON.stringify(payload) }, token)
}

export function listOrders(token) {
  return apiRequest('/orders', {}, token)
}

export function getOrder(token, orderId) {
  return apiRequest(`/orders/${orderId}`, {}, token)
}

export function deleteOrder(token, orderId) {
  return apiRequest(`/orders/${orderId}`, { method: 'DELETE' }, token)
}

// Regenerates the receipt PNG; pass send=true to also push it over WhatsApp.
export function getReceipt(token, orderId, send = false) {
  const query = send ? '?send=1' : ''
  return apiRequest(`/orders/${orderId}/receipt${query}`, {}, token)
}
