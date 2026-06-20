const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  price: { type: Number, default: 0 },
});

const addonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    quantity_minimum: { type: Number, default: 0 },
    quantity_maximum: { type: Number, default: 1 },
    options: [optionSchema],
  },
  { timestamps: true }
);

const categorySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    img_menu: String,
  },
  { timestamps: true }
);

const variationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  price: { type: Number, required: true },
  discounted: { type: Number, default: 0 },
  addons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Addon' }],
});

const foodSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    img_url: {
      type: String,
      required: true,
      default: 'https://placehold.co/600x400/f97316/ffffff?text=Codigo+10',
    },
    stock: { type: Number, default: 100 },
    tag: String,
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    variations: { type: [variationSchema], default: [] },
  },
  { timestamps: true }
);

const addressSchema = new mongoose.Schema({
  label: String,
  delivery_address: String,
  details: String,
  latitude: String,
  longitude: String,
  selected: Boolean,
});

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, sparse: true },
    phone: String,
    password: String,
    role: { type: String, enum: ['admin', 'customer', 'rider'], default: 'customer' },
    is_active: { type: Boolean, default: true },
    push_token: String,
    addresses: [addressSchema],
    username: String,
  },
  { timestamps: true }
);

const orderItemSchema = new mongoose.Schema({
  food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food' },
  variation: {
    _id: mongoose.Schema.Types.ObjectId,
    title: String,
    price: Number,
    discounted: Number,
  },
  addons: [
    {
      _id: mongoose.Schema.Types.ObjectId,
      title: String,
      description: String,
      quantity_minimum: Number,
      quantity_maximum: Number,
      options: [optionSchema],
    },
  ],
  quantity: Number,
});

const orderSchema = new mongoose.Schema(
  {
    order_id: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rider: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [orderItemSchema],
    delivery_address: addressSchema,
    delivery_charges: Number,
    order_amount: Number,
    paid_amount: Number,
    payment_method: String,
    payment_status: { type: String, default: 'PENDING' },
    order_status: { type: String, default: 'PENDING' },
    reason: String,
    status: Boolean,
  },
  { timestamps: true }
);

const configurationSchema = new mongoose.Schema(
  {
    order_id_prefix: { type: String, default: 'COD10-' },
    order_counter: { type: Number, default: 1000 },
    delivery_charges: { type: Number, default: 3 },
    currency: { type: String, default: 'USD' },
    currency_symbol: { type: String, default: '$' },
    email: String,
    password: String,
    enable_email: { type: Boolean, default: false },
    client_id: String,
    client_secret: String,
    sandbox: Boolean,
    publishable_key: String,
    secret_key: String,
    mongodb_url: String,
  },
  { timestamps: true }
);

const couponSchema = new mongoose.Schema(
  {
    title: String,
    discount: Number,
    enabled: Boolean,
  },
  { timestamps: true }
);

module.exports = {
  Addon: mongoose.model('Addon', addonSchema),
  Category: mongoose.model('Category', categorySchema),
  Food: mongoose.model('Food', foodSchema),
  User: mongoose.model('User', userSchema),
  Order: mongoose.model('Order', orderSchema),
  Configuration: mongoose.model('Configuration', configurationSchema),
  Coupon: mongoose.model('Coupon', couponSchema),
};
