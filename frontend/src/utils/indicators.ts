// src/utils/indicators.ts
import { SMA, RSI } from 'technicalindicators';

export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SMAData {
  time: number;
  value: number;
  period: number;
}

export interface RSIData {
  time: number;
  value: number;
}

export const calculateSMA = (data: CandleData[], period: number): SMAData[] => {
  if (data.length < period) return [];
  const closes = data.map(d => d.close);
  const smaValues = SMA.calculate({ period, values: closes });
  return smaValues.map((value, index) => ({
    time: Math.floor(new Date(data[index + period - 1].time).getTime() / 1000),
    value: value,
    period: period,
  }));
};

export const calculateRSI = (data: CandleData[], period: number = 14): RSIData[] => {
  if (data.length < period) return [];
  const closes = data.map(d => d.close);
  const rsiValues = RSI.calculate({ period, values: closes });
  return rsiValues.map((value, index) => ({
    time: Math.floor(new Date(data[index + period - 1].time).getTime() / 1000),
    value: value,
  }));
};

export const getAllSMAs = (data: CandleData[], periods: number[] = [20, 50, 200]) => {
  return periods
    .filter(p => data.length >= p)
    .map(period => ({
      period,
      data: calculateSMA(data, period),
    }));
};