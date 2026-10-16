/* Entrada: node server.js. Fluxo: requisição -> CRUD -> SQLite -> JSON.
   Aplicação de demonstração local, sem autenticação de produção. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const entidades = require('./backend/entidades');
const crud = require('./backend/crud');
const banco = require('./backend/database');
const patterns = require('./backend/patterns');
const aies = require('./backend/aies-mock');
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const json = (res, status, dados) => {
  res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
  res.end(JSON.stringify(dados));
};

// Reuso: centraliza o formato das respostas que retornam dados.
function responderDados(res, dados, status = 200) {
  return json(res, status, { sucesso: true, dados });
}

async function lerJson(req) {
  let texto = '';
  for await (const parte of req) {
    texto += parte;
    if (Buffer.byteLength(texto) > 65536) throw new crud.ErroHttp(413,'Formulário muito grande.');
  }
  try { return JSON.parse(texto); }
  catch { throw new crud.ErroHttp(400,'JSON inválido.'); }
}
const equipe = Object.entries(entidades).map(([chave,e]) => ({ cadastro:chave,titulo:e.titulo,integrante:e.integrante,tabela:e.tabela }));
const server = http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const rota = url.pathname;
    const orgId = url.searchParams.get('organizacao_id');
    if (rota.startsWith('/api/')) {
      if (['POST','PUT','DELETE'].includes(req.method) && req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) throw new crud.ErroHttp(403,'Origem da requisição não permitida.');
      if (rota === '/api/estrutura' && req.method === 'GET') return json(res,200,{sucesso:true,entidades,equipe});
      if (rota === '/api/status' && req.method === 'GET') return json(res,200,{sucesso:true,banco:'SQLite',arquivo:'data/reservaflex.sqlite',cruds:8,persistente:true});
      if (rota === '/api/equipe' && req.method === 'GET') return json(res,200,{sucesso:true,equipe,total_cruds:8});
      if (rota === '/api/aies' && req.method === 'GET') return json(res,200,{sucesso:true,simulado:true,dados:aies});
      if (rota === '/api/crud/all' && req.method === 'GET') return responderDados(res, crud.todos(orgId))
      const match = rota.match(/^\/api\/crud\/([a-z]+)(?:\/(\d+))?$/);
      if (match) {
        const [,chave,id] = match;
        if (!Object.hasOwn(entidades,chave)) throw new crud.ErroHttp(404,'Cadastro não encontrado.');
        if (req.method === 'GET') return responderDados(res, id ? crud.buscar(chave,id,orgId) : crud.listar(chave,orgId));
        // CREATE: o botão Salvar envia POST; a validação é seguida pelo INSERT.
        if (req.method === 'POST' && !id) return responderDados(res, crud.salvar(chave,await lerJson(req),null,orgId), 201);
        // UPDATE: edição usa PUT e mantém o mesmo identificador.
        if (req.method === 'PUT' && id) return responderDados(res, crud.salvar(chave,await lerJson(req),id,orgId));
        // DELETE: exclusão respeita os relacionamentos no banco.
        if (req.method === 'DELETE' && id) { crud.excluir(chave,id,orgId); return json(res,200,{sucesso:true,mensagem:'Registro excluído.'}); }
        throw new crud.ErroHttp(405,'Método não permitido para esse endereço.');
      }
      // Demonstrações de padrões separadas dos oito CRUDs.
      if (req.method === 'GET' && rota === '/api/patterns/singleton') {
        const db1 = patterns.DatabaseConnectionSingleton.getInstance(), db2 = patterns.DatabaseConnectionSingleton.getInstance();
        return json(res,200,{padrao:'Singleton',mesmaInstancia:db1===db2,consultaReal:db1.query('SELECT COUNT(*) AS total_usuarios FROM usuario'),contextoDemonstrativo:patterns.TenantContextSingleton.getInstance().getTenantInfo()});
      }
      if (req.method === 'GET' && rota === '/api/patterns/template-method') return json(res,200,{padrao:'Template Method',demonstracao:true,
        reserva:new patterns.ReservaAcademicaProcessor().processarReserva({documento:'2026109928'}),
        relatorio:new patterns.RelatorioFinanceiroGenerator().gerarRelatorio(),
        notificacao:new patterns.NotificacaoEmailService().enviarNotificacao('demo@reservaflex.local','Exemplo de confirmação')});
      if (req.method === 'GET' && rota === '/api/patterns/factory') return json(res,200,{padrao:'Fábricas simples (nomes originais preservados)',demonstracao:true,
        recurso:patterns.RecursoFactory.criarRecurso('SALA_REUNIAO',10,'Sala exemplo'),
        validador:patterns.ValidadorVinculoFactory.criarValidador('UNIVERSIDADE').validar('2026109928'),
        pagamento:patterns.PagamentoFactory.criarPagamento('PIX').processar(150)});
      throw new crud.ErroHttp(404,'API não encontrada.');
    }
    // O banco e os arquivos de backend não são entregues como arquivos públicos.
    const publicos = {'/':['index.html','text/html'],'/index.html':['index.html','text/html'],'/app.js':['app.js','text/javascript'],'/styles.css':['styles.css','text/css']};
    // Recursos visuais locais, com lista fixa: nenhuma pasta arbitrária é publicada.
    publicos['/assets/icons.css']=['assets/icons.css','text/css'];
    publicos['/assets/webfonts/fa-solid-900.woff2']=['assets/webfonts/fa-solid-900.woff2','font/woff2'];
    for(const peso of [400,500,600,700,800])publicos[`/assets/fonts/jakarta-${peso}.woff2`]=[`assets/fonts/jakarta-${peso}.woff2`,'font/woff2'];
    const arquivo = publicos[rota];
    if (!arquivo || !['GET','HEAD'].includes(req.method)) { res.writeHead(404); return res.end('Não encontrado'); }
    const conteudo = fs.readFileSync(path.join(__dirname,arquivo[0]));
    res.writeHead(200,{'Content-Type':arquivo[1].startsWith('text/')?`${arquivo[1]}; charset=utf-8`:arquivo[1],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(req.method === 'HEAD' ? undefined : conteudo);
  } catch (erro) {
    const resultado = crud.mensagemErro(erro);
    json(res,resultado.status,{sucesso:false,mensagem:resultado.mensagem});
  }
});
server.listen(PORT,HOST,() => {
  console.log(`ReservaFlex: http://localhost:${PORT}`);
  console.log(`Banco SQLite: ${banco.arquivo}`);
  console.log('8 CRUDs persistentes. Ctrl+C para encerrar.');
});
server.on('error', erro => { console.error(erro.code === 'EADDRINUSE' ? `A porta ${PORT} está ocupada. Encerre o servidor anterior com Ctrl+C.` : erro.message); process.exit(1); });
function encerrar() { server.close(() => { banco.db.close(); process.exit(0); }); }
process.on('SIGTERM',encerrar); process.on('SIGINT',encerrar);
