import axios from "axios";

export const API_BASE_URL = "http://localhost:4000";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("vrx_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});