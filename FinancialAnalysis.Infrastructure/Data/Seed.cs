using FinancialAnalysis.Core.Interfaces;
using FinancialAnalysis.Core.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace FinancialAnalysis.Infrastructure.Data;

public static class SeedData
{
    public static async Task InitializeAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var providers = scope.ServiceProvider.GetServices<IDataProvider>();

        Console.WriteLine("Начинаем загрузку инструментов...");

        // 1. Сначала добавляем базовые криптовалюты (если их нет)
        var cryptoInstruments = new List<Instrument>
        {
            new() { Symbol = "BTCUSDT", Name = "Bitcoin", Exchange = "Binance", Type = "Crypto", Currency = "USD", IsActive = true },
            new() { Symbol = "ETHUSDT", Name = "Ethereum", Exchange = "Binance", Type = "Crypto", Currency = "USD", IsActive = true },
            new() { Symbol = "BNBUSDT", Name = "Binance Coin", Exchange = "Binance", Type = "Crypto", Currency = "USD", IsActive = true },
        };

        foreach (var instrument in cryptoInstruments)
        {
            if (!await context.Instruments.AnyAsync(i => i.Symbol == instrument.Symbol))
            {
                await context.Instruments.AddAsync(instrument);
                Console.WriteLine($"Добавлена криптовалюта: {instrument.Symbol}");
            }
        }

        // 2. Загружаем инструменты из всех провайдеров (акции США и РФ)
        var allInstruments = new List<Instrument>();

        foreach (var provider in providers)
        {
            try
            {
                var instruments = await provider.FetchInstrumentsAsync();
                allInstruments.AddRange(instruments);
                Console.WriteLine($"Загружено {instruments.Count} инструментов из {provider.ProviderName}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Ошибка загрузки из {provider.ProviderName}: {ex.Message}");
            }
        }

        // 3. Добавляем только те, которых еще нет в БД
        foreach (var instrument in allInstruments.DistinctBy(i => i.Symbol))
        {
            if (!await context.Instruments.AnyAsync(i => i.Symbol == instrument.Symbol))
            {
                await context.Instruments.AddAsync(instrument);
                Console.WriteLine($"Добавлен инструмент: {instrument.Symbol} ({instrument.Exchange})");
            }
            else
            {
                Console.WriteLine($"Инструмент уже есть: {instrument.Symbol}");
            }
        }

        await context.SaveChangesAsync();
        Console.WriteLine($"ИТОГО инструментов в БД: {await context.Instruments.CountAsync()}");
    }
}