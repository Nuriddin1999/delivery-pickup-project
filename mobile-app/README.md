# Courier mobile app

A React Native app built with [Expo](https://expo.dev) and TypeScript. For now it shows one screen: the courier picks their name, and below it the orders are listed. It is the starting point for the courier phone app (the second part of [docs/TASK2.md](../docs/TASK2.md)).

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

You should see "Loading...", then "Please select yourself:" with a list of couriers and, under it, the orders.

## What the screen shows

- **Nobody chosen:** all orders. Each row shows the order id, Pickup or Delivery, the region, the weight, and on the right the courier who holds it, or "Free".
- **A courier chosen:** "You are {name}" and only that courier's orders, in the order of their route (Stop 1, Stop 2, ...). The route order comes from the server and is often not the order of the order ids. "Show all orders" goes back to everyone.
- **Pull down** on the list to load fresh data. The first load shows "Loading..."; a failed one shows the error and "Try again".

## The server

The app loads couriers and orders from the Go server in one request (`GET /api/state`), so start it first:

```sh
cd backend
go run ./cmd/server
```

The app looks for the server on port 8080 of the computer that runs `npx expo start`. The phone already reaches that computer to load the app, so this works for the emulator and for a phone on the same Wi-Fi. To use another address, set it before starting:

```sh
EXPO_PUBLIC_API_URL=http://192.168.1.10:8080 npx expo start
```

If the phone shows "Could not load data", check that the server is running and that Windows Firewall lets port 8080 through.

## Checks

```sh
npx tsc --noEmit   # typecheck
npx expo-doctor    # dependency and config checks
```

## Files

- `App.tsx`: the screen (loading, error with "Try again", courier select, order list)
- `src/OrderRow.tsx`: one order in the list
- `src/Select.tsx`: the select: field, list of the same width under it, check next to the chosen one
- `src/api.ts`: the server address, the request for couriers and orders, a courier's orders in route order
- `index.ts`: registers the app
- `app.json`: app name, icons, orientation
- `assets/`: icons and splash image
- `AGENTS.md`: notes from the Expo template for AI coding assistants
