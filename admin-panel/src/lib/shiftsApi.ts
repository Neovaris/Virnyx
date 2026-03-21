import { apiClient } from '@/lib/apiClient';

export interface Cashier {
  id: string;
  fullName: string;
  email: string;
}

export interface ShiftSession {
  id: string;
  merchantId: string;
  storeId: string;
  cashierId: string;
  status: 'OPEN' | 'CLOSED';
  openingCash: number;
  closingCash: number | null;
  expectedCash: number | null;
  difference: number | null;
  note: string | null;
  openedAt: string;
  closedAt: string | null;
  cashier: Cashier;
}

export interface SalesSummary {
  count: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

export interface RefundsSummary {
  count: number;
  amount: number;
}

export interface ShiftWithSummary extends ShiftSession {
  summary: {
    sales: SalesSummary;
    refunds: RefundsSummary;
    payments: Record<string, number>;
  };
}

export interface ShiftsListResponse {
  page: number;
  limit: number;
  total: number;
  pages: number;
  items: ShiftWithSummary[];
}

class ShiftsApi {
  async getShifts(params?: {
    page?: number;
    limit?: number;
    status?: 'OPEN' | 'CLOSED';
    from?: string;
    to?: string;
    cashierId?: string;
  }): Promise<ShiftsListResponse> {
    const response = await apiClient.get('/sessions/admin/all', {
      params,
    });
    return response.data;
  }

  async getShiftDetails(id: string): Promise<any> {
    const response = await apiClient.get(`/sessions/${id}`);
    return response.data;
  }
}

export const shiftsApi = new ShiftsApi();