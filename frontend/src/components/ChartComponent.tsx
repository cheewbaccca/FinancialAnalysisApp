// src/components/ChartComponent.tsx
import React, { useEffect, useRef, useState } from 'react';
import { 
  createChart, 
  ColorType, 
  CandlestickSeries, 
  HistogramSeries,
  LineSeries
} from 'lightweight-charts';
import type { CandleData } from '../types';
import { calculateSMA, calculateRSI } from '../utils/indicators';

interface SMASetting {
  id: string;
  period: number;
  color: string;
  enabled: boolean;
}

interface ChartComponentProps {
  data: CandleData[];
  theme?: 'dark' | 'light';
  smaList: SMASetting[];
  showVolume: boolean;
  showRSI: boolean;
  rsiPeriod: number;
}

export const ChartComponent: React.FC<ChartComponentProps> = ({ 
  data, 
  theme = 'dark',
  smaList,
  showVolume,
  showRSI,
  rsiPeriod
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [currentCandle, setCurrentCandle] = useState<CandleData | null>(
    data.length > 0 ? data[data.length - 1] : null
  );
  const isMounted = useRef(true);

  const isDark = theme === 'dark';
  const textColor = isDark ? '#d1d4dc' : '#1e222d';
  const borderColor = isDark ? '#2a2e39' : '#e0e0e0';
  const bgColor = isDark ? '#1e222d' : '#f0f0f0';

  const rsiData = data.length > 0 && showRSI ? calculateRSI(data, rsiPeriod) : [];

  useEffect(() => {
    if (data.length > 0) {
      setCurrentCandle(data[data.length - 1]);
    }
  }, [data]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (e) {}
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
  layout: {
    background: { type: ColorType.Solid, color: isDark ? '#131722' : '#ffffff' },
    textColor: textColor,
    fontSize: 12,
  },
  grid: {
    vertLines: { color: isDark ? '#2a2e39' : '#e0e0e0' },
    horzLines: { color: isDark ? '#2a2e39' : '#e0e0e0' },
  },
  width: chartContainerRef.current.clientWidth,
  height: 700,
  timeScale: {
    timeVisible: true,
    secondsVisible: false,
    borderColor: borderColor,
  },
  rightPriceScale: {
    borderColor: borderColor,
    scaleMargins: {
      top: 0.05,
      bottom: 0.05,
    },
  },
  leftPriceScale: {
    visible: false,
  },
  handleScroll: {
    mouseWheel: true,
    pressedMouseMove: true,
    horzTouchDrag: true,
    vertTouchDrag: true,
  },
  handleScale: {
    axisPressedMouseMove: true,
    mouseWheel: true,
    pinch: true,
  },
  crosshair: {
    mode: 0,
  },
});

    // ===== 1. СВЕЧИ (0% - 70% высоты) =====
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      priceScaleId: 'right',
    });

    const chartData = data.map((item) => ({
      time: Math.floor(new Date(item.time).getTime() / 1000),
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    candlestickSeries.setData(chartData);

    chart.priceScale('right').applyOptions({
      scaleMargins: {
        top: 0.0,
        bottom: 0.30,
      },
    });

    // ===== SMA (только включенные) =====
    smaList
      .filter(s => s.enabled)
      .forEach((sma) => {
        if (data.length >= sma.period) {
          const smaPoints = calculateSMA(data, sma.period);
          if (smaPoints.length > 0) {
            const series = chart.addSeries(LineSeries, {
              color: sma.color,
              lineWidth: 2,
              priceLineVisible: false,
              lastValueVisible: true,
              priceScaleId: 'right',
            });
            series.setData(smaPoints.map(d => ({ time: d.time, value: d.value })));
          }
        }
      });

    // ===== 2. ОБЪЕМ (70% - 85% высоты) =====
    if (showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });

      const volumeData = data.map((item) => ({
        time: Math.floor(new Date(item.time).getTime() / 1000),
        value: item.volume,
        color: item.close >= item.open ? '#26a69a' : '#ef5350',
      }));
      volumeSeries.setData(volumeData);

      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.70,
          bottom: showRSI ? 0.15 : 0.0,
        },
      });
    }

    // ===== 3. RSI (85% - 100% высоты) =====
    if (showRSI && rsiData.length > 0) {
      const rsiSeries = chart.addSeries(LineSeries, {
        color: '#FF6D00',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        priceScaleId: 'rsi',
      });
      rsiSeries.setData(rsiData.map(d => ({ time: d.time, value: d.value })));

      chart.priceScale('rsi').applyOptions({
        scaleMargins: {
          top: showVolume ? 0.85 : 0.70,
          bottom: 0.0,
        },
        autoScale: false,
      });

      // Уровни 30 и 70
      [30, 70].forEach(level => {
        const line = chart.addSeries(LineSeries, {
          color: level === 30 ? '#26a69a' : '#ef5350',
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          priceScaleId: 'rsi',
        });
        if (rsiData.length > 0) {
          line.setData([
            { time: rsiData[0].time, value: level },
            { time: rsiData[rsiData.length - 1].time, value: level },
          ]);
        }
      });
    }

    chartRef.current = chart;

    // ===== КРОССХЕЙР =====
    chart.subscribeCrosshairMove((param) => {
      if (!isMounted.current) return;
      if (!param || !param.time) {
        if (data.length > 0) setCurrentCandle(data[data.length - 1]);
        return;
      }
      const candle = data.find(d => Math.floor(new Date(d.time).getTime() / 1000) === param.time);
      if (candle) {
        setCurrentCandle(candle);
      } else if (data.length > 0) {
        setCurrentCandle(data[data.length - 1]);
      }
    });

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        try {
          chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        } catch (e) {}
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch (e) {}
        chartRef.current = null;
      }
    };
  }, [data, isDark, smaList, showVolume, showRSI, rsiPeriod]);

  if (data.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          height: '700px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#787b86',
          background: isDark ? '#131722' : '#ffffff',
          borderRadius: '8px',
          border: `1px solid ${borderColor}`,
        }}
      >
        Нет данных для отображения
      </div>
    );
  }

  const formatPrice = (value: number) => value.toFixed(2);
  const formatVolume = (value: number) => {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
    if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K';
    return value.toString();
  };

  const calculateChangePercent = (candle: CandleData | null) => {
    if (!candle || candle.open === 0) return { value: 0, isPositive: true };
    const change = ((candle.close - candle.open) / candle.open) * 100;
    return { value: change, isPositive: change >= 0 };
  };

  const changeInfo = currentCandle ? calculateChangePercent(currentCandle) : { value: 0, isPositive: true };

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '8px',
          padding: '10px 16px',
          background: bgColor,
          borderRadius: '8px 8px 0 0',
          border: `1px solid ${borderColor}`,
          borderBottom: 'none',
        }}
      >
        <InfoItem label="Дата" value={currentCandle ? new Date(currentCandle.time).toLocaleDateString('ru-RU') : '-'} />
        <InfoItem label="Open" value={currentCandle ? formatPrice(currentCandle.open) : '-'} color="#d1d4dc" />
        <InfoItem label="High" value={currentCandle ? formatPrice(currentCandle.high) : '-'} color="#26a69a" />
        <InfoItem label="Low" value={currentCandle ? formatPrice(currentCandle.low) : '-'} color="#ef5350" />
        <InfoItem label="Close" value={currentCandle ? formatPrice(currentCandle.close) : '-'} color="#2962FF" />
        <InfoItem 
          label="Volume" 
          value={currentCandle ? formatVolume(currentCandle.volume) : '-'} 
          color="#787b86" 
        />
        <InfoItem 
          label="Change %" 
          value={currentCandle ? `${changeInfo.value >= 0 ? '+' : ''}${changeInfo.value.toFixed(2)}%` : '-'} 
          color={changeInfo.isPositive ? '#26a69a' : '#ef5350'}
        />
      </div>

      <div
        ref={chartContainerRef}
        style={{
          width: '100%',
          height: '700px',
          background: isDark ? '#131722' : '#ffffff',
          borderRadius: '0 0 8px 8px',
          border: `1px solid ${borderColor}`,
          borderTop: 'none',
          overflow: 'hidden',
        }}
      />
    </div>
  );
};

const InfoItem: React.FC<{
  label: string;
  value: string;
  color?: string;
}> = ({ label, value, color = '#d1d4dc' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
    <span style={{ fontSize: '10px', color: '#787b86', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {label}
    </span>
    <span style={{ fontSize: '14px', fontWeight: 600, color: color, fontFamily: 'monospace' }}>
      {value}
    </span>
  </div>
);