using FinancialAnalysis.Core.Models;

namespace FinancialAnalysis.Core.Interfaces;

public interface IHistoricalPriceService
{
    /// <summary>
    /// Вернуть исторические данные для символа: сначала из кеша БД, при отсутствии — из внешнего провайдера.
    /// Бросает KeyNotFoundException, если инструмент не найден в БД.
    /// </summary>
    Task<List<HistoricalPrice>> GetHistoricalDataAsync(string symbol, string timeframe, int limit);

    /// <summary>
    /// Принудительно подтянуть свежие данные из провайдера и сохранить новые свечи в БД.
    /// Возвращает количество добавленных свечей. Бросает KeyNotFoundException, если инструмент не найден.
    /// </summary>
    Task<int> RefreshDataAsync(string symbol, string timeframe, int limit);
}
