// ─── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole = 'Super Admin' | 'Admin' | 'Seller';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profile_image: string | null;
}

// ─── Products ─────────────────────────────────────────────────────────────────

export interface ProductRef {
  _id: string;
  name: string;
  weight?: number;
  flavor?: string;
  puffs?: number;
  count?: number;
  image_url?: string;
}

export interface Product extends ProductRef {
  price: number;
  availability: number;
  sell_prices: number[];
  hidden: boolean;
  image_url?: string;
  units_per_box?: number;
  category?: { _id: string; name: string };
}

// ─── Client Orders ────────────────────────────────────────────────────────────

export type OrderStatus = 'нова' | 'доставена' | 'отказана';

export interface SecondProduct {
  product: ProductRef | null;
  quantity: number;
  price: number;
  payout: number;
}

export interface Order {
  _id: string;
  orderNumber: number;
  phone: string;
  isNewClient: boolean;
  product: ProductRef;
  quantity: number;
  price: number;
  address?: string;
  note?: string;
  contactMethod?: string;
  status: OrderStatus;
  assignedTo: { _id: string; name: string } | null;
  payout: number;
  isPaid: boolean;
  deliveryCost?: number;
  secondProduct?: SecondProduct;
  rejectionReason?: string;
  viewedBySeller?: boolean;
  revenueConfirmed?: boolean;
  distributorPayout?: number;
  statusChangedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrdersResponse {
  items: Order[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_results: number;
    per_page: number;
  };
  dailyCount: number;
}

export interface CreateOrderBody {
  phone: string;
  product: string;          // ObjectId string
  quantity: number;
  price: number;
  address?: string;
  note?: string;
  contactMethod?: string;
  assignedTo?: string;      // ObjectId — Admin only
  product2?: string;
  quantity2?: number;
  price2?: number;
  distributorPayout?: number; // Super Admin only
}

// ─── Seller Stock ─────────────────────────────────────────────────────────────

export interface StockProduct {
  stockId: string;
  productId: string;
  productName: string;
  productWeight?: number;
  productFlavor?: string;
  productPuffs?: number;
  productCount?: number;
  productImage?: string | null;
  stock: number;
}

export interface SellerStockEntry {
  sellerId: string;
  sellerName: string;
  profileImage: string | null;
  products: StockProduct[];
}

// ─── Client Phones ────────────────────────────────────────────────────────────

export interface ClientPhone {
  phone: string;
  name: string;
  lastOrder: string;
  orderCount: number;
}

export interface ClientNote {
  _id: string;
  text: string;
  createdAt: string;
  createdBy?: { _id: string; name: string } | null;
}

export interface ClientHistoryOrder {
  _id: string;
  orderNumber: number;
  status: OrderStatus;
  quantity: number;
  price: number;
  createdAt: string;
  product?: { name?: string; weight?: number; flavor?: string; puffs?: number; count?: number } | null;
  assignedTo?: { _id: string; name: string } | null;
}

export interface ClientFavoriteProduct {
  name: string;
  weight?: number;
  quantity: number;
  orders: number;
}

export interface ClientProfileSummary {
  totalOrders: number;
  totalRevenue: number;
  firstOrder: string | null;
  lastOrder: string | null;
  delivered: number;
  rejected: number;
}

export interface ClientProfile {
  phone: string;
  name: string;
  notes: ClientNote[];
  orders: ClientHistoryOrder[];
  summary: ClientProfileSummary;
  favoriteProduct: ClientFavoriteProduct | null;
}

// ─── Summary ──────────────────────────────────────────────────────────────────

// Seller summary
export interface SellerSummaryItem {
  _id: string;
  totalQuantity: number;
  totalRevenue: number;
  totalDelivery: number;
  paidPayout: number;
  unpaidCount: number;
  product: ProductRef & { category?: { _id: string; name: string } };
}

export interface SellerSummaryResponse {
  bySeller: false;
  items: SellerSummaryItem[];
  grandTotal: number;
  grandDelivery: number;
  grandPaidPayout: number;
}

// Admin summary
export interface AdminSummarySellerItem {
  product: string;
  totalQuantity: number;
  totalRevenue: number;
  totalPayout: number;
  totalDelivery: number;
  totalDistributorPayout: number;
  unpaidPayout: number;
  unpaidCount: number;
}

export interface AdminSummarySeller {
  _id: string;
  sellerName: string;
  items: AdminSummarySellerItem[];
  sellerTotal: number;
  sellerPayout: number;
  sellerDelivery: number;
  sellerDistributorPayout: number;
  sellerUnpaidPayout: number;
  sellerUnpaidCount: number;
}

export interface AdminSummaryResponse {
  bySeller: true;
  sellers: AdminSummarySeller[];
  grandTotal: number;
  grandPayout: number;
  grandPaidPayout: number;
  grandDistributorPayout: number;
}

export type SummaryResponse = SellerSummaryResponse | AdminSummaryResponse;

// ─── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
  _id: string;
  type: 'created' | 'updated' | 'deleted';
  orderId: string;
  orderNumber: number;
  changedBy: string;
  changedByUserId: string;
  status?: OrderStatus;
  change?: 'status' | 'edit';
  assignedTo: string | null;
  readBy: string[];
  createdAt: string;
}

export interface NotificationsResponse {
  items: Notification[];
  unreadCount: number;
  hasMore: boolean;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface UserListItem {
  _id: string;
  name: string;
  percent: number;
  target: number;
}
