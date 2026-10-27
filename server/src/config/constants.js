/** Domain enums shared across models, services and validation schemas. */

export const ROLES = Object.freeze({ CUSTOMER: 'customer', ADMIN: 'admin' });

export const INGREDIENT_CATEGORIES = Object.freeze({
  BASE: 'base',
  SAUCE: 'sauce',
  CHEESE: 'cheese',
  VEGETABLE: 'vegetable',
});

export const INGREDIENT_CATEGORY_VALUES = Object.values(INGREDIENT_CATEGORIES);

export const UNITS = Object.freeze({
  PIECE: 'piece',
  GRAM: 'g',
  ML: 'ml',
  PORTION: 'portion',
});

export const UNITS_VALUES = Object.values(UNITS);

export const PIZZA_CATEGORIES = Object.freeze([
  'classic',
  'veg',
  'non-veg',
  'premium',
  'cheese',
  'spicy',
]);

/** Lifecycle states of an order. */
export const ORDER_STATUS = Object.freeze({
  PAYMENT_PENDING: 'payment_pending',
  PAYMENT_FAILED: 'payment_failed',
  ORDER_RECEIVED: 'order_received',
  IN_KITCHEN: 'in_kitchen',
  SENT_TO_DELIVERY: 'sent_to_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
});

export const ORDER_STATUS_VALUES = Object.values(ORDER_STATUS);

/** Statuses a customer can see on the live tracker (in order). */
export const TRACKING_FLOW = [
  ORDER_STATUS.ORDER_RECEIVED,
  ORDER_STATUS.IN_KITCHEN,
  ORDER_STATUS.SENT_TO_DELIVERY,
  ORDER_STATUS.DELIVERED,
];

/** Allowed forward transitions used by the admin order management panel. */
export const ALLOWED_TRANSITIONS = Object.freeze({
  [ORDER_STATUS.PAYMENT_PENDING]: [ORDER_STATUS.CANCELLED, ORDER_STATUS.PAYMENT_FAILED],
  [ORDER_STATUS.PAYMENT_FAILED]: [ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.ORDER_RECEIVED]: [ORDER_STATUS.IN_KITCHEN, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.IN_KITCHEN]: [ORDER_STATUS.SENT_TO_DELIVERY, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.SENT_TO_DELIVERY]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: [],
});

export const PAYMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
});

export const PAYMENT_STATUS_VALUES = Object.values(PAYMENT_STATUS);

export const PAYMENT_PROVIDER = Object.freeze({
  RAZORPAY: 'razorpay',
  MOCK: 'mock',
});

export const MOVEMENT_TYPE = Object.freeze({
  DEDUCTION: 'deduction',
  MANUAL_ADJUSTMENT: 'manual_adjustment',
  RESTOCK: 'restock',
  RESERVATION_RELEASE: 'reservation_release',
});

export const TOKEN_PURPOSE = Object.freeze({
  EMAIL_VERIFY: 'email_verify',
  PASSWORD_RESET: 'password_reset',
});

export default {
  ROLES,
  INGREDIENT_CATEGORIES,
  ORDER_STATUS,
  ALLOWED_TRANSITIONS,
  PAYMENT_STATUS,
};
