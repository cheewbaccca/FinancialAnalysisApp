using FinancialAnalysis.Core.Models;

namespace FinancialAnalysis.Core.Interfaces;

public interface IWatchlistService
{
    /// <summary>
    /// Список инструментов в watchlist пользователя (с подгруженным Instrument), по позиции.
    /// Если у пользователя ещё нет watchlist — создаёт пустой.
    /// </summary>
    Task<List<WatchlistItem>> GetItemsAsync(int userId);

    /// <summary>
    /// Добавить инструмент в watchlist пользователя. Идемпотентно — повторное добавление
    /// того же инструмента просто вернёт существующую запись.
    /// Бросает KeyNotFoundException, если инструмент не найден/неактивен.
    /// </summary>
    Task<WatchlistItem> AddItemAsync(int userId, int instrumentId);

    /// <summary>
    /// Убрать инструмент из watchlist пользователя.
    /// Бросает KeyNotFoundException, если инструмента нет в списке.
    /// </summary>
    Task RemoveItemAsync(int userId, int instrumentId);
}
