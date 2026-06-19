/**
 * Repara productos en la API demo cuyo img_url es null (rompen la query foods).
 * Uso: node scripts/fix-null-food-images.mjs
 */

const API = 'https://enatega-singlevendor.up.railway.app/graphql';
const DEFAULT_IMG =
  'https://placehold.co/600x400/f97316/ffffff?text=Comida';
const ADMIN = { email: 'admin@enatega.com', password: 'enatega123' };

async function gql(query, variables, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = token;
  const res = await fetch(API, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables })
  });
  return res.json();
}

async function login() {
  const data = await gql(
    `mutation($email:String!,$password:String!){
      adminLogin(email:$email,password:$password){ token }
    }`,
    ADMIN
  );
  const token = data.data && data.data.adminLogin && data.data.adminLogin.token;
  if (!token) throw new Error('Login fallido: ' + JSON.stringify(data));
  return token;
}

async function listFoodsBasic() {
  const data = await gql(
    `query {
      foods(page:0) {
        _id title description stock
        category { _id }
      }
    }`
  );
  if (data.errors && !data.data) throw new Error(data.errors[0].message);
  return (data.data && data.data.foods) || [];
}

async function findBrokenIndex() {
  const data = await gql(`query { foods(page:0) { _id title img_url } }`);
  if (!data.errors) return -1;
  const path = data.errors[0].path || [];
  if (path[0] === 'foods' && typeof path[1] === 'number') return path[1];
  return -1;
}

async function patchFoodBasic(food, token) {
  if (!food.category || !food.category._id) {
    throw new Error('Producto sin categoría: ' + food._id);
  }
  const data = await gql(
    `mutation($f:FoodInput!){
      editFood(foodInput:$f){ _id title img_url }
    }`,
    {
      f: {
        _id: food._id,
        title: (food.title || 'Producto').trim() || 'Producto',
        description: food.description || food.title || 'Producto',
        img_url: DEFAULT_IMG,
        category: food.category._id,
        stock: Number(food.stock) || 10,
        variations: [
          { title: 'Regular', price: 1, discounted: 0, addons: [] }
        ]
      }
    },
    token
  );
  if (data.errors) throw new Error(data.errors[0].message);
  return data.data.editFood;
}

async function main() {
  console.log('Iniciando reparación de img_url null...');
  const token = await login();
  const foods = await listFoodsBasic();
  console.log('Productos en API:', foods.length);

  let fixed = 0;
  let guard = 0;
  while (guard < foods.length + 5) {
    guard += 1;
    const brokenIdx = await findBrokenIndex();
    if (brokenIdx < 0) {
      console.log('Listo: todos los productos tienen img_url válido.');
      console.log('Reparados en esta ejecución:', fixed);
      return;
    }
    const allFoods = await listFoodsBasic();
    const target = allFoods[brokenIdx];
    if (!target) {
      console.warn('Índice roto sin producto:', brokenIdx);
      break;
    }
    console.log(`Reparando [${brokenIdx}] ${target.title} (${target._id})...`);
    await patchFoodBasic(target, token);
    fixed += 1;
    await new Promise(r => setTimeout(r, 600));
  }
  console.warn('Se alcanzó el límite de iteraciones. Revisa la API manualmente.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
