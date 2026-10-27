export const ORDER_STATUS = {
  PAYMENT_PENDING: 'payment_pending',
  PAYMENT_FAILED: 'payment_failed',
  ORDER_RECEIVED: 'order_received',
  IN_KITCHEN: 'in_kitchen',
  SENT_TO_DELIVERY: 'sent_to_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

export const TRACKING_FLOW = [
  ORDER_STATUS.ORDER_RECEIVED,
  ORDER_STATUS.IN_KITCHEN,
  ORDER_STATUS.SENT_TO_DELIVERY,
  ORDER_STATUS.DELIVERED,
];

export const ALLOWED_TRANSITIONS = {
  [ORDER_STATUS.PAYMENT_PENDING]: [ORDER_STATUS.CANCELLED, ORDER_STATUS.PAYMENT_FAILED],
  [ORDER_STATUS.PAYMENT_FAILED]: [ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.ORDER_RECEIVED]: [ORDER_STATUS.IN_KITCHEN, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.IN_KITCHEN]: [ORDER_STATUS.SENT_TO_DELIVERY, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.SENT_TO_DELIVERY]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: [],
};

export const STATUS_LABELS = {
  [ORDER_STATUS.PAYMENT_PENDING]: 'Payment Pending',
  [ORDER_STATUS.PAYMENT_FAILED]: 'Payment Failed',
  [ORDER_STATUS.ORDER_RECEIVED]: 'Order Received',
  [ORDER_STATUS.IN_KITCHEN]: 'In Kitchen',
  [ORDER_STATUS.SENT_TO_DELIVERY]: 'Sent to Delivery',
  [ORDER_STATUS.DELIVERED]: 'Delivered',
  [ORDER_STATUS.CANCELLED]: 'Cancelled',
};

export const STATUS_TONES = {
  [ORDER_STATUS.PAYMENT_PENDING]: 'warning',
  [ORDER_STATUS.PAYMENT_FAILED]: 'error',
  [ORDER_STATUS.ORDER_RECEIVED]: 'info',
  [ORDER_STATUS.IN_KITCHEN]: 'primary',
  [ORDER_STATUS.SENT_TO_DELIVERY]: 'primary',
  [ORDER_STATUS.DELIVERED]: 'success',
  [ORDER_STATUS.CANCELLED]: 'neutral',
};

export const PAYMENT_LABELS = {
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
};

export const PAYMENT_TONES = {
  pending: 'warning',
  paid: 'success',
  failed: 'error',
  refunded: 'neutral',
};

export const CATEGORY_LABELS = {
  base: 'Bases',
  sauce: 'Sauces',
  cheese: 'Cheeses',
  vegetable: 'Vegetables',
};

export const INGREDIENT_CATEGORIES = ['base', 'sauce', 'cheese', 'vegetable'];

export const PIZZA_CATEGORY_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'classic', label: 'Classic' },
  { value: 'veg', label: 'Vegetarian' },
  { value: 'premium', label: 'Premium' },
  { value: 'cheese', label: 'Cheesy' },
  { value: 'spicy', label: 'Spicy' },
  { value: 'non-veg', label: 'Non-Veg' },
];
