// src/components/DrawingToolbar.tsx
import React from 'react';
import type { DrawingToolType } from '../types';

interface DrawingToolbarProps {
  theme: 'dark' | 'light';
  activeTool: DrawingToolType;
  onSelectTool: (tool: DrawingToolType) => void;
  onClearAll: () => void;
  drawingsCount: number;
  hasSelection?: boolean;
}

const TOOLS: { id: DrawingToolType; label: string; hint: string }[] = [
  { id: 'trendline', label: 'Тренд', hint: 'Трендовая линия: кликните дважды — начало и конец' },
  { id: 'channel', label: 'Канал', hint: 'Параллельный канал: кликните трижды — линия и её ширина' },
  { id: 'horizontal', label: 'Гориз. линия', hint: 'Горизонтальный уровень: один клик' },
  { id: 'brush', label: 'Кисть', hint: 'Зажмите кнопку мыши и ведите — произвольная линия' },
];

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  theme,
  activeTool,
  onSelectTool,
  onClearAll,
  drawingsCount,
  hasSelection = false,
}) => {
  const isDark = theme === 'dark';
  const bg = isDark ? '#2a2e39' : '#f0f0f0';
  const text = isDark ? '#d1d4dc' : '#1e222d';
  const border = isDark ? '#3a3e49' : '#e0e0e0';

  const buttonStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 12px',
    fontSize: '13px',
    borderRadius: '6px',
    background: active ? '#2962FF' : bg,
    color: active ? '#fff' : text,
    border: `1px solid ${border}`,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={() => onSelectTool('none')}
        title="Курсор (выключить рисование, вернуть панорамирование графика)"
        style={buttonStyle(activeTool === 'none')}
      >
        Курсор
      </button>

      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          type="button"
          onClick={() => onSelectTool(activeTool === tool.id ? 'none' : tool.id)}
          title={tool.hint}
          style={buttonStyle(activeTool === tool.id)}
        >
          {tool.label}
        </button>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        disabled={drawingsCount === 0}
        title="Убрать все рисунки с графика"
        style={{
          padding: '8px 12px',
          fontSize: '13px',
          borderRadius: '6px',
          background: 'none',
          color: drawingsCount === 0 ? '#555' : '#ef5350',
          border: `1px solid ${border}`,
          cursor: drawingsCount === 0 ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Очистить{drawingsCount > 0 ? ` (${drawingsCount})` : ''}
      </button>

      {activeTool !== 'none' && (
        <span style={{ fontSize: '12px', color: '#787b86' }}>
          Esc — отменить текущий рисунок
        </span>
      )}

      {activeTool === 'none' && hasSelection && (
        <span style={{ fontSize: '12px', color: '#2962FF' }}>
          Рисунок выбран — Delete/Backspace удалит его, Esc снимет выделение
        </span>
      )}
    </div>
  );
};
