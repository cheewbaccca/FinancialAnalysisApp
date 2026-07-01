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

        Console.WriteLine("Начинаем загрузку инструментов...");

        // 1. Добавляем базовые криптовалюты (если их нет)
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

        // 2. Добавляем акции США (Alpha Vantage) — только те, которых нет в БД
        var usStocks = new List<Instrument>
        {
            new() { Symbol = "AAPL", Name = "Apple Inc.", Exchange = "NASDAQ", Type = "Stock", Currency = "USD", IsActive = true },
            new() { Symbol = "NVDA", Name = "NVIDIA Corp.", Exchange = "NASDAQ", Type = "Stock", Currency = "USD", IsActive = true },
            new() { Symbol = "TSLA", Name = "Tesla Inc.", Exchange = "NASDAQ", Type = "Stock", Currency = "USD", IsActive = true },
            new() { Symbol = "MSFT", Name = "Microsoft Corp.", Exchange = "NASDAQ", Type = "Stock", Currency = "USD", IsActive = true },
            new() { Symbol = "AMZN", Name = "Amazon.com Inc.", Exchange = "NASDAQ", Type = "Stock", Currency = "USD", IsActive = true },
            new() { Symbol = "GOOGL", Name = "Alphabet Inc.", Exchange = "NASDAQ", Type = "Stock", Currency = "USD", IsActive = true },
            new() { Symbol = "META", Name = "Meta Platforms", Exchange = "NASDAQ", Type = "Stock", Currency = "USD", IsActive = true },
            new() { Symbol = "NFLX", Name = "Netflix Inc.", Exchange = "NASDAQ", Type = "Stock", Currency = "USD", IsActive = true },
            new() { Symbol = "IBM", Name = "IBM Corp.", Exchange = "NYSE", Type = "Stock", Currency = "USD", IsActive = true },
        };

        foreach (var instrument in usStocks)
        {
            if (!await context.Instruments.AnyAsync(i => i.Symbol == instrument.Symbol))
            {
                await context.Instruments.AddAsync(instrument);
                Console.WriteLine($"Добавлена акция США: {instrument.Symbol}");
            }
            else
            {
                Console.WriteLine($"Инструмент уже есть: {instrument.Symbol}");
            }
        }

        // 3. Сохраняем изменения
        await context.SaveChangesAsync();
        Console.WriteLine($"ИТОГО инструментов в БД: {await context.Instruments.CountAsync()}");
    }
}