using FinancialAnalysis.Core.Models;

namespace FinancialAnalysis.Core.Interfaces;

public interface IAuthService
{
    /// <summary>
    /// Зарегистрировать нового пользователя и создать для него пустой watchlist.
    /// Бросает InvalidOperationException, если email уже занят.
    /// </summary>
    Task<User> RegisterAsync(string email, string password);

    /// <summary>
    /// Проверить email/пароль. Возвращает пользователя при успехе, иначе null.
    /// </summary>
    Task<User?> ValidateCredentialsAsync(string email, string password);
}
