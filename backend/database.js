/* Banco real em arquivo, inicializado uma única vez. */
const fs = require('node:fs');
const path = require('node:path');
const entidades = require('./entidades');
const exemplos = require('./dados-iniciais.json');
let DatabaseSync;
try {
  ({
    DatabaseSync
  } = require('node:sqlite'));
} catch {
  throw new Error('Instale Node.js 24 LTS para executar este projeto com SQLite.');
}
const arquivo = path.resolve(process.env.RESERVAFLEX_DB || path.join(__dirname, '..', 'data', 'reservaflex.sqlite'));
if (arquivo !== ':memory:')
  fs.mkdirSync(path.dirname(arquivo), {
    recursive: true
  });
const db = new DatabaseSync(arquivo);
db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
const novo = !db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='organizacao'").get();
db.exec(fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8'));
if (novo) {
  db.exec('BEGIN');
  try {
    const inserir = (chave, origem, extras = {}) => {
      const e = entidades[chave],
        entrada = {
          ...origem,
          ...extras
        },
        dados = {};
      if (entrada[e.pk])
        dados[e.pk] = entrada[e.pk];
      for (const c of e.campos)
        dados[c.nome] = entrada[c.nome] ?? c.valor ?? '';
      if (chave === 'reservas') {
        dados.codigo_reserva = entrada.codigo_reserva;
        dados.valor_total = entrada.valor_total;
      }
      const colunas = Object.keys(dados);
      db.prepare(`INSERT INTO ${e.tabela} (${colunas.join(',')}) VALUES (${colunas.map(() => '?').join(',')})`).run(...Object.values(dados));
    };
    exemplos.organizacoes.forEach(o => inserir('organizacoes', o));
    exemplos.usuarios.forEach(u => inserir('usuarios', u));
    exemplos.recursos.forEach(r => inserir('recursos', r));
    exemplos.equipamentos.forEach(e => inserir('equipamentos', e, {
      organizacao_id: 1
    }));
    exemplos.regras.forEach(r => inserir('regras', r));
    exemplos.reservas.forEach(r => inserir('reservas', r, {
      documento_vinculo: '2026109928',
      num_participantes: 8
    }));
    exemplos.bloqueios.forEach(b => inserir(
      'bloqueios',
      b,
      {
        data_inicio: b.data_inicio.replace(' ', 'T'),
        data_fim: '2026-10-20T18:00'
      }
    ));
    exemplos.configuracoes.forEach(c => inserir('configuracoes', c));
    inserir(
      'recursos',
      {
        organizacao_id: 2,
        nome: 'Sala Hub 01',
        localizacao: 'Andar 2',
        capacidade: 8,
        preco_hora: 45
      }
    );
    inserir(
      'recursos',
      {
        organizacao_id: 3,
        nome: 'Salão de Festas',
        categoria: 'Salão de Festas',
        localizacao: 'Bloco Social',
        capacidade: 50,
        preco_hora: 150
      }
    );
    for (let id = 2; id <= 4; id++) {
      inserir(
        'configuracoes',
        {
          organizacao_id: id,
          modulo_coworking: Number(id === 2),
          modulo_condominio: Number(id === 3),
          modulo_esportivo: Number(id === 4),
          creditos_habilitados: Number(id === 2),
          racha_pix_habilitado: Number(id === 4)
        }
      );
      if (!db.prepare("SELECT 1 FROM usuario WHERE organizacao_id=? AND tipo_usuario='ADMINISTRADOR'").get(id)) {
        inserir(
          'usuarios',
          {
            organizacao_id: id,
            nome: `Responsável ${exemplos.organizacoes[id - 1].nome}`,
            email: `admin${id}@reservaflex.local`,
            tipo_usuario: 'ADMINISTRADOR'
          }
        );
      }
    }
    db.exec('COMMIT');
  } catch (erro) {
    db.exec('ROLLBACK');
    throw erro;
  }
}
module.exports = {
  db,
  arquivo
};
