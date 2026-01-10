# Vertix

Vertix — portrait-mode short-video app (Expo + TypeScript)

Quick start

Install dependencies:

```bash
npm install
# or
yarn
```

Run in development:

```bash
npx expo start
```

EAS builds:

```bash
eas build --platform ios
eas build --platform android
```

What I scaffolded:
- Basic Expo + TypeScript project files
- `src` folder with a minimal `Feed` screen and `VideoPlayer` using `expo-av`

Next steps I can implement:
- Full feed preloading, FlashList integration
- Auth flows and secure token storage
- Server reward endpoints and DRM license server

Native ad SDKs

Native Ad SDK integration (AdMob / AppLovin)

- This project includes a dynamic adapter at `src/services/nativeAdAdapter.ts` which will try to use `react-native-google-mobile-ads` and `react-native-applovin-max` when present, falling back to the simulated flow during development.
- To enable real native SDKs you must build a custom development client or bare workflow with EAS and install the native dependencies. Example steps:

1. Install native SDK packages

```bash
npm install react-native-google-mobile-ads react-native-applovin-max
```

2. Configure app.json / native manifests

- iOS: add `GADApplicationIdentifier` in Info.plist (via config plugin or `expo.ios.infoPlist`).
- Android: add AdMob App ID to `AndroidManifest.xml`.

3. Build with EAS (required to include native modules)

```bash
eas build --profile development --platform ios
eas build --profile development --platform android
```

4. Use the `RewardedAdButton` component to show rewarded ads; the adapter will prefer the native SDK path if present.

I can scaffold the exact `app.json` changes and EAS config for AdMob/AppLovin if you want — tell me which provider(s) to prioritize and I will add the necessary config plugin entries and sample manifest edits.
