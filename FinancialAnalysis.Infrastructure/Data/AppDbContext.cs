using FinancialAnalysis.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace FinancialAnalysis.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }
    
    public DbSet<User> Users { get; set; }
    public DbSet<Instrument> Instruments { get; set; }
    public DbSet<HistoricalPrice> HistoricalPrices { get; set; }
    public DbSet<ChartConfig> ChartConfigs { get; set; }
    public DbSet<Watchlist> Watchlists { get; set; }
    public DbSet<WatchlistItem> WatchlistItems { get; set; }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // User
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();
            
        // Instrument
        modelBuilder.Entity<Instrument>()
            .HasIndex(i => i.Symbol)
            .IsUnique();
            
        // HistoricalPrice - составной индекс для быстрого поиска
        modelBuilder.Entity<HistoricalPrice>()
            .HasIndex(h => new { h.InstrumentId, h.Time, h.Timeframe })
            .IsUnique();
            
        // ChartConfig - настройки в JSONB
        modelBuilder.Entity<ChartConfig>()
            .Property(c => c.Indicators)
            .HasColumnType("jsonb");
            
        modelBuilder.Entity<ChartConfig>()
            .Property(c => c.Drawings)
            .HasColumnType("jsonb");
            
        modelBuilder.Entity<ChartConfig>()
            .Property(c => c.ChartSettings)
            .HasColumnType("jsonb");
    }
}