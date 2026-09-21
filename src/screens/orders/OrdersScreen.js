import React, { useCallback, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { listOrders } from '../../api/orders'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../theme/colors'
import { formatPkr } from '../../utils/format'

function orderTotal(order) {
  if (order.grand_total != null) return Number(order.grand_total)
  if (Array.isArray(order.order_items)) {
    return order.order_items.reduce((sum, l) => sum + Number(l.sub_total || 0), 0)
  }
  return 0
}

export default function OrdersScreen({ navigation }) {
  const { token } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const result = await listOrders(token)
      setOrders(result.data || [])
    } catch (e) {
      setError(e.message || 'Could not load orders')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  function onRefresh() {
    setRefreshing(true)
    load()
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

      <FlatList
        data={orders}
        keyExtractor={(o) => String(o.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}>
            <View>
              <Text style={styles.orderTitle}>
                Order #{item.id} · {item.customer?.name || 'Walk-in'}
              </Text>
              <Text style={styles.orderMeta}>
                {item.type || 'dining'} · {item.status || 'pending'} · {item.paid ? 'Paid' : 'Unpaid'}
              </Text>
            </View>
            <Text style={styles.orderTotal}>{formatPkr(orderTotal(item))}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No orders yet. Pull down to refresh.</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 20 },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  orderTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  orderMeta: { fontSize: 12, color: colors.textMuted, marginTop: 4, textTransform: 'capitalize' },
  orderTotal: { fontSize: 15, fontWeight: '700', color: colors.primary },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  error: { color: colors.danger, marginBottom: 12, fontSize: 13, textAlign: 'center' },
})
