/* Fluxo comum dos oito CRUDs: validar -> SQL parametrizado -> retornar registro.
   As regras de reserva ficam aqui, fora do HTML. O banco é a única fonte dos ALIs. */
const entidades = require('./entidades');
const { db } = require('./database');
const { Recurso, RegraReserva } = require('./classes');
const { randomUUID } = require('node:crypto');
class ErroHttp extends Error {
  constructor(status, mensagem) { super(mensagem); this.status = status; }
}
const exigir = (condicao, mensagem, status = 400) => { if (!condicao) throw new ErroHttp(status, mensagem); };
const meta = chave => { exigir(Object.hasOwn(entidades,chave), 'Cadastro não encontrado.', 404); return entidades[chave]; };
const minutos = hora => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
const ativa = status => !['Cancelada', 'Concluída'].includes(status);
function dataValida(texto) {
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) && !Number.isNaN(Date.parse(texto)) && new Date(texto).toISOString().slice(0, 10) === texto;
}
function escopo(chave, orgId) {
  if (!orgId || chave === 'organizacoes') return { sql: '', params: [] };
  exigir(Number.isSafeInteger(Number(orgId)) && Number(orgId) > 0, 'Organização inválida.');
  if (['reservas', 'regras', 'bloqueios'].includes(chave)) {
    return { sql: ' WHERE recurso_id IN (SELECT id_recurso FROM recurso WHERE organizacao_id = ?)', params: [Number(orgId)] };
  }
  return { sql: ' WHERE organizacao_id = ?', params: [Number(orgId)] };
}
function listar(chave, orgId) {
  const e = meta(chave), filtro = escopo(chave, orgId);
  return db.prepare(`SELECT * FROM ${e.tabela}${filtro.sql} ORDER BY ${e.pk} DESC`).all(...filtro.params);
}
function buscar(chave, id, orgId) {
  const e = meta(chave);
  exigir(Number.isSafeInteger(Number(id)) && Number(id) > 0, 'Identificador inválido.');
  const linha = db.prepare(`SELECT * FROM ${e.tabela} WHERE ${e.pk} = ?`).get(Number(id));
  exigir(linha, 'Registro não encontrado.', 404);
  if (orgId && chave !== 'organizacoes') {
    const orgRegistro = linha.organizacao_id || db.prepare('SELECT organizacao_id FROM recurso WHERE id_recurso = ?').get(linha.recurso_id)?.organizacao_id;
    exigir(Number(orgId) === orgRegistro, 'Registro não pertence à organização selecionada.', 404);
  }
  return linha;
}
function validarCampos(chave, recebido, anterior) {
  const e = meta(chave), dados = {};
  exigir(recebido && typeof recebido === 'object' && !Array.isArray(recebido), 'Envie um objeto JSON.');
  for (const c of e.campos) {
    let valor = recebido[c.nome] ?? anterior?.[c.nome] ?? c.valor ?? '';
    if (c.tipo === 'checkbox') {
      exigir([0,1,false,true,'0','1'].includes(valor), `${c.rotulo}: use sim ou não.`);
      valor = Number(valor);
    } else if (c.tipo === 'number' || c.tipo === 'relation') {
      exigir(valor !== '' && typeof valor !== 'boolean', `${c.rotulo} é obrigatório.`);
      valor = Number(valor);
      exigir(Number.isFinite(valor), `${c.rotulo} deve ser um número.`);
      if (c.min !== undefined) exigir(valor >= c.min, `${c.rotulo}: mínimo ${c.min}.`);
      if (c.tipo === 'relation' || c.step === 1) exigir(Number.isSafeInteger(valor), `${c.rotulo} deve ser inteiro.`);
      if (c.tipo === 'relation') buscar(c.entidade, valor);
    } else {
      exigir(typeof valor === 'string', `${c.rotulo} deve ser texto.`);
      valor = valor.trim();
      exigir(valor.length <= (c.tipo === 'textarea' ? 2000 : 250), `${c.rotulo}: texto muito longo.`);
      if (c.required) exigir(valor.length > 0, `${c.rotulo} é obrigatório.`);
      if (c.tipo === 'email' && valor) exigir(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor), 'E-mail inválido.');
      if (c.tipo === 'select') exigir(c.opcoes.includes(valor), `${c.rotulo}: opção inválida.`);
      if (c.tipo === 'date') exigir(dataValida(valor), 'Data inválida.');
      if (c.tipo === 'time') exigir(/^([01]\d|2[0-3]):[0-5]\d$/.test(valor), 'Horário inválido.');
      if (c.tipo === 'datetime-local') exigir(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(valor) && dataValida(valor.slice(0,10)), `${c.rotulo}: data e hora inválidas.`);
    }
    dados[c.nome] = valor;
  }
  return dados;
}
function validarCancelamento(reserva) {
  if (!ativa(reserva.status)) return;
  const regra = db.prepare('SELECT * FROM regra_reserva WHERE recurso_id = ?').get(reserva.recurso_id);
  if (regra?.prazo_cancelamento_horas > 0) {
    const inicio = new Date(`${reserva.data_reserva}T${reserva.horario_inicio}`).getTime();
    exigir(inicio - Date.now() >= regra.prazo_cancelamento_horas * 3600000, 'O prazo de cancelamento/exclusão desta reserva já passou.', 409);
  }
}
function validarReserva(dados, anterior) {
  const espaco = buscar('recursos', dados.recurso_id), usuario = buscar('usuarios', dados.usuario_id);
  exigir(usuario.organizacao_id === espaco.organizacao_id, 'Solicitante e espaço devem pertencer à mesma organização.');
  const duracaoMin = minutos(dados.horario_fim) - minutos(dados.horario_inicio);
  exigir(duracaoMin > 0, 'O horário final deve ser posterior ao inicial, no mesmo dia.');
  exigir(dados.num_participantes <= espaco.capacidade, 'Participantes excedem a capacidade do espaço.');
  const recurso = Object.assign(Object.create(Recurso.prototype), espaco);
  const mudouPeriodo = !anterior || ['recurso_id','data_reserva','horario_inicio','horario_fim'].some(c => anterior[c] !== dados[c]);
  dados.valor_total = mudouPeriodo ? Math.round(recurso.calcularCusto(duracaoMin / 60) * 100) / 100 : anterior.valor_total;
  dados.codigo_reserva = anterior?.codigo_reserva || `RF-${randomUUID().slice(0,8).toUpperCase()}`;
  const regra = db.prepare('SELECT * FROM regra_reserva WHERE recurso_id = ?').get(dados.recurso_id);
  const cfg = db.prepare('SELECT * FROM configuracao_variabilidade WHERE organizacao_id = ?').get(espaco.organizacao_id);
  if (!anterior && ativa(dados.status) && (regra?.necessita_aprovacao || cfg?.aprovacao_habilitada)) dados.status = 'Aguardando aprovação';
  if (anterior && dados.status === 'Cancelada' && anterior.status !== 'Cancelada') validarCancelamento(anterior);
  if (!ativa(dados.status)) return;
  exigir(usuario.status === 'Ativo', 'O solicitante deve estar ativo.');
  exigir(buscar('organizacoes', espaco.organizacao_id).status === 'Ativo', 'A organização deve estar ativa.');
  exigir(espaco.status === 'Disponível', 'O espaço não está disponível.', 409);
  if (regra) {
    const regraObjeto = Object.assign(Object.create(RegraReserva.prototype), regra);
    exigir(regraObjeto.validarDuracao(duracaoMin / 60), 'Duração excede o limite definido na regra.', 409);
    if (mudouPeriodo && regra.antecedencia_min_horas > 0) {
      exigir(new Date(`${dados.data_reserva}T${dados.horario_inicio}`).getTime() - Date.now() >= regra.antecedencia_min_horas * 3600000, 'Antecedência mínima não atendida.', 409);
    }
    const segunda = new Date(`${dados.data_reserva}T12:00:00Z`);
    segunda.setUTCDate(segunda.getUTCDate() - (segunda.getUTCDay() + 6) % 7);
    const inicioSemana = segunda.toISOString().slice(0,10);
    segunda.setUTCDate(segunda.getUTCDate() + 7);
    const total = db.prepare("SELECT COUNT(*) AS n FROM reserva WHERE usuario_id=? AND recurso_id=? AND data_reserva>=? AND data_reserva<? AND status NOT IN ('Cancelada','Concluída') AND id_reserva<>?").get(dados.usuario_id,dados.recurso_id,inicioSemana,segunda.toISOString().slice(0,10),anterior?.id_reserva || 0).n;
    exigir(total < regra.limite_reservas_semana, 'Limite semanal de reservas atingido para este espaço.', 409);
  }
  const conflito = db.prepare("SELECT id_reserva FROM reserva WHERE recurso_id=? AND data_reserva=? AND horario_inicio<? AND horario_fim>? AND status NOT IN ('Cancelada','Concluída') AND id_reserva<>?").get(dados.recurso_id,dados.data_reserva,dados.horario_fim,dados.horario_inicio,anterior?.id_reserva || 0);
  exigir(!conflito, 'Já existe uma reserva para este espaço nesse período.', 409);
  const bloqueio = db.prepare("SELECT id_bloqueio FROM bloqueio_recurso WHERE recurso_id=? AND status IN ('Agendado','Em Andamento') AND data_inicio<? AND data_fim>?").get(dados.recurso_id,`${dados.data_reserva}T${dados.horario_fim}`,`${dados.data_reserva}T${dados.horario_inicio}`);
  exigir(!bloqueio, 'O espaço está bloqueado nesse período.', 409);
}
function validarRegrasEspecificas(chave, dados, anterior) {
  if (chave === 'reservas') validarReserva(dados, anterior);
  if (chave === 'bloqueios') {
    exigir(dados.data_fim > dados.data_inicio, 'O fim do bloqueio deve ser posterior ao início.');
    const admin = buscar('usuarios', dados.administrador_id), espaco = buscar('recursos', dados.recurso_id);
    exigir(admin.tipo_usuario === 'ADMINISTRADOR' && admin.status === 'Ativo' && admin.organizacao_id === espaco.organizacao_id, 'Escolha um administrador ativo da organização do espaço.');
    if (['Agendado','Em Andamento'].includes(dados.status)) {
      const conflito = db.prepare("SELECT id_reserva FROM reserva WHERE recurso_id=? AND (data_reserva || 'T' || horario_inicio)<? AND (data_reserva || 'T' || horario_fim)>? AND status NOT IN ('Cancelada','Concluída')").get(dados.recurso_id,dados.data_fim,dados.data_inicio);
      exigir(!conflito, 'O bloqueio conflita com uma reserva existente.', 409);
    }
  }
  // Não permitir que uma edição torne relacionamentos existentes inconsistentes.
  if (anterior && chave === 'usuarios' && dados.organizacao_id !== anterior.organizacao_id) {
    exigir(!db.prepare('SELECT id_reserva FROM reserva WHERE usuario_id=?').get(anterior.id_usuario) && !db.prepare('SELECT id_bloqueio FROM bloqueio_recurso WHERE administrador_id=?').get(anterior.id_usuario), 'Usuário possui reservas ou bloqueios; não pode mudar de organização.',409);
  }
  if (anterior && chave === 'usuarios' && (dados.tipo_usuario !== 'ADMINISTRADOR' || dados.status !== 'Ativo')) {
    exigir(!db.prepare("SELECT id_bloqueio FROM bloqueio_recurso WHERE administrador_id=? AND status IN ('Agendado','Em Andamento')").get(anterior.id_usuario), 'Usuário é responsável por bloqueios ativos.',409);
  }
  if (anterior && chave === 'recursos' && dados.organizacao_id !== anterior.organizacao_id) {
    for (const tabela of ['reserva','regra_reserva','bloqueio_recurso']) exigir(!db.prepare(`SELECT 1 FROM ${tabela} WHERE recurso_id=?`).get(anterior.id_recurso), 'Espaço possui vínculos; não pode mudar de organização.',409);
  }
  if (anterior && chave === 'recursos') {
    exigir(!db.prepare("SELECT id_reserva FROM reserva WHERE recurso_id=? AND status NOT IN ('Cancelada','Concluída') AND num_participantes>?").get(anterior.id_recurso,dados.capacidade), 'Há reservas que excedem a nova capacidade.',409);
  }
}
function transacao(acao) {
  db.exec('BEGIN IMMEDIATE');
  try { const resultado = acao(); db.exec('COMMIT'); return resultado; }
  catch (erro) { db.exec('ROLLBACK'); throw erro; }
}
function salvar(chave, recebido, id, orgId) {
  return transacao(() => {
    const e = meta(chave), anterior = id ? buscar(chave,id,orgId) : null;
    const dados = validarCampos(chave, recebido, anterior);
    if (orgId && chave !== 'organizacoes') {
      const orgRegistro = dados.organizacao_id || buscar('recursos', dados.recurso_id).organizacao_id;
      exigir(orgRegistro === Number(orgId), 'Dados não pertencem à organização selecionada.');
    }
    validarRegrasEspecificas(chave, dados, anterior);
    const colunas = Object.keys(dados), valores = Object.values(dados);
    if (anterior) {
      db.prepare(`UPDATE ${e.tabela} SET ${colunas.map(c => `${c}=?`).join(',')} WHERE ${e.pk}=?`).run(...valores,Number(id));
      return buscar(chave,id);
    }
    const resultado = db.prepare(`INSERT INTO ${e.tabela} (${colunas.join(',')}) VALUES (${colunas.map(() => '?').join(',')})`).run(...valores);
    return buscar(chave,Number(resultado.lastInsertRowid));
  });
}
function excluir(chave, id, orgId) {
  return transacao(() => {
    const e = meta(chave), anterior = buscar(chave,id,orgId);
    if (chave === 'reservas') validarCancelamento(anterior);
    db.prepare(`DELETE FROM ${e.tabela} WHERE ${e.pk}=?`).run(Number(id));
    return anterior;
  });
}
function todos(orgId) { return Object.fromEntries(Object.keys(entidades).map(chave => [chave,listar(chave,orgId)])); }
function mensagemErro(erro) {
  if (erro.status) return { status: erro.status, mensagem: erro.message };
  if (/UNIQUE constraint/.test(erro.message)) return { status:409,mensagem:'Registro duplicado. E-mail, regra por espaço e configuração por organização devem ser únicos.' };
  if (/FOREIGN KEY constraint/.test(erro.message)) return { status:409,mensagem:'Não é possível excluir: existem registros vinculados. Exclua ou ajuste os vínculos primeiro.' };
  if (/CHECK constraint|NOT NULL constraint/.test(erro.message)) return { status:400,mensagem:'Dados inválidos para o banco de dados.' };
  if (/database is locked|database is busy/.test(erro.message)) return { status:409,mensagem:'O banco está ocupado. No DB Browser, finalize ou reverta alterações pendentes e tente novamente.' };
  console.error(erro);
  return { status:500,mensagem:'Não foi possível concluir a operação.' };
}
module.exports = { listar,buscar,salvar,excluir,todos,mensagemErro,ErroHttp };
