// src/components/ChartComponent.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  LineSeries
} from 'lightweight-charts';
import { DrawingManager, TrendLine, ParallelChannel, HorizontalLine, Brush } from 'lightweight-charts-drawing';
import type { CandleData, DrawingToolType } from '../types';
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
  // ===== Рисование =====
  activeTool?: DrawingToolType;
  onToolConsumed?: () => void;
  onDrawingsCountChange?: (count: number) => void;
  onSelectionChange?: (hasSelection: boolean) => void;
  clearToken?: number;
}

// Сколько точек-якорей нужно набрать кликами для каждого «кликового» инструмента.
// Кисть (brush) сюда не входит — она рисуется зажатой кнопкой мыши, а не кликами.
const REQUIRED_ANCHORS: Record<'trendline' | 'channel' | 'horizontal', number> = {
  horizontal: 1,
  trendline: 2,
  channel: 3,
};

const TOOL_CLASSES: Record<'trendline' | 'channel' | 'horizontal', any> = {
  trendline: TrendLine,
  channel: ParallelChannel,
  horizontal: HorizontalLine,
};

const EDITABLE_TARGET_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export const ChartComponent: React.FC<ChartComponentProps> = ({
  data,
  theme = 'dark',
  smaList,
  showVolume,
  showRSI,
  rsiPeriod,
  activeTool = 'none',
  onToolConsumed,
  onDrawingsCountChange,
  onSelectionChange,
  clearToken,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const smaSeriesMapRef = useRef<Map<string, any>>(new Map());
  const volumeSeriesRef = useRef<any>(null);
  const rsiSeriesRef = useRef<any>(null);
  const rsiLevelSeriesRef = useRef<any[]>([]);
  const dataRef = useRef<CandleData[]>(data);

  // ===== Рисование =====
  const drawingManagerRef = useRef<any>(null);
  const drawingIdsRef = useRef<string[]>([]);
  const pendingAnchorsRef = useRef<{ time: any; price: number }[]>([]);
  const previewIdRef = useRef<string | null>(null);
  const nextDrawingIdRef = useRef(0);
  const selectedDrawingIdRef = useRef<string | null>(null);
  // Актуальный activeTool для колбэков, которые регистрируются один раз (например
  // drawing:selected) и иначе видели бы значение на момент подписки, а не текущее.
  const activeToolRef = useRef<DrawingToolType>(activeTool);

  const [currentCandle, setCurrentCandle] = useState<CandleData | null>(
    data.length > 0 ? data[data.length - 1] : null
  );
  const isMounted = useRef(true);

  const isDark = theme === 'dark';
  const textColor = isDark ? '#d1d4dc' : '#1e222d';
  const borderColor = isDark ? '#2a2e39' : '#e0e0e0';
  const bgColor = isDark ? '#1e222d' : '#f0f0f0';

  // Актуальные данные для колбэка кроссхейра (без пересоздания подписки)
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

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

  // Камера (панорамирование/зум/автомасштаб цены) блокируется, пока активен
  // инструмент рисования ИЛИ пока выбрана существующая фигура — иначе, например,
  // при редактировании (растягивании) уже нарисованной линии график одновременно
  // «едет» под курсором, а при рисовании новой линии вниз автомасштаб цены
  // бесконечно «убегает» следом за курсором. Читает только refs, поэтому
  // безопасна для вызова из любых колбэков без риска устаревшего замыкания.
  const applyCameraLock = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const locked = activeToolRef.current !== 'none' || !!selectedDrawingIdRef.current;
    chart.applyOptions({ handleScroll: !locked, handleScale: !locked });
    try {
      chart.priceScale('right').applyOptions({ autoScale: !locked });
    } catch (e) {}
  }, []);

  // ===== Создание графика, свечной серии и менеджера рисования (один раз при монтировании) =====
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#131722' : '#ffffff' },
        textColor: textColor,
        fontSize: 12,
      },
      grid: {
        vertLines: { color: borderColor },
        horzLines: { color: borderColor },
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
          top: 0.0,
          bottom: 0.30,
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

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      priceScaleId: 'right',
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    try {
      const manager = new DrawingManager();
      manager.attach(chart, candlestickSeries, chartContainerRef.current);
      drawingManagerRef.current = manager;
      // Библиотека сама шлёт это событие при выборе (клике по) уже нарисованной фигуры —
      // используем его, чтобы знать, что можно удалить по Delete.
      manager.on('drawing:selected', (event: any) => {
        const id = event?.drawingId ?? null;
        selectedDrawingIdRef.current = id;
        onSelectionChange?.(!!id);
        applyCameraLock();
      });
      manager.on('drawing:deselected', () => {
        selectedDrawingIdRef.current = null;
        onSelectionChange?.(false);
        applyCameraLock();
      });
      // Шлётся при каждом изменении формы/позиции существующего рисунка —
      // то есть прямо во время перетаскивания узла (растягивание/сдвиг линии).
      // Событие selected иногда успевает сработать позже, чем начинается сам
      // драг, поэтому здесь камеру блокируем жёстко и сразу, не дожидаясь
      // применения обычной логики applyCameraLock() через состояние выбора.
      manager.on('drawing:updated', () => {
        const c = chartRef.current;
        if (!c) return;
        c.applyOptions({ handleScroll: false, handleScale: false });
        try {
          c.priceScale('right').applyOptions({ autoScale: false });
        } catch (err) {}
      });
    } catch (e) {
      console.error('Не удалось инициализировать инструменты рисования', e);
      drawingManagerRef.current = null;
    }

    chart.subscribeCrosshairMove((param: any) => {
      if (!isMounted.current) return;
      const currentData = dataRef.current;
      if (!param || !param.time) {
        if (currentData.length > 0) setCurrentCandle(currentData[currentData.length - 1]);
        return;
      }
      const candle = currentData.find(
        (d) => Math.floor(new Date(d.time).getTime() / 1000) === param.time
      );
      if (candle) {
        setCurrentCandle(candle);
      } else if (currentData.length > 0) {
        setCurrentCandle(currentData[currentData.length - 1]);
      }
    });

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
      try {
        chart.remove();
      } catch (e) {}
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      smaSeriesMapRef.current.clear();
      volumeSeriesRef.current = null;
      rsiSeriesRef.current = null;
      rsiLevelSeriesRef.current = [];
      drawingManagerRef.current = null;
      drawingIdsRef.current = [];
      selectedDrawingIdRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // график создаётся один раз — дальше только обновляем его через applyOptions/setData

  // ===== Тема: обновляем цвета на месте, без пересоздания графика =====
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#131722' : '#ffffff' },
        textColor: textColor,
      },
      grid: {
        vertLines: { color: borderColor },
        horzLines: { color: borderColor },
      },
      timeScale: { borderColor },
      rightPriceScale: { borderColor },
    });
  }, [isDark, textColor, borderColor]);

  // ===== Свечи: обновляем данные без сброса зума/скролла =====
  useEffect(() => {
    const series = candlestickSeriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart || data.length === 0) return;

    const chartData = data.map((item) => ({
      time: Math.floor(new Date(item.time).getTime() / 1000),
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    // «Мёртвая зона» слева и справа от свечей — особенность библиотеки: вне
    // фактических точек данных coordinateToTime() возвращает null, и поставить
    // туда точку рисунка нельзя. Лечится добавлением «пустых» (whitespace)
    // точек — без цены, только с временем — по обе стороны от реальных данных;
    // тогда область по краям тоже становится адресуемой по времени.
    const PAD_BARS = 200;
    const VISIBLE_MARGIN_BARS = 5;
    let extendedData: { time: number; open?: number; high?: number; low?: number; close?: number }[] = chartData;

    if (chartData.length >= 2) {
      const diffs: number[] = [];
      for (let i = 1; i < chartData.length; i++) {
        diffs.push(chartData[i].time - chartData[i - 1].time);
      }
      diffs.sort((a, b) => a - b);
      const step = diffs[Math.floor(diffs.length / 2)] || 86400;

      const leading = Array.from({ length: PAD_BARS }, (_, i) => ({
        time: chartData[0].time - step * (PAD_BARS - i),
      }));
      const trailing = Array.from({ length: PAD_BARS }, (_, i) => ({
        time: chartData[chartData.length - 1].time + step * (i + 1),
      }));
      extendedData = [...leading, ...chartData, ...trailing];
    }

    series.setData(extendedData);

    // fitContent (и этот расчёт видимого диапазона) есть смысл вызывать только
    // когда пришёл новый набор данных (смена символа/таймфрейма/refresh), а не
    // при переключении индикаторов — те данные вообще не трогают. Показываем
    // в основном реальные свечи с небольшим запасом по краям, а не все 60
    // «пустых» баров сразу — иначе график по умолчанию выглядел бы слишком
    // отдалённым. Остальной запас всё равно доступен при скролле/зуме.
    if (chartData.length >= 2) {
      chart.timeScale().setVisibleLogicalRange({
        from: PAD_BARS - VISIBLE_MARGIN_BARS,
        to: PAD_BARS + chartData.length - 1 + VISIBLE_MARGIN_BARS,
      });
    } else {
      chart.timeScale().fitContent();
    }
  }, [data]);

  // ===== SMA: добавляем/удаляем/обновляем линии, не трогая остальной график =====
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const seriesMap = smaSeriesMapRef.current;

    const enabledIds = new Set(smaList.filter((s) => s.enabled).map((s) => s.id));

    // Убираем линии выключенных/удалённых SMA
    for (const [id, series] of seriesMap) {
      if (!enabledIds.has(id)) {
        try {
          chart.removeSeries(series);
        } catch (e) {}
        seriesMap.delete(id);
      }
    }

    // Добавляем/обновляем включённые SMA
    smaList
      .filter((s) => s.enabled)
      .forEach((sma) => {
        if (data.length < sma.period) return;
        const smaPoints = calculateSMA(data, sma.period);
        if (smaPoints.length === 0) return;

        let series = seriesMap.get(sma.id);
        if (!series) {
          series = chart.addSeries(LineSeries, {
            color: sma.color,
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: true,
            priceScaleId: 'right',
          });
          seriesMap.set(sma.id, series);
        } else {
          series.applyOptions({ color: sma.color });
        }
        series.setData(smaPoints.map((d) => ({ time: d.time, value: d.value })));
      });
  }, [smaList, data]);

  // ===== Объём =====
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (!showVolume) {
      if (volumeSeriesRef.current) {
        try {
          chart.removeSeries(volumeSeriesRef.current);
        } catch (e) {}
        volumeSeriesRef.current = null;
      }
      return;
    }

    if (data.length === 0) return;

    let series = volumeSeriesRef.current;
    if (!series) {
      series = chart.addSeries(HistogramSeries, {
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      volumeSeriesRef.current = series;
    }

    const volumeData = data.map((item) => ({
      time: Math.floor(new Date(item.time).getTime() / 1000),
      value: item.volume,
      color: item.close >= item.open ? '#26a69a' : '#ef5350',
    }));
    series.setData(volumeData);

    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.70,
        bottom: showRSI ? 0.15 : 0.0,
      },
    });
  }, [showVolume, showRSI, data]);

  // ===== RSI (линия + уровни 30/70) =====
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (!showRSI) {
      if (rsiSeriesRef.current) {
        try {
          chart.removeSeries(rsiSeriesRef.current);
        } catch (e) {}
        rsiSeriesRef.current = null;
      }
      rsiLevelSeriesRef.current.forEach((s) => {
        try {
          chart.removeSeries(s);
        } catch (e) {}
      });
      rsiLevelSeriesRef.current = [];
      return;
    }

    const rsiData = data.length > 0 ? calculateRSI(data, rsiPeriod) : [];
    if (rsiData.length === 0) return;

    let series = rsiSeriesRef.current;
    if (!series) {
      series = chart.addSeries(LineSeries, {
        color: '#FF6D00',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        priceScaleId: 'rsi',
      });
      rsiSeriesRef.current = series;
    }
    series.setData(rsiData.map((d) => ({ time: d.time, value: d.value })));

    if (rsiLevelSeriesRef.current.length === 0) {
      rsiLevelSeriesRef.current = [30, 70].map((level) =>
        chart.addSeries(LineSeries, {
          color: level === 30 ? '#26a69a' : '#ef5350',
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          priceScaleId: 'rsi',
        })
      );
    }
    rsiLevelSeriesRef.current.forEach((line, idx) => {
      const level = idx === 0 ? 30 : 70;
      line.setData([
        { time: rsiData[0].time, value: level },
        { time: rsiData[rsiData.length - 1].time, value: level },
      ]);
    });

    chart.priceScale('rsi').applyOptions({
      scaleMargins: {
        top: showVolume ? 0.85 : 0.70,
        bottom: 0.0,
      },
      autoScale: false,
    });
  }, [showRSI, rsiPeriod, showVolume, data]);

  // ===== Рисование: очистка всех рисунков по внешней команде (кнопка «Очистить») =====
  useEffect(() => {
    if (!clearToken) return;
    const manager = drawingManagerRef.current;
    if (!manager) return;
    drawingIdsRef.current.forEach((id) => {
      try {
        manager.removeDrawing(id);
      } catch (e) {}
    });
    drawingIdsRef.current = [];
    selectedDrawingIdRef.current = null;
    onDrawingsCountChange?.(0);
    onSelectionChange?.(false);
    applyCameraLock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearToken]);

  // ===== Рисование: удаление ТОЛЬКО выбранной фигуры по Delete/Backspace, =====
  // ===== снятие выделения по Escape (страховка, если камера вдруг «залипла») =====
  // Работает независимо от активного инструмента — можно кликнуть на существующую
  // линию (курсор/«none»), она подсветится через событие drawing:selected, дальше Delete.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Не мешаем обычному вводу текста/чисел в полях формы
      const target = e.target as HTMLElement | null;
      if (target && EDITABLE_TARGET_TAGS.has(target.tagName)) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const manager = drawingManagerRef.current;
        const id = selectedDrawingIdRef.current;
        if (!manager || !id) return;

        e.preventDefault();
        try {
          manager.removeDrawing(id);
        } catch (err) {}
        drawingIdsRef.current = drawingIdsRef.current.filter((d) => d !== id);
        selectedDrawingIdRef.current = null;
        onDrawingsCountChange?.(drawingIdsRef.current.length);
        onSelectionChange?.(false);
        applyCameraLock();
        return;
      }

      // Пока выбрана фигура (даже без активного инструмента рисования), камера
      // заблокирована — Escape даёт явный способ снять выделение и разблокировать
      // панораму/зум, даже если клик по пустому месту почему-то не снял выбор сам.
      if (e.key === 'Escape' && selectedDrawingIdRef.current) {
        const manager = drawingManagerRef.current;
        try {
          manager?.deselectAll();
        } catch (err) {}
        selectedDrawingIdRef.current = null;
        onSelectionChange?.(false);
        applyCameraLock();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDrawingsCountChange, onSelectionChange, applyCameraLock]);

  // ===== Рисование: обработка активного инструмента =====
  useEffect(() => {
    const container = chartContainerRef.current;
    const chart = chartRef.current;
    const manager = drawingManagerRef.current;
    if (!container || !chart) return;

    // Актуализируем ref до пересчёта блокировки камеры — иначе долгоживущие
    // колбэки (drawing:selected, Delete, «Очистить») видели бы старый инструмент.
    activeToolRef.current = activeTool;

    // Пока активен инструмент рисования — выключаем панорамирование/зум/автомасштаб
    // графика, иначе клики и перетаскивание будут двигать сам график, а не рисовать
    // (и при рисовании вниз автомасштаб цены «убегал» бы следом за курсором).
    applyCameraLock();

    pendingAnchorsRef.current = [];

    if (activeTool === 'none') {
      if (!manager) return;
      // Курсор: если уже что-то выбрано, следующий mousedown по графику —
      // это, вероятнее всего, захват узла (ручки) этой фигуры, чтобы её
      // подвинуть/растянуть. Блокируем панораму/масштаб ДО того, как сам
      // график по этому же жесту начнёт собственное перетаскивание —
      // capture-фаза срабатывает раньше bubble-обработчика, повешенного
      // библиотекой lightweight-charts на этот же контейнер, поэтому мы
      // успеваем выключить handleScroll/handleScale ещё до того, как график
      // вообще узнает об этом mousedown.
      const lockIfEditingSelection = () => {
        if (!selectedDrawingIdRef.current) return;
        chart.applyOptions({ handleScroll: false, handleScale: false });
        try {
          chart.priceScale('right').applyOptions({ autoScale: false });
        } catch (e) {}
      };
      const restoreAfterDrag = () => {
        applyCameraLock();
      };
      container.addEventListener('mousedown', lockIfEditingSelection, true);
      window.addEventListener('mouseup', restoreAfterDrag);
      return () => {
        container.removeEventListener('mousedown', lockIfEditingSelection, true);
        window.removeEventListener('mouseup', restoreAfterDrag);
      };
    }

    if (!manager) return;

    const toAnchor = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      // Зажимаем координату в границы контейнера — иначе, если увести мышь
      // далеко за пределы графика (особенно вниз), coordinateToPrice() отдаёт
      // экстремальное значение цены, и график начинает бесконечно уезжать по
      // вертикали следом за курсором, пытаясь под него подстроиться.
      const clampedX = Math.min(Math.max(clientX, rect.left), rect.right);
      const clampedY = Math.min(Math.max(clientY, rect.top), rect.bottom);
      const x = clampedX - rect.left;
      const y = clampedY - rect.top;
      const time = chart.timeScale().coordinateToTime(x);
      const price = candlestickSeriesRef.current?.coordinateToPrice(y);
      if (time === null || time === undefined || price === null || price === undefined) return null;
      return { time, price };
    };

    const clearPreview = () => {
      if (previewIdRef.current) {
        try {
          manager.removeDrawing(previewIdRef.current);
        } catch (e) {}
        previewIdRef.current = null;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      clearPreview();
      pendingAnchorsRef.current = [];
      onToolConsumed?.();
    };
    window.addEventListener('keydown', handleKeyDown);

    if (activeTool === 'brush') {
      let isDrawing = false;
      let path: { time: any; price: number }[] = [];
      let brushId = '';

      const handleMouseDown = (e: MouseEvent) => {
        const anchor = toAnchor(e.clientX, e.clientY);
        if (!anchor) return;
        isDrawing = true;
        path = [anchor];
        brushId = `drawing-${Date.now()}-${nextDrawingIdRef.current++}`;
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDrawing) return;
        const anchor = toAnchor(e.clientX, e.clientY);
        if (!anchor) return;
        path.push(anchor);
        try {
          manager.removeDrawing(brushId);
        } catch (e) {}
        try {
          manager.addDrawing(new Brush(brushId, path));
        } catch (e) {
          // библиотека может не принять промежуточный путь — просто ждём следующего движения
        }
      };

      const handleMouseUp = () => {
        if (!isDrawing) return;
        isDrawing = false;
        if (path.length > 1) {
          drawingIdsRef.current.push(brushId);
          onDrawingsCountChange?.(drawingIdsRef.current.length);
        } else {
          try {
            manager.removeDrawing(brushId);
          } catch (e) {}
        }
        path = [];
        // Инструмент остаётся активным — можно сразу вести следующий мазок,
        // не нажимая на кисть заново. Выйти из режима — кнопкой «Курсор» или Esc.
      };

      container.addEventListener('mousedown', handleMouseDown);
      container.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        container.removeEventListener('mousedown', handleMouseDown);
        container.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('keydown', handleKeyDown);
        applyCameraLock();
      };
    }

    // ===== Инструменты, набираемые кликами: горизонтальная линия (1), тренд (2), канал (3) =====
    const required = REQUIRED_ANCHORS[activeTool];
    const ToolClass = TOOL_CLASSES[activeTool];

    const handleClick = (e: MouseEvent) => {
      const anchor = toAnchor(e.clientX, e.clientY);
      if (!anchor) return;

      pendingAnchorsRef.current = [...pendingAnchorsRef.current, anchor];

      if (pendingAnchorsRef.current.length >= required) {
        clearPreview();
        const id = `drawing-${Date.now()}-${nextDrawingIdRef.current++}`;
        try {
          manager.addDrawing(new ToolClass(id, pendingAnchorsRef.current));
          drawingIdsRef.current.push(id);
          onDrawingsCountChange?.(drawingIdsRef.current.length);
        } catch (err) {
          console.error('Не удалось создать рисунок', err);
        }
        pendingAnchorsRef.current = [];
        // Инструмент остаётся активным — сразу можно набирать клики для следующей
        // фигуры того же типа, не нажимая на кнопку инструмента заново.
      }
    };

    const handleMouseMovePreview = (e: MouseEvent) => {
      const pending = pendingAnchorsRef.current;
      if (pending.length === 0 || pending.length >= required) return;
      const anchor = toAnchor(e.clientX, e.clientY);
      if (!anchor) return;
      const wouldBeAnchors = [...pending, anchor];
      clearPreview();
      try {
        const previewId = `preview-${Date.now()}`;
        // Канал рисуется как в TradingView: первые 2 точки визуально ведут себя как
        // обычная трендовая линия, и только когда она задана (2 клика), третья точка
        // «вытягивает» из неё канал нужной ширины.
        const PreviewClass = activeTool === 'channel' && wouldBeAnchors.length < 3 ? TrendLine : ToolClass;
        manager.addDrawing(new PreviewClass(previewId, wouldBeAnchors));
        previewIdRef.current = previewId;
      } catch (e) {
        // Превью для неполного набора точек не всегда поддерживается — не критично
      }
    };

    container.addEventListener('click', handleClick);
    container.addEventListener('mousemove', handleMouseMovePreview);

    return () => {
      container.removeEventListener('click', handleClick);
      container.removeEventListener('mousemove', handleMouseMovePreview);
      window.removeEventListener('keydown', handleKeyDown);
      clearPreview();
      applyCameraLock();
    };
  }, [activeTool, onToolConsumed, onDrawingsCountChange, applyCameraLock]);

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
          // overflow: 'hidden' обрезал ценовую подпись, которую инструмент
          // рисования рисует рядом с горизонтальной линией (она, судя по всему,
          // выходит за пределы контейнера отдельным слоем поверх графика).
          overflow: 'visible',
          cursor: activeTool !== 'none' ? 'crosshair' : 'default',
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
