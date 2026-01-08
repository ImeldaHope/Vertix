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
