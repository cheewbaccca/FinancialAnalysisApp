// src/components/AuthPanel.tsx
import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { login, register } from '../api/client';
import type { AuthUser } from '../types';

interface AuthPanelProps {
  theme: 'dark' | 'light';
  onAuthSuccess: (user: AuthUser) => void;
}

export const AuthPanel: React.FC<AuthPanelProps> = ({ theme, onAuthSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDark = theme === 'dark';
  const bg = isDark ? '#131722' : '#f5f5f5';
  const cardBg = isDark ? '#1e222d' : '#ffffff';
  const text = isDark ? '#fff' : '#1e222d';
  const border = isDark ? '#2a2e39' : '#e0e0e0';
  const inputBg = isDark ? '#131722' : '#f5f5f5';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Заполните email и пароль');
      return;
    }
    if (mode === 'register' && password.length < 6) {
      setError('Пароль должен быть не короче 6 символов');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = mode === 'login'
        ? await login(email.trim(), password)
        : await register(email.trim(), password);
      onAuthSuccess(user);
    } catch (err: any) {
      const serverMessage = err?.response?.data;
      if (typeof serverMessage === 'string' && serverMessage) {
        setError(serverMessage);
      } else if (err?.response?.status === 401) {
        setError('Неверный email или пароль');
      } else {
        setError('Не удалось выполнить запрос. Проверьте, что backend запущен.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '360px',
        background: cardBg,
        border: `1px solid ${border}`,
        borderRadius: '10px',
        padding: '32px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <TrendingUp size={26} color="#2962FF" />
          <span style={{ fontSize: '18px', fontWeight: 700, color: text }}>StockOverFlow</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              background: mode === 'login' ? '#2962FF' : inputBg,
              color: mode === 'login' ? '#fff' : text,
            }}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              background: mode === 'register' ? '#2962FF' : inputBg,
              color: mode === 'register' ? '#fff' : text,
            }}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: '12px', color: '#787b86', marginBottom: '6px' }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              marginBottom: '14px',
              borderRadius: '6px',
              border: `1px solid ${border}`,
              background: inputBg,
              color: text,
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
            placeholder="you@example.com"
            autoComplete="email"
          />

          <label style={{ display: 'block', fontSize: '12px', color: '#787b86', marginBottom: '6px' }}>
            Пароль
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              marginBottom: '18px',
              borderRadius: '6px',
              border: `1px solid ${border}`,
              background: inputBg,
              color: text,
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
            placeholder="••••••"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          {error && (
            <div style={{
              padding: '10px 12px',
              marginBottom: '14px',
              borderRadius: '6px',
              background: isDark ? '#2a1e1e' : '#fff0f0',
              border: `1px solid ${isDark ? '#4a2a2a' : '#ffcccc'}`,
              color: '#ef5350',
              fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              background: isSubmitting ? '#555' : '#2962FF',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            {isSubmitting ? 'Подождите...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>
      </div>
    </div>
  );
};
