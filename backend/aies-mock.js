// AIEs simulados somente para consulta.
const aie01_cadastro_academico = [{
  matricula: '2026109928',
  nome: 'Erick Silva',
  email: 'erick@univ.br',
  curso: 'Engenharia de Software',
  tipo_vinculo: 'ALUNO',
  situacao_vinculo: 'ATIVO'
}];
const aie02_cadastro_moradores = [{
  id_morador: 1,
  nome: 'Luan Costa',
  cpf: '111.222.333-44',
  unidade: 'Apt 402',
  bloco: 'Bloco B',
  situacao: 'ADIMPLENTE'
}];
const aie03_membros_coworking = [{
  id_membro: 1,
  nome: 'Vinicius Ferreira',
  email: 'vinicius@tech.com',
  empresa: 'Tech Labs',
  plano: 'Flex Pro Corporate',
  saldo_horas: 45
}];
const aie04_associados_esportivo = [{
  id_associado: 1,
  nome: 'Arthur Lima',
  email: 'arthur@sports.com',
  telefone: '(41) 99999-1004',
  equipe: 'Os Galácticos FC',
  situacao: 'REGULAR'
}];
const aie05_transacoes_pagamento = [{
  id_transacao: 'TRX-998271',
  codigo_reserva: 'RF10483',
  identificacao_pagador: 'Luan Costa',
  valor: 80.00,
  forma_pagamento: 'PIX',
  status_pagamento: 'APROVADO'
}];
const aie06_calendario_institucional = [{
  id_evento: 1,
  organizacao: 'Universidade Central',
  titulo: 'Semana Acadêmica de Tecnologia',
  data: '2026-10-25',
  tipo_evento: 'EVENTO_INSTITUCIONAL'
}];
const aie07_diretorio_sso = [{
  id_externo: 'SSO-RF-102',
  nome: 'Luan Costa',
  email: 'luan@reservaflex.com',
  perfil: 'ADMIN_GERAL',
  status_acesso: 'AUTORIZADO'
}];
const aie08_controle_acesso_fisico = [{
  id_acesso: 1,
  usuario_externo: 'Luan Costa',
  codigo_reserva: 'RF10483',
  recurso: 'Sala de Reunião Executive 04',
  ponto_acesso: 'Fechadura Eletrônica Sala 04',
  status_acesso: 'LIBERADO'
}];
module.exports = {
  aie01: aie01_cadastro_academico,
  aie02: aie02_cadastro_moradores,
  aie03: aie03_membros_coworking,
  aie04: aie04_associados_esportivo,
  aie05: aie05_transacoes_pagamento,
  aie06: aie06_calendario_institucional,
  aie07: aie07_diretorio_sso,
  aie08: aie08_controle_acesso_fisico
};
