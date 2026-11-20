# Courier auto-assign

A dispatcher's tool for one hub in Tashkent. The page shows a map of regions, orders and couriers. On it the dispatcher chooses each courier's regions, adds couriers and hands out orders. A Go server stores the data and checks every rule.

- **Backend:** Go 1.24+, standard library only (`net/http`, `encoding/json`). Data lives in memory and is reloaded from `data/` on every start.
- **Frontend:** React 19 + TypeScript (Vite), React Router 7, TanStack Query 5 (server data), React Hook Form + zod (add-courier form), Tailwind CSS v4, Leaflet with OpenStreetMap tiles.
- The task text is in [docs/TASK.md](docs/TASK.md).

## How to run

First copy the settings template once (the server and the page both read `.env` from the repository root):

```sh
cp .env.example .env
```

With Docker (one command, then open http://localhost:8080):

```sh
docker compose up --build
```

Without Docker, using two terminals (needs Go ≥ 1.24 and Node ≥ 20):

```sh
cd backend && go run ./cmd/server       # API on SERVER_ADDR (:8080), loads DATA_FILE and REGIONS_FILE
cd frontend && npm install && npm run dev # page on http://localhost:5173, /api goes to API_PROXY_TARGET
```

## Settings (.env)

All settings live in `.env` in the repository root; [.env.example](.env.example) is the committed template with every variable explained. `.env` itself is in `.gitignore`.

| Variable | Used by | Meaning |
| --- | --- | --- |
| `SERVER_ADDR` | Go server | listen address, e.g. `:8080` |
| `DATA_FILE`, `REGIONS_FILE` | Go server | seed files, relative to `backend/` |
| `STATIC_DIR` | Go server | optional folder with the built page to serve |
| `API_PROXY_TARGET` | Vite dev server | where `/api` is forwarded during `npm run dev` (not sent to the browser) |
| `VITE_TILE_URL`, `VITE_TILE_ATTRIBUTION`, `VITE_MAP_ZOOM` | page | map tiles and starting zoom |
| `APP_PORT` | docker compose | port on your machine |

Order of precedence for the server: command-line flag (`-addr`, `-data`, `-geo`, `-static`), then a real environment variable, then `.env`. A missing required setting stops the server or the page with a message that says which one. The Go server reads `.env` itself (no extra library); Vite reads it through `envDir`. Inside the Docker image the paths differ, so the Dockerfile sets the server variables; the page is built with your `.env` (or `.env.example` if there is none).

Tests:

```sh
cd backend && go test ./...
```

## Page addresses

Each view of the page has its own link, so it can be shared, reloaded or reached with the browser's back button:

| Address | What it shows |
| --- | --- |
| `/couriers` | courier panel (`/` and unknown addresses redirect here) |
| `/couriers/c1` | courier panel, with that courier's route drawn on the map |
| `/couriers/new` | the add-courier form; clicks on the map set the start point |
| `/orders` | order list |
| `/orders/o12` | order list with that order selected, ready to assign |

The Go server sends the page for any address that is not a file or `/api/...`, so these links also work after a reload in the Docker build.

## API

Every error response is JSON: `{"code": "...", "error": "plain sentence"}`. A form error also carries `"fields": {"max_kg": "..."}`.

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| GET | `/api/state` | | hub, regions, couriers (with load, route, better route, orders outside their regions), orders, and orders that cannot be assigned with the reason |
| GET | `/api/regions.geojson` | | region shapes |
| POST | `/api/couriers` | `{name, kinds, max_parcels, max_kg, start:{lat,lng}, active?, regions?}` | 201, or 400 with `fields` |
| PUT | `/api/couriers/{id}/regions` | `{regions: [...]}` | replaces the courier's regions |
| PUT | `/api/orders/{id}/courier` | `{courier_id}` | assigns the order, or moves it if another courier holds it |
| DELETE | `/api/orders/{id}/courier` | | takes the order off its courier |
| POST | `/api/auto-assign` | | `{assigned: [...], unplaced: [{order_id, reason}]}` |

Status codes: 400 for an unusable request (bad JSON, wrong types, unknown fields, failed checks), 404 for an unknown order or courier, 409 for a rule refusal.

Try it with curl:

```sh
curl -X PUT localhost:8080/api/orders/o12/courier -d '{"courier_id":"c5"}'
# 409 {"code":"wrong_region","error":"Kamola does not work in Bektemir"}
```

## Rules the server enforces

All rules live in [backend/internal/domain/rules.go](backend/internal/domain/rules.go) (`CanTake`). They are checked in this order, and the first rule that fails gives the message:

1. The order is not broken: `Order o15 cannot be assigned: Order type "return" is not supported: only pickups and deliveries can be assigned`
2. The courier is active: `Sardor is not active today`
3. The courier does that kind of work: `Dilnoza does not do deliveries`
4. The courier works in the order's region: `Kamola does not work in Bektemir`
5. Parcel room is left, with pickups and deliveries counted together: `Kamola has no room: already 3 of 3 parcels today`
6. Weight room is left: `Kamola cannot carry 6 kg more: already 12 of 15 kg today`

The use case layer ([usecase/dispatcher.go](backend/internal/usecase/dispatcher.go)) holds one lock around each change, so a check and the change it allows happen as one step.

## The seed data

These orders are broken. They are shown on the map with a red dashed "!" pin and in the panel with their reason, and they can never be assigned:

| Order | Problem |
| --- | --- |
| o08 | weight is 0 kg |
| o15 | type `"return"` is not pickup or delivery |
| o16 | region `"Olmazor"` is not in the region list (the point falls inside Chilonzor's shape, but I do not guess) |
| o20 | `lat` is `null`, so there is no pin; the order appears only in the lists |
| o03 (second one) | duplicate id. The first `o03` is kept. The second gets the internal id `o03-2` and is marked broken, because its data differs slightly and nobody can tell which copy is right |

These orders are valid, but no courier can take them right now. They are listed under "Orders that cannot be assigned", and the reason is worked out again on every request, so it changes when couriers or regions change:

| Order | Reason |
| --- | --- |
| o07 | No courier in Yashnobod does pickups (Bekzod does deliveries only) |
| o10 | 45 kg is more than any suitable courier can carry in a day (Aziz's limit is 40 kg) |
| o12 | No courier works in Bektemir |

Other things in the data:

- **o06** has region `" chilonzor "`. I read it as **Chilonzor**, ignoring case and extra spaces, and the order shows a note saying so. The intent is clear and the point lies inside Chilonzor, so refusing the order would only create work for the dispatcher. This is the one place where I fix up input instead of refusing it.
- **o23** was created at 08:00 but sits near the end of the file. Nothing breaks: auto-assign handles orders oldest first, so it goes first.
- **Jasur** (c6) has no regions, so can take nothing until the dispatcher adds some. **Sardor** (c4) is inactive.

## Decisions and assumptions

- **One endpoint for assigning and moving.** `PUT /orders/{id}/courier` assigns a free order, or moves an assigned order in one step. If the new courier is refused, the order stays with the old one. Assigning to the courier who already has the order is refused as `already_assigned`.
- **The route** is the courier's start point, then their pickups in the order given, then the hub, then their deliveries in the order given. A courier with only deliveries goes start → hub → deliveries. A courier with only pickups ends at the hub. A courier with no orders has no route (0 km). "Order given" means the time of assignment, so a moved order goes to the end of its new courier's list.
- **Km** are straight-line (haversine) distances. Each leg is rounded to 0.01 km, and the total is the sum of the rounded legs, so the numbers on screen add up.
- **Region change** replaces the whole list. Orders the courier already holds stay with them. Those outside the new regions get an orange ring on the map and an "outside" tag in the panel and lists. New orders in a dropped region are refused.
- **New courier checks** (the same in the page and on the server, in [courier_draft.go](backend/internal/domain/courier_draft.go) and [courierForm.ts](frontend/src/domain/courierForm.ts)):
  - Name is required, at most 50 characters, and must not match an existing name ignoring case. Refusal messages use names, so two Kamolas would make "Kamola does not work in Bektemir" ambiguous.
  - At least one kind of work.
  - `max_parcels` is a whole number from 1 to 100.
  - `max_kg` is more than 0 and at most 500.
  - The start point is within lat 41.0–41.6 and lng 69.0–69.6 (around Tashkent).
  - Regions are optional when adding. The page asks for them on the map right after saving.
  - Unknown JSON fields and wrong types (for example `"max_parcels": 2.5` or `"max_kg": "10"`) are refused with a field message.
- **Weights** use a 1e-9 tolerance, so 12.1 + 2.9 kg fits a 15 kg limit despite float rounding.
- **Courier colours** come from a fixed palette by the courier's position in the list.
- Couriers cannot be edited (except regions), deactivated or deleted, and orders cannot be created. The task does not ask for this.

## Bonus parts

- **Auto-assign** (button at the top right). It takes every free, valid order, oldest first, and gives it to the allowed courier for whom it is **nearest**. Orders already assigned are not touched. Orders it cannot place are listed with the reason: either the permanent reason (region, kind, inactive, weight) or "Every courier allowed to take it is full: …" with each courier's limit.
  - **How "nearest" is chosen:** the courier whose route grows the least, in km, when the order is added at the end of their pickups or deliveries. I picked this over "closest start point" because it accounts for where the courier already has to go, including the trip to the hub. For a courier with no orders it is roughly start → order → hub. Ties go to the courier who comes first in the list.
  - It is greedy and does not look ahead: an early order may take the last free space that a later order needed more.
- **Reassign:** in the order box, choose another courier and press "Move", or press "Take off".
- **Better routes:** each courier card shows the km in the given order and in a shorter order. A checkbox switches the stop list and the map line to the shorter order. Pickups stay before the hub and deliveries after it. Each part is solved exactly by trying every order when it has 7 stops or fewer, and otherwise by nearest neighbour followed by 2-opt. The shorter order is only shown, never saved: the rule says the route follows the order given.
- **Docker:** `docker compose up --build` builds the page and the server into one image.

## What I skipped and why

- **A database:** the task allows memory, and losing changes on restart is fine.
- **Logins and roles:** not asked for.
- **Frontend tests:** the rules that matter run on the server, and the server has the tests. I checked the page by driving it in a headless browser: refusing o12 for Kamola, a region click on the map, the add-courier form with bad and good input, and auto-assign.
- **Checking that an order's point lies inside its region's shape:** the shapes are described as rough, so a mismatch would not prove the data is wrong. I ran the check once by hand, and every order with a known region lies inside its own shape.
- **The Docker build was not run on my machine** (Docker is not installed here). The Dockerfile is a plain multi-stage build.

## Tests

`cd backend && go test ./...`

- [domain/rules_test.go](backend/internal/domain/rules_test.go): each refusal (broken order, inactive courier, wrong kind, wrong region, parcel limit, weight limit), shared limit for pickups and deliveries, edge cases at the limit, the "nobody can take it" reasons, and how the nearest courier is chosen.
- [domain/courier_draft_test.go](backend/internal/domain/courier_draft_test.go): every way a new courier is refused.
- [domain/route_test.go](backend/internal/domain/route_test.go): stop order, assignment order, leg sums, empty route, and a shorter order that is never worse.
- [usecase/dispatcher_test.go](backend/internal/usecase/dispatcher_test.go): on the real seed data, broken orders never assignable, a region change keeps orders and marks them, unknown regions refused, a refused courier is not stored, a move refused or done, and auto-assign respects every rule and keeps hand assignments.
- [seed/seed_test.go](backend/internal/seed/seed_test.go): every broken seed order is found with its reason.
- [repository/memory/memory_test.go](backend/internal/repository/memory/memory_test.go): stored data cannot be changed from outside; ids and sequence numbers.
- [transport/httpapi/api_test.go](backend/internal/transport/httpapi/api_test.go): requests sent by hand over HTTP, including bad JSON, wrong types, unknown fields and unknown ids, with status codes and messages.
- [config/config_test.go](backend/internal/config/config_test.go): reading `.env`, and flags winning over it.

## Architecture

### Backend: clean architecture

Dependencies point inwards only. The business rules know nothing about HTTP, JSON or storage, so each layer can be read, tested and replaced on its own.

```
          transport/httpapi  ──►  usecase  ──►  domain
 cmd/server ─┤                      ▲
          repository/memory ────────┘ (implements usecase.Repository)
          seed            ─────────────────►  domain
```

```
backend/
  cmd/server/main.go        composition root: config → seed → repository → use cases → HTTP
  internal/
    domain/                 entities and rules, no I/O and no JSON
      courier.go, order.go, kind.go, city.go, geo.go, load.go
      rules.go              CanTake (every assignment rule), WhyNobodyCanTake
      route.go              route in the order given; route_optimize.go the shorter order
      nearest.go            how auto-assign picks the nearest courier
      courier_draft.go      checks for a new courier
      errors.go             Refusal (rule broken) and ValidationError (bad input)
    usecase/                what the dispatcher can do; one lock makes check + change atomic
      ports.go              Repository interface the use cases need
      assign.go, couriers.go, auto_assign.go, overview.go
    repository/memory/      in-memory Repository (returns copies)
    seed/                   reads data.json / regions.geojson, marks broken orders
    transport/httpapi/      router, handlers, request/response DTOs, error → status mapping
    config/                 settings from .env, environment and flags
```

### Frontend: layers and features

```
frontend/src/
  main.tsx                  entry: router + App
  app/                      App (loading), Dashboard (layout), Header, SideTabs,
                            SidePanelRoutes, routes.ts (addresses), useAppRoute (address → selection)
  api/                      client.ts (fetch + ApiError), dispatchApi.ts (endpoints), types.ts (JSON shapes)
  config/env.ts             VITE_* settings from .env
  domain/                   pure logic, no React: formatting, form checks, rule hints, colours
  hooks/                    shared: useDispatchState (TanStack Query), useStateMutation (change + reload), useToast
  features/                 one folder per part of the page, one component per file
    map/                    MapView, RegionsLayer, OrderMarker, MapClickCatcher, Legend, mapStyles.ts
    regions/                RegionEditor, RegionChip, useRegionEditor
    couriers/               CourierPanel, CourierCard, LoadMeter, RouteStops, StopLabel, RouteTotal, UnassignableList
    orders/                 OrdersPanel, OrderFilters, OrderRow, OrderStatus, AssignBox, OrderDetails,
                            CourierPicker, useOrderActions
    add-courier/            AddCourierForm, useCourierForm (React Hook Form + zod schema from domain/courierForm.ts)
    auto-assign/            AutoAssignReport, useAutoAssign
  shared/ui/                Button, Card, CardHeader, Tag, Alert, Toast, Swatch, Checkbox, FormField, styles.ts
data/                       data.json, regions.geojson (seed)
```

Imports use the `@/` alias for `src/`. Components only draw; state and server calls live in hooks; rules and formatting live in `domain/`. Server data is read with TanStack Query; every change is a mutation that reloads the state, so no component passes a refresh function around. A hook used by one feature lives in that feature; `hooks/` holds only shared ones.

## Time and AI use

- **Time:** _fill in_.
- **AI:** I built this with Claude Code (an AI coding assistant). It read the task, wrote the backend, tests, frontend and this README, and checked the page in a headless browser. I reviewed the decisions above and the commits.
