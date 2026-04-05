import { apiClient } from '@/lib/apiClient';

export interface SalesListItem {
  id: string;
  reference: string;
  cashierId: string;
  cashierName: string;
  total: number;
  status: string;
  createdAt: string;
}

export interface SalesListResponse {
  page: number;
  limit: number;
  total: number;
  pages: number;
  items: SalesListItem[];
}

export interface DashboardMetrics {
  today: {
    sales: number;
    revenue: number;
    transactions: number;
    averageTransaction: number;
  };
  thisMonth: {
    sales: number;
    revenue: number;
    transactions: number;
  };
  thisYear: {
    sales: number;
    revenue: number;
    transactions: number;
  };
  topCashiers: Array<{
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
  activeShifts: number;
}

export interface InventoryMetrics {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
}

export interface RefundRecord {
  id: string;
  saleId: string;
  reason: string;
  status: string;
  createdAt: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
}

export interface RefundListResponse {
  page: number;
  limit: number;
  total: number;
  pages: number;
  items: RefundRecord[];
}

export interface PendingRefundsResponse {
  items: RefundRecord[];
  total: number;
}

export interface StoreSettingsResponse {
  [key: string]: unknown;
}

class AdminApi {
  // ========================
  // SALES
  // ========================
  async getSales(params?: {
    page?: number;
    limit?: number;
    from?: string;
    to?: string;
    cashierId?: string;
  }): Promise<SalesListResponse> {
    const response = await apiClient.get('/sales', { params });
    return response.data;
  }

  // ========================
  // DASHBOARD
  // ========================
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const response = await apiClient.get('/reports/dashboard');
    return response.data;
  }

  async getInventoryMetrics(): Promise<InventoryMetrics> {
    const response = await apiClient.get('/reports/inventory');
    return response.data;
  }

  // ========================
  // REFUNDS
  // ========================
  async getRefunds(params?: {
    page?: number;
    limit?: number;
    from?: string;
    to?: string;
  }): Promise<RefundListResponse> {
    const response = await apiClient.get('/refunds', { params });
    return response.data;
  }

  async getPendingRefunds(): Promise<PendingRefundsResponse> {
    const response = await apiClient.get('/refunds/pending-approvals');
    return response.data;
  }

  async approveRefund(refundId: string): Promise<RefundRecord> {
    const response = await apiClient.patch(`/refunds/${refundId}/approve`);
    return response.data;
  }

  async rejectRefund(refundId: string, reason?: string): Promise<RefundRecord> {
    const response = await apiClient.patch(`/refunds/${refundId}/reject`, {
      reason,
    });
    return response.data;
  }

  // ========================
  // SETTINGS
  // ========================
  async getStoreSettings(): Promise<StoreSettingsResponse> {
    const response = await apiClient.get('/settings');
    return response.data;
  }

  async updateStoreSettings(data: StoreSettingsResponse): Promise<StoreSettingsResponse> {
    const response = await apiClient.patch('/settings', data);
    return response.data;
  }
}

export const adminApi = new AdminApi();