import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as AuthApi from '../api/auth'

const TOKEN_KEY = 'mobile_auth_token'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const stored = await AsyncStorage.getItem(TOKEN_KEY)
      if (stored) {
        try {
          const { user } = await AuthApi.getLoggedUser(stored)
          setToken(stored)
          setUser(user)
        } catch (e) {
          await AsyncStorage.removeItem(TOKEN_KEY)
        }
      }
      setLoading(false)
    })()
  }, [])

  async function signIn(email, password) {
    const result = await AuthApi.login(email, password)
    await AsyncStorage.setItem(TOKEN_KEY, result.token)
    const { user } = await AuthApi.getLoggedUser(result.token)
    setToken(result.token)
    setUser(user)
  }

  async function signOut() {
    try {
      if (token) await AuthApi.logout(token)
    } catch (e) {
      // ignore network errors on logout, still clear locally
    } finally {
      await AsyncStorage.removeItem(TOKEN_KEY)
      setToken(null)
      setUser(null)
    }
  }

  async function updateProfile(fields) {
    const result = await AuthApi.updateProfile(token, fields)
    setUser(result.user)
    return result
  }

  function changePassword(fields) {
    return AuthApi.changePassword(token, fields)
  }

  return (
    <AuthContext.Provider
      value={{ token, user, loading, signIn, signOut, updateProfile, changePassword }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
