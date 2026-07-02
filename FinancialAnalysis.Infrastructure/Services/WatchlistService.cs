using FinancialAnalysis.Core.Interfaces;
using FinancialAnalysis.Core.Models;
using FinancialAnalysis.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FinancialAnalysis.Infrastructure.Services;

public class WatchlistService : IWatchlistService
{
    private readonly AppDbContext _context;

    public WatchlistService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<WatchlistItem>> GetItemsAsync(int userId)
    {
        var watchlist = await GetOrCreateWatchlistAsync(userId);

        return await _context.WatchlistItems
            .Include(i => i.Instrument)
            .Where(i => i.WatchlistId == watchlist.WatchlistId)
            .OrderBy(i => i.Position)
            .ToListAsync();
    }

    public async Task<WatchlistItem> AddItemAsync(int userId, int instrumentId)
    {
        var instrumentExists = await _context.Instruments
            .AnyAsync(i => i.InstrumentId == instrumentId && i.IsActive);
        if (!instrumentExists)
            throw new KeyNotFoundException("Инструмент не найден");

        var watchlist = await GetOrCreateWatchlistAsync(userId);

        var existing = await _context.WatchlistItems
            .Include(i => i.Instrument)
            .FirstOrDefaultAsync(i => i.WatchlistId == watchlist.WatchlistId && i.InstrumentId == instrumentId);
        if (existing != null)
            return existing;

        var maxPosition = await _context.WatchlistItems
            .Where(i => i.WatchlistId == watchlist.WatchlistId)
            .Select(i => (int?)i.Position)
            .MaxAsync() ?? -1;

        var item = new WatchlistItem
        {
            WatchlistId = watchlist.WatchlistId,
            InstrumentId = instrumentId,
            Position = maxPosition + 1,
            AddedAt = DateTime.UtcNow
        };

        await _context.WatchlistItems.AddAsync(item);
        await _context.SaveChangesAsync();

        await _context.Entry(item).Reference(i => i.Instrument).LoadAsync();
        return item;
    }

    public async Task RemoveItemAsync(int userId, int instrumentId)
    {
        var watchlist = await GetOrCreateWatchlistAsync(userId);

        var item = await _context.WatchlistItems
            .FirstOrDefaultAsync(i => i.WatchlistId == watchlist.WatchlistId && i.InstrumentId == instrumentId);

        if (item == null)
            throw new KeyNotFoundException("Инструмент отсутствует в списке наблюдения");

        _context.WatchlistItems.Remove(item);
        await _context.SaveChangesAsync();
    }

    private async Task<Watchlist> GetOrCreateWatchlistAsync(int userId)
    {
        var watchlist = await _context.Watchlists.FirstOrDefaultAsync(w => w.UserId == userId);
        if (watchlist != null)
            return watchlist;

        watchlist = new Watchlist
        {
            UserId = userId,
            Name = "My Watchlist",
            CreatedAt = DateTime.UtcNow
        };
        await _context.Watchlists.AddAsync(watchlist);
        await _context.SaveChangesAsync();
        return watchlist;
    }
}
