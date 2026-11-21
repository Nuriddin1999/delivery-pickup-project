# Courier mobile app

A React Native app built with [Expo](https://expo.dev) and TypeScript. For now it shows one screen where the courier picks their name from a list loaded from the server. It is the starting point for the courier phone app (the second part of [docs/TASK2.md](../docs/TASK2.md)).

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

You should see "Loading...", then "Please select yourself:" with a list of couriers.

## The server

The app loads the couriers from the Go server (`GET /api/state`), so start it first:

```sh
cd backend
go run ./cmd/server
```

The app looks for the server on port 8080 of the computer that runs `npx expo start`. The phone already reaches that computer to load the app, so this works for the emulator and for a phone on the same Wi-Fi. To use another address, set it before starting:

```sh
EXPO_PUBLIC_API_URL=http://192.168.1.10:8080 npx expo start
```

If the phone shows "Could not load couriers", check that the server is running and that Windows Firewall lets port 8080 through.

## Checks

```sh
npx tsc --noEmit   # typecheck
npx expo-doctor    # dependency and config checks
```

## Files

- `App.tsx`: the screen (loading, error with "Try again", courier list)
- `src/api.ts`: the server address and the request for couriers
- `index.ts`: registers the app
- `app.json`: app name, icons, orientation
- `assets/`: icons and splash image
- `AGENTS.md`: notes from the Expo template for AI coding assistants
