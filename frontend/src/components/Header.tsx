// src/components/Header.tsx
import React from 'react';
import { TrendingUp, Moon, Sun } from 'lucide-react';

interface HeaderProps {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ theme, toggleTheme }) => {
  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 24px',
      background: theme === 'dark' ? '#1e222d' : '#ffffff',
      borderBottom: `1px solid ${theme === 'dark' ? '#2a2e39' : '#e0e0e0'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <TrendingUp size={28} color={theme === 'dark' ? '#2962FF' : '#2962FF'} />
        <span style={{
          fontSize: '20px',
          fontWeight: 700,
          color: theme === 'dark' ? '#ffffff' : '#1e222d',
        }}>
          StockOverFlow
        </span>
        <span style={{
          fontSize: '12px',
          color: theme === 'dark' ? '#787b86' : '#999',
          marginLeft: '8px',
        }}>
          Killer of TradingView
        </span>
      </div>

     
    </header>
  );
};