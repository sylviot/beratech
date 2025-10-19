using beratech.Infra.Context;
using beratech.Infra.Models;
using Dapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Text.Json;

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

    [HttpGet("filter")]
    public async Task<IActionResult> Index([FromQuery]string responsavel = null, [FromQuery]DateTime? periodoInicio = null, [FromQuery]DateTime? periodoFim = null)
    {
        var query = _context.Set<Acao>().AsQueryable();

        if(!string.IsNullOrEmpty(responsavel))
        {
            query = query.Where(x => x.Responsavel == responsavel);
        }

        if(periodoInicio != null)
        {
            query = query.Where(x => x.CreatedAt > periodoInicio);
        }

        if (periodoFim != null)
        {
            query = query.Where(x => x.CreatedAt < periodoFim);
        }

        var acoes = await query.ToListAsync();
        var featuresCollection = new FeatureCollection();
        featuresCollection.Features = new List<Feature>();
        foreach (var item in acoes)
        {
            try
            {
                var feature = JsonSerializer.Deserialize<Feature[]>(item.Coordenadas);
                featuresCollection.Features.AddRange(feature);
            }
            catch
            {

            }
        }

        using var connection = new NpgsqlConnection(_context.Database.GetConnectionString());
        try
        {
            await connection.OpenAsync();

            var sql = @"
                SELECT 
                    'Conflito entre ações ('||a.nome||') e ('||b.nome||')' as descricao,
                    ST_DistanceSphere(a.geom, b.geom) AS distancia,
    ROUND(ST_X(ST_LineInterpolatePoint(ST_ShortestLine(a.geom, b.geom), 0.5))::numeric, 6) AS longitude,
    ROUND(ST_Y(ST_LineInterpolatePoint(ST_ShortestLine(a.geom, b.geom), 0.5))::numeric, 6) AS latitude
                FROM 
                    public.linhas_intervencao a
                JOIN 
                    public.linhas_intervencao b
                ON 
                    a.id < b.id
                WHERE 
                    ST_DWithin(a.geom, b.geom, 0.002) OR
ST_Crosses(a.geom, b.geom)
    OR (ST_DWithin(a.geom, b.geom, 0.0005) AND NOT ST_Intersects(a.geom, b.geom));;
            ";

            var resultados = (await connection.QueryAsync<Conflito>(sql)).ToList();

            foreach (var item in resultados)
            {
                featuresCollection.Features.Add(new Feature()
                {
                    type = "Feature",
                    properties = new Properties
                    {
                        name = item.descricao,
                        description = item.descricao,
                        responsavel = "Secretária",
                        situacao = "Concluído",
                        dataInicio = "2025-10-19",
                        dataFim = "2025-10-21",
                        radius = 100
                    },
                    geometry = new
                    {
                        type = "Circle",
                        coordinates = new decimal[] { item.longitude, item.latitude }
                    }
                });
            }
        }
        catch
        {

        }
        finally
        {
            connection.Dispose();
        }

        //featuresCollection.Features.Add(new Feature
        //{
        //    type = "Feature",
        //    properties = new Properties
        //    {
        //        name = "Círculo Envolvente",
        //        description = "Círculo que cobre toda a área",
        //        responsavel = "Secretária",
        //        situacao = "Concluído",
        //        dataInicio = "2025-10-19",
        //        dataFim = "2025-10-21",
        //        radius = 50
        //    },
        //    geometry = new
        //    {
        //        type = "Circle",
        //        coordinates = new decimal[] { -63.88180M, -8.74795M }
        //    }
        //});

        /*{
      "type": "Feature",
      "properties": {
        "name": "Círculo Envolvente",
        "description": "Círculo que cobre toda a área",
        "responsavel": "Secretária",
        "situacao": "Planejada",
        "dataInicio": "2025-10-19",
        "dataFim": "2025-10-21",
        "radius": 100
      },
      "geometry": {
        "type": "Circle",
        "coordinates": [
          -63.89422552631579,
          -8.748706973684207
        ]
      }
    }*/

        return Ok(featuresCollection);
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

        var features = JsonSerializer.Deserialize<List<FeatureStrongTyped>>(acao.Coordenadas);

        foreach (var f in features)
        {
            if (f.geometry.type == "LineString")
            {
                var linhaWkt = $"LINESTRING({f.geometry.coordinates[0][0].ToString().Replace(",", ".")} {f.geometry.coordinates[0][1].ToString().Replace(",", ".")}, {f.geometry.coordinates[1][0].ToString().Replace(",", ".")} {f.geometry.coordinates[0][1].ToString().Replace(",", ".")})";
                await _context.Database.ExecuteSqlRawAsync(
                    "INSERT INTO public.linhas_intervencao (nome, geom) VALUES (@p0, ST_SetSRID(ST_GeomFromText(@p1), 4326));",
                    acao.Titulo,
                    linhaWkt
                );
            }
        }

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