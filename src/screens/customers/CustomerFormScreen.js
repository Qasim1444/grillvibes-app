import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { createCustomer, updateCustomer, deleteCustomer } from '../../api/customers'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../theme/colors'

export default function CustomerFormScreen({ route, navigation }) {
  const existing = route.params?.customer
  const { token } = useAuth()
  const [name, setName] = useState(existing?.name || '')
  const [contact, setContact] = useState(existing?.contact || '')
  const [address, setAddress] = useState(existing?.address || '')
  const [email, setEmail] = useState(existing?.email || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setError('')
    if (!name || !contact || !address) {
      setError('Name, contact, and address are required.')
      return
    }
    setLoading(true)
    try {
      if (existing) {
        await updateCustomer(token, existing.id, { name, contact, address, email })
      } else {
        await createCustomer(token, { name, contact, address, email })
      }
      navigation.goBack()
    } catch (e) {
      setError(e.message || 'Could not save customer')
    } finally {
      setLoading(false)
    }
  }

  function handleDelete() {
    Alert.alert('Delete customer', `Delete ${existing.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCustomer(token, existing.id)
            navigation.goBack()
          } catch (e) {
            setError(e.message || 'Could not delete customer')
          }
        },
      },
    ])
  }

  return (
    <View style={styles.container}>
      {!!error && <Text style={styles.error}>{error}</Text>}

      <TextInput style={styles.input} placeholder="Name" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />
      <TextInput
        style={styles.input}
        placeholder="Contact number"
        placeholderTextColor={colors.textMuted}
        keyboardType="phone-pad"
        value={contact}
        onChangeText={setContact}
      />
      <TextInput
        style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
        placeholder="Address"
        placeholderTextColor={colors.textMuted}
        value={address}
        onChangeText={setAddress}
        multiline
      />
      <TextInput
        style={styles.input}
        placeholder="Email (optional)"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{existing ? 'Save Changes' : 'Add Customer'}</Text>}
      </TouchableOpacity>

      {!!existing && (
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Delete Customer</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },
  input: {
    backgroundColor: colors.surface,
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
  deleteButton: { borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 14 },
  deleteButtonText: { color: colors.danger, fontWeight: '700', fontSize: 14 },
  error: { color: colors.danger, marginBottom: 12, fontSize: 13, textAlign: 'center' },
})
