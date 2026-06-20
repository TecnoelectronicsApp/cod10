export interface Category {
  _id: string;
  title: string;
  description?: string;
  img_menu?: string;
}

export interface FoodVariation {
  _id: string;
  title: string;
  price: number;
  discounted?: number;
  addons?: Addon[];
}

export interface AddonOption {
  _id: string;
  title: string;
  price: number;
}

export interface Addon {
  _id: string;
  title: string;
  options: AddonOption[];
}

export interface Food {
  _id: string;
  title: string;
  description?: string;
  img_url?: string;
  stock?: number;
  variations: FoodVariation[];
}

export interface CartItem {
  key: string;
  foodId: string;
  title: string;
  img_url?: string;
  quantity: number;
  variation: { _id: string; title: string; price: number };
  addons: { _id: string; options: { _id: string; title: string; price: number }[] }[];
  unitPrice: number;
}

export interface Order {
  _id: string;
  order_id: string;
  order_status: string;
  order_amount: number;
  paid_amount?: number;
  delivery_charges?: number;
  payment_method?: string;
  payment_status?: string;
  createdAt?: string;
  user?: { _id?: string; name?: string; phone?: string; email?: string };
  rider?: { _id?: string; name?: string };
  delivery_address?: {
    delivery_address?: string;
    details?: string;
    label?: string;
    latitude?: string;
    longitude?: string;
  };
  items?: OrderItem[];
}

export interface OrderItem {
  quantity: number;
  food?: { title?: string; img_url?: string };
  variation?: { title?: string; price?: number };
  addons?: { title?: string; options?: { title?: string }[] }[];
}

export interface Address {
  _id?: string;
  label: string;
  delivery_address: string;
  details: string;
  latitude: string;
  longitude: string;
  selected?: boolean;
}
