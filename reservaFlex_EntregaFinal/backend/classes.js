/* ==========================================================================
   ReservaFlex - Mapeamento das 10 Principais Classes do Sistema
   Modelos originais preservados para estudo. Recurso.calcularCusto e
   RegraReserva.validarDuracao são reutilizados pelo CRUD real.
   Métodos de login, check-in, vínculo de equipamento, pagamento e notificação
   abaixo são exemplos de domínio: não representam serviços implementados.
   ========================================================================== */

// 1. Classe Usuario
class Usuario {
  constructor(id_usuario, organizacao_id, nome, email, telefone, senha, tipo_usuario, status = 'Ativo') {
    this.id_usuario = id_usuario;
    this.organizacao_id = organizacao_id;
    this.nome = nome;
    this.email = email;
    this.telefone = telefone;
    this.senha = senha;
    this.tipo_usuario = tipo_usuario; // 'USUARIO' ou 'ADMINISTRADOR'
    this.status = status;
    this.data_cadastro = new Date().toISOString().split('T')[0];
  }

  autenticar(senhaDigitada) {
    return this.senha === senhaDigitada && this.status === 'Ativo';
  }

  atualizarPerfil(novoNome, novoTelefone) {
    this.nome = novoNome;
    this.telefone = novoTelefone;
  }

  isAdministrador() {
    return this.tipo_usuario === 'ADMINISTRADOR';
  }
}

// 2. Classe Organizacao (Tenant)
class Organizacao {
  constructor(id_organizacao, nome, segmento, documento, telefone, email) {
    this.id_organizacao = id_organizacao;
    this.nome = nome;
    this.segmento = segmento; // 'Universidade', 'Coworking', 'Condomínio', 'Centro Esportivo'
    this.documento = documento;
    this.telefone = telefone;
    this.email = email;
    this.status = 'Ativo';
  }

  ativarSegmento(novoSegmento) {
    this.segmento = novoSegmento;
  }

  obterResumo() {
    return `${this.nome} (${this.segmento}) - Doc: ${this.documento}`;
  }
}

// 3. Classe Recurso
class Recurso {
  constructor(id_recurso, organizacao_id, nome, categoria, descricao, localizacao, capacidade, preco_hora) {
    this.id_recurso = id_recurso;
    this.organizacao_id = organizacao_id;
    this.nome = nome;
    this.categoria = categoria; // 'Sala de Reunião', 'Laboratório', 'Quadra', 'Salão de Festas'
    this.descricao = descricao;
    this.localizacao = localizacao;
    this.capacidade = capacidade;
    this.preco_hora = preco_hora;
    this.status = 'Disponível'; // 'Disponível', 'Em Manutenção', 'Ocupado'
  }

  calcularCusto(horas) {
    return this.preco_hora * horas;
  }

  alterarStatus(novoStatus) {
    this.status = novoStatus;
  }
}

// 4. Classe Equipamento
class Equipamento {
  constructor(id_equipamento, nome, categoria, descricao, status = 'Ativo') {
    this.id_equipamento = id_equipamento;
    this.nome = nome;
    this.categoria = categoria; // 'Multimídia', 'Climatização', 'Áudio'
    this.descricao = descricao;
    this.status = status;
  }

  vincularARecurso(recursoId) {
    console.log(`Equipamento ${this.nome} vinculado ao Recurso ID ${recursoId}`);
  }
}

// 5. Classe Reserva
class Reserva {
  constructor(id_reserva, codigo_reserva, usuario_id, recurso_id, data_reserva, horario_inicio, horario_fim, finalidade, valor_total) {
    this.id_reserva = id_reserva;
    this.codigo_reserva = codigo_reserva;
    this.usuario_id = usuario_id;
    this.recurso_id = recurso_id;
    this.data_reserva = data_reserva;
    this.horario_inicio = horario_inicio;
    this.horario_fim = horario_fim;
    this.finalidade = finalidade;
    this.valor_total = valor_total;
    this.status = 'Aguardando aprovação'; // 'Confirmada', 'Cancelada', 'Concluída'
    this.checkin_realizado = false;
    this.pagamento_realizado = false;
  }

  confirmarReserva() {
    this.status = 'Confirmada';
  }

  registrarCheckin() {
    this.checkin_realizado = true;
  }

  cancelar() {
    this.status = 'Cancelada';
  }
}

// 6. Classe RegraReserva
class RegraReserva {
  constructor(id_regra, recurso_id, duracao_max_horas = 3, antecedencia_min_horas = 2, limite_reservas_semana = 5, necessita_aprovacao = true) {
    this.id_regra = id_regra;
    this.recurso_id = recurso_id;
    this.duracao_max_horas = duracao_max_horas;
    this.antecedencia_min_horas = antecedencia_min_horas;
    this.limite_reservas_semana = limite_reservas_semana;
    this.necessita_aprovacao = necessita_aprovacao;
  }

  validarDuracao(duracaoDesejada) {
    return duracaoDesejada <= this.duracao_max_horas;
  }
}

// 7. Classe BloqueioRecurso
class BloqueioRecurso {
  constructor(id_bloqueio, recurso_id, administrador_id, tipo, motivo, data_inicio, data_fim) {
    this.id_bloqueio = id_bloqueio;
    this.recurso_id = recurso_id;
    this.administrador_id = administrador_id;
    this.tipo = tipo; // 'Manutenção', 'Bloqueio Administrativo'
    this.motivo = motivo;
    this.data_inicio = data_inicio;
    this.data_fim = data_fim;
    this.status = 'Agendado';
  }

  iniciarManutencao() {
    this.status = 'Em Andamento';
  }
}

// 8. Classe ConfiguracaoVariabilidade
class ConfiguracaoVariabilidade {
  constructor(id_configuracao, organizacao_id, modulo_academico, modulo_coworking, modulo_condominio, modulo_esportivo) {
    this.id_configuracao = id_configuracao;
    this.organizacao_id = organizacao_id;
    this.modulo_academico = modulo_academico;
    this.modulo_coworking = modulo_coworking;
    this.modulo_condominio = modulo_condominio;
    this.modulo_esportivo = modulo_esportivo;
  }

  isModuloAtivo(moduloNome) {
    return !!this[moduloNome];
  }
}

// 9. Classe TransacaoPagamento
class TransacaoPagamento {
  constructor(id_transacao, codigo_reserva, pagador, valor, forma_pagamento) {
    this.id_transacao = id_transacao;
    this.codigo_reserva = codigo_reserva;
    this.pagador = pagador;
    this.valor = valor;
    this.forma_pagamento = forma_pagamento; // 'PIX', 'Cartão', 'Créditos'
    this.status = 'PENDENTE';
    this.data_pagamento = new Date().toISOString();
  }

  aprovar() {
    this.status = 'APROVADO';
  }
}

// 10. Classe Notificacao
class Notificacao {
  constructor(id_notificacao, usuario_id, mensagem, tipo) {
    this.id_notificacao = id_notificacao;
    this.usuario_id = usuario_id;
    this.mensagem = mensagem;
    this.tipo = tipo; // 'EMAIL', 'SMS', 'WHATSAPP'
    this.lida = false;
    this.data_envio = new Date().toISOString();
  }

  marcarComoLida() {
    this.lida = true;
  }
}

module.exports = {
  Usuario,
  Organizacao,
  Recurso,
  Equipamento,
  Reserva,
  RegraReserva,
  BloqueioRecurso,
  ConfiguracaoVariabilidade,
  TransacaoPagamento,
  Notificacao
};
