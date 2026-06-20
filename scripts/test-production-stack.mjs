const API = process.env.API_URL || 'https://cod10-graphql.onrender.com/graphql';

async function gql(query, variables) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data;
}

async function main() {
  console.log('=== Test stack Codigo 10 ===');
  console.log('API:', API);

  const healthUrl = API.replace('/graphql', '/health');
  const h = await fetch(healthUrl).then((r) => r.json());
  console.log('Health:', h);
  if (!h.mongo) throw new Error('MongoDB no conectado en Render');

  const { categories } = await gql('{ categories { _id title } }');
  console.log('Categorías:', categories.length, categories.map((c) => c.title).join(', '));

  const catId = categories[0]._id;
  const { foodByCategory } = await gql(
    `query($c:String!){ foodByCategory(category:$c,inStock:true){ _id title variations { price } } }`,
    { c: catId }
  );
  console.log('Productos cat', categories[0].title + ':', foodByCategory.length);

  const login = await gql(
    `mutation($e:String!,$p:String!){ adminLogin(email:$e,password:$p){ token userId } }`,
    { e: 'admin@codigo10.com', p: 'codigo10admin' }
  );
  console.log('Admin login:', login.adminLogin ? 'OK' : 'FAIL');

  const { configuration } = await gql('{ configuration { currency_symbol delivery_charges } }');
  console.log('Config:', configuration);

  console.log('\n✅ TODO OK — API producción funcionando');
}

main().catch((e) => {
  console.error('\n❌ FALLO:', e.message);
  process.exit(1);
});
