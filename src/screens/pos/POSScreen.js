import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getFoodCategories, getFoodItems } from '../../api/menu'
import { getPlaces } from '../../api/places'
import { getCustomers } from '../../api/customers'
import { getKdsStations, getPosBootstrap } from '../../api/pos'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../theme/colors'

export default function POSScreen({ navigation }) {
  const { token } = useAuth()
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [places, setPlaces] = useState([])
  const [customers, setCustomers] = useState([])
  const [kdsStations, setKdsStations] = useState([])
  const [loyalty, setLoyalty] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState({}) // { [itemId]: quantity }
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      let cats
      let foods
      let placeList
      let customerList
      let stationList = []
      let loyaltySettings = null
      let campaignList = []

      try {
        const bootstrap = await getPosBootstrap(token)
        cats = bootstrap.categories || []
        foods = bootstrap.foodItems || []
        placeList = bootstrap.places || []
        stationList = bootstrap.kdsStations || []
        loyaltySettings = bootstrap.loyalty || null
        campaignList = bootstrap.campaigns || []
        customerList = await getCustomers(token)
      } catch {
        const fallback = await Promise.all([
          getFoodCategories(token),
          getFoodItems(token),
          getPlaces(token),
          getCustomers(token),
          getKdsStations(token).catch(() => []),
        ])
        cats = fallback[0]
        foods = fallback[1]
        placeList = fallback[2]
        customerList = fallback[3]
        stationList = fallback[4]
      }

      setCategories(Array.isArray(cats) ? cats : cats.data || [])
      const foodList = Array.isArray(foods) ? foods : foods.data || []
      setItems(foodList.filter((i) => i.status === true || i.status === 1))
      setPlaces(Array.isArray(placeList) ? placeList : placeList.data || [])
      setCustomers(Array.isArray(customerList) ? customerList : customerList.data || [])
      setKdsStations(Array.isArray(stationList) ? stationList : stationList.data || [])
      setLoyalty(loyaltySettings)
      setCampaigns(Array.isArray(campaignList) ? campaignList : campaignList.data || [])
    } catch (e) {
      setError(e.message || 'Could not load POS data')
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

  async function onRefresh() {
    setRefreshing(true)
    load()
  }

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.foodcategory_id === activeCategory
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [items, activeCategory, search])

  const cartCount = Object.values(cart).reduce((sum, q) => sum + q, 0)
  const cartSubtotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = items.find((i) => String(i.id) === id)
    return sum + (item ? Number(item.price) * qty : 0)
  }, 0)

  function addToCart(itemId) {
    setCart((prev) => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }))
  }

  function goToCart() {
    const lines = Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = items.find((i) => String(i.id) === id)
        return {
          fooditems_id: item.id,
          foodcategory_id: item.foodcategory_id,
          name: item.name,
          price: Number(item.price),
          quantity: qty,
          note: '',
          kds_station_id: null,
        }
      })
    navigation.navigate('Cart', { lines, places, customers, kdsStations, loyalty, campaigns })
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
      <TextInput
        style={styles.search}
        placeholder="Search menu..."
        placeholderTextColor={colors.textMuted}
        value={search}
        onChangeText={setSearch}
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ id: 'all', name: 'All' }, ...categories]}
        keyExtractor={(c) => String(c.id)}
        style={styles.tabs}
        contentContainerStyle={{ paddingRight: 12 }}
        renderItem={({ item: cat }) => (
          <TouchableOpacity
            style={[styles.tab, activeCategory === cat.id && styles.tabActive]}
            onPress={() => setActiveCategory(cat.id)}
          >
            <Text style={[styles.tabText, activeCategory === cat.id && styles.tabTextActive]}>{cat.name}</Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ gap: 12, paddingBottom: cartCount > 0 ? 100 : 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        ListEmptyComponent={<Text style={styles.empty}>No items found.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.itemCard} onPress={() => addToCart(item.id)}>
            <Text style={styles.itemName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.itemPrice}>${Number(item.price).toFixed(2)}</Text>
            {!!cart[item.id] && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cart[item.id]}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      {cartCount > 0 && (
        <TouchableOpacity style={styles.cartButton} onPress={goToCart}>
          <Text style={styles.cartButtonText}>
            View Cart · {cartCount} items · ${cartSubtotal.toFixed(2)}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16, paddingTop: 50 },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  search: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  tabs: { marginBottom: 12, flexGrow: 0 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  itemCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    minHeight: 90,
    justifyContent: 'space-between',
  },
  itemName: { fontSize: 14, fontWeight: '700', color: colors.text },
  itemPrice: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  cartButton: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  cartButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  error: { color: colors.danger, marginBottom: 8, fontSize: 13, textAlign: 'center' },
})
