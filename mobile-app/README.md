# E Vision Customer Mobile App

React Native app in a separate folder using Expo + React Navigation.

## Implemented

- OTP login screen (customer/dealer/electrician flow via backend `/auth/send-otp` + `/auth/verify-otp`)
- Home/Browse products
- Product detail
- Cart grouped by shop
- Checkout
- Razorpay payment handoff
- My Orders (group view)
- Order detail (sub-orders, tracking, invoice link if available)
- Profile (basic account info + FCM token preview)
- Axios API client targeting NestJS backend
- Firebase FCM integration scaffold for Android + iOS

## Configure backend URL

1. Copy `.env.example` to `.env`
2. Set:

```bash
EXPO_PUBLIC_API_URL=http://<your-machine-ip>:8000
```

Use machine IP (not `localhost`) when running on a physical device.

## Firebase FCM setup (iOS + Android)

1. Create Firebase project and add Android + iOS apps.
2. Download files and place in this folder:
   - `google-services.json`
   - `GoogleService-Info.plist`
3. Confirm paths in `app.json`:
   - `expo.android.googleServicesFile`
   - `expo.ios.googleServicesFile`
4. Generate native folders:

```bash
npx expo prebuild
```

5. Run app:

```bash
npm run android
npm run ios
```

## Razorpay notes

- `react-native-razorpay` requires native build (Expo Go is not enough).
- Use Android/iOS build after `expo prebuild`.

## Scripts

- `npm run start`
- `npm run android`
- `npm run ios`
- `npm run web`
