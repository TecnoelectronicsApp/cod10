const mongoose = require('mongoose');
const { Addon, Category, Food, User, Order, Configuration, Coupon } = require('./models');
const { signToken, comparePassword, hashPassword } = require('./auth');

const PLACEHOLDER_IMG = 'https://placehold.co/600x400/f97316/ffffff?text=Codigo+10';

async function getConfig() {
  let cfg = await Configuration.findOne();
  if (!cfg) {
    cfg = await Configuration.create({});
  }
  return cfg;
}

function mapId(doc) {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  obj._id = String(obj._id);
  if (obj.category && obj.category._id) obj.category._id = String(obj.category._id);
  if (obj.variations) {
    obj.variations = obj.variations.map((v) => ({
      ...v,
      _id: v._id ? String(v._id) : new mongoose.Types.ObjectId().toString(),
    }));
  }
  return obj;
}

async function populateFood(query) {
  return query.populate('category').populate({
    path: 'variations.addons',
    model: 'Addon',
  });
}

async function resolveAddonsByIds(ids) {
  if (!ids || !ids.length) return [];
  return Addon.find({ _id: { $in: ids } });
}

function buildLoginResponse(user) {
  const token = signToken({ userId: String(user._id), role: user.role });
  return {
    userId: String(user._id),
    token,
    name: user.name,
    email: user.email,
    phone: user.phone,
    is_active: user.is_active !== false,
  };
}

async function mapOrder(order) {
  if (!order) return null;
  const o = order.toObject ? order.toObject() : order;
  o._id = String(o._id);
  o.createdAt = o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString();
  if (o.user && o.user._id) o.user._id = String(o.user._id);
  if (o.rider && o.rider._id) o.rider._id = String(o.rider._id);
  if (o.items) {
    for (const item of o.items) {
      if (item.food && item.food._id) item.food._id = String(item.food._id);
      if (item.variation && item.variation._id) item.variation._id = String(item.variation._id);
      if (item.addons) {
        item.addons = item.addons.map((a) => ({
          ...a,
          _id: a._id ? String(a._id) : undefined,
        }));
      }
      item._id = item._id ? String(item._id) : new mongoose.Types.ObjectId().toString();
    }
  }
  return o;
}

function requireUser(context) {
  if (!context.user) throw new Error('No autorizado');
  return context.user;
}

function createResolvers(pubsub) {
  return {
    Query: {
      categories: async () => Category.find().sort({ title: 1 }),
      allCategories: async (_, { page }) => {
        const skip = (page || 0) * 50;
        return Category.find().skip(skip).limit(50).sort({ title: 1 });
      },
      foods: async (_, { page }) => {
        const skip = (page || 0) * 100;
        const list = await populateFood(Food.find().skip(skip).limit(100).sort({ createdAt: -1 }));
        return list.map((f) => {
          const doc = mapId(f);
          doc.img_url = doc.img_url || PLACEHOLDER_IMG;
          return doc;
        });
      },
      foodByIds: async (_, { ids }) => {
        const list = await populateFood(Food.find({ _id: { $in: ids } }));
        return list.map((f) => {
          const doc = mapId(f);
          doc.img_url = doc.img_url || PLACEHOLDER_IMG;
          return doc;
        });
      },
      foodByCategory: async (_, { category, inStock, search }) => {
        const query = { category };
        if (inStock) query.stock = { $gt: 0 };
        if (search) query.title = { $regex: search, $options: 'i' };
        const list = await populateFood(Food.find(query).sort({ title: 1 }));
        return list.map((f) => {
          const doc = mapId(f);
          doc.img_url = doc.img_url || PLACEHOLDER_IMG;
          return doc;
        });
      },
      configuration: async () => getConfig(),
      allOrders: async (_, { page, rows, search }) => {
        const skip = (page || 0) * (rows || 10);
        const limit = rows || 10;
        const filter = {};
        if (search) filter.order_id = { $regex: search, $options: 'i' };
        const orders = await Order.find(filter)
          .populate('user')
          .populate('rider')
          .populate('items.food')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit);
        return Promise.all(orders.map(mapOrder));
      },
      orderCount: async () => Order.countDocuments(),
      orders: async (_, { offset }, context) => {
        const user = requireUser(context);
        const orders = await Order.find({ user: user.userId })
          .populate('items.food')
          .sort({ createdAt: -1 })
          .skip(offset || 0)
          .limit(20);
        return Promise.all(orders.map(mapOrder));
      },
      profile: async (_, __, context) => {
        const auth = requireUser(context);
        const user = await User.findById(auth.userId);
        if (!user) throw new Error('Usuario no encontrado');
        return user;
      },
      users: async (_, { page }) => {
        const skip = (page || 0) * 50;
        return User.find({ role: 'customer' }).skip(skip).limit(50).sort({ createdAt: -1 });
      },
      addons: async () => Addon.find().sort({ title: 1 }),
      Addons: async () => Addon.find().sort({ title: 1 }),
      options: async () => {
        const addons = await Addon.find();
        return addons.flatMap((a) => a.options || []);
      },
      Options: async () => {
        const addons = await Addon.find();
        return addons.flatMap((a) => a.options || []);
      },
      allOptions: async () => {
        const addons = await Addon.find();
        return addons.flatMap((a) => a.options || []);
      },
      allAddons: async (_, { page }) => {
        const skip = (page || 0) * 50;
        return Addon.find().skip(skip).limit(50);
      },
      coupons: async () => Coupon.find(),
      Coupons: async () => Coupon.find(),
      reviews: async () => [],
      riders: async () => User.find({ role: 'rider' }),
      availableRiders: async () => User.find({ role: 'rider', is_active: true }),
      assignedOrders: async (_, { id }) => {
        const orders = await Order.find({ rider: id })
          .populate('user')
          .populate('items.food')
          .sort({ createdAt: -1 });
        return Promise.all(orders.map(mapOrder));
      },
      unassignedOrders: async () => {
        const orders = await Order.find({
          rider: null,
          order_status: { $in: ['PENDING', 'ACCEPTED', 'ASSIGNED'] },
        })
          .populate('user')
          .populate('items.food')
          .sort({ createdAt: -1 });
        return Promise.all(orders.map(mapOrder));
      },
      getDashboardTotal: async () => ({
        total_orders: await Order.countDocuments(),
        total_users: await User.countDocuments({ role: 'customer' }),
        total_sales: (await Order.aggregate([{ $group: { _id: null, t: { $sum: '$order_amount' } } }]))[0]?.t || 0,
        total_ratings: 0,
        avg_ratings: 0,
      }),
      getDashboardSales: async () => [],
      getDashboardOrders: async () => ({
        total_orders: await Order.countDocuments(),
        total_users: await User.countDocuments({ role: 'customer' }),
        total_sales: 0,
        orders: [],
      }),
      getDashboardData: async () => ({
        total_orders: await Order.countDocuments(),
        total_users: await User.countDocuments({ role: 'customer' }),
        total_sales: 0,
        orders: [],
      }),
      orderStatuses: () => ['PENDING', 'ACCEPTED', 'ASSIGNED', 'PICKED', 'DELIVERED', 'CANCELLED'],
      paymentStatuses: () => ['PENDING', 'PAID'],
    },

    Mutation: {
      adminLogin: async (_, { email, password }) => {
        const user = await User.findOne({ email: email.toLowerCase(), role: 'admin' });
        if (!user || !(await comparePassword(password, user.password))) {
          throw new Error('Credenciales inválidas');
        }
        return buildLoginResponse(user);
      },
      riderLogin: async (_, { username, password }) => {
        const user = await User.findOne({ username, role: 'rider' });
        if (!user || !(await comparePassword(password, user.password))) {
          throw new Error('Credenciales inválidas');
        }
        return buildLoginResponse(user);
      },
      login: async (_, { email, password, type, name, notificationToken }) => {
        let user;
        if (type === 'google' || type === 'apple' || type === 'facebook') {
          if (!email) throw new Error('Email requerido');
          user = await User.findOne({ email: email.toLowerCase() });
          if (!user) {
            user = await User.create({
              email: email.toLowerCase(),
              name: name || email.split('@')[0],
              role: 'customer',
              is_active: true,
            });
          }
        } else {
          user = await User.findOne({ email: email.toLowerCase(), role: 'customer' });
          if (!user || !(await comparePassword(password, user.password))) {
            throw new Error('Credenciales inválidas');
          }
        }
        if (notificationToken) {
          user.push_token = notificationToken;
          await user.save();
        }
        return buildLoginResponse(user);
      },
      createUser: async (_, { userInput }) => {
        const exists = await User.findOne({ email: userInput.email.toLowerCase() });
        if (exists) throw new Error('El email ya está registrado');
        const user = await User.create({
          name: userInput.name,
          email: userInput.email.toLowerCase(),
          phone: userInput.phone,
          password: await hashPassword(userInput.password),
          role: 'customer',
          is_active: true,
        });
        return buildLoginResponse(user);
      },
      createFood: async (_, { foodInput }) => {
        const variations = (foodInput.variations || []).map((v) => ({
          title: v.title,
          price: Number(v.price),
          discounted: Number(v.discounted || 0),
          addons: v.addons || [],
        }));
        const food = await Food.create({
          title: foodInput.title,
          description: foodInput.description,
          img_url: foodInput.img_url || PLACEHOLDER_IMG,
          category: foodInput.category,
          stock: Number(foodInput.stock ?? 100),
          variations,
        });
        const populated = await populateFood(Food.findById(food._id));
        return mapId(populated);
      },
      editFood: async (_, { foodInput }) => {
        const variations = (foodInput.variations || []).map((v) => ({
          _id: v._id || new mongoose.Types.ObjectId(),
          title: v.title,
          price: Number(v.price),
          discounted: Number(v.discounted || 0),
          addons: v.addons || [],
        }));
        await Food.findByIdAndUpdate(foodInput._id, {
          title: foodInput.title,
          description: foodInput.description,
          img_url: foodInput.img_url || PLACEHOLDER_IMG,
          category: foodInput.category,
          stock: Number(foodInput.stock ?? 100),
          variations,
        });
        const populated = await populateFood(Food.findById(foodInput._id));
        return mapId(populated);
      },
      deleteFood: async (_, { id }) => {
        const food = await Food.findByIdAndDelete(id);
        if (!food) throw new Error('Producto no encontrado');
        return mapId(food);
      },
      createCategory: async (_, { category }) => Category.create(category),
      editCategory: async (_, { category }) =>
        Category.findByIdAndUpdate(category._id, category, { new: true }),
      deleteCategory: async (_, { id }) => {
        const cat = await Category.findByIdAndDelete(id);
        if (!cat) throw new Error('Categoría no encontrada');
        return cat;
      },
      placeOrder: async (_, { orderInput, paymentMethod, address }, context) => {
        const auth = requireUser(context);
        const cfg = await getConfig();
        const items = [];
        let subtotal = 0;

        for (const line of orderInput) {
          const food = await populateFood(Food.findById(line.food));
          const f = food[0] || food;
          if (!f) throw new Error('Producto no encontrado');
          const variation = (f.variations || []).find((v) => String(v._id) === String(line.variation));
          if (!variation) throw new Error('Variación no encontrada');
          const price = Number(variation.discounted || variation.price || 0);
          subtotal += price * line.quantity;

          const addonDocs = [];
          for (const a of line.addons || []) {
            const addon = await Addon.findById(a._id);
            if (addon) {
              const selectedOptions = (addon.options || []).filter((o) =>
                (a.options || []).includes(String(o._id))
              );
              addonDocs.push({
                _id: addon._id,
                title: addon.title,
                description: addon.description,
                quantity_minimum: addon.quantity_minimum,
                quantity_maximum: addon.quantity_maximum,
                options: selectedOptions,
              });
              for (const opt of selectedOptions) {
                subtotal += Number(opt.price || 0) * line.quantity;
              }
            }
          }

          items.push({
            food: f._id,
            quantity: line.quantity,
            variation: {
              _id: variation._id,
              title: variation.title,
              price: variation.price,
              discounted: variation.discounted,
            },
            addons: addonDocs,
          });
        }

        cfg.order_counter = (cfg.order_counter || 1000) + 1;
        await cfg.save();
        const orderId = `${cfg.order_id_prefix || 'COD10-'}${cfg.order_counter}`;
        const delivery = Number(cfg.delivery_charges || 0);
        const total = subtotal + delivery;

        const order = await Order.create({
          order_id: orderId,
          user: auth.userId,
          items,
          delivery_address: address,
          delivery_charges: delivery,
          order_amount: total,
          paid_amount: total,
          payment_method: paymentMethod,
          payment_status: 'PENDING',
          order_status: 'PENDING',
        });

        const populated = await Order.findById(order._id)
          .populate('user')
          .populate('items.food');
        const mapped = await mapOrder(populated);
        pubsub.publish('ORDER_PLACED', { subscribePlaceOrder: { origin: 'new', order: mapped } });
        return mapped;
      },
      updateOrderStatus: async (_, { id, status, reason }) => {
        const order = await Order.findByIdAndUpdate(
          id,
          { order_status: status, reason: reason || '' },
          { new: true }
        )
          .populate('user')
          .populate('items.food');
        const mapped = await mapOrder(order);
        pubsub.publish('ORDER_PLACED', { subscribePlaceOrder: { origin: 'update', order: mapped } });
        return mapped;
      },
      updatePaymentStatus: async (_, { id, status }) =>
        Order.findByIdAndUpdate(id, { payment_status: status }, { new: true }),
      updateStatus: async (_, { id, status, reason }) =>
        User.findByIdAndUpdate(id, { is_active: status, reason }, { new: true }),
      saveDeliveryConfiguration: async (_, { configurationInput }) => {
        const cfg = await getConfig();
        cfg.delivery_charges = configurationInput.delivery_charges;
        await cfg.save();
        return cfg;
      },
      saveCurrencyConfiguration: async (_, { configurationInput }) => {
        const cfg = await getConfig();
        if (configurationInput.currency) cfg.currency = configurationInput.currency;
        if (configurationInput.currency_symbol) cfg.currency_symbol = configurationInput.currency_symbol;
        await cfg.save();
        return cfg;
      },
      saveOrderConfiguration: async (_, { configurationInput }) => {
        const cfg = await getConfig();
        if (configurationInput.order_id_prefix) cfg.order_id_prefix = configurationInput.order_id_prefix;
        await cfg.save();
        return cfg;
      },
      saveEmailConfiguration: async (_, { configurationInput }) => {
        const cfg = await getConfig();
        Object.assign(cfg, configurationInput);
        await cfg.save();
        return cfg;
      },
      saveMongoConfiguration: async (_, { configurationInput }) => {
        const cfg = await getConfig();
        cfg.mongodb_url = configurationInput.mongodb_url;
        await cfg.save();
        return cfg;
      },
      savePaypalConfiguration: async (_, { configurationInput }) => {
        const cfg = await getConfig();
        Object.assign(cfg, configurationInput);
        await cfg.save();
        return cfg;
      },
      saveStripeConfiguration: async (_, { configurationInput }) => {
        const cfg = await getConfig();
        Object.assign(cfg, configurationInput);
        await cfg.save();
        return cfg;
      },
      createAddons: async (_, { addonInput }) => {
        const created = [];
        for (const a of addonInput || []) {
          created.push(await Addon.create(a));
        }
        return created;
      },
      editAddon: async (_, { addonInput }) => Addon.findByIdAndUpdate(addonInput._id, addonInput, { new: true }),
      deleteAddon: async (_, { id }) => Addon.findByIdAndDelete(id),
      createOptions: async () => [],
      editOption: async () => null,
      deleteOption: async () => null,
      createCoupon: async (_, { couponInput }) => Coupon.create(couponInput),
      editCoupon: async (_, { couponInput }) => Coupon.findByIdAndUpdate(couponInput._id, couponInput, { new: true }),
      deleteCoupon: async (_, { id }) => Coupon.findByIdAndDelete(id),
      createRider: async () => ({ _id: '0', name: 'Rider', username: 'rider', available: true }),
      editRider: async () => ({ _id: '0', name: 'Rider', username: 'rider', available: true }),
      deleteRider: async () => ({ _id: '0' }),
      assignRider: async (_, { id, riderId }) =>
        Order.findByIdAndUpdate(id, { rider: riderId, order_status: 'ASSIGNED' }, { new: true }),
      assignOrder: async (_, { id }, context) => {
        const auth = requireUser(context);
        return Order.findByIdAndUpdate(
          id,
          { rider: auth.userId, order_status: 'ASSIGNED' },
          { new: true }
        );
      },
      updateOrderStatusRider: async (_, { id, status }) =>
        Order.findByIdAndUpdate(id, { order_status: status }, { new: true }),
      uploadToken: async (_, { pushToken }, context) => {
        const auth = requireUser(context);
        return User.findByIdAndUpdate(auth.userId, { push_token: pushToken }, { new: true });
      },
      sendNotificationUser: async () => true,
      resetPassword: async () => true,
    },

    Subscription: {
      subscribePlaceOrder: {
        subscribe: () => pubsub.asyncIterator(['ORDER_PLACED']),
      },
      subscriptionAssignRider: {
        subscribe: () => pubsub.asyncIterator(['ORDER_PLACED']),
      },
      unassignedOrder: {
        subscribe: () => pubsub.asyncIterator(['ORDER_PLACED']),
      },
    },

    Food: {
      category: (parent) => parent.category || Category.findById(parent.category),
      img_url: (parent) => parent.img_url || PLACEHOLDER_IMG,
    },
    Order: {
      review: () => null,
    },
    User: {
      status: (parent) => parent.is_active,
    },
  };
}

module.exports = { createResolvers, getConfig, hashPassword, PLACEHOLDER_IMG };
