/* ==========================================================================
   ReservaFlex - Implementação dos 3 Padrões de Projeto (Design Patterns)
   Opção 01:
   - Singleton (2 Exemplos)
   - Template Method (3 Exemplos)
   - Fábricas simples (3 exemplos; nomes originais preservados).
   Atenção: a escolha por switch destes exemplos é Simple Factory.
   Não há aqui o Factory Method GoF baseado em criadores especializados.
   ========================================================================== */

// ==========================================================================
// 1. SINGLETON DESIGN PATTERN (2 EXEMPLOS)
// ==========================================================================

// --- Singleton Exemplo 1: Conexão Única com Banco de Dados ---
class DatabaseConnectionSingleton {
  constructor() {
    if (DatabaseConnectionSingleton.instance) {
      return DatabaseConnectionSingleton.instance;
    }
    this.connectionString = require('./database').arquivo;
    this.db = require('./database').db;
    this.connected = true;
    this.createdAt = new Date().toISOString();
    DatabaseConnectionSingleton.instance = this;
  }

  static getInstance() {
    if (!DatabaseConnectionSingleton.instance) {
      DatabaseConnectionSingleton.instance = new DatabaseConnectionSingleton();
    }
    return DatabaseConnectionSingleton.instance;
  }

  query(sql) {
    return this.db.prepare(sql).all();
  }
}

// --- Singleton Exemplo 2: Gerenciador do Contexto Global do Tenant Ativo ---
class TenantContextSingleton {
  constructor() {
    if (TenantContextSingleton.instance) {
      return TenantContextSingleton.instance;
    }
    this.activeTenantId = 1;
    this.activeSegment = 'Universidade';
    this.activeTenantName = 'Universidade Central';
    TenantContextSingleton.instance = this;
  }

  static getInstance() {
    if (!TenantContextSingleton.instance) {
      TenantContextSingleton.instance = new TenantContextSingleton();
    }
    return TenantContextSingleton.instance;
  }

  setTenant(id, segmento, nome) {
    this.activeTenantId = id;
    this.activeSegment = segmento;
    this.activeTenantName = nome;
  }

  getTenantInfo() {
    return {
      id: this.activeTenantId,
      segmento: this.activeSegment,
      nome: this.activeTenantName
    };
  }
}

// ==========================================================================
// 2. TEMPLATE METHOD DESIGN PATTERN (3 EXEMPLOS)
// ==========================================================================

// --- Template Method Exemplo 1: Esqueleto de Processamento de Reserva ---
class ReservaProcessorTemplate {
  // O Método Template define o esqueleto do algoritmo
  processarReserva(dadosReserva) {
    const log = [];
    log.push("1. Iniciando validação genérica de horário e disponibilidade...");
    
    // Etapa 2: Passo Específico / Customizável
    const validacaoEspecfica = this.validarRegrasEspecificas(dadosReserva);
    log.push(`2. ${validacaoEspecfica}`);

    // Etapa 3: Passo Específico de Cálculo
    const valorCalculado = this.calcularValorTotal(dadosReserva);
    log.push(`3. Valor total calculado: R$ ${valorCalculado.toFixed(2)}`);

    // Etapa 4: Passo Final Padrão
    log.push('4. Demonstração concluída. O cadastro real de reservas é executado pela API CRUD.');
    
    return { sucesso: true, etapas: log, valor: valorCalculado };
  }

  // Métodos abstratos a serem implementados pelas subclasses
  validarRegrasEspecificas(dados) {
    throw new Error("O método validarRegrasEspecificas deve ser implementado!");
  }

  calcularValorTotal(dados) {
    throw new Error("O método calcularValorTotal deve ser implementado!");
  }
}

class ReservaAcademicaProcessor extends ReservaProcessorTemplate {
  validarRegrasEspecificas(dados) {
    return `[AIE01] Vínculo do aluno/docente RA ${dados.documento || '2026109928'} validado no sistema acadêmico.`;
  }
  calcularValorTotal(dados) {
    return 0.00; // Isento para uso acadêmico
  }
}

class ReservaCoworkingProcessor extends ReservaProcessorTemplate {
  validarRegrasEspecificas(dados) {
    return `[AIE03] Saldo de horas do membro (Plano Corporate) validado no sistema de Coworking.`;
  }
  calcularValorTotal(dados) {
    return (dados.horas || 2) * 45.00;
  }
}

class ReservaCondominioProcessor extends ReservaProcessorTemplate {
  validarRegrasEspecificas(dados) {
    return `[AIE02] Adimplência da unidade Apt 402 validada no sistema do Condomínio.`;
  }
  calcularValorTotal(dados) {
    return 150.00 + 80.00; // Valor diária + Taxa de Limpeza R$ 80
  }
}


// --- Template Method Exemplo 2: Esqueleto de Geração de Relatórios ---
class RelatorioGeneratorTemplate {
  gerarRelatorio(filtros) {
    const etapas = [];
    etapas.push("1. Conectando à base de dados para extração de registros...");
    const dados = this.extrairDados(filtros);
    etapas.push(`2. Registros recuperados: ${dados.length} itens.`);
    
    const conteudoFormatado = this.formatarCorpo(dados);
    etapas.push(`3. Conteúdo formatado conforme layout específico.`);
    
    etapas.push("4. Rodapé institucional anexado. Relatório gerado com sucesso.");
    return { formato: this.constructor.name, etapas, totalItens: dados.length };
  }

  extrairDados(filtros) {
    return [{ id: 1, recurso: 'Sala 04' }, { id: 2, recurso: 'Quadra 01' }];
  }

  formatarCorpo(dados) {
    throw new Error("Método formatarCorpo deve ser implementado!");
  }
}

class RelatorioOcupacaoGenerator extends RelatorioGeneratorTemplate {
  formatarCorpo(dados) {
    return "Tabela de % de Ocupação Média por Recurso: 78.4%";
  }
}

class RelatorioFinanceiroGenerator extends RelatorioGeneratorTemplate {
  formatarCorpo(dados) {
    return "Demonstrativo Financeiro: Faturamento Total R$ 12.450,00";
  }
}

class RelatorioUsoRecursosGenerator extends RelatorioGeneratorTemplate {
  formatarCorpo(dados) {
    return "Ranking de Recursos Mais Reservados: 1º Sala 04, 2º Quadra Society";
  }
}


// --- Template Method Exemplo 3: Esqueleto de Notificação ---
class NotificacaoServiceTemplate {
  enviarNotificacao(destinatario, mensagem) {
    const etapas = [];
    etapas.push(`1. Buscando dados de contato de ${destinatario}...`);
    const modelo = this.montarTemplate(mensagem);
    etapas.push(`2. Template montado: "${modelo}"`);
    const resultado = this.disparar(destinatario, modelo);
    etapas.push(`3. Status do disparo: ${resultado}`);
    return { sucesso: true, etapas };
  }

  montarTemplate(mensagem) {
    return `[ReservaFlex Alert]: ${mensagem}`;
  }

  disparar(destinatario, mensagemFinal) {
    throw new Error("Método disparar deve ser implementado!");
  }
}

class NotificacaoEmailService extends NotificacaoServiceTemplate {
  disparar(destinatario, mensagem) {
    return `E-mail enviado com sucesso para ${destinatario} via SMTP.`;
  }
}

class NotificacaoSMSService extends NotificacaoServiceTemplate {
  disparar(destinatario, mensagem) {
    return `SMS disparado com sucesso para ${destinatario} via Gateway SMS.`;
  }
}

class NotificacaoWhatsAppService extends NotificacaoServiceTemplate {
  disparar(destinatario, mensagem) {
    return `Mensagem de WhatsApp (Racha PIX) enviada para ${destinatario}.`;
  }
}


// ==========================================================================
// 3. FACTORY METHOD DESIGN PATTERN (3 EXEMPLOS - 3º PADRÃO ESCOLHIDO)
// ==========================================================================

// --- Fábrica simples Exemplo 1: RecursoFactory ---
class RecursoFactory {
  static criarRecurso(tipo, id, nome, preco) {
    switch (tipo.toUpperCase()) {
      case 'SALA_REUNIAO':
        return { id, nome, categoria: 'Sala de Reunião', preco_hora: preco || 40.00, icone: 'fa-briefcase' };
      case 'LABORATORIO':
        return { id, nome, categoria: 'Laboratório Acadêmico', preco_hora: preco || 0.00, icone: 'fa-flask' };
      case 'QUADRA':
        return { id, nome, categoria: 'Quadra Esportiva', preco_hora: preco || 140.00, icone: 'fa-futbol' };
      case 'SALAO_FESTAS':
        return { id, nome, categoria: 'Área Social / Festa', preco_hora: preco || 150.00, icone: 'fa-utensils' };
      default:
        return { id, nome, categoria: 'Espaço Genérico', preco_hora: preco || 50.00, icone: 'fa-building' };
    }
  }
}

// --- Fábrica simples Exemplo 2: ValidadorVinculoFactory (AIEs simulados) ---
class ValidadorVinculoFactory {
  static criarValidador(segmento) {
    switch (segmento.toUpperCase()) {
      case 'UNIVERSIDADE':
        return {
          validar: (doc) => `[AIE01] Matrícula ${doc} validada no Sistema Acadêmico da Universidade.`
        };
      case 'COWORKING':
        return {
          validar: (doc) => `[AIE03] CNPJ/Membro ${doc} validado no Sistema Comercial de Coworking.`
        };
      case 'CONDOMINIO':
        return {
          validar: (doc) => `[AIE02] Apartamento/Morador ${doc} validado no Sistema do Condomínio.`
        };
      case 'CENTRO_ESPORTIVO':
        return {
          validar: (doc) => `[AIE04] Carteirinha ${doc} validada no Sistema do Clube Esportivo.`
        };
      default:
        return {
          validar: (doc) => `[AIE Generico] Documento ${doc} validado no sistema.`
        };
    }
  }
}

// --- Fábrica simples Exemplo 3: PagamentoFactory (simulação) ---
class PagamentoFactory {
  static criarPagamento(metodo) {
    switch (metodo.toUpperCase()) {
      case 'PIX':
        return {
          tipo: 'PIX',
          processar: (valor) => `[AIE05] QR Code PIX de R$ ${valor.toFixed(2)} gerado no Gateway de Pagamentos.`
        };
      case 'CARTAO':
        return {
          tipo: 'CARTAO_CREDITO',
          processar: (valor) => `[AIE05] Transação de R$ ${valor.toFixed(2)} aprovada na Operadora de Cartão.`
        };
      case 'CREDITO_HORAS':
        return {
          tipo: 'CREDITO_HORAS',
          processar: (valor) => `[AIE03] 2 Horas deduzidas do Saldo de Créditos do Membro.`
        };
      default:
        return {
          tipo: 'DINHEIRO',
          processar: (valor) => `Pagamento manual de R$ ${valor.toFixed(2)} registrado na Recepção.`
        };
    }
  }
}

module.exports = {
  DatabaseConnectionSingleton,
  TenantContextSingleton,
  ReservaAcademicaProcessor,
  ReservaCoworkingProcessor,
  ReservaCondominioProcessor,
  RelatorioOcupacaoGenerator,
  RelatorioFinanceiroGenerator,
  RelatorioUsoRecursosGenerator,
  NotificacaoEmailService,
  NotificacaoSMSService,
  NotificacaoWhatsAppService,
  RecursoFactory,
  ValidadorVinculoFactory,
  PagamentoFactory
};
