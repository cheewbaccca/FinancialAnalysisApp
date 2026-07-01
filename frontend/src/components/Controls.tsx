// src/components/Controls.tsx
import React from 'react';
import { RefreshCw, ChevronDown } from 'lucide-react';

interface ControlsProps {
  symbols: string[];
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  limit: number;
  onLimitChange: (limit: number) => void;
  onRefresh: () => void;
  isLoading: boolean;
  theme: 'dark' | 'light';
}

const TIMEFRAMES = [
  { label: '1m', value: '1min' },
  { label: '5m', value: '5min' },
  { label: '15m', value: '15min' },
  { label: '1h', value: '1h' },
  { label: '1d', value: 'daily' },
  { label: '1w', value: 'week' },
  { label: '1M', value: 'month' },
];

const LIMITS = [20, 50, 100, 200, 500];

export const Controls: React.FC<ControlsProps> = ({
  symbols,
  selectedSymbol,
  onSymbolChange,
  timeframe,
  onTimeframeChange,
  limit,
  onLimitChange,
  onRefresh,
  isLoading,
  theme,
}) => {
  const isDark = theme === 'dark';
  const bg = isDark ? '#2a2e39' : '#f0f0f0';
  const text = isDark ? '#d1d4dc' : '#1e222d';
  const border = isDark ? '#3a3e49' : '#e0e0e0';
  const inputBg = isDark ? '#1e222d' : '#ffffff';

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '12px',
      padding: '16px 24px',
      background: bg,
      borderBottom: `1px solid ${border}`,
    }}>
      {/* Выбор инструмента */}
      <div style={{ position: 'relative' }}>
        <select
          value={selectedSymbol}
          onChange={(e) => onSymbolChange(e.target.value)}
          style={{
            padding: '8px 32px 8px 14px',
            fontSize: '14px',
            borderRadius: '6px',
            background: inputBg,
            color: text,
            border: `1px solid ${border}`,
            cursor: 'pointer',
            appearance: 'none',
            minWidth: '100px',
          }}
          disabled={isLoading}
        >
          {symbols.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <ChevronDown size={16} style={{
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#787b86',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Таймфреймы */}
      <div style={{ display: 'flex', gap: '4px', background: inputBg, padding: '4px', borderRadius: '6px', border: `1px solid ${border}` }}>
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.value}
            onClick={() => onTimeframeChange(tf.value)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              borderRadius: '4px',
              background: timeframe === tf.value ? '#2962FF' : 'transparent',
              color: timeframe === tf.value ? '#fff' : text,
              border: 'none',
              cursor: 'pointer',
              fontWeight: timeframe === tf.value ? 600 : 400,
            }}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Количество свечей */}
      <div style={{ position: 'relative' }}>
        <select
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          style={{
            padding: '8px 32px 8px 14px',
            fontSize: '14px',
            borderRadius: '6px',
            background: inputBg,
            color: text,
            border: `1px solid ${border}`,
            cursor: 'pointer',
            appearance: 'none',
          }}
          disabled={isLoading}
        >
          {LIMITS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <ChevronDown size={16} style={{
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#787b86',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Кнопка обновления */}
      <button
        onClick={onRefresh}
        disabled={isLoading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          fontSize: '14px',
          borderRadius: '6px',
          background: isLoading ? '#555' : '#2962FF',
          color: '#fff',
          border: 'none',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          fontWeight: 500,
        }}
      >
        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        {isLoading ? 'Загрузка...' : 'Обновить'}
      </button>
    </div>
  );
};