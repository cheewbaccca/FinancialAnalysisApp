// src/App.tsx
import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Controls } from './components/Controls';
import { ChartComponent } from './components/ChartComponent';
import { IndicatorSettings } from './components/IndicatorSettings';
import { WatchlistManager } from './components/WatchlistManager';
import { DrawingToolbar } from './components/DrawingToolbar';
import { AuthPanel } from './components/AuthPanel';
import {
  getHistoricalPrices,
  getInstruments,
  refreshData,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  getStoredToken,
  getStoredUser,
  logout as apiLogout,
} from './api/client';
import type { CandleData, Instrument, WatchlistItemDto, AuthUser, DrawingToolType } from './types';

const generateId = () => Math.random().toString(36).substr(2, 9);
const SMA_COLORS = ['#2962FF', '#FF6D00', '#E040FB', '#00BCD4', '#4CAF50', '#FF5722'];

interface SMASetting {
  id: string;
  period: number;
  color: string;
  enabled: boolean;
}

function App() {
  // Переключение темы убрали — приложение теперь всегда тёмное.
  const theme: 'dark' | 'light' = 'dark';

  // ===== Авторизация =====
  const [user, setUser] = useState<AuthUser | null>(() => getStoredToken() ? getStoredUser() : null);

  useEffect(() => {
    const handleForcedLogout = () => setUser(null);
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, []);

  const handleLogout = () => {
    apiLogout();
    setUser(null);
  };

  // ===== Watchlist / инструменты =====
  const [allInstruments, setAllInstruments] = useState<Instrument[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItemDto[]>([]);
  const [watchlistBusy, setWatchlistBusy] = useState(false);

  const [symbol, setSymbol] = useState('');
  const [timeframe, setTimeframe] = useState('daily');
  const [limit, setLimit] = useState(100);
  const [data, setData] = useState<CandleData[]>([]);
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

  // ===== Рисование на графике =====
  const [activeDrawingTool, setActiveDrawingTool] = useState<DrawingToolType>('none');
  const [drawingsCount, setDrawingsCount] = useState(0);
  const [clearDrawingsToken, setClearDrawingsToken] = useState(0);
  const [hasSelectedDrawing, setHasSelectedDrawing] = useState(false);
  // useCallback — стабильная ссылка на функцию: без неё ChartComponent получал бы новый
  // колбэк на каждый ререндер App и мог бы пересобирать обработчики мыши посреди рисования.
  const handleToolConsumed = useCallback(() => setActiveDrawingTool('none'), []);
  const handleSelectionChange = useCallback((hasSelection: boolean) => setHasSelectedDrawing(hasSelection), []);

  // Рисунки привязаны к конкретному инструменту/таймфрейму — при их смене чистим холст,
  // чтобы старые линии не «прилипали» к чужим ценам. Обычный refresh (те же symbol/timeframe)
  // рисунки не трогает.
  useEffect(() => {
    setActiveDrawingTool('none');
    setClearDrawingsToken((t) => t + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeframe]);

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

  // Загрузка общего списка инструментов и watchlist пользователя
  const loadInstrumentsAndWatchlist = useCallback(async () => {
    try {
      setLoadingSymbols(true);
      const [instruments, items] = await Promise.all([getInstruments(), getWatchlist()]);
      setAllInstruments(instruments);
      setWatchlist(items);
      setSymbol((prev) => prev || (items.length > 0 ? items[0].symbol : ''));
    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить список инструментов');
    } finally {
      setLoadingSymbols(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadInstrumentsAndWatchlist();
    }
  }, [user, loadInstrumentsAndWatchlist]);

  // Загрузка данных по выбранному символу
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

  const handleAddToWatchlist = async (instrumentId: number) => {
    setWatchlistBusy(true);
    try {
      const item = await addToWatchlist(instrumentId);
      setWatchlist((prev) => (prev.some(w => w.instrumentId === item.instrumentId) ? prev : [...prev, item]));
      if (!symbol) setSymbol(item.symbol);
    } catch (err) {
      console.error(err);
      setError('Не удалось добавить инструмент в список');
    } finally {
      setWatchlistBusy(false);
    }
  };

  const handleRemoveFromWatchlist = async (instrumentId: number) => {
    setWatchlistBusy(true);
    try {
      await removeFromWatchlist(instrumentId);
      setWatchlist((prev) => {
        const next = prev.filter(w => w.instrumentId !== instrumentId);
        const removedWasSelected = prev.find(w => w.instrumentId === instrumentId)?.symbol === symbol;
        if (removedWasSelected) {
          setSymbol(next.length > 0 ? next[0].symbol : '');
          if (next.length === 0) setData([]);
        }
        return next;
      });
    } catch (err) {
      console.error(err);
      setError('Не удалось убрать инструмент из списка');
    } finally {
      setWatchlistBusy(false);
    }
  };

  if (!user) {
    return <AuthPanel theme={theme} onAuthSuccess={setUser} />;
  }

  const watchlistSymbols = watchlist.map((w) => w.symbol);

  return (
    <div style={{ background: bg, minHeight: '100vh', color: text }}>
      <Header theme={theme} user={user} onLogout={handleLogout} />

      {loadingSymbols ? (
        <div style={{ padding: '40px' }}>Загрузка списка инструментов...</div>
      ) : (
        <>
          <Controls
            symbols={watchlistSymbols}
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
            <WatchlistManager
              theme={theme}
              watchlist={watchlist}
              allInstruments={allInstruments}
              onAdd={handleAddToWatchlist}
              onRemove={handleRemoveFromWatchlist}
              isBusy={watchlistBusy}
            />

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

          <div style={{
            padding: '10px 24px',
            background: theme === 'dark' ? '#1e222d' : '#f0f0f0',
            borderBottom: `1px solid ${theme === 'dark' ? '#2a2e39' : '#e0e0e0'}`,
          }}>
            <DrawingToolbar
              theme={theme}
              activeTool={activeDrawingTool}
              onSelectTool={setActiveDrawingTool}
              onClearAll={() => setClearDrawingsToken((t) => t + 1)}
              drawingsCount={drawingsCount}
              hasSelection={hasSelectedDrawing}
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

            {watchlist.length === 0 && !error && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#787b86' }}>
                Ваш список инструментов пуст. Откройте «Мой список» выше и добавьте что-нибудь.
              </div>
            )}

            {!loading && data.length > 0 && watchlist.length > 0 && (
              <ChartComponent
                data={data}
                theme={theme}
                smaList={smaList}
                showVolume={showVolume}
                showRSI={showRSI}
                rsiPeriod={rsiPeriod}
                activeTool={activeDrawingTool}
                onToolConsumed={handleToolConsumed}
                onDrawingsCountChange={setDrawingsCount}
                onSelectionChange={handleSelectionChange}
                clearToken={clearDrawingsToken}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
