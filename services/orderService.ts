import api from './api';
import type {
  Order,
  OrderStatus,
  OrdersResponse,
  CreateOrderBody,
  SummaryResponse,
} from '@/types';

export const orderService = {
  // GET /api/client-orders
  list: (page = 1, perPage = 15, status?: OrderStatus) =>
    api
      .get<OrdersResponse>('/api/client-orders', {
        params: { page, per_page: perPage, ...(status ? { status } : {}) },
      })
      .then((r) => r.data),

  // POST /api/client-orders
  create: (body: CreateOrderBody) =>
    api
      .post<{ message: string; status: boolean }>('/api/client-orders', body)
      .then((r) => r.data),

  // PUT /api/client-orders/:id — status change
  updateStatus: (id: string, status: OrderStatus, rejectionReason?: string) =>
    api
      .put<{ message: string; status: boolean }>(`/api/client-orders/${id}`, {
        status,
        ...(rejectionReason !== undefined ? { rejectionReason } : {}),
      })
      .then((r) => r.data),

  // PUT /api/client-orders/:id — edit product/price/qty
  updateProduct: (
    id: string,
    fields: {
      product?: string;
      quantity?: number;
      price?: number;
      secondProduct?: { product?: string | null; quantity?: number; price?: number } | null;
    }
  ) =>
    api
      .put<{ message: string; status: boolean }>(`/api/client-orders/${id}`, fields)
      .then((r) => r.data),

  // PATCH /api/client-orders/:id — mark viewed by seller
  markViewed: (id: string) =>
    api.patch<{ status: boolean }>(`/api/client-orders/${id}`).then((r) => r.data),

  // GET /api/client-orders/summary
  summary: (from?: string, to?: string) =>
    api
      .get<SummaryResponse>('/api/client-orders/summary', {
        params: { ...(from ? { from } : {}), ...(to ? { to } : {}) },
      })
      .then((r) => r.data),
};
