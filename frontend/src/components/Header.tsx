// src/components/Header.tsx
import React from 'react';
import { TrendingUp, Moon, Sun, LogOut } from 'lucide-react';
import type { AuthUser } from '../types';

interface HeaderProps {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  user?: AuthUser | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, user, onLogout }) => {
  const isDark = theme === 'dark';
  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 24px',
      background: isDark ? '#1e222d' : '#ffffff',
      borderBottom: `1px solid ${isDark ? '#2a2e39' : '#e0e0e0'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <TrendingUp size={28} color="#2962FF" />
        <span style={{
          fontSize: '20px',
          fontWeight: 700,
          color: isDark ? '#ffffff' : '#1e222d',
        }}>
          StockOverFlow
        </span>
        <span style={{
          fontSize: '12px',
          color: isDark ? '#787b86' : '#999',
          marginLeft: '8px',
        }}>
          Killer of TradingView
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {user && (
          <span style={{ fontSize: '13px', color: isDark ? '#787b86' : '#666' }}>
            {user.email}
          </span>
        )}
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
            background: 'none',
            border: `1px solid ${isDark ? '#2a2e39' : '#e0e0e0'}`,
            borderRadius: '6px',
            color: isDark ? '#d1d4dc' : '#1e222d',
            cursor: 'pointer',
          }}
          title="Сменить тему"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        {user && onLogout && (
          <button
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              background: 'none',
              border: `1px solid ${isDark ? '#2a2e39' : '#e0e0e0'}`,
              borderRadius: '6px',
              color: '#ef5350',
              cursor: 'pointer',
              fontSize: '13px',
            }}
            title="Выйти"
          >
            <LogOut size={16} /> Выйти
          </button>
        )}
      </div>
    </header>
  );
};
