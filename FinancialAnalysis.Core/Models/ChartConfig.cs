using System.Text.Json;

namespace FinancialAnalysis.Core.Models;

public class ChartConfig
{
    public int ChartConfigId { get; set; }
    public int UserId { get; set; }
    public int InstrumentId { get; set; }
    public string Name { get; set; } = "My Chart";
    public string Timeframe { get; set; } = "1h";
    public string Indicators { get; set; } = "[]";  // JSON
    public string Drawings { get; set; } = "[]";    // JSON
    public string ChartSettings { get; set; } = "{}"; // JSON
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public User User { get; set; } = null!;
    public Instrument Instrument { get; set; } = null!;
}