using FinancialAnalysis.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace FinancialAnalysis.Infrastructure;

public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        
        // Эта строка нужна ТОЛЬКО для дизайн-тайма (миграций)
        // Пароль должен совпадать с тем, что в appsettings.json
        optionsBuilder.UseNpgsql(
            "Host=localhost;Port=5432;Database=financial_analysis;Username=postgres;Password=mysecretpassword");
        
        return new AppDbContext(optionsBuilder.Options);
    }
}