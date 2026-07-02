using System.Security.Claims;
using FinancialAnalysis.API.Dtos;
using FinancialAnalysis.Core.Interfaces;
using FinancialAnalysis.Core.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinancialAnalysis.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WatchlistController : ControllerBase
{
    private readonly IWatchlistService _watchlistService;

    public WatchlistController(IWatchlistService watchlistService)
    {
        _watchlistService = watchlistService;
    }

    [HttpGet]
    public async Task<IActionResult> GetWatchlist()
    {
        var items = await _watchlistService.GetItemsAsync(GetUserId());
        return Ok(items.Select(ToResponse));
    }

    [HttpPost("items")]
    public async Task<IActionResult> AddItem([FromBody] AddWatchlistItemRequest request)
    {
        try
        {
            var item = await _watchlistService.AddItemAsync(GetUserId(), request.InstrumentId);
            return Ok(ToResponse(item));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    [HttpDelete("items/{instrumentId:int}")]
    public async Task<IActionResult> RemoveItem(int instrumentId)
    {
        try
        {
            await _watchlistService.RemoveItemAsync(GetUserId(), instrumentId);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    private int GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.Parse(value!);
    }

    private static WatchlistItemResponse ToResponse(WatchlistItem item) => new(
        item.InstrumentId,
        item.Instrument.Symbol,
        item.Instrument.Name,
        item.Instrument.Exchange,
        item.Instrument.Type,
        item.Position);
}
