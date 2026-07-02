using FinancialAnalysis.Core.Interfaces;
using FinancialAnalysis.Core.Models;
using FinancialAnalysis.Core.Services;
using FinancialAnalysis.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FinancialAnalysis.Infrastructure.Services;

public class HistoricalPriceService : IHistoricalPriceService
{
    private readonly AppDbContext _context;
    private readonly DataAggregator _aggregator;
    private readonly ILogger<HistoricalPriceService> _logger;

    public HistoricalPriceService(AppDbContext context, DataAggregator aggregator, ILogger<HistoricalPriceService> logger)
    {
        _context = context;
        _aggregator = aggregator;
        _logger = logger;
    }

    public async Task<List<HistoricalPrice>> GetHistoricalDataAsync(string symbol, string timeframe, int limit)
    {
        var instrument = await GetInstrumentAsync(symbol);

        var cachedData = await _context.HistoricalPrices
            .Where(h => h.InstrumentId == instrument.InstrumentId && h.Timeframe == timeframe)
            .OrderByDescending(h => h.Time)
            .Take(limit)
            .ToListAsync();

        if (cachedData.Any())
        {
            _logger.LogInformation(
                "Данные найдены в БД: {Count} свечей ({Symbol}, {Timeframe})",
                cachedData.Count, symbol, timeframe);
            return cachedData.OrderBy(h => h.Time).ToList();
        }

        _logger.LogInformation("Данных в БД нет, загружаем из API: {Symbol} ({Timeframe})", symbol, timeframe);
        var freshData = await _aggregator.GetHistoricalDataAsync(symbol, timeframe, limit);

        if (!freshData.Any())
        {
            _logger.LogWarning("API не вернул данных для {Symbol} ({Timeframe})", symbol, timeframe);
            return new List<HistoricalPrice>();
        }

        await SavePricesAsync(instrument.InstrumentId, timeframe, freshData);
        return freshData.OrderBy(h => h.Time).ToList();
    }

    public async Task<int> RefreshDataAsync(string symbol, string timeframe, int limit)
    {
        var instrument = await GetInstrumentAsync(symbol);

        var freshData = await _aggregator.GetHistoricalDataAsync(symbol, timeframe, limit);
        if (!freshData.Any())
            return 0;

        return await SavePricesAsync(instrument.InstrumentId, timeframe, freshData);
    }

    private async Task<Instrument> GetInstrumentAsync(string symbol)
    {
        var instrument = await _context.Instruments
            .FirstOrDefaultAsync(i => i.Symbol == symbol.ToUpper());

        if (instrument == null)
            throw new KeyNotFoundException($"Инструмент {symbol} не найден");

        return instrument;
    }

    private async Task<int> SavePricesAsync(int instrumentId, string timeframe, List<HistoricalPrice> prices)
    {
        var addedCount = 0;
        foreach (var price in prices)
        {
            price.InstrumentId = instrumentId;
            price.Timeframe = timeframe;

            var exists = await _context.HistoricalPrices.AnyAsync(h =>
                h.InstrumentId == instrumentId && h.Time == price.Time && h.Timeframe == timeframe);

            if (!exists)
            {
                await _context.HistoricalPrices.AddAsync(price);
                addedCount++;
            }
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Сохранено {Count} новых свечей (таймфрейм: {Timeframe})", addedCount, timeframe);
        return addedCount;
    }
}
