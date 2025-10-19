using System.Text.Json.Nodes;

namespace beratech.Infra.Models
{
    public class FeatureCollection
    {
        public string Type { get; set; } = "FeatureCollection";
        public List<Feature> Features { get; set; }
    }

    public class FeatureStrongTyped
    {
        public string type { get; set; }
        public Properties properties { get; set; }

        public Geometry geometry { get; set; }
    }

    public class Feature
    {
        public string type { get; set; }
        public Properties properties { get; set; }
        public dynamic geometry { get; set; }
    }

    public class Properties
    {
        public string name { get; set; }
        public string description { get; set; }
        public string responsavel { get; set; }
        public string situacao { get; set; }
        public string dataInicio { get; set; }
        public string dataFim { get; set; }
        public int radius { get; set; }
    }

    public class Geometry
    {
        public string type { get; set; }
        public decimal[][] coordinates { get; set; }
    }
}
