using System.ComponentModel.DataAnnotations;

namespace FinancialAnalysis.Core.Models;

public class HistoricalPrice
{
    [Key]
    public int PriceId { get; set; }
    
    public int InstrumentId { get; set; }
    public DateTime Time { get; set; }
    public string Timeframe { get; set; } = "1h";
    
    public decimal Open { get; set; }
    public decimal High { get; set; }
    public decimal Low { get; set; }
    public decimal Close { get; set; }
    public decimal Volume { get; set; }
    
    // Navigation property
    public Instrument Instrument { get; set; } = null!;
}