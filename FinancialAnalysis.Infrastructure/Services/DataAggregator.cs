using FinancialAnalysis.Core.Interfaces;
using FinancialAnalysis.Core.Models;

namespace FinancialAnalysis.Core.Services;

public class DataAggregator
{
    private readonly IEnumerable<IDataProvider> _providers;

    public DataAggregator(IEnumerable<IDataProvider> providers)
    {
        _providers = providers;
    }

    /// <summary>
    /// Получить исторические данные для символа с указанным таймфреймом
    /// </summary>
    public async Task<List<HistoricalPrice>> GetHistoricalDataAsync(
        string symbol,
        string timeframe = "daily",
        int limit = 100)
    {
        // Ищем провайдера, который поддерживает этот символ
        var provider = _providers.FirstOrDefault(p => p.SupportsSymbol(symbol));
        
        if (provider == null)
            throw new NotSupportedException($"Нет провайдера для символа {symbol}");

        Console.WriteLine($"📥 Загружаем {symbol} из {provider.ProviderName} (таймфрейм: {timeframe}, лимит: {limit})");
        
        // Передаем таймфрейм и лимит в провайдер
        return await provider.FetchHistoricalDataAsync(symbol, timeframe, limit);
    }

    /// <summary>
    /// Получить список всех инструментов от всех провайдеров
    /// </summary>
    public async Task<List<Instrument>> GetAllInstrumentsAsync()
    {
        var allInstruments = new List<Instrument>();
        
        foreach (var provider in _providers)
        {
            try
            {
                var instruments = await provider.FetchInstrumentsAsync();
                allInstruments.AddRange(instruments);
                Console.WriteLine($"📋 Загружено {instruments.Count} инструментов из {provider.ProviderName}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Ошибка загрузки из {provider.ProviderName}: {ex.Message}");
            }
        }
        
        return allInstruments.DistinctBy(i => i.Symbol).ToList();
    }
}