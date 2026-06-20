const typeDefs = `#graphql
  scalar JSON

  type Category {
    _id: ID!
    title: String!
    description: String
    img_menu: String
    sort_order: Int
  }

  type Option {
    _id: ID!
    title: String!
    description: String
    price: Float
  }

  type Addon {
    _id: ID!
    title: String!
    description: String
    quantity_minimum: Int
    quantity_maximum: Int
    options: [Option]
  }

  type Variation {
    _id: ID!
    title: String!
    price: Float!
    discounted: Float
    addons: [Addon]
  }

  type Food {
    _id: ID!
    title: String!
    description: String
    img_url: String!
    stock: Int
    tag: String
    sort_order: Int
    category: Category!
    variations: [Variation]
  }

  type Address {
    _id: ID
    label: String
    delivery_address: String
    details: String
    latitude: String
    longitude: String
    selected: Boolean
  }

  type User {
    _id: ID!
    name: String
    email: String
    phone: String
    is_active: Boolean
    status: Boolean
    reason: String
    push_token: String
    addresses: [Address]
  }

  type Rider {
    _id: ID!
    name: String
    username: String
    password: String
    phone: String
    available: Boolean
  }

  type OrderItem {
    _id: ID!
    quantity: Int
    food: Food
    variation: Variation
    addons: [Addon]
  }

  type Order {
    _id: ID!
    order_id: String
    order_status: String
    payment_status: String
    payment_method: String
    order_amount: Float
    paid_amount: Float
    delivery_charges: Float
    reason: String
    status: Boolean
    createdAt: String
    user: User
    rider: Rider
    delivery_address: Address
    items: [OrderItem]
    review: Review
  }

  type Review {
    _id: ID!
    rating: Float
    description: String
    createdAt: String
    updatedAt: String
    is_active: Boolean
    order: Order
  }

  type Coupon {
    _id: ID!
    code: String
    title: String
    discount: Float
    enabled: Boolean
  }

  type Configuration {
    _id: ID!
    order_id_prefix: String
    email: String
    password: String
    enable_email: Boolean
    client_id: String
    client_secret: String
    sandbox: Boolean
    publishable_key: String
    secret_key: String
    delivery_charges: Float
    currency: String
    currency_symbol: String
    mongodb_url: String
  }

  type LoginResponse {
    userId: ID!
    token: String!
    name: String
    email: String
    phone: String
    is_active: Boolean
    tokenExpiration: String
    notificationToken: String
  }

  type DashboardTotal {
    total_orders: Int
    total_users: Int
    total_sales: Float
    total_ratings: Int
    avg_ratings: Float
  }

  type DashboardDay {
    day: String
    count: Int
    amount: Float
  }

  type DashboardData {
    total_orders: Int
    total_users: Int
    total_sales: Float
    orders: [DashboardDay]
  }

  type PlaceOrderPayload {
    origin: String
    order: Order
  }

  input AddressInput {
    label: String
    delivery_address: String!
    details: String
    latitude: String
    longitude: String
  }

  input OrderCustomerInput {
    name: String
    phone: String
    delivery_address: String
    details: String
  }

  input VariationInput {
    _id: ID
    title: String!
    price: Float!
    discounted: Float
    addons: [ID!]
  }

  input FoodInput {
    _id: ID
    title: String!
    description: String!
    img_url: String!
    category: ID!
    stock: Int
    variations: [VariationInput!]!
  }

  input CategoryInput {
    _id: ID
    title: String!
    description: String
    img_menu: String
  }

  input UserInput {
    name: String!
    email: String!
    password: String!
    phone: String
  }

  input OrderInput {
    food: ID!
    quantity: Int!
    variation: ID!
    addons: [OrderAddonInput!]
  }

  input OrderAddonInput {
    _id: ID!
    options: [ID!]
  }

  input DeliveryConfigurationInput {
    delivery_charges: Float
  }

  input CurrencyConfigurationInput {
    currency: String
    currency_symbol: String
  }

  input OrderConfigurationInput {
    order_id_prefix: String
  }

  input EmailConfigurationInput {
    email: String
    password: String
    enable_email: Boolean
  }

  input MongoConfigurationInput {
    mongodb_url: String
  }

  input PaypalConfigurationInput {
    client_id: String
    client_secret: String
    sandbox: Boolean
  }

  input StripeConfigurationInput {
    publishable_key: String
    secret_key: String
  }

  input AddonInput {
    _id: ID
    title: String!
    description: String
    quantity_minimum: Int
    quantity_maximum: Int
    options: [OptionInput]
  }

  input OptionInput {
    _id: ID
    title: String!
    description: String
    price: Float
  }

  input CouponInput {
    _id: ID
    code: String!
    discount: Float
    enabled: Boolean
  }

  input RiderInput {
    _id: ID
    name: String!
    username: String!
    password: String
    phone: String
    available: Boolean
  }

  type Query {
    categories: [Category!]!
    allCategories(page: Int): [Category!]!
    foods(page: Int): [Food!]!
    foodByIds(ids: [String!]!): [Food!]!
    foodByCategory(category: String!, inStock: Boolean, onSale: Boolean, min: Float, max: Float, search: String): [Food!]!
    configuration: Configuration!
    allOrders(page: Int, rows: Int, search: String): [Order!]!
    orderCount: Int!
    orders(offset: Int): [Order!]!
    profile: User!
    users(page: Int): [User!]!
    addons: [Addon!]!
    Addons: [Addon!]!
    options: [Option!]!
    Options: [Option!]!
    allOptions(page: Int): [Option!]!
    allAddons(page: Int): [Addon!]!
    coupons: [Coupon!]!
    Coupons: [Coupon!]!
    reviews(offset: Int): [Review!]!
    allReviews(offset: Int): [Review!]!
    riders: [Rider!]!
    availableRiders: [Rider!]!
    assignedOrders(id: String!): [Order!]!
    unassignedOrders: [Order!]!
    getDashboardTotal(starting_date: String, ending_date: String): DashboardTotal!
    getDashboardSales(starting_date: String, ending_date: String): [DashboardDay!]!
    getDashboardOrders(starting_date: String, ending_date: String): DashboardData!
    getDashboardData(starting_date: String, ending_date: String): DashboardData!
    orderStatuses: [String!]!
    paymentStatuses: [String!]!
    getOrderStatuses: [String!]!
    getPaymentStatuses: [String!]!
  }

  type Mutation {
    adminLogin(email: String!, password: String!): LoginResponse!
    login(email: String, password: String, type: String!, name: String, facebookId: String, appleId: String, notificationToken: String): LoginResponse!
    createUser(userInput: UserInput!): LoginResponse!
    createFood(foodInput: FoodInput!): Food!
    editFood(foodInput: FoodInput!): Food!
    deleteFood(id: String!): Food!
    createCategory(category: CategoryInput!): Category!
    editCategory(category: CategoryInput!): Category!
    deleteCategory(id: String!): Category!
    reorderCategories(ids: [ID!]!): [Category!]!
    reorderFoods(ids: [ID!]!): [Food!]!
    placeOrder(orderInput: [OrderInput!]!, paymentMethod: String!, address: AddressInput!, couponCode: String, cashTender: Float): Order!
    updateOrderStatus(id: String!, status: String!, reason: String): Order!
    updatePaymentStatus(id: String!, status: String!): Order!
    updateOrderKitchenDetails(id: String!, input: OrderCustomerInput!): Order!
    updateStatus(id: String!, status: Boolean!, reason: String): User!
    saveDeliveryConfiguration(configurationInput: DeliveryConfigurationInput!): Configuration!
    saveCurrencyConfiguration(configurationInput: CurrencyConfigurationInput!): Configuration!
    saveOrderConfiguration(configurationInput: OrderConfigurationInput!): Configuration!
    saveEmailConfiguration(configurationInput: EmailConfigurationInput!): Configuration!
    saveMongoConfiguration(configurationInput: MongoConfigurationInput!): Configuration!
    savePaypalConfiguration(configurationInput: PaypalConfigurationInput!): Configuration!
    saveStripeConfiguration(configurationInput: StripeConfigurationInput!): Configuration!
    createAddons(addonInput: [AddonInput!]): [Addon!]!
    editAddon(addonInput: AddonInput!): Addon!
    deleteAddon(id: String!): Addon!
    createOptions(optionInput: [OptionInput!]): [Option!]!
    editOption(optionInput: OptionInput!): Option!
    deleteOption(id: String!): Option!
    createCoupon(couponInput: CouponInput!): Coupon!
    editCoupon(couponInput: CouponInput!): Coupon!
    deleteCoupon(id: String!): Coupon!
    createRider(riderInput: RiderInput!): Rider!
    editRider(riderInput: RiderInput!): Rider!
    deleteRider(id: String!): Rider!
    toggleAvailablity(id: String): Rider!
    assignRider(id: String!, riderId: String!): Order!
    assignOrder(id: String!, riderId: String!): Order!
    updateOrderStatusRider(id: String!, status: String!, riderId: String): Order!
    uploadToken(pushToken: String!): User!
    sendNotificationUser(notificationTitle: String, notificationBody: String!): Boolean!
    resetPassword(password: String!, token: String!): Boolean!
    riderLogin(username: String!, password: String!, notificationToken: String): LoginResponse!
  }

  type Subscription {
    subscribePlaceOrder: PlaceOrderPayload!
    subscriptionAssignRider(riderId: String!): JSON
    unassignedOrder: JSON
  }
`;

module.exports = typeDefs;
