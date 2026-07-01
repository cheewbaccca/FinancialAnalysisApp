using FinancialAnalysis.Infrastructure.Data;
using FinancialAnalysis.Infrastructure.Services;   // ← Для AlphaVantageProvider и MoexProvider
using FinancialAnalysis.Core.Interfaces;          // ← Для IDataProvider
using FinancialAnalysis.Core.Services;            // ← Для DataAggregator
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// 1. Настройка CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy => policy
            .WithOrigins("http://localhost:5173", "http://localhost:3000")
            .AllowAnyMethod()
            .AllowAnyHeader());
});
// Регистрация HTTP клиентов
builder.Services.AddHttpClient<AlphaVantageProvider>(client =>
{
    client.BaseAddress = new Uri("https://www.alphavantage.co/");
    client.DefaultRequestHeaders.Add("User-Agent", "FinancialAnalysisApp");
});



// Регистрация провайдеров как Scoped (или Transient)
builder.Services.AddScoped<IDataProvider, AlphaVantageProvider>();
builder.Services.AddScoped<TInvestProvider>();
builder.Services.AddScoped<IDataProvider, TInvestProvider>();

// Регистрация агрегатора
builder.Services.AddScoped<DataAggregator>();
// 2. Настройка PostgreSQL
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// 3. Настройка JWT
var jwtKey = Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? "default-key-32-chars-long-here!!!");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(jwtKey)
        };
    });

builder.Services.AddAuthorization();

// 4. Настройка Controllers
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// 5. Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// 6. Auto-migration (создаст БД при первом запуске)
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.Migrate();
}
// После `app.Services.GetRequiredService<AppDbContext>().Database.Migrate();`
// После миграций
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.Migrate();
    
    // Заполняем базу данными
    await SeedData.InitializeAsync(app.Services);
}
// 7. Middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AllowReactApp");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();