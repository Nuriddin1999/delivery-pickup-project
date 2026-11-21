# Courier mobile app

A React Native app built with [Expo](https://expo.dev) and TypeScript. For now it only shows "Hello world". It is the starting point for the courier phone app (the second part of [docs/TASK2.md](../docs/TASK2.md)).

## How to run

You need Node 20 or newer.

```sh
cd mobile-app
npm install
npx expo start
```

`npx expo start` prints a QR code. Then open the app in one of these ways:

- **On a phone:** install **Expo Go** from Google Play or the App Store, then scan the QR code. On iPhone, use the Camera app to scan it. The phone and the computer must be on the same Wi-Fi.
- **In the Android emulator:** press `a` in the terminal. This needs Android Studio with an emulator running.
- **In a browser:** press `w`. This needs the web packages: `npx expo install react-dom react-native-web`.

You should see "Hello world" in the middle of the screen.

## Checks

```sh
npx tsc --noEmit   # typecheck
npx expo-doctor    # dependency and config checks
```

## Files

- `App.tsx`: the screen
- `index.ts`: registers the app
- `app.json`: app name, icons, orientation
- `assets/`: icons and splash image
- `AGENTS.md`: notes from the Expo template for AI coding assistants
