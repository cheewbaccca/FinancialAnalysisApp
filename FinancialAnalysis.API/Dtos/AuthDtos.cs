namespace FinancialAnalysis.API.Dtos;

public record RegisterRequest(string Email, string Password);

public record LoginRequest(string Email, string Password);

public record AuthResponse(string Token, int UserId, string Email, string Role, DateTime ExpiresAt);
