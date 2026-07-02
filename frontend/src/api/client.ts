// src/api/client.ts
import axios from 'axios';
import type { AuthResponse, AuthUser, Instrument, WatchlistItemDto } from '../types';

const API_BASE_URL = 'http://localhost:5098/api';
const TOKEN_STORAGE_KEY = 'fa_token';
const USER_STORAGE_KEY = 'fa_user';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ===== Хранение токена авторизации =====
export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
};

export const getStoredUser = (): AuthUser | null => {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

const storeAuth = (auth: AuthResponse) => {
  localStorage.setItem(TOKEN_STORAGE_KEY, auth.token);
  localStorage.setItem(
    USER_STORAGE_KEY,
    JSON.stringify({ userId: auth.userId, email: auth.email, role: auth.role } as AuthUser)
  );
};

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
};

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuth();
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    return Promise.reject(error);
  }
);

// ===== Аутентификация =====
export const register = async (email: string, password: string): Promise<AuthUser> => {
  const response = await apiClient.post<AuthResponse>('/Auth/register', { email, password });
  storeAuth(response.data);
  return getStoredUser()!;
};

export const login = async (email: string, password: string): Promise<AuthUser> => {
  const response = await apiClient.post<AuthResponse>('/Auth/login', { email, password });
  storeAuth(response.data);
  return getStoredUser()!;
};

export const logout = () => {
  clearAuth();
};

// ===== Инструменты и котировки =====
export const getHistoricalPrices = async (symbol: string, limit: number = 100, timeframe: string = 'daily') => {
  const response = await apiClient.get(`/HistoricalPrices/${symbol}`, {
    params: { limit, timeframe },
  });
  return response.data;
};

export const getSymbols = async () => {
  const response = await apiClient.get('/Instruments/symbols');
  return response.data;
};

export const getInstruments = async (): Promise<Instrument[]> => {
  const response = await apiClient.get<Instrument[]>('/Instruments');
  return response.data;
};

export const refreshData = async (symbol: string, limit: number = 100) => {
  const response = await apiClient.post(`/HistoricalPrices/refresh/${symbol}?limit=${limit}`);
  return response.data;
};

// ===== Watchlist пользователя =====
export const getWatchlist = async (): Promise<WatchlistItemDto[]> => {
  const response = await apiClient.get<WatchlistItemDto[]>('/Watchlist');
  return response.data;
};

export const addToWatchlist = async (instrumentId: number): Promise<WatchlistItemDto> => {
  const response = await apiClient.post<WatchlistItemDto>('/Watchlist/items', { instrumentId });
  return response.data;
};

export const removeFromWatchlist = async (instrumentId: number): Promise<void> => {
  await apiClient.delete(`/Watchlist/items/${instrumentId}`);
};
