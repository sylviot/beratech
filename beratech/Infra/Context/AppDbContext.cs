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
            entity.ToTable("acoes");
    
            entity.HasKey(e => e.Id);
    
            entity.Property(e => e.Id)
                .HasColumnName("id");
    
            entity.Property(e => e.Titulo)
                .HasColumnName("titulo")
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(e => e.Responsavel)
                .HasColumnName("responsavel")
                .IsRequired()
                .HasMaxLength(400);

            entity.Property(e => e.Descricao)
                .HasColumnName("descricao")
                .IsRequired()
                .HasColumnType("text");
    
            entity.Property(e => e.Coordenadas)
                .HasColumnName("coordenadas")
                .HasMaxLength(100);
    
            entity.Property(e => e.AcaoParcial)
                .HasColumnName("acao_parcial")
                .IsRequired()
                .HasDefaultValue(false);
            
            entity.Property(e => e.PossuiConflito)
                .HasColumnName("possui_conflito")
                .IsRequired()
                .HasDefaultValue(false);
    
            entity.Property(e => e.DataInicio)
                .HasColumnName("data_inicio")
                .IsRequired();
    
            entity.Property(e => e.DataFim)
                .HasColumnName("data_fim")
                .IsRequired();
    
            entity.Property(e => e.CreatedAt)
                .HasColumnName("created_at")
                .IsRequired()
                .HasDefaultValueSql("NOW()");
    
            entity.Property(e => e.UpdatedAt)
                .HasColumnName("updated_at")
                .IsRequired()
                .HasDefaultValueSql("NOW()");
        });
    }
}