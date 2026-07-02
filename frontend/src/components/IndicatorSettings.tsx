// src/components/IndicatorSettings.tsx
import React, { useState } from 'react';
import { Settings, Plus, X } from 'lucide-react';

interface SMASetting {
  id: string;
  period: number;
  color: string;
  enabled: boolean;
}

interface IndicatorSettingsProps {
  smaList: SMASetting[];
  onAddSMA: () => void;
  onRemoveSMA: (id: string) => void;
  onToggleSMA: (id: string) => void;
  onUpdateSMA: (id: string, period: number) => void;
  showVolume: boolean;
  setShowVolume: (val: boolean) => void;
  showRSI: boolean;
  setShowRSI: (val: boolean) => void;
  rsiPeriod: number;
  setRsiPeriod: (val: number) => void;
  theme: 'dark' | 'light';
}

export const IndicatorSettings: React.FC<IndicatorSettingsProps> = ({
  smaList,
  onAddSMA,
  onRemoveSMA,
  onToggleSMA,
  onUpdateSMA,
  showVolume,
  setShowVolume,
  showRSI,
  setShowRSI,
  rsiPeriod,
  setRsiPeriod,
  theme,
}) => {
  const [expanded, setExpanded] = useState(false);
  const isDark = theme === 'dark';
  const bg = isDark ? '#2a2e39' : '#f0f0f0';
  const text = isDark ? '#d1d4dc' : '#1e222d';
  const border = isDark ? '#3a3e49' : '#e0e0e0';
  const inputBg = isDark ? '#1e222d' : '#ffffff';

  const activeCount = smaList.filter(s => s.enabled).length;

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
        <Settings size={16} />
        Индикаторы
        <span style={{ fontSize: '11px', color: '#787b86' }}>
          ({activeCount} SMA{showVolume ? ' + Объем' : ''}{showRSI ? ' + RSI' : ''})
        </span>
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
            zIndex: 1000,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          {/* ===== SMA ===== */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: text, fontSize: '14px', fontWeight: 600 }}>SMA</span>
              <button
                onClick={onAddSMA}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  background: '#2962FF',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                <Plus size={14} /> Добавить
              </button>
            </div>
            
            {smaList.map((sma) => (
              <div key={sma.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <input
                  type="checkbox"
                  checked={sma.enabled}
                  onChange={() => onToggleSMA(sma.id)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ 
                  display: 'inline-block', 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '2px', 
                  background: sma.color,
                  flexShrink: 0,
                  opacity: sma.enabled ? 1 : 0.3,
                }} />
                <input
                  type="number"
                  value={sma.period}
                  onChange={(e) => onUpdateSMA(sma.id, Number(e.target.value) || 10)}
                  style={{
                    width: '60px',
                    padding: '4px 6px',
                    background: inputBg,
                    color: text,
                    border: `1px solid ${border}`,
                    borderRadius: '4px',
                    fontSize: '12px',
                    opacity: sma.enabled ? 1 : 0.5,
                  }}
                  disabled={!sma.enabled}
                />
                <span style={{ fontSize: '12px', color: '#787b86' }}>п.</span>
                <button
                    onClick={() => onRemoveSMA(sma.id)}
                    style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px',
                    background: 'none',
                    border: 'none',
                    color: '#ef5350',
                    cursor: 'pointer',
                    }}
                >
                    <X size={16} />
                </button>
              </div>
            ))}
            {smaList.length === 0 && (
              <span style={{ fontSize: '12px', color: '#787b86' }}>Нет SMA. Нажмите "Добавить".</span>
            )}
          </div>

          <div style={{ borderTop: `1px solid ${border}`, paddingTop: '12px' }}>
            {/* ===== ОБЪЕМ ===== */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: text, fontSize: '14px', marginBottom: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showVolume}
                onChange={() => setShowVolume(!showVolume)}
              />
              Объем (Volume)
            </label>

            {/* ===== RSI ===== */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: text, fontSize: '14px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showRSI}
                onChange={() => setShowRSI(!showRSI)}
              />
              RSI (Relative Strength Index)
            </label>
            {showRSI && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', marginLeft: '24px' }}>
                <span style={{ fontSize: '13px', color: '#787b86' }}>Период:</span>
                <input
                  type="number"
                  value={rsiPeriod}
                  onChange={(e) => setRsiPeriod(Number(e.target.value) || 14)}
                  style={{
                    width: '60px',
                    padding: '4px 6px',
                    background: inputBg,
                    color: text,
                    border: `1px solid ${border}`,
                    borderRadius: '4px',
                    fontSize: '12px',
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};