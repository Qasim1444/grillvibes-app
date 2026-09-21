import React, { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import {
  getQuickReport,
  getTopTenDeals,
  getSalesSummary,
  getCategorySales,
  getCategorySalesByQuantity,
} from '../../api/reports'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../theme/colors'

const REPORTS = [
  { key: 'quick', label: 'Quick Report (Today)' },
  { key: 'topTen', label: 'Top 10 Deals (Today)' },
  { key: 'sales', label: 'Sales Summary (All)' },
  { key: 'salesDining', label: 'Sales — Dining' },
  { key: 'salesDelivery', label: 'Sales — Delivery' },
  { key: 'salesOnWay', label: 'Sales — On the Way' },
  { key: 'categorySales', label: 'Category Sales' },
  { key: 'categoryQty', label: 'Category Sales by Item Qty' },
]

const pkrFormatter = new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR',
  maximumFractionDigits: 0,
})

function titleize(key) {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
}

function isMoneyKey(key) {
  if (/count|id|number|phone|qty|quantity/i.test(key)) return false
  return /amount|balance|cash|discount|due|grand|paid|payment|price|profit|sale|subtotal|tax|total/i.test(key)
}

function isDateKey(key) {
  return /date|time|created|updated|at$/i.test(key)
}

function formatDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatValue(key, value) {
  if (value == null || value === '') return '-'
  if (isMoneyKey(key) && !Number.isNaN(Number(value))) return pkrFormatter.format(Number(value))
  if (isDateKey(key)) return formatDateTime(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

// Renders any JSON-ish value as readable rows, since exact report shapes
// aren't fully specified in the API docs.
function ReportOutput({ data, parentKey = '' }) {
  if (data == null) return null
  if (Array.isArray(data)) {
    return (
      <View>
        {data.map((row, idx) => (
          <View key={idx} style={styles.row}>
            <Text style={styles.rowTitle}>{titleize(parentKey || 'item')} #{idx + 1}</Text>
            <ReportOutput data={row} parentKey={parentKey} />
          </View>
        ))}
      </View>
    )
  }
  if (typeof data === 'object') {
    return (
      <View>
        {Object.entries(data).map(([key, value]) => (
          typeof value === 'object' && value !== null ? (
            <View key={key} style={styles.section}>
              <Text style={styles.sectionTitle}>{titleize(key)}</Text>
              <ReportOutput data={value} parentKey={key} />
            </View>
          ) : (
            <View key={key} style={styles.kvRow}>
              <Text style={styles.kvKey}>{titleize(key)}</Text>
              <Text style={styles.kvValue}>{formatValue(key, value)}</Text>
            </View>
          )
        ))}
      </View>
    )
  }
  return <Text style={styles.kvValue}>{formatValue(parentKey, data)}</Text>
}

export default function ReportsScreen() {
  const { token } = useAuth()
  const [activeKey, setActiveKey] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function runReport(key) {
    setActiveKey(key)
    setLoading(true)
    setError('')
    setResult(null)
    try {
      let data
      switch (key) {
        case 'quick':
          data = await getQuickReport(token)
          break
        case 'topTen':
          data = await getTopTenDeals(token)
          break
        case 'sales':
          data = await getSalesSummary(token, 'all')
          break
        case 'salesDining':
          data = await getSalesSummary(token, 'dining')
          break
        case 'salesDelivery':
          data = await getSalesSummary(token, 'delivery')
          break
        case 'salesOnWay':
          data = await getSalesSummary(token, 'onway')
          break
        case 'categorySales':
          data = await getCategorySales(token)
          break
        case 'categoryQty':
          data = await getCategorySalesByQuantity(token)
          break
        default:
          data = null
      }
      setResult(data)
    } catch (e) {
      setError(e.message || 'Could not load report')
    } finally {
      setLoading(false)
    }
  }

  function refreshReport() {
    if (activeKey && !loading) runReport(activeKey)
  }

  const activeReport = REPORTS.find((report) => report.key === activeKey)

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {REPORTS.map((r) => (
          <TouchableOpacity
            key={r.key}
            style={[styles.tab, activeKey === r.key && styles.tabActive]}
            onPress={() => runReport(r.key)}
          >
            <Text style={[styles.tabText, activeKey === r.key && styles.tabTextActive]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.toolbar}>
        <Text style={styles.toolbarTitle}>{activeReport?.label || 'Reports'}</Text>
        <TouchableOpacity
          style={[styles.refreshButton, (!activeKey || loading) && styles.refreshButtonDisabled]}
          onPress={refreshReport}
          disabled={!activeKey || loading}
        >
          <Text style={styles.refreshButtonText}>{loading ? 'Loading...' : 'Refresh'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.results} contentContainerStyle={{ padding: 16 }}>
        {loading && <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 30 }} />}
        {!!error && <Text style={styles.error}>{error}</Text>}
        {!loading && !error && !result && (
          <Text style={styles.placeholder}>Pick a report above to load it.</Text>
        )}
        {!!result && (
          <View style={styles.card}>
            <ReportOutput data={result} />
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 50 },
  tabs: { flexGrow: 0, paddingHorizontal: 16, marginBottom: 8 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.text, fontWeight: '600', fontSize: 12 },
  tabTextActive: { color: '#fff' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  toolbarTitle: { color: colors.text, fontWeight: '800', fontSize: 16, flex: 1, marginRight: 12 },
  refreshButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  refreshButtonDisabled: { opacity: 0.55 },
  refreshButtonText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  results: { flex: 1 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16 },
  row: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10, marginBottom: 10 },
  rowTitle: { color: colors.primary, fontSize: 12, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase' },
  section: { marginBottom: 12 },
  sectionTitle: { color: colors.text, fontWeight: '800', fontSize: 15, marginBottom: 8 },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  kvKey: { color: colors.textMuted, fontSize: 13, textTransform: 'capitalize', flex: 1 },
  kvValue: { color: colors.text, fontSize: 13, fontWeight: '600', flex: 1.35, textAlign: 'right' },
  placeholder: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  error: { color: colors.danger, textAlign: 'center', marginTop: 20 },
})
