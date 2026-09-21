import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Text } from 'react-native'
import { colors } from '../theme/colors'

import POSScreen from '../screens/pos/POSScreen'
import CartScreen from '../screens/pos/CartScreen'
import OrdersScreen from '../screens/orders/OrdersScreen'
import OrderDetailScreen from '../screens/orders/OrderDetailScreen'
import ReportsScreen from '../screens/reports/ReportsScreen'
import CustomersScreen from '../screens/customers/CustomersScreen'
import CustomerFormScreen from '../screens/customers/CustomerFormScreen'
import ProfileScreen from '../screens/ProfileScreen'
import ChangePasswordScreen from '../screens/ChangePasswordScreen'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

const stackScreenOptions = { headerShown: false }

function PosStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="POSHome" component={POSScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
    </Stack.Navigator>
  )
}

function OrdersStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="OrdersList" component={OrdersScreen} options={{ title: 'Orders' }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order Detail' }} />
    </Stack.Navigator>
  )
}

function CustomersStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="CustomersList" component={CustomersScreen} options={{ title: 'Customers' }} />
      <Stack.Screen name="CustomerForm" component={CustomerFormScreen} options={{ title: 'Customer' }} />
    </Stack.Navigator>
  )
}

function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} options={{ title: 'My Profile' }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change Password' }} />
    </Stack.Navigator>
  )
}

const ICONS = {
  POS: '🍽️',
  Orders: '🧾',
  Reports: '📊',
  Customers: '👥',
  Profile: '👤',
}

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: () => <Text style={{ fontSize: 18 }}>{ICONS[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="POS" component={PosStack} />
      <Tab.Screen name="Orders" component={OrdersStack} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Customers" component={CustomersStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  )
}
