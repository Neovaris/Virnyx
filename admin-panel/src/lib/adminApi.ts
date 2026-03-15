import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

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
}

export interface InventoryMetrics {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
}

class AdminApi {
  private client = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
  });

  // Sales endpoints
  async getSales(params?: {
    page?: number;
    limit?: number;
    from?: string;
    to?: string;
    cashierId?: string;
  }): Promise<SalesListResponse> {
    const response = await this.client.get('/sales', { params });
    return response.data;
  }

  // Dashboard endpoints
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const response = await this.client.get('/reports/dashboard');
    return response.data;
  }

  async getInventoryMetrics(): Promise<InventoryMetrics> {
    const response = await this.client.get('/reports/inventory');
    return response.data;
  }

  // Refunds
  async getRefunds(params?: {
    page?: number;
    limit?: number;
    from?: string;
    to?: string;
  }): Promise<any> {
    const response = await this.client.get('/refunds', { params });
    return response.data;
  }

  // Settings
  async getStoreSettings(): Promise<any> {
    const response = await this.client.get('/settings');
    return response.data;
  }

  async updateStoreSettings(data: any): Promise<any> {
    const response = await this.client.patch('/settings', data);
    return response.data;
  }
}

export const adminApi = new AdminApi();
