using beratech.Infra.Context;
using beratech.Infra.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace beratech.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AcoesController : ControllerBase
{
    private readonly AppDbContext _context;

    public AcoesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<Acao>>> GetAll()
    {
        var acoes = await _context.Set<Acao>()
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();
        return Ok(acoes);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Acao>> GetById(int id)
    {
        var acao = await _context.Set<Acao>().FindAsync(id);
        if (acao == null)
            return NotFound();
        
        return Ok(acao);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Acao acao)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        acao.CreatedAt = DateTime.UtcNow;
        acao.UpdatedAt = DateTime.UtcNow;

        await _context.Set<Acao>().AddAsync(acao);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = acao.Id }, acao);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Acao acao)
    {
        if (id != acao.Id)
            return BadRequest("ID mismatch");

        var acaoToUpdate = await _context.Set<Acao>().FindAsync(id);
        if (acaoToUpdate == null)
            return NotFound();

        // Atualizar propriedades
        acaoToUpdate.Titulo = acao.Titulo;
        acaoToUpdate.Descricao = acao.Descricao;
        acaoToUpdate.Coordenadas = acao.Coordenadas;
        acaoToUpdate.AcaoParcial = acao.AcaoParcial;
        acaoToUpdate.DataInicio = acao.DataInicio;
        acaoToUpdate.DataFim = acao.DataFim;
        acaoToUpdate.UpdatedAt = DateTime.UtcNow;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await _context.Set<Acao>().AnyAsync(a => a.Id == id))
                return NotFound();
            throw;
        }

        return Ok(acaoToUpdate);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var acao = await _context.Set<Acao>().FindAsync(id);
        if (acao == null)
            return NotFound();

        _context.Remove(acao);
        await _context.SaveChangesAsync();
        
        return NoContent();
    }
}