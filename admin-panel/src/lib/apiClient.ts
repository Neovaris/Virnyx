import axios from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// ✅ ADD THIS INTERCEPTOR
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});