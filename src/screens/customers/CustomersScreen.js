import React, { useCallback, useMemo, useState } from 'react'
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getCustomers } from '../../api/customers'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../theme/colors'

export default function CustomersScreen({ navigation }) {
  const { token } = useAuth()
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const result = await getCustomers(token)
      setCustomers(Array.isArray(result) ? result : result.data || [])
    } catch (e) {
      setError(e.message || 'Could not load customers')
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

  // Client-side filtering — the API docs list customer search as a
  // suggested future endpoint, not yet live, so we filter what's loaded.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(
      (c) => c.name?.toLowerCase().includes(q) || c.contact?.toLowerCase().includes(q)
    )
  }, [customers, search])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.search}
          placeholder="Search by name or phone"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('CustomerForm', {})}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={filtered}
        keyExtractor={(c) => String(c.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('CustomerForm', { customer: item })}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.contact}</Text>
            {!!item.address && <Text style={styles.meta}>{item.address}</Text>}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No customers found.</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 50 },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  search: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addButton: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center' },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 10 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  error: { color: colors.danger, marginBottom: 12, fontSize: 13, textAlign: 'center' },
})
