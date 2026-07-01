using System.Text.Json;
using FinancialAnalysis.Core.Interfaces;
using FinancialAnalysis.Core.Models;
using Microsoft.Extensions.Configuration;
using System.Globalization;
namespace FinancialAnalysis.Infrastructure.Services;

public class AlphaVantageProvider : IDataProvider
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    public string ProviderName => "Alpha Vantage";

    public AlphaVantageProvider(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _apiKey = configuration["ExternalApis:AlphaVantage:ApiKey"] 
                   ?? throw new Exception("Alpha Vantage API Key не найден в конфигурации");
    }

    public bool SupportsSymbol(string symbol)
    {
        var usStocks = new[] { "AAPL", "TSLA", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "NFLX", "IBM" };
        return usStocks.Contains(symbol.ToUpper());
    }

public async Task<List<HistoricalPrice>> FetchHistoricalDataAsync(
    string symbol,
    string timeframe = "daily",
    int limit = 100)
{
    try
    {
        var url = $"https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol={symbol}&outputsize=compact&apikey={_apiKey}";
        
        var response = await _httpClient.GetAsync(url);
        var json = await response.Content.ReadAsStringAsync();

        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;

        if (root.TryGetProperty("Note", out var note))
        {
            throw new Exception($"Alpha Vantage лимит: {note.GetString()}");
        }

        if (root.TryGetProperty("Error Message", out var error))
        {
            throw new Exception($"Alpha Vantage ошибка: {error.GetString()}");
        }

        if (!root.TryGetProperty("Time Series (Daily)", out var timeSeries))
        {
            throw new Exception("Не удалось найти 'Time Series (Daily)' в ответе Alpha Vantage");
        }

        var prices = new List<HistoricalPrice>();

        foreach (var property in timeSeries.EnumerateObject())
        {
            var date = DateTime.Parse(property.Name, CultureInfo.InvariantCulture);
            var utcDate = DateTime.SpecifyKind(date, DateTimeKind.Utc); // ← Приводим к UTC

            var values = property.Value;

            var openStr = values.GetProperty("1. open").GetString() ?? "0";
            var highStr = values.GetProperty("2. high").GetString() ?? "0";
            var lowStr = values.GetProperty("3. low").GetString() ?? "0";
            var closeStr = values.GetProperty("4. close").GetString() ?? "0";
            var volumeStr = values.GetProperty("5. volume").GetString() ?? "0";

            var open = decimal.Parse(openStr, CultureInfo.InvariantCulture);
            var high = decimal.Parse(highStr, CultureInfo.InvariantCulture);
            var low = decimal.Parse(lowStr, CultureInfo.InvariantCulture);
            var close = decimal.Parse(closeStr, CultureInfo.InvariantCulture);
            var volume = decimal.Parse(volumeStr, CultureInfo.InvariantCulture);

            prices.Add(new HistoricalPrice
            {
                Time = utcDate, // ← Теперь UTC
                Open = open,
                High = high,
                Low = low,
                Close = close,
                Volume = volume,
                Timeframe = "1d"
            });
        }

        return prices.OrderByDescending(p => p.Time).Take(limit).OrderBy(p => p.Time).ToList();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Ошибка Alpha Vantage: {ex.Message}");
        throw;
    }
}

    public Task<List<Instrument>> FetchInstrumentsAsync()
    {
        var instruments = new List<Instrument>
        {
            new() { Symbol = "AAPL", Name = "Apple Inc.", Exchange = "NASDAQ", Type = "Stock", Currency = "USD", IsActive = true },
            new() { Symbol = "TSLA", Name = "Tesla Inc.", Exchange = "NASDAQ", Type = "Stock", Currency = "USD", IsActive = true },
            new() { Symbol = "MSFT", Name = "Microsoft Corp.", Exchange = "NASDAQ", Type = "Stock", Currency = "USD", IsActive = true },
            new() { Symbol = "GOOGL", Name = "Alphabet Inc.", Exchange = "NASDAQ", Type = "Stock", Currency = "USD", IsActive = true },
            new() { Symbol = "AMZN", Name = "Amazon.com Inc.", Exchange = "NASDAQ", Type = "Stock", Currency = "USD", IsActive = true },
            new() { Symbol = "META", Name = "Meta Platforms", Exchange = "NASDAQ", Type = "Stock", Currency = "USD", IsActive = true },
            new() { Symbol = "NVDA", Name = "NVIDIA Corp.", Exchange = "NASDAQ", Type = "Stock", Currency = "USD", IsActive = true },
            new() { Symbol = "NFLX", Name = "Netflix Inc.", Exchange = "NASDAQ", Type = "Stock", Currency = "USD", IsActive = true },
            new() { Symbol = "IBM", Name = "IBM Corp.", Exchange = "NYSE", Type = "Stock", Currency = "USD", IsActive = true },
        };

        return Task.FromResult(instruments);
    }
}