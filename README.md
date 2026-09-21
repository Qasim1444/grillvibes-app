# GrillVibes POS (React Native / Expo)

A cashier-facing Point of Sale app built against the **GrillVibes Mobile POS API + React Native
Build Guide**, matching the web `/pos` screen's workflow:

- Login + forgot/reset password (email + one-time code)
- POS screen: category tabs, search, menu grid, running cart
- Checkout: order type, table/place, customer (with inline "add new customer"), status, paid
  toggle, manual discount (amount or %), service charge (%), live totals
- Orders: list (pull-to-refresh), detail, regenerate/resend receipt, delete
- Reports: quick report, top 10 deals, sales summary (all/dining/delivery/on-the-way), category
  sales
- Customers: list with search, add/edit/delete
- My Profile: update name/phone/address, change password, logout

## 1. Set your API URL

Open `src/api/client.js`:

```js
const BASE_URL = 'http://127.0.0.1:8000/api'
```

- **Physical phone in Expo Go**: use your computer's LAN IP, e.g. `http://192.168.1.20:8000/api`
  (phone and computer must be on the same Wi-Fi).
- **Android emulator**: use `http://10.0.2.2:8000/api`.
- **Production / a real APK**: your real domain, e.g. `https://infinicodesystem.site/api`
  (must be internet-reachable — a phone running the built APK can't reach `127.0.0.1`).

## 2. Install and run

```bash
cd grillvibes-app
npm install
npx expo start
```

Scan the QR code with the **Expo Go** app, or run `npx expo start --web` to try it in a browser.

## 3. Build a real APK (free, no Android Studio)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview
```

`eas.json` is set to produce a plain `.apk` you can download and sideload directly.

## App structure

```
AuthStack (logged out)
  Login → ForgotPassword → ResetPassword (OTP)

AppTabs (logged in)
  POS        → POSHome (category tabs, search, grid) → Cart (checkout)
  Orders     → OrdersList (pull-to-refresh) → OrderDetail (receipt, delete)
  Reports    → tabs for each daily-summary / category-sales endpoint
  Customers  → CustomersList (search) → CustomerForm (add/edit/delete)
  Profile    → ProfileHome (update-profile) → ChangePassword
```

## Project files

```
src/api/client.js       shared fetch helper — set BASE_URL here
src/api/auth.js         login / logged-user / logout / update-profile / change-password /
                         forgot-password / reset-password
src/api/customers.js    customers CRUD
src/api/menu.js         food-categories, food-items
src/api/places.js       places
src/api/orders.js       createOrder / listOrders / getOrder / deleteOrder / getReceipt +
                         calculateTotals() (subtotal → discount → service charge → grand total,
                         matching the doc's exact formulas) + buildOrderPayload()
src/api/reports.js      daily-summary + category-sales endpoints, with optional date range
src/context/AuthContext.js   session state: signIn / signOut / updateProfile / changePassword
src/navigation/AppNavigator.js   top-level: Auth stack vs App tabs
src/navigation/AppTabs.js        bottom tabs, each with its own stack
src/screens/pos/POSScreen.js      category tabs, search, item grid, running cart bar
src/screens/pos/CartScreen.js     full checkout: type/place/customer/status/paid/discount/
                                   service charge, live totals, place/customer picker modals
src/screens/orders/OrdersScreen.js, OrderDetailScreen.js
src/screens/reports/ReportsScreen.js
src/screens/customers/CustomersScreen.js, CustomerFormScreen.js
src/screens/ProfileScreen.js, ChangePasswordScreen.js
src/screens/LoginScreen.js, ForgotPasswordScreen.js, ResetPasswordScreen.js
```

## Notes on scope and assumptions

- **JavaScript, not TypeScript.** The doc's checklist suggests TypeScript; this app is plain JS to
  match what was already built. Say the word if you'd like it converted.
- **Customer search**: the doc lists `GET /api/customers/search` as a *suggested future endpoint*,
  not yet live on the backend. The Customers tab and the in-cart customer picker instead load all
  customers once and filter client-side, per the doc's own fallback guidance.
- **Reports screen** renders whatever fields each report endpoint returns as generic label/value
  rows, since the docs don't give exact response shapes for the daily-summary and category-sales
  endpoints. Once you share a real example response, I can build a proper formatted view (tables,
  charts) for it.
- **Not included** (all explicitly called out in the docs as "add later" / backend-not-ready):
  KDS station selection, promo code quotes, loyalty point redemption, discount campaigns, and the
  `/api/pos/bootstrap` combined endpoint. The app currently loads categories/items/places/customers
  as four separate calls, which the doc says is fine for the first version.
- **`PUT /api/orders/{id}`** (editing an already-placed order) isn't wired up — the Orders screen
  only lists, views, and deletes, matching the doc's "Orders Screen" section. Say so if you want
  order editing added too.
- **User/staff management** (`/api/users`) and **Settings/branding** (`/api/settings`) exist in the
  route list but aren't part of this app yet — typically admin-only tools rather than a cashier's
  daily workflow. Let me know if you want them added as another tab.
