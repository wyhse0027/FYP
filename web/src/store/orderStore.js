// Lightweight order store using localStorage
export const ORDER_TABS = {
  TO_BUY: 'TO_BUY',
  TO_SHIP: 'TO_SHIP',
  TO_RECEIVE: 'TO_RECEIVE',
  TO_RATE: 'TO_RATE',
  HISTORY: 'HISTORY',
};

export const PAYMENT_METHODS = {
  CARD: 'card',       // fake online
  FPX: 'fpx',         // fake online
  EWALLET: 'ewallet', // fake online
  COD: 'cod',
};

export const PAYMENT_STATUS = {
  UNPAID: 'UNPAID',
  PAID: 'PAID',
  COD_PENDING: 'COD_PENDING',
};

const LS_KEY = 'orders_v1';

const nowISO = () => new Date().toISOString();
const pad = (n) => String(n).padStart(2, '0');
const genOrderId = (user = 'USR') => {
  const d = new Date();
  return `${user}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${d.getFullYear()}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

// ---- storage helpers -------------------------------------------------------
export const getOrders = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
  catch { return []; }
};

// Backward-compat alias (prevents "getAllOrders is not defined")
export const getAllOrders = getOrders;

const setOrders = (orders) => {
  // keep only the most recent 100
  localStorage.setItem(LS_KEY, JSON.stringify(orders.slice(0, 100)));
};

const pushTimeline = (order, event, note) => {
  order.timeline = order.timeline || [];
  order.timeline.unshift({ at: nowISO(), event, note });
};

export const addOrder = (order) => {
  const orders = getOrders();
  orders.unshift(order);
  setOrders(orders);
};

export const updateOrder = (id, updater) => {
  const orders = getOrders();
  const i = orders.findIndex(o => o.id === id);
  if (i === -1) return null;

  const draft = { ...orders[i] };
  const updated = typeof updater === 'function' ? updater(draft) : { ...draft, ...updater };

  orders[i] = updated;
  setOrders(orders);
  return updated;
};

export const byStatus = (status) => getOrders().filter(o => o.status === status);

// ---- totals helpers ---------------------------------------------------------
export const calcSubtotal = (items) =>
  items.reduce((s, it) => s + Number(it.price) * Number(it.qty), 0);

export const shippingFor = (subtotal) => (subtotal >= 300 ? 0 : 10);
export const discountFor = () => 0;

// ---- create order from cart/draft ------------------------------------------
export const createOrderFromDraft = ({
  userCode = 'USR', items = [], address, paymentMethod,
}) => {
  const orderItems = items.map(it => ({
    productId: it.productId ?? it.id,
    name: it.name,
    price: Number(it.price),
    qty: Number(it.qty || it.quantity || 1),
  }));

  const subtotal = calcSubtotal(orderItems);
  const shippingFee = shippingFor(subtotal);
  const discount = discountFor(orderItems);
  const total = subtotal + shippingFee - discount;

  const id = genOrderId(userCode);
  const base = {
    id,
    createdAt: nowISO(),
    items: orderItems,
    subtotal, shippingFee, discount, total,
    address,
    paymentMethod,
    paymentStatus: PAYMENT_STATUS.UNPAID,
    status: ORDER_TABS.TO_BUY,
    timeline: [],
  };

  if (paymentMethod === PAYMENT_METHODS.COD) {
    base.paymentStatus = PAYMENT_STATUS.COD_PENDING;
    base.status = ORDER_TABS.TO_SHIP;
  }

  pushTimeline(base, 'ORDER_CREATED');
  addOrder(base);
  return base;
};

// ---- state transitions ------------------------------------------------------
export const payOrder = (id) => updateOrder(id, (o) => {
  if (o.status !== ORDER_TABS.TO_BUY) return o;
  o.paymentStatus = PAYMENT_STATUS.PAID;
  o.status = ORDER_TABS.TO_SHIP;
  pushTimeline(o, 'PAYMENT_SUCCESS');
  return o;
});

export const cancelOrder = (id) => updateOrder(id, (o) => {
  const can =
    o.status === ORDER_TABS.TO_BUY ||
    (o.status === ORDER_TABS.TO_SHIP && o.paymentMethod === PAYMENT_METHODS.COD);
  if (!can) return o;
  o.status = ORDER_TABS.HISTORY;
  pushTimeline(o, 'ORDER_CANCELLED');
  return o;
});

export const markShipped = (id) => updateOrder(id, (o) => {
  if (o.status !== ORDER_TABS.TO_SHIP) return o;
  o.status = ORDER_TABS.TO_RECEIVE;
  pushTimeline(o, 'ORDER_SHIPPED');
  return o;
});

export const confirmDelivered = (id) => updateOrder(id, (o) => {
  if (o.status !== ORDER_TABS.TO_RECEIVE) return o;
  o.status = ORDER_TABS.TO_RATE;
  pushTimeline(o, 'ORDER_DELIVERED');
  return o;
});

export const finishRating = (id) => updateOrder(id, (o) => {
  if (o.status !== ORDER_TABS.TO_RATE) return o;
  o.status = ORDER_TABS.HISTORY;
  pushTimeline(o, 'REVIEW_SUBMITTED');
  return o;
});

// ---- utils ------------------------------------------------------------------
export const formatMYR = (n) => `RM ${Number(n).toFixed(2)}`;

export function getOrderById(id) {
  return getOrders().find(o => o.id === id);
}
