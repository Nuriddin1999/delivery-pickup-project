# Courier mobile app

A React Native app built with [Expo](https://expo.dev) and TypeScript. The courier picks their name, sees today's stops in route order and marks each one done. The server checks the rules (see the root README, "Stop rules"). It is the starting point for the courier phone app (the second part of [docs/TASK2.md](../docs/TASK2.md)).

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
- **A courier chosen:** "You are {name}" and today's stops in route order: pickups, a "Hub" line, deliveries, numbered like on the dispatcher's map. The header counts them ("Today's stops: 1 of 5 done"). "Show all orders" goes back to everyone.
- **Marking a stop done:** only the next stop is highlighted and has a "Done" button. It asks "Stop 2 done?" first. A done stop gets a green check and the time. If the server refuses (for example the screen was out of date), its message is shown and the list reloads.
- **Stays up to date:** while the app is open it asks the server every 5 seconds, so an order the dispatcher gives out or takes off shows up on the phone within seconds, with no reload. In the background it stops asking and catches up as soon as the app is opened again. Pull down on the list to load at once.
- The first load shows "Loading..."; if it fails, the error and "Try again". If a later load fails, the list stays and a yellow note says there is no connection; it goes away when the server answers again.

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
- `src/StopList.tsx`: today's stops of the chosen courier, with the Done button on the next one
- `src/OrderRow.tsx`: one order in the list
- `src/useDispatchState.ts`: loads couriers and orders and keeps them fresh (every 5 s, on return to the app, on pull down)
- `src/Select.tsx`: the select: field, list of the same width under it, check next to the chosen one
- `src/api.ts`: the server address, the request for couriers, orders and routes, marking a stop done
- `index.ts`: registers the app
- `app.json`: app name, icons, orientation
- `assets/`: icons and splash image
- `AGENTS.md`: notes from the Expo template for AI coding assistants
