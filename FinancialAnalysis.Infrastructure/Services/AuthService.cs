using FinancialAnalysis.Core.Interfaces;
using FinancialAnalysis.Core.Models;
using FinancialAnalysis.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace FinancialAnalysis.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly PasswordHasher<User> _passwordHasher = new();

    public AuthService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<User> RegisterAsync(string email, string password)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();

        if (await _context.Users.AnyAsync(u => u.Email == normalizedEmail))
            throw new InvalidOperationException("Пользователь с таким email уже зарегистрирован");

        var user = new User
        {
            Email = normalizedEmail,
            Role = "User",
            CreatedAt = DateTime.UtcNow
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, password);

        await _context.Users.AddAsync(user);

        // Сразу создаём пустой watchlist, чтобы фронту было куда добавлять инструменты
        var watchlist = new Watchlist
        {
            User = user,
            Name = "My Watchlist",
            CreatedAt = DateTime.UtcNow
        };
        await _context.Watchlists.AddAsync(watchlist);

        await _context.SaveChangesAsync();
        return user;
    }

    public async Task<User?> ValidateCredentialsAsync(string email, string password)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        if (user == null)
            return null;

        var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);
        if (result == PasswordVerificationResult.Failed)
            return null;

        user.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return user;
    }
}
