/**
 * Migra categorías y productos desde la API demo Enatega (si responde).
 * Uso: node scripts/migrate-from-enatega-demo.mjs http://localhost:4000/graphql
 */

const DEMO = 'https://enatega-singlevendor.up.railway.app/graphql';
const TARGET = process.argv[2] || 'http://localhost:4000/graphql';
const PLACEHOLDER = 'https://placehold.co/600x400/f97316/ffffff?text=Codigo+10';

async function gql(url, query, variables, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

async function main() {
  console.log('Origen:', DEMO);
  console.log('Destino:', TARGET);

  const login = await gql(DEMO, `mutation($e:String!,$p:String!){
    adminLogin(email:$e,password:$p){ token }
  }`, { e: 'admin@enatega.com', p: 'enatega123' });

  const demoToken = login.data?.adminLogin?.token;
  if (!demoToken) {
    console.warn('Demo no disponible para login. Usando queries públicas...');
  }

  const cats = await gql(DEMO, `{ categories { _id title description img_menu } }`);
  if (cats.errors) throw new Error(cats.errors[0].message);
  const categories = cats.data?.categories || [];
  console.log('Categorías demo:', categories.length);

  const targetLogin = await gql(TARGET, `mutation($e:String!,$p:String!){
    adminLogin(email:$e,password:$p){ token }
  }`, { e: 'admin@codigo10.com', p: 'codigo10admin' });
  const targetToken = targetLogin.data?.adminLogin?.token;
  if (!targetToken) throw new Error('No se pudo entrar al API destino. ¿Corrió seed?');

  const catMap = {};
  for (const c of categories) {
    const created = await gql(
      TARGET,
      `mutation($t:String!,$d:String,$i:String){
        createCategory(category:{title:$t,description:$d,img_menu:$i}){ _id title }
      }`,
      {
        t: c.title,
        d: c.description || '',
        i: c.img_menu || PLACEHOLDER,
      },
      targetToken
    );
    if (created.errors) {
      console.warn('Categoría omitida:', c.title, created.errors[0].message);
      continue;
    }
    catMap[c._id] = created.data.createCategory._id;
    console.log('Categoría:', c.title);
  }

  for (const oldCatId of Object.keys(catMap)) {
    const foods = await gql(
      DEMO,
      `query($cat:String!){
        foodByCategory(category:$cat,inStock:false){
          _id title description img_url stock
          variations { title price discounted addons { _id } }
        }
      }`,
      { cat: oldCatId }
    );
    if (foods.errors) {
      console.warn('Foods error cat', oldCatId, foods.errors[0].message);
      continue;
    }
    for (const f of foods.data?.foodByCategory || []) {
      const variations = (f.variations || []).map((v) => ({
        title: v.title || 'Regular',
        price: Number(v.price || 1),
        discounted: Number(v.discounted || 0),
        addons: [],
      }));
      if (!variations.length) {
        variations.push({ title: 'Regular', price: 1, discounted: 0, addons: [] });
      }
      const created = await gql(
        TARGET,
        `mutation($f:FoodInput!){ createFood(foodInput:$f){ _id title } }`,
        {
          f: {
            title: f.title,
            description: f.description || f.title,
            img_url: f.img_url || PLACEHOLDER,
            category: catMap[oldCatId],
            stock: Number(f.stock ?? 100),
            variations,
          },
        },
        targetToken
      );
      if (created.errors) {
        console.warn('Producto omitido:', f.title, created.errors[0].message);
      } else {
        console.log('  +', f.title);
      }
    }
  }

  console.log('Migración terminada.');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
