import { apiRequest } from './client'

export function login(email, password) {
  return apiRequest('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function getLoggedUser(token) {
  return apiRequest('/logged-user', {}, token)
}

export function logout(token) {
  return apiRequest('/logout', { method: 'POST' }, token)
}

export function updateProfile(token, { name, phone, address }) {
  return apiRequest(
    '/update-profile',
    { method: 'POST', body: JSON.stringify({ name, phone, address }) },
    token
  )
}

export function changePassword(token, { currentPassword, password, passwordConfirmation }) {
  return apiRequest(
    '/change-password',
    {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      }),
    },
    token
  )
}

// Sends a reset OTP to the given email.
export function forgotPassword(email) {
  return apiRequest('/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

// Resets the password using the OTP sent by email.
export function resetPassword({ email, otp, password, passwordConfirmation }) {
  return apiRequest('/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      email,
      otp,
      password,
      password_confirmation: passwordConfirmation,
    }),
  })
}
