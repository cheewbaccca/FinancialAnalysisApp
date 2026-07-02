namespace FinancialAnalysis.API.Dtos;

public record AddWatchlistItemRequest(int InstrumentId);

public record WatchlistItemResponse(
    int InstrumentId,
    string Symbol,
    string Name,
    string Exchange,
    string Type,
    int Position);
