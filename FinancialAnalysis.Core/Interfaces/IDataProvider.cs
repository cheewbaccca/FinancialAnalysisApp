using FinancialAnalysis.Core.Models;

namespace FinancialAnalysis.Core.Interfaces;

public interface IDataProvider
{
    string ProviderName { get; }
    bool SupportsSymbol(string symbol);
    Task<List<HistoricalPrice>> FetchHistoricalDataAsync(string symbol, string timeframe = "1h", int limit = 100);
    Task<List<Instrument>> FetchInstrumentsAsync();
}