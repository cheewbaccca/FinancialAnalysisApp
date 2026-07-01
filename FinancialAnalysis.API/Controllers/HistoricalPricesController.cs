using FinancialAnalysis.Core.Services;
using FinancialAnalysis.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinancialAnalysis.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HistoricalPricesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly DataAggregator _aggregator;

    public HistoricalPricesController(AppDbContext context, DataAggregator aggregator)
    {
        _context = context;
        _aggregator = aggregator;
    }

    // ЭТОТ МЕТОД ДОЛЖЕН БЫТЬ ТОЛЬКО ОДИН!
    [HttpGet("{symbol}")]
    public async Task<IActionResult> GetHistoricalData(string symbol, [FromQuery] int limit = 100)
    {
        try
        {
            // 1. Находим инструмент
            var instrument = await _context.Instruments
                .FirstOrDefaultAsync(i => i.Symbol == symbol.ToUpper());

            if (instrument == null)
                return NotFound($"Инструмент {symbol} не найден");

            // 2. Проверяем, есть ли данные в БД вообще
            var totalCount = await _context.HistoricalPrices
                .Where(h => h.InstrumentId == instrument.InstrumentId)
                .CountAsync();

            // 3. Если данных в БД меньше, чем запрошено, или их нет — загружаем из API
            if (totalCount < limit)
            {
                Console.WriteLine($"🔄 В БД {totalCount} записей, запрошено {limit}, загружаем из API...");
                
                var freshData = await _aggregator.GetHistoricalDataAsync(symbol, "daily", limit);
                
                if (freshData.Any())
                {
                    foreach (var price in freshData)
                    {
                        price.InstrumentId = instrument.InstrumentId;
                        price.Timeframe = "1d";

                        var existing = await _context.HistoricalPrices
                            .FirstOrDefaultAsync(h => h.InstrumentId == instrument.InstrumentId
                                && h.Time == price.Time
                                && h.Timeframe == price.Timeframe);

                        if (existing == null)
                        {
                            await _context.HistoricalPrices.AddAsync(price);
                        }
                    }

                    await _context.SaveChangesAsync();
                    Console.WriteLine($"✅ Сохранено {freshData.Count} новых записей для {symbol}");
                }
            }

            // 4. Отдаем из БД ровно столько, сколько запросил пользователь
            var prices = await _context.HistoricalPrices
                .Where(h => h.InstrumentId == instrument.InstrumentId)
                .OrderByDescending(h => h.Time)
                .Take(limit)
                .OrderBy(h => h.Time)
                .Select(h => new
                {
                    time = h.Time,
                    open = h.Open,
                    high = h.High,
                    low = h.Low,
                    close = h.Close,
                    volume = h.Volume
                })
                .ToListAsync();

            return Ok(prices);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Ошибка: {ex.Message}");
            return StatusCode(500, $"Ошибка: {ex.Message}");
        }
    }
}