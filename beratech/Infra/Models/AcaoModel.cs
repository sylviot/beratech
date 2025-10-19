namespace beratech.Infra.Models;

public class Acao
{
    public int Id { get; set; }
    public string Titulo { get; set; }
    public string Descricao { get; set; }
    public string Responsavel { get; set; }

    public string Coordenadas { get; set; }

    public bool AcaoParcial { get; set; }
    public bool PossuiConflito { get; set; }
    
    public DateTime DataInicio { get; set; }
    public DateTime DataFim { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}