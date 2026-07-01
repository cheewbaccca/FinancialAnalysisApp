namespace FinancialAnalysis.Core.Models;

public class Instrument
{
    public int InstrumentId { get; set; }
    public string Symbol { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Exchange { get; set; } = string.Empty;
    public string Type { get; set; } = "Crypto";
    public string Currency { get; set; } = "USD";
    public bool IsActive { get; set; } = true;
    
    // Navigation properties
    public ICollection<HistoricalPrice> HistoricalPrices { get; set; } = new List<HistoricalPrice>();
    public ICollection<WatchlistItem> WatchlistItems { get; set; } = new List<WatchlistItem>();
}