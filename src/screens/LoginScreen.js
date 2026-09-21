import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { assetUrl } from '../api/client'
import { getSettings } from '../api/settings'
import { useAuth } from '../context/AuthContext'
import { colors } from '../theme/colors'

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    let mounted = true

    getSettings()
      .then((data) => {
        if (mounted) setSettings(data)
      })
      .catch(() => {
        if (mounted) setSettings(null)
      })

    return () => {
      mounted = false
    }
  }, [])

  async function handleLogin() {
    setError('')
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (e) {
      setError(e.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        {!!settings?.logo && (
          <Image
            source={{ uri: assetUrl(settings.logo) }}
            style={styles.logoImage}
            resizeMode="contain"
          />
        )}
        <Text style={styles.logo}>{settings?.company || settings?.name || 'GrillVibes'} POS</Text>
        <Text style={styles.subtitle}>Sign in to start a shift</Text>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log In</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={{ marginTop: 16 }}>
          <Text style={styles.link}>Forgot password?</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  logoImage: {
    width: 132,
    height: 132,
    alignSelf: 'center',
    marginBottom: 12,
    borderRadius: 16,
  },
  logo: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 24 },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: colors.danger, textAlign: 'center', marginBottom: 12, fontSize: 13 },
  link: { color: colors.primary, textAlign: 'center', fontWeight: '600', fontSize: 13 },
})
