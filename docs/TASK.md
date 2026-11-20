# Test task: courier auto-assign

## The story

You are building the piece of a delivery company that decides which courier takes which order today. Time budget: 2 working days.

The company has one **hub** (a warehouse) in Tashkent. Every parcel passes through it, so there are two kinds of order:

- **Pickup**: a courier drives to a seller, collects the parcel and brings it to the hub.
- **Delivery**: a courier takes a parcel from the hub to the buyer.

The city is split into **regions** (districts). Each courier works only in the regions a dispatcher has chosen for them, and only on the kinds of order they are set up for: some couriers do pickups only, some deliveries only, some both. A courier can also carry only so much in one day.

You build the dispatcher's tool: a page with a map where they choose each courier's regions, add couriers and hand out orders, and the backend that checks every rule.

## What to build

A backend and a web page for the dispatcher. Both are required.

**The page**

1. **Map.** Show the regions as shapes with their names, the hub, and every order as a pin. Pickups and deliveries look different. An order that has a courier takes that courier's colour.
2. **Choose a courier's regions on the map.** Pick a courier from a select and their regions light up. Clicking a region adds or removes it. Save stores the change on the server.
3. **Add a courier.** A form with name, kinds of work, `max_parcels`, `max_kg` and a start point, set by clicking the map or typing coordinates. Check the fields in the page and again on the server.
4. **Assign an order by hand.** Pick an order on the map or in a list, then pick a courier. If the server refuses, say why in plain words, for example "Kamola does not work in Bektemir".
5. **Courier panel.** For each courier: kinds, regions, load used against the limits, the stops in route order with km per leg, and the total km. Orders that can never be assigned are listed separately with their reason.

**The server** stores couriers and orders and enforces every rule. Checks in the page are only for comfort: a request sent by hand must be refused too.

Use any language. Go for the backend and React for the page is a plus, since that is what we use, but it is not required. Keeping data in memory or in SQLite is fine, and losing changes on restart is fine. For the map use Leaflet with OpenStreetMap tiles: no key or paid API is needed.

## Rules

- A courier can take an order only when they are active, do that kind of work (pickup or delivery), work in the order's region, and still have room. Each courier has a daily limit of parcels and of kilograms, and pickups and deliveries count towards the same limit.
- When an assignment breaks a rule, the server refuses it and the page says why.
- Some orders in the seed data are broken on purpose. Find them, show them with the reason, and never let them be assigned.
- Changing a courier's regions does not take away orders they already hold. Mark the ones that are now outside their regions.
- A courier's route is their pickups, then the hub, then their deliveries, each in the order they were given. Show the straight-line km for each leg and the total.

If something is unclear, decide, write the decision in your README and keep going.

## Seed data

Two files come with this task. Load them on start.

- `data.json`: the hub, the regions, the couriers and today's orders. No order has a courier yet.
- `regions.geojson`: rough region shapes for the map, not the real district borders.

You design the API between the page and the server yourself.

## Bonus

Only once the required parts work. One done well beats three half done.

- **Auto-assign.** One button gives every free order to the nearest courier who is allowed to take it, keeps hand assignments as they are, and lists the orders it could not place with the reason. Explain in your README how you chose "nearest".
- **Reassign.** Move an order to another courier in one step, or take it off a courier. If the new courier is not allowed, the order stays where it was.
- **Better routes.** Reorder each courier's stops to cut the total km, and show the km before and after.
- **Docker.** One command starts everything.

## Hand-in and scoring

Send a link to a git repo. It must contain:

- **README**: how to run it in under five commands, every assumption you made, what you skipped and why, how long it took, and how you used AI tools, if at all
- **Tests** for the server rules: every way an assignment can be refused, a region change, and a refused new courier
- **Commit history** as you worked. One commit at the end loses points

We then run it, try to break it from the page and with curl, and talk with you for 30 minutes about one decision you made.

| What we check | Points |
| --- | --- |
| Hand assignment: the server enforces every rule, and the page explains refusals in plain words | 25 |
| Choosing regions on the map works and is saved | 20 |
| Add courier: checked in the page and on the server | 15 |
| Courier panel: load, stops and km are right | 10 |
| Broken orders shown with their reason; nothing crashes on them | 10 |
| Tests, README and commits | 10 |
| Code is easy to read and change | 10 |
| Bonus: auto-assign +10, reassign +5, anything else +5 | up to +20 |
