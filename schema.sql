-- Banco utilizado pela aplicação: SQLite. Executado automaticamente por database.js.
-- Para consulta, abra data/reservaflex.sqlite no DB Browser. Este script é SQLite.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS organizacao (
  id_organizacao INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL, segmento TEXT NOT NULL, documento TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'Ativo'
);
CREATE TABLE IF NOT EXISTS usuario (
  id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
  organizacao_id INTEGER NOT NULL REFERENCES organizacao(id_organizacao) ON DELETE RESTRICT,
  nome TEXT NOT NULL, email TEXT NOT NULL COLLATE NOCASE UNIQUE, telefone TEXT NOT NULL DEFAULT '',
  tipo_usuario TEXT NOT NULL DEFAULT 'USUARIO', status TEXT NOT NULL DEFAULT 'Ativo'
);
CREATE TABLE IF NOT EXISTS recurso (
  id_recurso INTEGER PRIMARY KEY AUTOINCREMENT,
  organizacao_id INTEGER NOT NULL REFERENCES organizacao(id_organizacao) ON DELETE RESTRICT,
  nome TEXT NOT NULL, categoria TEXT NOT NULL, descricao TEXT NOT NULL DEFAULT '', localizacao TEXT NOT NULL,
  capacidade INTEGER NOT NULL CHECK(capacidade > 0), preco_hora REAL NOT NULL CHECK(preco_hora >= 0), status TEXT NOT NULL DEFAULT 'Disponível'
);
CREATE TABLE IF NOT EXISTS reserva (
  id_reserva INTEGER PRIMARY KEY AUTOINCREMENT, codigo_reserva TEXT NOT NULL UNIQUE,
  usuario_id INTEGER NOT NULL REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
  recurso_id INTEGER NOT NULL REFERENCES recurso(id_recurso) ON DELETE RESTRICT,
  documento_vinculo TEXT NOT NULL, data_reserva TEXT NOT NULL, horario_inicio TEXT NOT NULL, horario_fim TEXT NOT NULL,
  finalidade TEXT NOT NULL, num_participantes INTEGER NOT NULL CHECK(num_participantes > 0),
  valor_total REAL NOT NULL CHECK(valor_total >= 0), status TEXT NOT NULL DEFAULT 'Confirmada'
);
CREATE TABLE IF NOT EXISTS regra_reserva (
  id_regra INTEGER PRIMARY KEY AUTOINCREMENT, recurso_id INTEGER NOT NULL UNIQUE REFERENCES recurso(id_recurso) ON DELETE RESTRICT,
  duracao_max_horas REAL NOT NULL CHECK(duracao_max_horas > 0), antecedencia_min_horas INTEGER NOT NULL CHECK(antecedencia_min_horas >= 0),
  limite_reservas_semana INTEGER NOT NULL CHECK(limite_reservas_semana > 0), necessita_aprovacao INTEGER NOT NULL DEFAULT 0 CHECK(necessita_aprovacao IN (0,1)),
  prazo_cancelamento_horas INTEGER NOT NULL DEFAULT 0 CHECK(prazo_cancelamento_horas >= 0)
);
CREATE TABLE IF NOT EXISTS bloqueio_recurso (
  id_bloqueio INTEGER PRIMARY KEY AUTOINCREMENT, recurso_id INTEGER NOT NULL REFERENCES recurso(id_recurso) ON DELETE RESTRICT,
  administrador_id INTEGER NOT NULL REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
  tipo TEXT NOT NULL, motivo TEXT NOT NULL, data_inicio TEXT NOT NULL, data_fim TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Agendado'
);
CREATE TABLE IF NOT EXISTS equipamento (
  id_equipamento INTEGER PRIMARY KEY AUTOINCREMENT,
  organizacao_id INTEGER NOT NULL REFERENCES organizacao(id_organizacao) ON DELETE RESTRICT,
  nome TEXT NOT NULL, categoria TEXT NOT NULL, descricao TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'Ativo'
);
CREATE TABLE IF NOT EXISTS configuracao_variabilidade (
  id_configuracao INTEGER PRIMARY KEY AUTOINCREMENT, organizacao_id INTEGER NOT NULL UNIQUE REFERENCES organizacao(id_organizacao) ON DELETE RESTRICT,
  modulo_academico INTEGER NOT NULL DEFAULT 0 CHECK(modulo_academico IN (0,1)),
  modulo_coworking INTEGER NOT NULL DEFAULT 0 CHECK(modulo_coworking IN (0,1)),
  modulo_condominio INTEGER NOT NULL DEFAULT 0 CHECK(modulo_condominio IN (0,1)),
  modulo_esportivo INTEGER NOT NULL DEFAULT 0 CHECK(modulo_esportivo IN (0,1)),
  aprovacao_habilitada INTEGER NOT NULL DEFAULT 0 CHECK(aprovacao_habilitada IN (0,1)),
  creditos_habilitados INTEGER NOT NULL DEFAULT 0 CHECK(creditos_habilitados IN (0,1)),
  racha_pix_habilitado INTEGER NOT NULL DEFAULT 0 CHECK(racha_pix_habilitado IN (0,1))
);
