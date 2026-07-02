using FinancialAnalysis.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace FinancialAnalysis.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HistoricalPricesController : ControllerBase
{
    private readonly IHistoricalPriceService _historicalPriceService;

    public HistoricalPricesController(IHistoricalPriceService historicalPriceService)
    {
        _historicalPriceService = historicalPriceService;
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
            var prices = await _historicalPriceService.GetHistoricalDataAsync(symbol, timeframe, limit);

            return Ok(prices.Select(h => new
            {
                time = h.Time,
                open = h.Open,
                high = h.High,
                low = h.Low,
                close = h.Close,
                volume = h.Volume
            }));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (NotSupportedException ex)
        {
            return BadRequest($"Нет провайдера для {symbol}: {ex.Message}");
        }
        catch (Exception ex)
        {
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
            var addedCount = await _historicalPriceService.RefreshDataAsync(symbol, timeframe, limit);
            return Ok(new
            {
                message = addedCount > 0 ? $"Добавлено {addedCount} новых свечей" : "Нет новых данных",
                count = addedCount
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Ошибка: {ex.Message}");
        }
    }
}
