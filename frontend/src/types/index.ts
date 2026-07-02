// src/types/index.ts
export interface CandleData {
  time: string;   // ISO datetime
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartData {
  time: string;
  value: number; // для линейного графика
}

export interface Instrument {
  instrumentId: number;
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  currency: string;
  isActive: boolean;
}

export interface WatchlistItemDto {
  instrumentId: number;
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  position: number;
}

export interface AuthUser {
  userId: number;
  email: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  userId: number;
  email: string;
  role: string;
  expiresAt: string;
}

// 'none' — обычный курсор (панорамирование/зум графика включены).
// Остальные — активный инструмент рисования (панорамирование выключено на время рисования).
export type DrawingToolType = 'none' | 'trendline' | 'channel' | 'horizontal' | 'brush';
