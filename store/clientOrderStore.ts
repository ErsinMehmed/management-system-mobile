import { create } from 'zustand';
import api from '@/services/api';
import type {
  Order,
  OrdersResponse,
  SummaryResponse,
  SellerStockEntry,
  ClientPhone,
} from '@/types';

// ─── History types ────────────────────────────────────────────────────────────

export interface HistoryProduct {
  name?: string;
  flavor?: string;
  weight?: number;
  puffs?: number;
  count?: number;
  quantity: number;
  price: number;
  payout: number;
  deliveryCost: number;
}

export interface HistoryPayment {
  paidAt: string | null;
  orderCount: number;
  totalRevenue: number;
  totalPayout: number;
  totalDelivery: number;
  revenueConfirmed: boolean;
  products: HistoryProduct[];
}

export interface HistorySeller {
  sellerId: string;
  sellerName: string;
  payments: HistoryPayment[];
  orderCount: number;
  totalRevenue: number;
  totalPayout: number;
  totalDelivery: number;
}

export interface HistoryResponse {
  isSeller: boolean;
  sellers: HistorySeller[];
  grandTotal: number;
  grandPayout: number;
}

// ─── Order form ───────────────────────────────────────────────────────────────

export interface OrderFormData {
  phone: string;
  product: string;
  quantity: string;
  price: string;
  address: string;
  note: string;
  assignedTo: string;
  contactMethod: string;
  deliveryCost: string;
  product2: string;
  quantity2: string;
  price2: string;
  distributorPayout: string;
}

const initialOrderData: OrderFormData = {
  phone: '',
  product: '',
  quantity: '',
  price: '',
  address: '',
  note: '',
  assignedTo: '',
  contactMethod: '',
  deliveryCost: '',
  product2: '',
  quantity2: '',
  price2: '',
  distributorPayout: '',
};

// ─── Store ────────────────────────────────────────────────────────────────────

interface ClientOrderState {
  // Orders
  orders: OrdersResponse;
  isLoading: boolean;
  isCreating: boolean;
  isLoadingMore: boolean;
  currentPage: number;
  perPage: number;
  orderData: OrderFormData;

  // Summary
  summary: SummaryResponse | null;
  isSummaryLoading: boolean;

  // History
  history: HistoryResponse;
  isHistoryLoading: boolean;

  // Stock
  stock: { sellers: SellerStockEntry[] };
  isStockLoading: boolean;

  // Clients
  clients: ClientPhone[];
  clientsTotal: number;
  clientsHasMore: boolean;
  isClientsLoading: boolean;
  isClientsLoadingMore: boolean;

  // Actions
  setOrderData: (data: Partial<OrderFormData>) => void;
  clearOrderData: () => void;
  loadOrders: (page?: number) => Promise<void>;
  loadMoreOrders: () => Promise<void>;
  createOrder: () => Promise<boolean>;
  updateStatus: (id: string, status: string, rejectionReason?: string) => Promise<void>;
  updateProductPrice: (id: string, fields: object) => Promise<boolean>;
  markAsViewed: (id: string) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  loadSummary: (from?: string | null, to?: string | null) => Promise<void>;
  loadHistory: () => Promise<void>;
  confirmRevenue: (sellerId: string, paidAt: string | null) => Promise<void>;
  markSellerAsPaid: (sellerId: string) => Promise<boolean>;
  loadStock: () => Promise<void>;
  saveSellerStock: (sellerId: string, products: { productId: string; stock: number }[]) => Promise<boolean>;
  loadClients: (page: number, search: string, replace?: boolean) => Promise<void>;
  saveClientName: (phone: string, name: string) => Promise<void>;
}

const emptyOrders: OrdersResponse = {
  items: [],
  pagination: { current_page: 1, total_pages: 1, total_results: 0, per_page: 15 },
  dailyCount: 0,
};

const emptyHistory: HistoryResponse = {
  isSeller: false,
  sellers: [],
  grandTotal: 0,
  grandPayout: 0,
};

export const useClientOrderStore = create<ClientOrderState>((set, get) => ({
  orders: emptyOrders,
  isLoading: true,
  isCreating: false,
  isLoadingMore: false,
  currentPage: 1,
  perPage: 15,
  orderData: { ...initialOrderData },

  summary: null,
  isSummaryLoading: false,

  history: emptyHistory,
  isHistoryLoading: false,

  stock: { sellers: [] },
  isStockLoading: false,

  clients: [],
  clientsTotal: 0,
  clientsHasMore: false,
  isClientsLoading: false,
  isClientsLoadingMore: false,

  setOrderData: (data) =>
    set((s) => ({ orderData: { ...s.orderData, ...data } })),

  clearOrderData: () => set({ orderData: { ...initialOrderData } }),

  loadOrders: async (page) => {
    const p = page ?? get().currentPage;
    set({ isLoading: true, currentPage: p });
    try {
      const { data } = await api.get<OrdersResponse>('/api/client-orders', {
        params: { page: p, per_page: get().perPage },
      });
      set({ orders: data });
    } catch { /* ignore */ } finally {
      set({ isLoading: false });
    }
  },

  loadMoreOrders: async () => {
    if (get().isLoadingMore) return;
    const { orders } = get();
    const nextPage = (orders.pagination?.current_page ?? 0) + 1;
    if (nextPage > (orders.pagination?.total_pages ?? 1)) return;

    set({ isLoadingMore: true });
    try {
      const { data } = await api.get<OrdersResponse>('/api/client-orders', {
        params: { page: nextPage, per_page: get().perPage },
      });
      set((s) => ({
        orders: { ...data, items: [...(s.orders.items ?? []), ...(data.items ?? [])] },
      }));
    } catch { /* ignore */ } finally {
      set({ isLoadingMore: false });
    }
  },

  createOrder: async () => {
    set({ isCreating: true });
    try {
      const orderData = get().orderData;
      const body = {
        phone: orderData.phone,
        product: orderData.product,
        quantity: parseInt(orderData.quantity) || 1,
        price: parseFloat(orderData.price) || 0,
        ...(orderData.address && { address: orderData.address }),
        ...(orderData.note && { note: orderData.note }),
        ...(orderData.contactMethod && { contactMethod: orderData.contactMethod }),
        ...(orderData.assignedTo && { assignedTo: orderData.assignedTo }),
        ...(orderData.product2 && { product2: orderData.product2 }),
        ...(orderData.quantity2 && { quantity2: parseInt(orderData.quantity2) || 1 }),
        ...(orderData.price2 && { price2: parseFloat(orderData.price2) || 0 }),
        ...(orderData.distributorPayout && { distributorPayout: parseFloat(orderData.distributorPayout) || 0 }),
      };

      const { data } = await api.post<{ status: boolean; message: string }>(
        '/api/client-orders',
        body
      );
      if (data.status) {
        get().clearOrderData();
        await get().loadOrders(1);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      set({ isCreating: false });
    }
  },

  updateStatus: async (id, status, rejectionReason = '') => {
    try {
      await api.put(`/api/client-orders/${id}`, { status, rejectionReason });
      await get().loadOrders();
    } catch { /* ignore */ }
  },

  updateProductPrice: async (id, fields) => {
    const { data } = await api.put<{ status: boolean }>(`/api/client-orders/${id}`, fields);
    return data.status;
  },

  markAsViewed: async (id) => {
    await api.patch(`/api/client-orders/${id}`);
  },

  deleteOrder: async (id) => {
    try {
      await api.delete(`/api/client-orders/${id}`);
      await get().loadOrders();
    } catch { /* ignore */ }
  },

  loadSummary: async (from = null, to = null) => {
    set({ isSummaryLoading: true });
    try {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const { data } = await api.get<SummaryResponse>('/api/client-orders/summary', { params });
      set({ summary: data });
    } catch { /* ignore */ } finally {
      set({ isSummaryLoading: false });
    }
  },

  loadHistory: async () => {
    set({ isHistoryLoading: true });
    try {
      const { data } = await api.get<HistoryResponse>('/api/client-orders/history');
      set({ history: data });
    } catch { /* ignore */ } finally {
      set({ isHistoryLoading: false });
    }
  },

  confirmRevenue: async (sellerId, paidAt) => {
    // Optimistic update
    set((s) => ({
      history: {
        ...s.history,
        sellers: s.history.sellers.map((seller) => {
          if (String(seller.sellerId) !== String(sellerId)) return seller;
          return {
            ...seller,
            payments: seller.payments.map((p) =>
              String(p.paidAt) === String(paidAt) ? { ...p, revenueConfirmed: true } : p
            ),
          };
        }),
      },
    }));
    try {
      await api.patch('/api/client-orders/payment-confirm', { sellerId, paidAt });
    } catch {
      await get().loadHistory();
    }
  },

  markSellerAsPaid: async (sellerId) => {
    const { data } = await api.post<{ status: boolean }>('/api/client-orders/pay', { sellerId });
    if (data.status) await get().loadSummary();
    return data.status;
  },

  loadStock: async () => {
    set({ isStockLoading: true });
    try {
      const { data } = await api.get<{ sellers: SellerStockEntry[] }>('/api/seller-stock');
      set({ stock: data });
    } catch { /* ignore */ } finally {
      set({ isStockLoading: false });
    }
  },

  saveSellerStock: async (sellerId, products) => {
    const { data } = await api.post<{ status: boolean }>('/api/seller-stock', { sellerId, products });
    if (data.status) await get().loadStock();
    return data.status;
  },

  loadClients: async (page, search, replace = false) => {
    if (replace) {
      set({ isClientsLoading: true });
    } else {
      set({ isClientsLoadingMore: true });
    }
    try {
      const { data } = await api.get<{ items: ClientPhone[]; hasMore: boolean; total: number }>(
        '/api/client-phones',
        { params: { page, search } }
      );
      set((s) => ({
        clients: replace ? data.items : [...s.clients, ...data.items],
        clientsHasMore: data.hasMore,
        clientsTotal: data.total,
      }));
    } catch { /* ignore */ } finally {
      set({ isClientsLoading: false, isClientsLoadingMore: false });
    }
  },

  saveClientName: async (phone, name) => {
    await api.put('/api/client-phones', { phone, name });
    set((s) => ({
      clients: s.clients.map((c) => (c.phone === phone ? { ...c, name } : c)),
    }));
  },
}));
