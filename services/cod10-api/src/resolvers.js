const mongoose = require('mongoose');
const { Addon, Category, Food, User, Order, Configuration, Coupon } = require('./models');
const { signToken, comparePassword, hashPassword, normalizePhone, phoneAuthEmail } = require('./auth');
const { calcDeliveryFeeFromAddress } = require('./delivery-pricing');

const PLACEHOLDER_IMG = 'https://placehold.co/600x400/f97316/ffffff?text=Codigo+10';

async function nextSortOrder(Model) {
  const last = await Model.findOne().sort({ sort_order: -1 }).select('sort_order').lean();
  return (last?.sort_order ?? -1) + 1;
}

async function applySortOrder(Model, ids) {
  if (!ids?.length) return [];
  await Promise.all(
    ids.map((id, index) => Model.findByIdAndUpdate(id, { sort_order: index }))
  );
  return Model.find({ _id: { $in: ids } }).sort({ sort_order: 1, title: 1 });
}

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
  const o = order.toObject
    ? order.toObject({ flattenMaps: true })
    : JSON.parse(JSON.stringify(order));
  o._id = String(o._id);
  o.createdAt = o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString();

  if (o.user?._id) {
    o.user = { ...o.user, _id: String(o.user._id) };
  }

  if (o.rider) {
    const riderRef = typeof o.rider === 'object' && o.rider._id != null ? o.rider._id : o.rider;
    o.rider =
      typeof o.rider === 'object' && o.rider.name
        ? { ...o.rider, _id: String(o.rider._id) }
        : { _id: String(riderRef) };
  }

  if (o.items) {
    o.items = o.items.map((item) => {
      const mapped = { ...item };
      if (mapped.food?._id) {
        mapped.food = { ...mapped.food, _id: String(mapped.food._id) };
      }
      if (mapped.variation) {
        mapped.variation = {
          ...mapped.variation,
          _id: mapped.variation._id ? String(mapped.variation._id) : undefined,
        };
      }
      if (mapped.addons) {
        mapped.addons = mapped.addons.map((a) => ({
          ...a,
          _id: a._id ? String(a._id) : undefined,
        }));
      }
      mapped._id = mapped._id
        ? String(mapped._id)
        : new mongoose.Types.ObjectId().toString();
      return mapped;
    });
  }
  return o;
}

function requireUser(context) {
  if (!context.user) throw new Error('No autorizado');
  return context.user;
}

function requireAdmin(context) {
  const auth = requireUser(context);
  if (auth.role !== 'admin') throw new Error('Solo administradores');
  return auth;
}

function requireRider(context) {
  const auth = requireUser(context);
  if (auth.role !== 'rider') throw new Error('Solo repartidores');
  return auth;
}

async function findCustomerByLogin(email, password) {
  const emailLower = String(email || '').toLowerCase();
  let user = await User.findOne({ email: emailLower, role: 'customer' });

  if (!user && emailLower.endsWith('@wa.cod10.app')) {
    const rawPhone = emailLower.replace('@wa.cod10.app', '');
    const normalized = normalizePhone(rawPhone);
    const localPhone =
      rawPhone.startsWith('0') && rawPhone.length === 11
        ? rawPhone
        : normalized.startsWith('58') && normalized.length === 12
          ? `0${normalized.slice(2)}`
          : rawPhone;

    user = await User.findOne({
      role: 'customer',
      $or: [
        { email: emailLower },
        { email: `${rawPhone}@wa.cod10.app` },
        { email: `${normalized}@wa.cod10.app` },
        { email: `${localPhone}@wa.cod10.app` },
        { phone: rawPhone },
        { phone: normalized },
        { phone: localPhone },
      ],
    });
  }

  if (!user || !(await comparePassword(password, user.password))) {
    return null;
  }

  return user;
}

function mapRider(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    _id: String(obj._id),
    name: obj.name || '',
    username: obj.username || '',
    password: obj.password || '',
    phone: obj.phone || '',
    available: obj.available !== false,
  };
}

function createResolvers(pubsub) {
  return {
    Query: {
      categories: async () => Category.find().sort({ sort_order: 1, title: 1 }),
      allCategories: async (_, { page }) => {
        const skip = (page || 0) * 50;
        return Category.find().skip(skip).limit(50).sort({ sort_order: 1, title: 1 });
      },
      foods: async (_, { page }) => {
        const skip = (page || 0) * 100;
        const list = await populateFood(
          Food.find().skip(skip).limit(100).sort({ sort_order: 1, title: 1 })
        );
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
        const list = await populateFood(Food.find(query).sort({ sort_order: 1, title: 1 }));
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
        const auth = requireUser(context);
        const orders = await Order.find({ user: auth.userId })
          .populate('user')
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
      allReviews: async () => [],
      riders: async () => {
        const list = await User.find({ role: 'rider' });
        return list.map(mapRider);
      },
      availableRiders: async () => {
        const list = await User.find({ role: 'rider', available: { $ne: false } });
        return list.map(mapRider);
      },
      assignedOrders: async (_, { id }) => {
        const orders = await Order.find({ rider: id })
          .populate('user')
          .populate('rider')
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
      orderStatuses: () => ['PENDING', 'ACCEPTED', 'ASSIGNED', 'READY', 'PICKED', 'DELIVERED', 'CANCELLED'],
      paymentStatuses: () => ['PENDING', 'PAID'],
      getOrderStatuses: () => ['PENDING', 'ACCEPTED', 'ASSIGNED', 'READY', 'PICKED', 'DELIVERED', 'CANCELLED'],
      getPaymentStatuses: () => ['PENDING', 'PAID'],
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
          user = await findCustomerByLogin(email, password);
          if (!user) throw new Error('Credenciales inválidas');
        }
        if (notificationToken) {
          user.push_token = notificationToken;
          await user.save();
        }
        return buildLoginResponse(user);
      },
      createUser: async (_, { userInput }) => {
        const emailLower = userInput.email.toLowerCase();
        const phone = userInput.phone || '';
        const exists = await User.findOne({
          role: 'customer',
          $or: [{ email: emailLower }, ...(phone ? [{ phone }] : [])],
        });
        if (exists) throw new Error('El email ya está registrado');
        const user = await User.create({
          name: userInput.name,
          email: emailLower,
          phone,
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
          sort_order: await nextSortOrder(Food),
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
      createCategory: async (_, { category }) =>
        Category.create({ ...category, sort_order: await nextSortOrder(Category) }),
      editCategory: async (_, { category }) =>
        Category.findByIdAndUpdate(category._id, category, { new: true }),
      deleteCategory: async (_, { id }) => {
        const cat = await Category.findByIdAndDelete(id);
        if (!cat) throw new Error('Categoría no encontrada');
        return cat;
      },
      reorderCategories: async (_, { ids }) => applySortOrder(Category, ids),
      reorderFoods: async (_, { ids }) => {
        await applySortOrder(Food, ids);
        const list = await populateFood(Food.find({ _id: { $in: ids } }).sort({ sort_order: 1, title: 1 }));
        return list.map((f) => {
          const doc = mapId(f);
          doc.img_url = doc.img_url || PLACEHOLDER_IMG;
          return doc;
        });
      },
      placeOrder: async (_, { orderInput, paymentMethod, address }, context) => {
        const auth = requireUser(context);
        const cfg = await getConfig();
        const items = [];
        let subtotal = 0;

        for (const line of orderInput) {
          const f = await populateFood(Food.findById(line.food));
          if (!f) throw new Error('Producto no encontrado');
          const variation = (f.variations || []).find((v) => String(v._id) === String(line.variation));
          if (!variation) throw new Error('Variación no encontrada');
          const price =
            variation.discounted != null && Number(variation.discounted) > 0
              ? Number(variation.discounted)
              : Number(variation.price || 0);
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
        const delivery = calcDeliveryFeeFromAddress(address);
        const total = subtotal + delivery;

        const order = await Order.create({
          order_id: orderId,
          user: new mongoose.Types.ObjectId(auth.userId),
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
        const patch = { order_status: status, reason: reason || '' };
        if (['PENDING', 'ACCEPTED'].includes(status)) {
          patch.rider = null;
        }
        const order = await Order.findByIdAndUpdate(id, patch, { new: true })
          .populate('user')
          .populate('rider')
          .populate('items.food');
        const mapped = await mapOrder(order);
        pubsub.publish('ORDER_PLACED', { subscribePlaceOrder: { origin: 'update', order: mapped } });
        return mapped;
      },
      updatePaymentStatus: async (_, { id, status }) => {
        const order = await Order.findByIdAndUpdate(
          id,
          { payment_status: status },
          { new: true }
        )
          .populate('user')
          .populate('items.food');
        return mapOrder(order);
      },
      updateOrderKitchenDetails: async (_, { id, input }, context) => {
        requireAdmin(context);
        const order = await Order.findById(id);
        if (!order) throw new Error('Pedido no encontrado');

        if (input.name != null || input.phone != null) {
          const user = await User.findById(order.user);
          if (user) {
            if (input.name != null) user.name = input.name;
            if (input.phone != null) user.phone = input.phone;
            await user.save();
          }
        }

        if (input.delivery_address != null || input.details != null) {
          const addr = order.delivery_address?.toObject?.() || order.delivery_address || {};
          if (input.delivery_address != null) addr.delivery_address = input.delivery_address;
          if (input.details != null) addr.details = input.details;
          order.delivery_address = addr;
          order.markModified('delivery_address');
        }

        await order.save();
        const populated = await Order.findById(id)
          .populate('user')
          .populate('items.food');
        const mapped = await mapOrder(populated);
        pubsub.publish('ORDER_PLACED', { subscribePlaceOrder: { origin: 'update', order: mapped } });
        return mapped;
      },
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
      createCoupon: async (_, { couponInput }) =>
        Coupon.create({
          code: couponInput.code,
          title: couponInput.code,
          discount: couponInput.discount,
          enabled: couponInput.enabled ?? false,
        }),
      editCoupon: async (_, { couponInput }) =>
        Coupon.findByIdAndUpdate(
          couponInput._id,
          {
            code: couponInput.code,
            title: couponInput.code,
            discount: couponInput.discount,
            enabled: couponInput.enabled,
          },
          { new: true }
        ),
      deleteCoupon: async (_, { id }) => Coupon.findByIdAndDelete(id),
      createRider: async (_, { riderInput }) => {
        const { name, username, password, phone, available } = riderInput;
        if (!name || !username || !password) {
          throw new Error('Nombre, usuario y contraseña son requeridos');
        }
        const exists = await User.findOne({ username, role: 'rider' });
        if (exists) throw new Error('El usuario ya existe');
        const rider = await User.create({
          name,
          username,
          password,
          phone,
          available: available !== false,
          role: 'rider',
          is_active: true,
        });
        return mapRider(rider);
      },
      editRider: async (_, { riderInput }) => {
        const { _id, name, username, password, phone, available } = riderInput;
        if (!_id) throw new Error('ID requerido');
        const updates = { name, username, phone, available };
        if (password) updates.password = password;
        const rider = await User.findOneAndUpdate({ _id, role: 'rider' }, updates, { new: true });
        if (!rider) throw new Error('Repartidor no encontrado');
        return mapRider(rider);
      },
      deleteRider: async (_, { id }) => {
        const rider = await User.findOneAndDelete({ _id: id, role: 'rider' });
        if (!rider) throw new Error('Repartidor no encontrado');
        return mapRider(rider);
      },
      toggleAvailablity: async (_, { id }) => {
        const rider = await User.findOne({ _id: id, role: 'rider' });
        if (!rider) throw new Error('Repartidor no encontrado');
        rider.available = !rider.available;
        await rider.save();
        return mapRider(rider);
      },
      assignRider: async (_, { id, riderId }) => {
        const order = await Order.findById(id);
        if (!order) throw new Error('Pedido no encontrado');
        if (!['ACCEPTED', 'ASSIGNED'].includes(order.order_status)) {
          throw new Error('El pedido debe estar aceptado en cocina antes de asignar repartidor');
        }
        const updated = await Order.findByIdAndUpdate(
          id,
          { rider: riderId, order_status: 'ASSIGNED' },
          { new: true }
        )
          .populate('user')
          .populate('rider')
          .populate('items.food');
        return mapOrder(updated);
      },
      assignOrder: async (_, { id, riderId: argRiderId }, context) => {
        const auth = context.user;
        let riderUserId = null;

        if (auth?.role === 'rider') {
          riderUserId = String(auth.userId);
        } else if (auth?.role === 'admin' && argRiderId) {
          riderUserId = String(argRiderId);
        } else if (argRiderId) {
          const rider = await User.findOne({
            _id: argRiderId,
            role: 'rider',
            is_active: { $ne: false },
          });
          if (!rider) throw new Error('Repartidor no encontrado');
          riderUserId = String(argRiderId);
        } else {
          throw new Error('No autorizado');
        }

        if (argRiderId && String(argRiderId) !== riderUserId) {
          throw new Error('No autorizado');
        }

        const order = await Order.findById(id);
        if (!order) throw new Error('Pedido no encontrado');
        if (order.rider) throw new Error('Pedido ya asignado a otro repartidor');
        if (order.order_status !== 'ACCEPTED') {
          throw new Error('El pedido no está disponible para tomar');
        }

        const updated = await Order.findByIdAndUpdate(
          id,
          { rider: riderUserId, order_status: 'ASSIGNED' },
          { new: true }
        )
          .populate('user')
          .populate('rider')
          .populate('items.food');
        const mapped = await mapOrder(updated);
        pubsub.publish('ORDER_PLACED', { subscribePlaceOrder: { origin: 'assign', order: mapped } });
        return mapped;
      },
      updateOrderStatusRider: async (_, { id, status, riderId: argRiderId }, context) => {
        const auth = context.user;
        const existing = await Order.findById(id);
        if (!existing) throw new Error('Pedido no encontrado');

        const orderRiderId = existing.rider ? String(existing.rider) : null;
        if (auth?.role === 'rider') {
          if (orderRiderId && orderRiderId !== String(auth.userId)) {
            throw new Error('No autorizado');
          }
        } else if (argRiderId) {
          if (orderRiderId && orderRiderId !== String(argRiderId)) {
            throw new Error('No autorizado');
          }
        } else if (!auth) {
          throw new Error('No autorizado');
        }

        if (status === 'PICKED' && existing.order_status !== 'READY') {
          throw new Error('Cocina aún no marcó el pedido como listo');
        }

        const order = await Order.findByIdAndUpdate(
          id,
          { order_status: status },
          { new: true }
        )
          .populate('user')
          .populate('rider')
          .populate('items.food');
        const mapped = await mapOrder(order);
        pubsub.publish('ORDER_PLACED', { subscribePlaceOrder: { origin: 'update', order: mapped } });
        return mapped;
      },
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
    Coupon: {
      code: (parent) => parent.code || parent.title || '',
    },
    User: {
      status: (parent) => parent.is_active,
    },
  };
}

module.exports = { createResolvers, getConfig, hashPassword, PLACEHOLDER_IMG };
