import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
  private client = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
  });

  async getShifts(params?: {
    page?: number;
    limit?: number;
    status?: 'OPEN' | 'CLOSED';
    from?: string;
    to?: string;
    cashierId?: string;
  }): Promise<ShiftsListResponse> {
    const response = await this.client.get('/sessions/admin/all', {
      params,
    });
    return response.data;
  }

  async getShiftDetails(id: string): Promise<any> {
    const response = await this.client.get(`/sessions/${id}`);
    return response.data;
  }
}

export const shiftsApi = new ShiftsApi();
