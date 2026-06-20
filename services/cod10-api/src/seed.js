require('dotenv').config();
const mongoose = require('mongoose');
const { Category, Food, User, Addon, Configuration } = require('./models');
const { hashPassword, PLACEHOLDER_IMG } = require('./auth');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cod10';

const DEFAULT_ADMINS = [
  {
    email: (process.env.ADMIN_EMAIL || 'admin@codigo10.com').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || 'codigo10admin',
    name: 'Admin Codigo 10',
  },
  {
    email: 'admin@enatega.com',
    password: 'enatega123',
    name: 'Admin Enatega',
  },
];

async function ensureAdmins() {
  for (const admin of DEFAULT_ADMINS) {
    const email = admin.email.toLowerCase();
    const exists = await User.findOne({ email, role: 'admin' });
    if (exists) continue;
    await User.create({
      name: admin.name,
      email,
      password: await hashPassword(admin.password),
      role: 'admin',
      is_active: true,
    });
    console.log('[seed] Admin creado:', email);
  }
}

const MENU = [
  {
    category: 'Hamburguesas',
    description: 'Las mejores hamburguesas',
    foods: [
      { title: '10-1 Parrillera con Papas fritas', description: '🍔 Parrillera clásica', price: 6 },
      { title: '10-2 Pollo Crispy con Papas fritas', description: '🍗 Pollo crispy', price: 6 },
      { title: '10-3 Doble Pollo Crispy con Papas fritas', description: '🍗🍗 Doble crispy', price: 8 },
      { title: '10-10 Big Brasa + Papas Fritas + Refresco 330Ml', description: '🔥 Combo Big Brasa', price: 11 },
    ],
  },
  {
    category: 'Bebidas',
    description: 'Refrescos y jugos',
    foods: [
      { title: 'Refresco 330ml', description: '🥤 Bebida fría', price: 2 },
      { title: 'Jugo natural', description: '🍊 Jugo del día', price: 3 },
    ],
  },
  {
    category: 'Sopas',
    description: 'Sopas caseras',
    foods: [{ title: 'Sopa del día', description: '🍲 Sopa casera', price: 5 }],
  },
  {
    category: 'Salchipapas',
    description: 'Salchipapas y combos',
    foods: [{ title: 'Salchipapas clásica', description: '🌭 Salchipapas', price: 7 }],
  },
];

async function runSeed({ reset = false, disconnect = true } = {}) {
  let connectedHere = false;
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(MONGODB_URI);
    connectedHere = true;
    console.log('[seed] Conectado a MongoDB');
  }

  const existingCategories = await Category.countDocuments();
  if (existingCategories > 0 && !reset) {
    await ensureAdmins();
    console.log('[seed] Ya hay datos — omitiendo seed');
    if (disconnect && connectedHere) await mongoose.disconnect();
    return;
  }

  if (reset) {
    await Promise.all([
      Category.deleteMany({}),
      Food.deleteMany({}),
      Addon.deleteMany({}),
      User.deleteMany({}),
      Configuration.deleteMany({}),
    ]);
  }

  const adminEmail = DEFAULT_ADMINS[0].email;
  const adminPass = DEFAULT_ADMINS[0].password;

  await ensureAdmins();

  const configExists = await Configuration.countDocuments();
  if (configExists === 0) {
    await Configuration.create({
      delivery_charges: 3,
      currency: 'USD',
      currency_symbol: '$',
      order_id_prefix: 'COD10-',
      order_counter: 1000,
    });
  }

  let extraQueso = await Addon.findOne({ title: 'Extra-Queso' });
  if (!extraQueso) {
    extraQueso = await Addon.create({
      title: 'Extra-Queso',
      description: 'Adicional',
      quantity_minimum: 0,
      quantity_maximum: 1,
      options: [{ title: 'Adicional', price: 1 }],
    });
  }

  if (existingCategories === 0 || reset) {
    for (const block of MENU) {
      const cat = await Category.create({
        title: block.category,
        description: block.description,
        img_menu: PLACEHOLDER_IMG,
      });

      for (const item of block.foods) {
        await Food.create({
          title: item.title,
          description: item.description,
          img_url: PLACEHOLDER_IMG,
          stock: 100,
          category: cat._id,
          variations: [
            {
              title: 'Regular',
              price: item.price,
              discounted: 0,
              addons: [extraQueso._id],
            },
          ],
        });
      }
    }
  }

  const counts = {
    categories: await Category.countDocuments(),
    foods: await Food.countDocuments(),
    addons: await Addon.countDocuments(),
  };

  console.log('[seed] Listo:', counts);
  console.log('[seed] Admin:', adminEmail, '/', adminPass);

  if (disconnect && connectedHere) await mongoose.disconnect();
}

module.exports = { runSeed, ensureAdmins };

if (require.main === module) {
  runSeed({ reset: true, disconnect: true }).catch((err) => {
    console.error('[seed] Error:', err);
    process.exit(1);
  });
}
