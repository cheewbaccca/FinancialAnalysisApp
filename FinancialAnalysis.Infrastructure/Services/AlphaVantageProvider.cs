using System.Globalization;
using System.Text.Json;
using FinancialAnalysis.Core.Interfaces;
using FinancialAnalysis.Core.Models;
using Microsoft.Extensions.Configuration;

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
        var usStocks = new[] { "AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "GOOGL", "META", "NFLX", "IBM" };
        return usStocks.Contains(symbol.ToUpper());
    }

    public async Task<List<HistoricalPrice>> FetchHistoricalDataAsync(
        string symbol,
        string timeframe = "daily",
        int limit = 100)
    {
        try
        {
            // Определяем функцию и интервал
            string function;
            string intervalParam = "";
            string timeSeriesKey;

            switch (timeframe.ToLower())
            {
                case "1min":
                    function = "TIME_SERIES_INTRADAY";
                    intervalParam = "&interval=1min";
                    timeSeriesKey = "Time Series (1min)";
                    break;
                case "5min":
                    function = "TIME_SERIES_INTRADAY";
                    intervalParam = "&interval=5min";
                    timeSeriesKey = "Time Series (5min)";
                    break;
                case "15min":
                    function = "TIME_SERIES_INTRADAY";
                    intervalParam = "&interval=15min";
                    timeSeriesKey = "Time Series (15min)";
                    break;
                case "1h":
                    function = "TIME_SERIES_INTRADAY";
                    intervalParam = "&interval=60min";
                    timeSeriesKey = "Time Series (60min)";
                    break;
                case "daily":
                default:
                    function = "TIME_SERIES_DAILY";
                    intervalParam = "";
                    timeSeriesKey = "Time Series (Daily)";
                    break;
                case "week":
                    function = "TIME_SERIES_WEEKLY";
                    intervalParam = "";
                    timeSeriesKey = "Weekly Time Series";
                    break;
                case "month":
                    function = "TIME_SERIES_MONTHLY";
                    intervalParam = "";
                    timeSeriesKey = "Monthly Time Series";
                    break;
            }

            // Формируем URL
            var url = $"https://www.alphavantage.co/query?function={function}&symbol={symbol}{intervalParam}&outputsize=compact&apikey={_apiKey}";
            
            Console.WriteLine($"🟢 Alpha Vantage: Запрос к {url}");

            var response = await _httpClient.GetAsync(url);
            var json = await response.Content.ReadAsStringAsync();

            // Логируем ответ для отладки
            Console.WriteLine($"📨 Ответ Alpha Vantage (первые 300 символов): {json.Substring(0, Math.Min(300, json.Length))}");

            using var document = JsonDocument.Parse(json);
            var root = document.RootElement;

            // Проверяем на ошибки
            if (root.TryGetProperty("Note", out var note))
            {
                throw new Exception($"Alpha Vantage лимит: {note.GetString()}");
            }

            if (root.TryGetProperty("Error Message", out var error))
            {
                throw new Exception($"Alpha Vantage ошибка: {error.GetString()}");
            }

            // Пробуем найти данные по ключу
            if (!root.TryGetProperty(timeSeriesKey, out var timeSeries))
            {
                // Если не нашли, пробуем альтернативные ключи для внутридневных данных
                if (timeframe.ToLower() == "1h")
                {
                    // Alpha Vantage может вернуть Time Series (1min) для 60min
                    if (root.TryGetProperty("Time Series (1min)", out var altSeries))
                    {
                        timeSeries = altSeries;
                        Console.WriteLine("⚠️ Используем Time Series (1min) вместо (60min)");
                    }
                    else if (root.TryGetProperty("Time Series (5min)", out var altSeries5))
                    {
                        timeSeries = altSeries5;
                        Console.WriteLine("⚠️ Используем Time Series (5min) вместо (60min)");
                    }
                    else
                    {
                        throw new Exception($"Не удалось найти данные для {timeframe} в ответе Alpha Vantage");
                    }
                }
                else
                {
                    throw new Exception($"Не удалось найти '{timeSeriesKey}' в ответе Alpha Vantage");
                }
            }

            var prices = new List<HistoricalPrice>();
            var count = 0;

            foreach (var property in timeSeries.EnumerateObject())
            {
                if (count >= limit) break;
                
                try
                {
                    var date = DateTime.Parse(property.Name, CultureInfo.InvariantCulture);
                    var utcDate = DateTime.SpecifyKind(date, DateTimeKind.Utc);
                    var values = property.Value;

                    prices.Add(new HistoricalPrice
                    {
                        Time = utcDate,
                        Open = decimal.Parse(values.GetProperty("1. open").GetString() ?? "0", CultureInfo.InvariantCulture),
                        High = decimal.Parse(values.GetProperty("2. high").GetString() ?? "0", CultureInfo.InvariantCulture),
                        Low = decimal.Parse(values.GetProperty("3. low").GetString() ?? "0", CultureInfo.InvariantCulture),
                        Close = decimal.Parse(values.GetProperty("4. close").GetString() ?? "0", CultureInfo.InvariantCulture),
                        Volume = decimal.Parse(values.GetProperty("5. volume").GetString() ?? "0", CultureInfo.InvariantCulture),
                        Timeframe = timeframe
                    });
                    count++;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"⚠️ Ошибка парсинга строки: {ex.Message}");
                }
            }

            Console.WriteLine($"✅ Alpha Vantage: Загружено {prices.Count} свечей для {symbol} ({timeframe})");
            return prices.OrderBy(p => p.Time).ToList();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Ошибка Alpha Vantage: {ex.Message}");
            throw;
        }
    }

    public Task<List<Instrument>> FetchInstrumentsAsync()
    {
        var instruments = new List<Instrument>
        {
            new() { Symbol = "AAPL", Name = "Apple Inc.", Exchange = "NASDAQ", Type = "Stock", Currency = "USD", IsActive = true },
            new() { Symbol = "NVDA", Name = "NVIDIA Corp.", Exchange = "NASDAQ", Type = "Stock", Currency = "USD", IsActive = true },
            new() { Symbol = "TSLA", Name = "Tesla Inc.", Exchange = "NASDAQ", Type = "Stock", Currency = "USD", IsActive = true },
            new() { Symbol = "MSFT", Name = "Microsoft Corp.", Exchange = "NASDAQ", Type = "Stock", Currency = "USD", IsActive = true },
            new() { Symbol = "AMZN", Name = "Amazon.com Inc.", Exchange = "NASDAQ", Type = "Stock", Currency = "USD", IsActive = true },
            new() { Symbol = "GOOGL", Name = "Alphabet Inc.", Exchange = "NASDAQ", Type = "Stock", Currency = "USD", IsActive = true },
            new() { Symbol = "META", Name = "Meta Platforms", Exchange = "NASDAQ", Type = "Stock", Currency = "USD", IsActive = true },
            new() { Symbol = "NFLX", Name = "Netflix Inc.", Exchange = "NASDAQ", Type = "Stock", Currency = "USD", IsActive = true },
            new() { Symbol = "IBM", Name = "IBM Corp.", Exchange = "NYSE", Type = "Stock", Currency = "USD", IsActive = true },
        };

        return Task.FromResult(instruments);
    }
}