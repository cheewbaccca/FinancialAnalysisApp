// src/components/WatchlistManager.tsx
import React, { useState } from 'react';
import { ListPlus, X, Plus } from 'lucide-react';
import type { Instrument, WatchlistItemDto } from '../types';

interface WatchlistManagerProps {
  theme: 'dark' | 'light';
  watchlist: WatchlistItemDto[];
  allInstruments: Instrument[];
  onAdd: (instrumentId: number) => void;
  onRemove: (instrumentId: number) => void;
  isBusy?: boolean;
}

export const WatchlistManager: React.FC<WatchlistManagerProps> = ({
  theme,
  watchlist,
  allInstruments,
  onAdd,
  onRemove,
  isBusy = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const isDark = theme === 'dark';
  const bg = isDark ? '#2a2e39' : '#f0f0f0';
  const text = isDark ? '#d1d4dc' : '#1e222d';
  const border = isDark ? '#3a3e49' : '#e0e0e0';

  const watchlistIds = new Set(watchlist.map((w) => w.instrumentId));
  const available = allInstruments.filter((i) => !watchlistIds.has(i.instrumentId));

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          background: bg,
          color: text,
          border: `1px solid ${border}`,
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '13px',
        }}
      >
        <ListPlus size={16} />
        Мой список
        <span style={{ fontSize: '11px', color: '#787b86' }}>({watchlist.length})</span>
      </button>

      {expanded && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '8px',
            background: bg,
            border: `1px solid ${border}`,
            borderRadius: '8px',
            padding: '16px',
            minWidth: '320px',
            maxHeight: '420px',
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <span style={{ color: text, fontSize: '14px', fontWeight: 600 }}>В моём списке</span>
            {watchlist.length === 0 && (
              <div style={{ fontSize: '12px', color: '#787b86', marginTop: '6px' }}>
                Пока пусто — добавьте инструменты из списка ниже.
              </div>
            )}
            {watchlist.map((item) => (
              <div
                key={item.instrumentId}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}
              >
                <div>
                  <div style={{ color: text, fontSize: '13px', fontWeight: 600 }}>{item.symbol}</div>
                  <div style={{ color: '#787b86', fontSize: '11px' }}>{item.name}</div>
                </div>
                <button
                  onClick={() => onRemove(item.instrumentId)}
                  disabled={isBusy}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    background: 'none',
                    border: 'none',
                    color: '#ef5350',
                    cursor: isBusy ? 'not-allowed' : 'pointer',
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ borderTop: `1px solid ${border}`, paddingTop: '12px' }}>
            <span style={{ color: text, fontSize: '14px', fontWeight: 600 }}>Все инструменты</span>
            {available.length === 0 && (
              <div style={{ fontSize: '12px', color: '#787b86', marginTop: '6px' }}>
                Все доступные инструменты уже в вашем списке.
              </div>
            )}
            {available.map((instrument) => (
              <div
                key={instrument.instrumentId}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}
              >
                <div>
                  <div style={{ color: text, fontSize: '13px', fontWeight: 600 }}>{instrument.symbol}</div>
                  <div style={{ color: '#787b86', fontSize: '11px' }}>{instrument.name}</div>
                </div>
                <button
                  onClick={() => onAdd(instrument.instrumentId)}
                  disabled={isBusy}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    background: '#2962FF',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isBusy ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                  }}
                >
                  <Plus size={13} /> Добавить
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
