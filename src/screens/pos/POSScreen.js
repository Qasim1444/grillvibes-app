import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
  useWindowDimensions,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getFoodCategories, getFoodItems } from '../../api/menu'
import { getPlaces } from '../../api/places'
import { getCustomers } from '../../api/customers'
import { getKdsStations, getPosBootstrap } from '../../api/pos'
import { assetUrl } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../theme/colors'
import { formatPkr } from '../../utils/format'

function foodImageUrl(item) {
  const path =
    item.image_url ||
    item.image ||
    item.photo ||
    item.picture ||
    item.thumbnail ||
    item.food_image ||
    item.foodimage

  return path ? assetUrl(path) : ''
}

export default function POSScreen({ navigation }) {
  const { token } = useAuth()
  const { width } = useWindowDimensions()
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

  const columnCount = width >= 900 ? 4 : width >= 620 ? 3 : 2
  const gridGap = 12
  const cardWidth = (width - 28 - gridGap * (columnCount - 1)) / columnCount
  const categoryTabs = useMemo(() => [{ id: 'all', name: 'All' }, ...categories], [categories])

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
    setCart({})
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
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Search menu..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} disabled={refreshing}>
          <Text style={styles.refreshButtonText}>{refreshing ? '...' : 'Refresh'}</Text>
        </TouchableOpacity>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {categoryTabs.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.tab, activeCategory === cat.id && styles.tabActive]}
            onPress={() => setActiveCategory(cat.id)}
          >
            <Text
              style={[styles.tabText, activeCategory === cat.id && styles.tabTextActive]}
              numberOfLines={1}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.resultCount}>
        {filteredItems.length} item{filteredItems.length === 1 ? '' : 's'} available
      </Text>

      <FlatList
        key={columnCount}
        data={filteredItems}
        keyExtractor={(item) => String(item.id)}
        numColumns={columnCount}
        columnWrapperStyle={styles.itemRow}
        contentContainerStyle={[styles.itemsContent, { paddingBottom: cartCount > 0 ? 100 : 20 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        ListEmptyComponent={<Text style={styles.empty}>No items found.</Text>}
        renderItem={({ item }) => {
          const imageUri = foodImageUrl(item)

          return (
            <TouchableOpacity
              style={[styles.itemCard, { width: cardWidth }]}
              onPress={() => addToCart(item.id)}
            >
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.itemImage} resizeMode="cover" />
              ) : (
                <View style={styles.itemImagePlaceholder}>
                  <Text style={styles.itemImagePlaceholderText}>No Image</Text>
                </View>
              )}
              <View style={styles.itemBody}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.itemPrice}>{formatPkr(item.price)}</Text>
              </View>
              {!!cart[item.id] && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cart[item.id]}</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        }}
      />

      {cartCount > 0 && (
        <TouchableOpacity style={styles.cartButton} onPress={goToCart}>
          <Text style={styles.cartButtonText}>
            View Cart - {cartCount} items - {formatPkr(cartSubtotal)}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 14, paddingTop: 44 },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
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
  refreshButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 82,
    alignItems: 'center',
  },
  refreshButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  tabsWrapper: {
    height: 44,
    marginBottom: 8,
  },
  tabsContent: {
    alignItems: 'center',
    paddingRight: 12,
  },
  tab: {
    minHeight: 34,
    maxWidth: 180,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  resultCount: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 10 },
  itemsContent: { gap: 12 },
  itemRow: { gap: 12 },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    height: 190,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemImage: { width: '100%', aspectRatio: 1.7, backgroundColor: colors.background },
  itemImagePlaceholder: {
    width: '100%',
    aspectRatio: 1.7,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemImagePlaceholderText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  itemBody: { flex: 1, padding: 12, justifyContent: 'space-between' },
  itemName: { fontSize: 14, fontWeight: '700', color: colors.text, paddingRight: 22, lineHeight: 18 },
  itemPrice: { fontSize: 13, color: colors.primary, fontWeight: '800', marginTop: 10 },
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
    bottom: 16,
    left: 14,
    right: 14,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  cartButtonText: { color: '#fff', fontWeight: '700', fontSize: 14, textAlign: 'center' },
  error: { color: colors.danger, marginBottom: 8, fontSize: 13, textAlign: 'center' },
})
