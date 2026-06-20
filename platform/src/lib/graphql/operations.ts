import { gql } from '@apollo/client';

export const CATEGORIES = gql`
  query Categories {
    categories { _id title description img_menu }
  }
`;

export const FOOD_BY_CATEGORY = gql`
  query FoodByCategory($category: String!) {
    foodByCategory(category: $category, inStock: true) {
      _id title description img_url stock
      variations { _id title price discounted addons { _id title options { _id title price } } }
    }
  }
`;

export const CONFIGURATION = gql`
  query Configuration {
    configuration { currency currency_symbol delivery_charges }
  }
`;

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!, $type: String!) {
    login(email: $email, password: $password, type: $type) {
      userId token name email phone is_active
    }
  }
`;

export const LOGIN_SOCIAL = gql`
  mutation LoginSocial(
    $email: String
    $password: String
    $type: String!
    $name: String
    $facebookId: String
    $appleId: String
  ) {
    login(
      email: $email
      password: $password
      type: $type
      name: $name
      facebookId: $facebookId
      appleId: $appleId
    ) {
      userId token name email phone is_active
    }
  }
`;

export const CREATE_USER = gql`
  mutation CreateUser($email: String!, $password: String!, $name: String!, $phone: String!) {
    createUser(userInput: { email: $email, password: $password, name: $name, phone: $phone }) {
      userId token name email phone
    }
  }
`;

export const PROFILE = gql`
  query Profile {
    profile {
      _id name phone email
      addresses { _id label delivery_address details latitude longitude selected }
    }
  }
`;

export const MY_ORDERS = gql`
  query Orders($offset: Int) {
    orders(offset: $offset) {
      _id order_id order_status order_amount payment_method createdAt
      user { name email phone }
      items { quantity food { title img_url } variation { title price } }
    }
  }
`;

export const PLACE_ORDER = gql`
  mutation PlaceOrder($orderInput: [OrderInput!]!, $paymentMethod: String!, $address: AddressInput!) {
    placeOrder(orderInput: $orderInput, paymentMethod: $paymentMethod, address: $address) {
      _id order_id order_status order_amount
    }
  }
`;

export const ADMIN_LOGIN = gql`
  mutation AdminLogin($email: String!, $password: String!) {
    adminLogin(email: $email, password: $password) { userId token name email }
  }
`;

export const ALL_ORDERS = gql`
  query AllOrders($page: Int, $rows: Int) {
    allOrders(page: $page, rows: $rows) {
      _id order_id order_status order_amount delivery_charges payment_method payment_status createdAt
      user { _id name phone }
      rider { _id name }
      delivery_address { delivery_address details label latitude longitude }
      items { quantity food { title } variation { title price } addons { title options { title } } }
    }
  }
`;

export const UPDATE_PAYMENT_STATUS = gql`
  mutation UpdatePaymentStatus($id: String!, $status: String!) {
    updatePaymentStatus(id: $id, status: $status) { _id payment_status }
  }
`;

export const UPDATE_ORDER_KITCHEN = gql`
  mutation UpdateOrderKitchen($id: String!, $input: OrderCustomerInput!) {
    updateOrderKitchenDetails(id: $id, input: $input) {
      _id order_id payment_status payment_method
      user { name phone }
      delivery_address { delivery_address details label latitude longitude }
    }
  }
`;

export const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($id: String!, $status: String!, $reason: String) {
    updateOrderStatus(id: $id, status: $status, reason: $reason) { _id order_status }
  }
`;

export const SUBSCRIBE_PLACE_ORDER = gql`
  subscription SubscribePlaceOrder {
    subscribePlaceOrder {
      origin
      order {
        _id order_id order_status order_amount delivery_charges payment_method payment_status createdAt
        user { name phone }
        delivery_address { delivery_address details label latitude longitude }
        items { quantity food { title } variation { title price } addons { title options { title } } }
      }
    }
  }
`;

export const RIDER_LOGIN = gql`
  mutation RiderLogin($username: String!, $password: String!) {
    riderLogin(username: $username, password: $password) { userId token }
  }
`;

export const ASSIGNED_ORDERS = gql`
  query AssignedOrders($id: String!) {
    assignedOrders(id: $id) {
      _id order_id order_status order_amount delivery_charges payment_method payment_status createdAt
      user { name phone email }
      delivery_address { delivery_address details label latitude longitude }
      items { quantity food { title } variation { title price } addons { title options { title } } }
    }
  }
`;

export const UNASSIGNED_ORDERS = gql`
  query UnassignedOrders {
    unassignedOrders {
      _id order_id order_status order_amount delivery_charges payment_method payment_status createdAt
      user { name phone }
      delivery_address { delivery_address details label latitude longitude }
      items { quantity food { title } variation { title price } addons { title options { title } } }
    }
  }
`;

export const ASSIGN_ORDER = gql`
  mutation AssignOrder($id: String!, $riderId: String!) {
    assignOrder(id: $id, riderId: $riderId) { _id order_status rider { _id } }
  }
`;

export const UPDATE_ORDER_STATUS_RIDER = gql`
  mutation UpdateOrderStatusRider($id: String!, $status: String!, $riderId: String) {
    updateOrderStatusRider(id: $id, status: $status, riderId: $riderId) { _id order_status }
  }
`;

export const SUBSCRIPTION_ASSIGN_RIDER = gql`
  subscription SubscriptionAssignRider($riderId: String!) {
    subscriptionAssignRider(riderId: $riderId) {
      order {
        _id order_id order_status order_amount
        user { name phone }
        delivery_address { delivery_address details label latitude longitude }
        items { quantity food { title } }
      }
    }
  }
`;

export const SUBSCRIPTION_UNASSIGNED = gql`
  subscription SubscriptionUnAssignedOrder {
    unassignedOrder {
      order {
        _id order_id order_status order_amount
        user { name phone }
        delivery_address { delivery_address details label latitude longitude }
        items { quantity food { title } }
      }
    }
  }
`;
