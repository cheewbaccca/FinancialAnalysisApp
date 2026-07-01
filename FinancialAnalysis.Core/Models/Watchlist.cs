namespace FinancialAnalysis.Core.Models;

public class Watchlist
{
    public int WatchlistId { get; set; }
    public int UserId { get; set; }
    public string Name { get; set; } = "My Watchlist";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public User User { get; set; } = null!;
    public ICollection<WatchlistItem> Items { get; set; } = new List<WatchlistItem>();
}