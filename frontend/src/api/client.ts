// src/api/client.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5098/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

// Добавляем refreshData
export const refreshData = async (symbol: string, limit: number = 100) => {
  const response = await apiClient.post(`/HistoricalPrices/refresh/${symbol}?limit=${limit}`);
  return response.data;
};