/* Metadados dos 8 CRUDs. */
const campo = (nome, rotulo, tipo = 'text', extra = {}) => ({
  nome,
  rotulo,
  tipo,
  ...extra
});
const org = () => campo('organizacao_id', 'Organização', 'relation', {
  entidade: 'organizacoes',
  required: true
});
const recurso = () => campo('recurso_id', 'Espaço', 'relation', {
  entidade: 'recursos',
  required: true
});
const nome = () => campo('nome', 'Nome', 'text', {
  required: true
});
const opcao = (nome, rotulo, opcoes, valor) => campo(nome, rotulo, 'select', {
  opcoes,
  valor: valor || opcoes[0],
  required: true
});
const numero = (nome, rotulo, valor, min = 0, step = 1) => campo(nome, rotulo, 'number', {
  valor,
  min,
  step,
  required: true
});
const flag = (nome, rotulo, valor = 0) => campo(nome, rotulo, 'checkbox', {
  valor
});
module.exports = {
  usuarios: {
    tabela: 'usuario',
    pk: 'id_usuario',
    titulo: 'Usuários',
    integrante: 'Luan',
    ali: 'ALI01',
    campos: [
      org(),
      nome(),
      campo('email', 'E-mail', 'email', {
        required: true
      }),
      campo('telefone', 'Telefone'),
      opcao('tipo_usuario', 'Perfil', ['USUARIO', 'ADMINISTRADOR']),
      opcao('status', 'Situação', ['Ativo', 'Inativo', 'Bloqueado'])
    ]
  },
  organizacoes: {
    tabela: 'organizacao',
    pk: 'id_organizacao',
    titulo: 'Organizações',
    integrante: 'Luan',
    ali: 'ALI02',
    campos: [
      nome(),
      opcao('segmento', 'Segmento', ['Universidade', 'Coworking', 'Condomínio', 'Centro Esportivo']),
      campo('documento', 'Documento'),
      campo('telefone', 'Telefone'),
      campo('email', 'E-mail', 'email'),
      opcao('status', 'Situação', ['Ativo', 'Inativo'])
    ]
  },
  recursos: {
    tabela: 'recurso',
    pk: 'id_recurso',
    titulo: 'Recursos e espaços',
    integrante: 'Érick',
    ali: 'ALI03',
    campos: [
      org(),
      nome(),
      opcao('categoria', 'Categoria', ['Sala de Reunião', 'Laboratório', 'Auditório', 'Quadra', 'Salão de Festas']),
      campo('descricao', 'Descrição', 'textarea'),
      campo('localizacao', 'Localização', 'text', {
        required: true
      }),
      numero('capacidade', 'Capacidade de pessoas', 10, 1),
      numero('preco_hora', 'Preço por hora em reais', 40, 0, 0.01),
      opcao('status', 'Situação', ['Disponível', 'Em Manutenção', 'Ocupado'])
    ]
  },
  reservas: {
    tabela: 'reserva',
    pk: 'id_reserva',
    titulo: 'Reservas e agendamentos',
    integrante: 'Érick',
    ali: 'ALI05',
    campos: [
      campo('usuario_id', 'Solicitante', 'relation', {
        entidade: 'usuarios',
        required: true
      }),
      recurso(),
      campo('documento_vinculo', 'Identificação do solicitante', 'text', {
        required: true
      }),
      campo('data_reserva', 'Data', 'date', {
        required: true
      }),
      campo('horario_inicio', 'Início', 'time', {
        required: true
      }),
      campo('horario_fim', 'Fim', 'time', {
        required: true
      }),
      campo('finalidade', 'Finalidade', 'text', {
        required: true
      }),
      numero('num_participantes', 'Participantes', 1, 1),
      opcao('status', 'Situação', ['Confirmada', 'Aguardando aprovação', 'Cancelada', 'Concluída'])
    ]
  },
  regras: {
    tabela: 'regra_reserva',
    pk: 'id_regra',
    titulo: 'Regras de reserva',
    integrante: 'Vinicius',
    ali: 'ALI06',
    campos: [
      recurso(),
      numero('duracao_max_horas', 'Duração máxima em horas', 3, 0.25, 0.25),
      numero('antecedencia_min_horas', 'Antecedência mínima em horas', 0),
      numero('limite_reservas_semana', 'Limite semanal por usuário', 5, 1),
      flag('necessita_aprovacao', 'Exige aprovação'),
      numero('prazo_cancelamento_horas', 'Prazo de cancelamento em horas', 0)
    ]
  },
  bloqueios: {
    tabela: 'bloqueio_recurso',
    pk: 'id_bloqueio',
    titulo: 'Bloqueios e manutenções',
    integrante: 'Vinicius',
    ali: 'ALI07',
    campos: [
      recurso(),
      campo(
        'administrador_id',
        'Administrador responsável',
        'relation',
        {
          entidade: 'usuarios',
          required: true,
          perfil: 'ADMINISTRADOR'
        }
      ),
      opcao('tipo', 'Tipo', ['Manutenção', 'Bloqueio Administrativo', 'Evento Especial']),
      campo('motivo', 'Motivo', 'text', {
        required: true
      }),
      campo('data_inicio', 'Início', 'datetime-local', {
        required: true
      }),
      campo('data_fim', 'Fim', 'datetime-local', {
        required: true
      }),
      opcao('status', 'Situação', ['Agendado', 'Em Andamento', 'Concluído', 'Cancelado'])
    ]
  },
  equipamentos: {
    tabela: 'equipamento',
    pk: 'id_equipamento',
    titulo: 'Equipamentos',
    integrante: 'Arthur',
    ali: 'ALI04',
    campos: [
      org(),
      nome(),
      campo('categoria', 'Categoria', 'text', {
        required: true
      }),
      campo('descricao', 'Descrição', 'textarea'),
      opcao('status', 'Situação', ['Ativo', 'Manutenção', 'Inativo'])
    ]
  },
  configuracoes: {
    tabela: 'configuracao_variabilidade',
    pk: 'id_configuracao',
    titulo: 'Configurações de variabilidade',
    integrante: 'Arthur',
    ali: 'ALI08',
    campos: [
      org(),
      flag('modulo_academico', 'Módulo acadêmico'),
      flag('modulo_coworking', 'Módulo coworking'),
      flag('modulo_condominio', 'Módulo condomínio'),
      flag('modulo_esportivo', 'Módulo esportivo'),
      flag('aprovacao_habilitada', 'Aprovação manual de reservas'),
      flag('creditos_habilitados', 'Créditos de horas'),
      flag('racha_pix_habilitado', 'Divisão de pagamento PIX')
    ]
  }
};
