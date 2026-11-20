// Every page address in one place, so links and routes cannot drift apart.

export const paths = {
  couriers: "/couriers",
  courier: (id: string) => `/couriers/${encodeURIComponent(id)}`,
  newCourier: "/couriers/new",
  orders: "/orders",
  order: (id: string) => `/orders/${encodeURIComponent(id)}`,
};

/** Route patterns for <Route path> and useMatch. */
export const patterns = {
  couriers: "/couriers",
  courier: "/couriers/:courierId",
  newCourier: "/couriers/new",
  orders: "/orders",
  order: "/orders/:orderId",
};
