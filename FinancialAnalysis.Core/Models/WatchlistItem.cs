namespace FinancialAnalysis.Core.Models;

public class WatchlistItem
{
    public int WatchlistItemId { get; set; }
    public int WatchlistId { get; set; }
    public int InstrumentId { get; set; }
    public int Position { get; set; }
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public Watchlist Watchlist { get; set; } = null!;
    public Instrument Instrument { get; set; } = null!;
}