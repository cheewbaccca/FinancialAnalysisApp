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