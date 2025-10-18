using beratech.Infra.Models;
using Microsoft.EntityFrameworkCore;

namespace beratech.Infra.Context;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Acao> Acoes { get; set; }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        modelBuilder.Entity<Acao>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Titulo).IsRequired().HasMaxLength(255);
            entity.HasIndex(e => e.Descricao).IsUnique();
            
            entity.HasIndex(e => e.AcaoParcial).IsUnique();
            
            entity.Property(e => e.DataInicio).HasDefaultValueSql("NOW()");
            entity.Property(e => e.DataFim).HasDefaultValueSql("NOW()");
            
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("NOW()");
        });
    }
}