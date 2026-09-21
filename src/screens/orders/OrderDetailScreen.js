import React, { useCallback, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Alert } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getOrder, deleteOrder, getReceipt } from '../../api/orders'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../theme/colors'

export default function OrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params
  const { token } = useAuth()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getOrder(token, orderId)
      setOrder(data.data || data)
    } catch (e) {
      setError(e.message || 'Could not load order')
    } finally {
      setLoading(false)
    }
  }, [orderId, token])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  async function handleReceipt(send) {
    setBusy(true)
    try {
      const result = await getReceipt(token, orderId, send)
      if (result.receipt_url) Linking.openURL(result.receipt_url)
    } catch (e) {
      setError(e.message || 'Could not generate receipt')
    } finally {
      setBusy(false)
    }
  }

  function handleDelete() {
    Alert.alert('Delete order', `Delete order #${orderId}? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteOrder(token, orderId)
            navigation.goBack()
          } catch (e) {
            setError(e.message || 'Could not delete order')
          }
        },
      },
    ])
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.card}>
        <Text style={styles.row}>
          Customer: <Text style={styles.bold}>{order?.customer?.name || 'Walk-in'}</Text>
        </Text>
        <Text style={styles.row}>
          Type: <Text style={styles.bold}>{order?.type}</Text>
        </Text>
        <Text style={styles.row}>
          Status: <Text style={styles.bold}>{order?.status}</Text>
        </Text>
        <Text style={styles.row}>
          Paid: <Text style={styles.bold}>{order?.paid ? 'Yes' : 'No'}</Text>
        </Text>
        <Text style={styles.row}>
          Grand Total: <Text style={styles.bold}>${Number(order?.grand_total || 0).toFixed(2)}</Text>
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Items</Text>
      <FlatList
        data={order?.order_items || []}
        keyExtractor={(l, idx) => String(l.id ?? idx)}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <Text style={styles.itemName}>
              {item.quantity}× {item.fooditem?.name || `Item #${item.fooditems_id}`}
            </Text>
            <Text style={styles.itemPrice}>${Number(item.sub_total || 0).toFixed(2)}</Text>
          </View>
        )}
      />

      <TouchableOpacity style={styles.secondaryButton} onPress={() => handleReceipt(false)} disabled={busy}>
        <Text style={styles.secondaryButtonText}>View / Regenerate Receipt</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => handleReceipt(true)} disabled={busy}>
        <Text style={styles.secondaryButtonText}>Resend Receipt via WhatsApp</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteButtonText}>Delete Order</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 18, marginBottom: 16 },
  row: { fontSize: 14, color: colors.textMuted, marginBottom: 8, textTransform: 'capitalize' },
  bold: { color: colors.text, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemName: { fontSize: 13, color: colors.text },
  itemPrice: { fontSize: 13, color: colors.textMuted },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  secondaryButtonText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  deleteButton: {
    backgroundColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  deleteButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  error: { color: colors.danger, marginBottom: 12, fontSize: 13, textAlign: 'center' },
})
