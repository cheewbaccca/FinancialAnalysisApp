// src/App.tsx
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Controls } from './components/Controls';
import { ChartComponent } from './components/ChartComponent';
import { IndicatorSettings } from './components/IndicatorSettings';
import { getHistoricalPrices, getSymbols, refreshData } from './api/client';
import type { CandleData } from './types';

const generateId = () => Math.random().toString(36).substr(2, 9);
const SMA_COLORS = ['#2962FF', '#FF6D00', '#E040FB', '#00BCD4', '#4CAF50', '#FF5722'];

interface SMASetting {
  id: string;
  period: number;
  color: string;
  enabled: boolean;
}

function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [symbol, setSymbol] = useState('');
  const [timeframe, setTimeframe] = useState('daily');
  const [limit, setLimit] = useState(100);
  const [data, setData] = useState<CandleData[]>([]);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSymbols, setLoadingSymbols] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Индикаторы
  const [smaList, setSmaList] = useState<SMASetting[]>([
    { id: generateId(), period: 20, color: SMA_COLORS[0], enabled: true },
    { id: generateId(), period: 50, color: SMA_COLORS[1], enabled: true },
    { id: generateId(), period: 200, color: SMA_COLORS[2], enabled: true },
  ]);
  const [showVolume, setShowVolume] = useState(true);
  const [showRSI, setShowRSI] = useState(true);
  const [rsiPeriod, setRsiPeriod] = useState(14);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const bg = theme === 'dark' ? '#131722' : '#f5f5f5';
  const text = theme === 'dark' ? '#fff' : '#1e222d';

  // SMA функции
  const handleAddSMA = () => {
    const usedColors = smaList.map(s => s.color);
    const availableColor = SMA_COLORS.find(c => !usedColors.includes(c)) || '#888';
    setSmaList([...smaList, { id: generateId(), period: 20, color: availableColor, enabled: true }]);
  };

  const handleRemoveSMA = (id: string) => {
    setSmaList(smaList.filter(s => s.id !== id));
  };

  const handleToggleSMA = (id: string) => {
    setSmaList(smaList.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const handleUpdateSMA = (id: string, period: number) => {
    setSmaList(smaList.map(s => s.id === id ? { ...s, period: Math.max(1, period) } : s));
  };

  // Загрузка списка инструментов
  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        setLoadingSymbols(true);
        const result = await getSymbols();
        setSymbols(result);
        if (result.length > 0) setSymbol(result[0]);
      } catch (err) {
        console.error(err);
        setError('Не удалось загрузить список инструментов');
      } finally {
        setLoadingSymbols(false);
      }
    };
    fetchSymbols();
  }, []);

  // Загрузка данных
  useEffect(() => {
    if (!symbol) return;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getHistoricalPrices(symbol, limit, timeframe);
        setData(result);
        if (result.length === 0) setError(`Нет данных для ${symbol} (${timeframe})`);
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.includes('Note') ? 'Превышен лимит запросов. Попробуйте через минуту.' : `Не удалось загрузить данные для ${symbol}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [symbol, timeframe, limit]);

  const handleRefresh = async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    try {
      await refreshData(symbol, 100);
      const freshData = await getHistoricalPrices(symbol, limit, timeframe);
      setData(freshData);
    } catch (err) {
      setError('Не удалось обновить данные');
    } finally {
      setLoading(false);
    }
  };

  if (loadingSymbols) {
    return <div style={{ padding: '40px', background: bg, minHeight: '100vh', color: text }}>Загрузка списка инструментов...</div>;
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', color: text }}>
      <Header theme={theme} toggleTheme={toggleTheme} />
      
      <Controls
        symbols={symbols}
        selectedSymbol={symbol}
        onSymbolChange={setSymbol}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        limit={limit}
        onLimitChange={setLimit}
        onRefresh={handleRefresh}
        isLoading={loading}
        theme={theme}
      />

      <div style={{ 
        padding: '12px 24px', 
        background: theme === 'dark' ? '#1e222d' : '#f0f0f0',
        borderBottom: `1px solid ${theme === 'dark' ? '#2a2e39' : '#e0e0e0'}`,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <IndicatorSettings
          smaList={smaList}
          onAddSMA={handleAddSMA}
          onRemoveSMA={handleRemoveSMA}
          onToggleSMA={handleToggleSMA}
          onUpdateSMA={handleUpdateSMA}
          showVolume={showVolume}
          setShowVolume={setShowVolume}
          showRSI={showRSI}
          setShowRSI={setShowRSI}
          rsiPeriod={rsiPeriod}
          setRsiPeriod={setRsiPeriod}
          theme={theme}
        />
      </div>

      <div style={{ padding: '20px' }}>
        {error && (
          <div style={{
            padding: '12px 16px',
            background: theme === 'dark' ? '#2a1e1e' : '#fff0f0',
            border: `1px solid ${theme === 'dark' ? '#4a2a2a' : '#ffcccc'}`,
            borderRadius: '6px',
            color: '#ef5350',
            marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        {!loading && data.length > 0 && (
          <ChartComponent 
            data={data} 
            theme={theme}
            smaList={smaList}
            showVolume={showVolume}
            showRSI={showRSI}
            rsiPeriod={rsiPeriod}
          />
        )}
        {!loading && data.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#787b86' }}>
            Нет данных для отображения
          </div>
        )}
      </div>
    </div>
  );
}

export default App;