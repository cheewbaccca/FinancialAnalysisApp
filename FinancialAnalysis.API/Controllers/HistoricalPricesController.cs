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

    /// <summary>
    /// Получить исторические данные для инструмента
    /// </summary>
    [HttpGet("{symbol}")]
    public async Task<IActionResult> GetHistoricalData(
        string symbol,
        [FromQuery] int limit = 100,
        [FromQuery] string timeframe = "daily")
    {
        try
        {
            Console.WriteLine($"📥 Запрос: {symbol}, таймфрейм: {timeframe}, лимит: {limit}");

            // 1. Находим инструмент
            var instrument = await _context.Instruments
                .FirstOrDefaultAsync(i => i.Symbol == symbol.ToUpper());

            if (instrument == null)
                return NotFound($"Инструмент {symbol} не найден");

            // 2. Проверяем кеш в БД для данного таймфрейма
            var cachedData = await _context.HistoricalPrices
                .Where(h => h.InstrumentId == instrument.InstrumentId 
                            && h.Timeframe == timeframe)
                .OrderByDescending(h => h.Time)
                .Take(limit)
                .ToListAsync();

            // 3. Если данные есть — возвращаем
            if (cachedData.Any())
            {
                Console.WriteLine($"✅ Данные найдены в БД: {cachedData.Count} свечей (таймфрейм: {timeframe})");
                return Ok(cachedData.OrderBy(h => h.Time).Select(h => new
                {
                    time = h.Time,
                    open = h.Open,
                    high = h.High,
                    low = h.Low,
                    close = h.Close,
                    volume = h.Volume
                }));
            }

            // 4. Если нет — загружаем из API
            Console.WriteLine($"🔄 Данных в БД нет, загружаем из API...");
            
            var freshData = await _aggregator.GetHistoricalDataAsync(symbol, timeframe, limit);

            if (!freshData.Any())
            {
                Console.WriteLine($"⚠️ API не вернул данных для {symbol} ({timeframe})");
                return Ok(new List<object>());
            }

            // 5. Сохраняем данные в БД
            var addedCount = 0;
            foreach (var price in freshData)
            {
                price.InstrumentId = instrument.InstrumentId;
                price.Timeframe = timeframe; // ← ВАЖНО: сохраняем переданный таймфрейм!

                var existing = await _context.HistoricalPrices
                    .FirstOrDefaultAsync(h => h.InstrumentId == instrument.InstrumentId
                        && h.Time == price.Time
                        && h.Timeframe == timeframe); // ← проверяем по таймфрейму

                if (existing == null)
                {
                    await _context.HistoricalPrices.AddAsync(price);
                    addedCount++;
                }
            }

            await _context.SaveChangesAsync();
            Console.WriteLine($"✅ Сохранено {addedCount} новых свечей для {symbol} ({timeframe})");

            // 6. Возвращаем данные
            return Ok(freshData.OrderBy(h => h.Time).Select(h => new
            {
                time = h.Time,
                open = h.Open,
                high = h.High,
                low = h.Low,
                close = h.Close,
                volume = h.Volume
            }));
        }
        catch (NotSupportedException ex)
        {
            Console.WriteLine($"❌ Ошибка: {ex.Message}");
            return BadRequest($"Нет провайдера для {symbol}: {ex.Message}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Ошибка: {ex.Message}");
            return StatusCode(500, $"Ошибка загрузки данных: {ex.Message}");
        }
    }

    /// <summary>
    /// Принудительное обновление данных
    /// </summary>
    [HttpPost("refresh/{symbol}")]
    public async Task<IActionResult> RefreshData(
        string symbol,
        [FromQuery] int limit = 100,
        [FromQuery] string timeframe = "daily")
    {
        try
        {
            var instrument = await _context.Instruments
                .FirstOrDefaultAsync(i => i.Symbol == symbol.ToUpper());

            if (instrument == null)
                return NotFound($"Инструмент {symbol} не найден");

            var freshData = await _aggregator.GetHistoricalDataAsync(symbol, timeframe, limit);

            if (!freshData.Any())
                return Ok(new { message = "Нет новых данных", count = 0 });

            var addedCount = 0;
            foreach (var price in freshData)
            {
                price.InstrumentId = instrument.InstrumentId;
                price.Timeframe = timeframe; // ← сохраняем переданный таймфрейм

                var existing = await _context.HistoricalPrices
                    .FirstOrDefaultAsync(h => h.InstrumentId == instrument.InstrumentId
                        && h.Time == price.Time
                        && h.Timeframe == timeframe);

                if (existing == null)
                {
                    await _context.HistoricalPrices.AddAsync(price);
                    addedCount++;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = $"Добавлено {addedCount} новых свечей", count = addedCount });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Ошибка: {ex.Message}");
        }
    }
}