using FinancialAnalysis.Core.Models;
using FinancialAnalysis.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinancialAnalysis.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InstrumentsController : ControllerBase
{
    private readonly AppDbContext _context;

    public InstrumentsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Instrument>>> GetInstruments()
    {
        var instruments = await _context.Instruments
            .Where(i => i.IsActive)
            .ToListAsync();
        
        return Ok(instruments);
    }
    [HttpGet("symbols")]
public async Task<ActionResult<IEnumerable<string>>> GetSymbols()
{
    var symbols = await _context.Instruments
        .Where(i => i.IsActive)
        .Select(i => i.Symbol)
        .OrderBy(s => s)
        .ToListAsync();
    
    return Ok(symbols);
}
}