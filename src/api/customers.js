import { apiRequest } from './client'

export function getCustomers(token) {
  return apiRequest('/customers', {}, token)
}

export function getCustomer(token, id) {
  return apiRequest(`/customers/${id}`, {}, token)
}

export function createCustomer(token, { name, contact, address, email, dateOfBirth }) {
  return apiRequest(
    '/customers',
    {
      method: 'POST',
      body: JSON.stringify({
        name,
        contact,
        address,
        email: email || undefined,
        date_of_birth: dateOfBirth || undefined,
      }),
    },
    token
  )
}

export function updateCustomer(token, id, { name, contact, address, email, dateOfBirth }) {
  return apiRequest(
    `/customers/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        name,
        contact,
        address,
        email: email || undefined,
        date_of_birth: dateOfBirth || undefined,
      }),
    },
    token
  )
}

export function deleteCustomer(token, id) {
  return apiRequest(`/customers/${id}`, { method: 'DELETE' }, token)
}
