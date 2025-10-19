CREATE TABLE IF NOT EXISTS acoes (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT NOT NULL,
    coordenadas TEXT,
    acao_parcial BOOLEAN NOT NULL DEFAULT FALSE,
    possui_conflito BOOLEAN NOT NULL DEFAULT FALSE,
    data_inicio TIMESTAMP NOT NULL,
    data_fim TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_acoes_data_fim CHECK (data_fim > data_inicio)
);