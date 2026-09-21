import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
  Linking,
  Image,
} from 'react-native'
import { createOrder, buildOrderPayload, calculateTotals, getReceipt } from '../../api/orders'
import { createCustomer } from '../../api/customers'
import { quotePromo } from '../../api/pos'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../theme/colors'
import { formatPkr } from '../../utils/format'

const ORDER_TYPES = ['dining', 'delivery', 'on-way']
const STATUSES = ['pending', 'preparing', 'on-way', 'completed']

const money = formatPkr
const num = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export default function CartScreen({ route, navigation }) {
  const {
    places = [],
    customers: initialCustomers = [],
    kdsStations = [],
    loyalty = null,
    campaigns = [],
  } = route.params
  const [lines, setLines] = useState(route.params.lines || [])
  const [customers, setCustomers] = useState(initialCustomers)
  const { token } = useAuth()

  const [type, setType] = useState('dining')
  const [placeId, setPlaceId] = useState(places[0]?.id ?? null)
  const [customerId, setCustomerId] = useState(null)
  const [status, setStatus] = useState('pending')
  const [paid, setPaid] = useState(false)
  const [discountType, setDiscountType] = useState('amount')
  const [discountAmount, setDiscountAmount] = useState('0')
  const [serviceChargesPercentage, setServiceChargesPercentage] = useState('0')
  const [promoInput, setPromoInput] = useState('')
  const [appliedPromo, setAppliedPromo] = useState(null)
  const [redeemPoints, setRedeemPoints] = useState('0')

  const [placeModalOpen, setPlaceModalOpen] = useState(false)
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [newCustomerMode, setNewCustomerMode] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: '', contact: '', address: '' })
  const [receipt, setReceipt] = useState(null)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [promoLoading, setPromoLoading] = useState(false)

  const selectedCustomer = customers.find((c) => c.id === customerId)
  const promoDiscount = appliedPromo ? num(appliedPromo.discount) : 0
  const totals = useMemo(
    () =>
      calculateTotals({
        lines,
        discountType,
        discountAmount,
        serviceChargesPercentage,
        promoDiscount,
        redeemPoints,
        loyalty,
      }),
    [lines, discountType, discountAmount, serviceChargesPercentage, promoDiscount, redeemPoints, loyalty]
  )

  const selectedPlace = places.find((p) => p.id === placeId)
  const pointsBalance = num(selectedCustomer?.loyalty_points_balance)
  const pointValue = num(loyalty?.currency_per_point)
  const maxRedeemPercent = num(loyalty?.max_redeem_percent)
  const maxRedeemPoints =
    loyalty?.is_active && pointValue > 0
      ? Math.max(0, Math.min(pointsBalance, Math.floor(((totals.subtotal * maxRedeemPercent) / 100) / pointValue)))
      : 0

  function changeQty(fooditemsId, delta) {
    setLines((prev) =>
      prev
        .map((l) => (l.fooditems_id === fooditemsId ? { ...l, quantity: Math.max(1, l.quantity + delta) } : l))
        .filter((l) => l.quantity > 0)
    )
  }

  function updateLine(fooditemsId, patch) {
    setLines((prev) => prev.map((l) => (l.fooditems_id === fooditemsId ? { ...l, ...patch } : l)))
  }

  function removeLine(fooditemsId) {
    setLines((prev) => prev.filter((l) => l.fooditems_id !== fooditemsId))
  }

  function campaignBase(campaign) {
    if (campaign.applies_to === 'all') return totals.subtotal
    const ids = (campaign.target_ids || []).map(Number)
    return lines
      .filter((line) => ids.includes(Number(campaign.applies_to === 'category' ? line.foodcategory_id : line.fooditems_id)))
      .reduce((sum, line) => sum + Number(line.price) * Number(line.quantity), 0)
  }

  function campaignDiscount(campaign) {
    const base = campaignBase(campaign)
    if (base <= 0 || totals.subtotal < num(campaign.min_order_amount)) return 0
    let raw = campaign.type === 'percentage' ? (base * num(campaign.value)) / 100 : num(campaign.value)
    if (campaign.max_discount !== null && campaign.max_discount !== undefined) {
      raw = Math.min(raw, num(campaign.max_discount))
    }
    return Math.min(raw, totals.subtotal)
  }

  const suggestedCampaigns = campaigns
    .filter((campaign) => {
      const orderTypes = campaign.order_types || []
      return orderTypes.length === 0 || orderTypes.includes(type)
    })
    .map((campaign) => ({ ...campaign, previewDiscount: campaignDiscount(campaign) }))
    .filter((campaign) => campaign.previewDiscount > 0)

  async function handleApplyPromo() {
    const code = promoInput.trim()
    if (!code) return
    setError('')
    setPromoLoading(true)
    try {
      const result = await quotePromo(token, { code, subtotal: totals.subtotal, customerId })
      setAppliedPromo(result)
      setPromoInput(result.code || code)
    } catch (e) {
      setAppliedPromo(null)
      setError(e.message || 'Promo code could not be applied.')
    } finally {
      setPromoLoading(false)
    }
  }

  async function handleCreateCustomer() {
    if (!newCustomer.name || !newCustomer.contact || !newCustomer.address) {
      setError('New customer needs a name, contact, and address.')
      return
    }
    try {
      const result = await createCustomer(token, newCustomer)
      const created = result.data || result
      setCustomers((prev) => [...prev, created])
      setCustomerId(created.id)
      setRedeemPoints('0')
      setNewCustomerMode(false)
      setCustomerModalOpen(false)
      setNewCustomer({ name: '', contact: '', address: '' })
    } catch (e) {
      setError(e.message || 'Could not create customer')
    }
  }

  async function handlePlaceOrder() {
    setError('')
    if (lines.length === 0) return setError('Cart is empty.')
    if (!placeId) return setError('Please select a table/place.')
    if (type === 'delivery' && !customerId) return setError('A customer is required for delivery orders.')
    if (num(serviceChargesPercentage) < 0 || num(serviceChargesPercentage) > 100) {
      return setError('Service charge must be between 0 and 100.')
    }
    if (totals.totalDiscount > totals.subtotal) return setError('Discounts exceed the subtotal.')
    if (num(redeemPoints) > 0 && !customerId) return setError('Pick a customer before redeeming points.')
    if (num(redeemPoints) > maxRedeemPoints) return setError(`You can redeem up to ${maxRedeemPoints} points here.`)

    setLoading(true)
    try {
      const payload = buildOrderPayload({
        lines,
        type,
        placeId,
        customerId,
        status,
        paid,
        discountType,
        discountAmount,
        serviceChargesPercentage,
        promoCode: appliedPromo?.code,
        promoDiscount,
        redeemPoints,
        loyalty,
      })
      const result = await createOrder(token, payload)
      const orderId = result.data?.id || result.order_id
      let receiptUrl = result.receipt_url
      if (!receiptUrl && orderId) {
        const receiptResult = await getReceipt(token, orderId)
        receiptUrl = receiptResult.receipt_url
      }
      setReceipt({ orderId, url: receiptUrl, message: result.message })
    } catch (e) {
      setError(e.message || 'Could not place order')
    } finally {
      setLoading(false)
    }
  }

  function finishOrder() {
    setReceipt(null)
    navigation.popToTop()
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Checkout</Text>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={lines}
        keyExtractor={(l) => String(l.fooditems_id)}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.lineCard}>
            <View style={styles.lineHeader}>
              <Text style={styles.lineName}>{item.name}</Text>
              <TouchableOpacity onPress={() => removeLine(item.fooditems_id)}>
                <Text style={styles.remove}>Remove</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.lineRow}>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => changeQty(item.fooditems_id, -1)}>
                  <Text style={styles.stepText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.qty}>{item.quantity}</Text>
                <TouchableOpacity style={styles.stepBtn} onPress={() => changeQty(item.fooditems_id, 1)}>
                  <Text style={styles.stepText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.linePrice}>{money(item.price * item.quantity)}</Text>
            </View>
            <TextInput
              style={styles.noteInput}
              placeholder="Kitchen note (optional)"
              placeholderTextColor={colors.textMuted}
              value={item.note}
              onChangeText={(text) => updateLine(item.fooditems_id, { note: text })}
            />
            <Text style={styles.inlineLabel}>KDS station</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, !item.kds_station_id && styles.chipActive]}
                onPress={() => updateLine(item.fooditems_id, { kds_station_id: null })}
              >
                <Text style={[styles.chipText, !item.kds_station_id && styles.chipTextActive]}>Auto</Text>
              </TouchableOpacity>
              {kdsStations.map((station) => (
                <TouchableOpacity
                  key={station.id}
                  style={[styles.chip, item.kds_station_id === station.id && styles.chipActive]}
                  onPress={() => updateLine(item.fooditems_id, { kds_station_id: station.id })}
                >
                  <Text style={[styles.chipText, item.kds_station_id === station.id && styles.chipTextActive]}>
                    {station.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      />

      <Text style={styles.label}>Order type</Text>
      <View style={styles.chipRow}>{ORDER_TYPES.map((t) => renderChip(t, type === t, () => setType(t)))}</View>

      <Text style={styles.label}>Table / place</Text>
      <TouchableOpacity style={styles.pickerButton} onPress={() => setPlaceModalOpen(true)}>
        <Text style={styles.pickerButtonText}>{selectedPlace?.name || 'Select a place'}</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Customer {type === 'delivery' ? '(required)' : '(optional)'}</Text>
      <TouchableOpacity style={styles.pickerButton} onPress={() => setCustomerModalOpen(true)}>
        <Text style={styles.pickerButtonText}>{selectedCustomer?.name || 'Select a customer'}</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Status</Text>
      <View style={styles.chipRow}>{STATUSES.map((s) => renderChip(s, status === s, () => setStatus(s)))}</View>

      <TouchableOpacity style={styles.paidRow} onPress={() => setPaid((p) => !p)}>
        <View style={[styles.checkbox, paid && styles.checkboxChecked]}>{paid && <Text style={styles.checkmark}>✓</Text>}</View>
        <Text style={styles.paidLabel}>Payment received</Text>
      </TouchableOpacity>

      {!!suggestedCampaigns.length && (
        <>
          <Text style={styles.label}>Discount champion</Text>
          <View style={styles.chipRow}>
            {suggestedCampaigns.map((campaign) => (
              <TouchableOpacity
                key={campaign.id}
                style={styles.offerChip}
                onPress={() => {
                  setDiscountType('amount')
                  setDiscountAmount(String(campaign.previewDiscount.toFixed(2)))
                }}
              >
                <Text style={styles.offerText}>{campaign.name} - {money(campaign.previewDiscount)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Text style={styles.label}>Discount</Text>
      <View style={styles.discountRow}>
        <View style={styles.chipRow}>{['amount', 'percentage'].map((d) => renderChip(d, discountType === d, () => setDiscountType(d)))}</View>
        <TextInput style={styles.smallInput} keyboardType="numeric" value={discountAmount} onChangeText={setDiscountAmount} placeholder="0" placeholderTextColor={colors.textMuted} />
      </View>

      <Text style={styles.label}>Promo Code</Text>
      <View style={styles.inlineRow}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          autoCapitalize="characters"
          value={promoInput}
          onChangeText={(value) => {
            setPromoInput(value)
            setAppliedPromo(null)
          }}
          placeholder="e.g. FLAT100"
          placeholderTextColor={colors.textMuted}
        />
        <TouchableOpacity style={styles.applyButton} onPress={handleApplyPromo} disabled={promoLoading}>
          {promoLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.applyButtonText}>Apply</Text>}
        </TouchableOpacity>
      </View>
      {!!appliedPromo && <Text style={styles.goodText}>{appliedPromo.code} applied - {money(promoDiscount)} off</Text>}

      <Text style={styles.label}>Redeem Points</Text>
      <View style={styles.inlineRow}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          keyboardType="numeric"
          value={redeemPoints}
          onChangeText={setRedeemPoints}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
        />
        <TouchableOpacity style={styles.applyButton} onPress={() => setRedeemPoints(String(maxRedeemPoints))}>
          <Text style={styles.applyButtonText}>Max</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>
        {selectedCustomer
          ? `Balance ${pointsBalance} points · max ${maxRedeemPoints} here`
          : 'Select a customer to redeem points.'}
      </Text>

      <Text style={styles.label}>Service charge (%)</Text>
      <TextInput style={styles.smallInput} keyboardType="numeric" value={serviceChargesPercentage} onChangeText={setServiceChargesPercentage} placeholder="0" placeholderTextColor={colors.textMuted} />

      <View style={styles.totalsCard}>
        {totalRow('Subtotal', money(totals.subtotal))}
        {totalRow('Discount', `-${money(totals.manualDiscount)}`)}
        {totalRow('Promo', `-${money(totals.promoDiscount)}`)}
        {totalRow('Points', `-${money(totals.loyaltyDiscount)}`)}
        {totalRow('Service charge', `+${money(totals.serviceCharges)}`)}
        <View style={[styles.totalRow, { marginTop: 8 }]}>
          <Text style={styles.grandLabel}>Grand Total</Text>
          <Text style={styles.grandValue}>{money(totals.grandTotal)}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handlePlaceOrder} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Place Order · {money(totals.grandTotal)}</Text>}
      </TouchableOpacity>

      {pickerModal(placeModalOpen, 'Select a place', places, (item) => {
        setPlaceId(item.id)
        setPlaceModalOpen(false)
      }, () => setPlaceModalOpen(false))}

      <Modal visible={customerModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select a customer</Text>
            {!newCustomerMode ? (
              <>
                <FlatList
                  data={customers}
                  keyExtractor={(c) => String(c.id)}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.modalRow}
                      onPress={() => {
                        setCustomerId(item.id)
                        setRedeemPoints('0')
                        setCustomerModalOpen(false)
                      }}
                    >
                      <Text style={styles.modalRowText}>{item.name}</Text>
                      <Text style={styles.modalRowSubtext}>{item.contact} {item.loyalty_points_balance ? `· ${item.loyalty_points_balance} pts` : ''}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={<Text style={styles.empty}>No customers yet.</Text>}
                />
                <TouchableOpacity style={styles.addNewButton} onPress={() => setNewCustomerMode(true)}>
                  <Text style={styles.addNewButtonText}>+ Add new customer</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View>
                {['name', 'contact', 'address'].map((field) => (
                  <TextInput
                    key={field}
                    style={styles.input}
                    placeholder={field[0].toUpperCase() + field.slice(1)}
                    placeholderTextColor={colors.textMuted}
                    value={newCustomer[field]}
                    onChangeText={(value) => setNewCustomer((prev) => ({ ...prev, [field]: value }))}
                  />
                ))}
                <TouchableOpacity style={styles.submitButton} onPress={handleCreateCustomer}>
                  <Text style={styles.submitButtonText}>Save Customer</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => {
              setCustomerModalOpen(false)
              setNewCustomerMode(false)
            }}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!receipt} animationType="slide">
        <View style={styles.receiptScreen}>
          <Text style={styles.title}>Order Complete</Text>
          <Text style={styles.hint}>Order #{receipt?.orderId || '-'} saved. Receipt is ready.</Text>
          {receipt?.url ? (
            <Image source={{ uri: receipt.url }} style={styles.receiptImage} resizeMode="contain" />
          ) : (
            <Text style={styles.empty}>Receipt URL was not returned.</Text>
          )}
          <TouchableOpacity style={styles.submitButton} onPress={() => receipt?.url && Linking.openURL(receipt.url)}>
            <Text style={styles.submitButtonText}>Open / Print Receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => receipt?.url && Linking.openURL(`whatsapp://send?text=${encodeURIComponent(receipt.url)}`)}>
            <Text style={styles.secondaryButtonText}>Share on WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalClose} onPress={finishOrder}>
            <Text style={styles.modalCloseText}>New Order</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  )
}

function renderChip(label, active, onPress) {
  return (
    <TouchableOpacity key={label} style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

function totalRow(label, value) {
  return (
    <View style={styles.totalRow}>
      <Text style={styles.totalLabel}>{label}</Text>
      <Text style={styles.totalValue}>{value}</Text>
    </View>
  )
}

function pickerModal(visible, title, rows, onPick, onClose) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <FlatList
            data={rows}
            keyExtractor={(row) => String(row.id)}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalRow} onPress={() => onPick(item)}>
                <Text style={styles.modalRowText}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 40 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 16 },
  lineCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 10 },
  lineHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  lineName: { fontSize: 14, fontWeight: '700', color: colors.text, flex: 1, paddingRight: 8 },
  remove: { color: colors.danger, fontSize: 12, fontWeight: '600' },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 15, color: colors.primary, fontWeight: '700' },
  qty: { width: 26, textAlign: 'center', fontWeight: '600', color: colors.text },
  linePrice: { fontSize: 14, fontWeight: '700', color: colors.text },
  noteInput: { marginTop: 8, backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: colors.text, borderWidth: 1, borderColor: colors.border },
  inlineLabel: { fontSize: 12, color: colors.textMuted, marginTop: 10, marginBottom: 6, fontWeight: '600' },
  label: { fontSize: 13, color: colors.textMuted, marginTop: 14, marginBottom: 8, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.border, marginRight: 8, marginBottom: 8, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '600', fontSize: 12, textTransform: 'capitalize' },
  chipTextActive: { color: '#fff' },
  offerChip: { backgroundColor: '#FFF3E8', borderColor: colors.primary, borderWidth: 1, borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12, marginRight: 8, marginBottom: 8 },
  offerText: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 },
  pickerButton: { backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: colors.border },
  pickerButtonText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  paidRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.border, marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  paidLabel: { fontSize: 14, color: colors.text, fontWeight: '600' },
  discountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallInput: { backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border, width: 96, textAlign: 'right' },
  input: { backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border },
  applyButton: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, minWidth: 76, alignItems: 'center' },
  applyButtonText: { color: '#fff', fontWeight: '700' },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
  goodText: { color: colors.success, fontSize: 12, fontWeight: '700', marginTop: 6 },
  totalsCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginTop: 20 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalLabel: { color: colors.textMuted, fontSize: 13 },
  totalValue: { color: colors.text, fontSize: 13, fontWeight: '600' },
  grandLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
  grandValue: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  submitButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryButton: { backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: colors.border },
  secondaryButtonText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  error: { color: colors.danger, marginBottom: 12, fontSize: 13, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  modalRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalRowText: { fontSize: 14, fontWeight: '600', color: colors.text },
  modalRowSubtext: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  modalClose: { marginTop: 16, alignItems: 'center', paddingVertical: 10 },
  modalCloseText: { color: colors.primary, fontWeight: '700' },
  addNewButton: { paddingVertical: 14, alignItems: 'center' },
  addNewButtonText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  empty: { color: colors.textMuted, textAlign: 'center', marginVertical: 20 },
  receiptScreen: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 50 },
  receiptImage: { flex: 1, backgroundColor: colors.surface, borderRadius: 14, marginVertical: 12 },
})
