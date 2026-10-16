/* ReservaFlex — interface original conectada aos oito CRUDs.
   Caminho de um clique: formulario -> salvarRegistro -> api/fetch -> server.js
   -> backend/crud.js -> SQLite -> carregarDados -> renderCrud.
   Os campos são reutilizados a partir de backend/entidades.js. */
let entidades = {}, dados = {}, currentTenantId = null, currentView = 'view-inicio';
let versaoConsulta = 0, exclusaoPendente = null, excluindo = false, formularioAtual = null;
let ultimoFoco = null;
const telas = {usuarios:'view-usuarios',organizacoes:'view-organizacoes',recursos:'view-buscar',reservas:'view-form-dinamico',regras:'view-regras',bloqueios:'view-bloqueios',equipamentos:'view-equipamentos',configuracoes:'view-configuracoes'};
const tenantConfigs = {
  Universidade: {theme:'theme-univ',icon:'fa-graduation-cap',campo:'Número de Matrícula (RA Aluno/Professor)',dica:'Ex.: 2026109928',resumo:'Portal Acadêmico & Aulas'},
  Coworking: {theme:'theme-coworking',icon:'fa-briefcase',campo:'CNPJ / CPF do Membro ou Plano',dica:'Informe o documento do membro',resumo:'Membros & Espaços de Trabalho'},
  'Condomínio': {theme:'theme-condo',icon:'fa-building',campo:'Número do Apartamento / Bloco',dica:'Ex.: Apt 402 — Bloco B',resumo:'Áreas de Lazer & Festas'},
  'Centro Esportivo': {theme:'theme-sports',icon:'fa-futbol',campo:'CPF do Capitão do Time / Grupo',dica:'Informe o documento do responsável',resumo:'Quadras & Agendamentos'}
};
const textos = {
  usuarios: {titulo:'Usuários da Organização',descricao:'Gerencie as pessoas e os responsáveis pelos agendamentos.',novo:'Novo usuário',singular:'Usuário',icon:'fa-user-plus'},
  organizacoes: {titulo:'Organizações',descricao:'Gerencie os clientes e seus ambientes de trabalho.',novo:'Nova organização',singular:'Organização',icon:'fa-building'},
  recursos: {titulo:'Catálogo de Espaços Disponíveis',descricao:'Confira os ambientes, capacidades, valores por hora e disponibilidade.',novo:'Novo espaço',singular:'Espaço',icon:'fa-plus'},
  reservas: {titulo:'Agendamentos',descricao:'Solicite uma reserva e acompanhe os agendamentos da organização.',novo:'Novo agendamento',singular:'Agendamento',icon:'fa-calendar-plus'},
  regras: {titulo:'Regras de Reserva',descricao:'Defina duração, antecedência, aprovação e limites de uso para cada espaço.',novo:'Nova regra',singular:'Regra',icon:'fa-sliders'},
  bloqueios: {titulo:'Bloqueios & Manutenções',descricao:'Organize os períodos em que um espaço ficará indisponível.',novo:'Novo bloqueio',singular:'Bloqueio',icon:'fa-screwdriver-wrench'},
  equipamentos: {titulo:'Equipamentos',descricao:'Mantenha os equipamentos e suas informações atualizadas.',novo:'Novo equipamento',singular:'Equipamento',icon:'fa-plus'},
  configuracoes: {titulo:'Personalização da Empresa',descricao:'Configure as características e o fluxo de aprovação da organização.',novo:'Criar configuração',singular:'Configuração',icon:'fa-wand-magic-sparkles'}
};
const colunas = {
  usuarios: [['nome','Nome'],['email','E-mail'],['tipo_usuario','Perfil'],['status','Situação']],
  organizacoes: [['nome','Organização'],['segmento','Segmento'],['email','Contato'],['status','Situação']],
  reservas: [['codigo_reserva','Reserva'],['recurso_id','Espaço'],['usuario_id','Solicitante'],['periodo','Data e horário'],['valor_total','Valor'],['status','Situação']],
  regras: [['recurso_id','Espaço'],['duracao_max_horas','Duração máxima'],['antecedencia_min_horas','Antecedência'],['limite_reservas_semana','Limite semanal'],['necessita_aprovacao','Aprovação']],
  bloqueios: [['recurso_id','Espaço'],['motivo','Motivo'],['administrador_id','Responsável'],['periodo','Período'],['status','Situação']],
  equipamentos: [['nome','Equipamento'],['categoria','Categoria'],['descricao','Descrição'],['status','Situação']]
};
const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dinheiro = v => Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const orgAtual = () => dados.organizacoes?.find(o=>o.id_organizacao===currentTenantId);
const temaAtual = () => tenantConfigs[orgAtual()?.segmento] || tenantConfigs.Universidade;
const configAtual = () => dados.configuracoes?.find(c=>c.organizacao_id===currentTenantId);
const icone = nome => `<i class="fa-solid ${nome}" aria-hidden="true"></i>`;
const dataBR = data => data ? data.slice(0,10).split('-').reverse().join('/') : '—';


function enderecoCrud(chave,id) { return `/api/crud/${chave}${id?'/'+id:''}${currentTenantId?'?organizacao_id='+currentTenantId:''}`; }



async function api(url,opcoes={}) {
  const r=await fetch(url,{...opcoes,headers:{'Content-Type':'application/json',...opcoes.headers}});
  const j=await r.json(); if(!r.ok||j.sucesso===false)throw new Error(j.mensagem||'Não foi possível concluir a operação.');return j;
}


function limparErro() { document.getElementById('globalError').hidden=true; }
function mostrarErro(erro) { const box=document.getElementById('globalError');box.textContent=erro.message;box.hidden=false;showToast(erro.message,'error'); }
function salvarPreferencia() { try { localStorage.setItem('reservaflex-organizacao',String(currentTenantId||'')); } catch {} }

document.addEventListener('DOMContentLoaded',async()=>{
  try {
    entidades=(await api('/api/estrutura')).entidades;
    try { currentTenantId=Number(localStorage.getItem('reservaflex-organizacao'))||null; } catch {}
    const tenant=new URLSearchParams(location.search).get('tenant');
    if(tenant)currentTenantId=Number(tenant)||({univ:1,coworking:2,condo:3,sports:4}[tenant])||null;
    await carregarDados();
    const view=new URLSearchParams(location.search).get('view')||location.hash.slice(1);
    switchView(document.getElementById(view)?view:'view-inicio');
    document.getElementById('crudDialog').addEventListener('close',()=>{formularioAtual=null;ultimoFoco?.focus();});
    document.getElementById('deleteDialog').addEventListener('close',()=>{exclusaoPendente=null;ultimoFoco?.focus();});
  } catch(erro) { mostrarErro(erro); }
});
async function carregarDados() {
  const consulta=++versaoConsulta;
  const orgs=(await api('/api/crud/organizacoes')).dados;
  if(consulta!==versaoConsulta)return;
  if(!orgs.some(o=>o.id_organizacao===currentTenantId))currentTenantId=orgs[orgs.length-1]?.id_organizacao||null;
  const resultado=await api(enderecoCrud('all'));
  if(consulta!==versaoConsulta)return;
  dados=resultado.dados;dados.organizacoes=orgs;salvarPreferencia();
  document.getElementById('tenantSelect').innerHTML=orgs.length?orgs.map(o=>`<option value="${o.id_organizacao}" ${o.id_organizacao===currentTenantId?'selected':''}>${esc(o.nome)}</option>`).join(''):'<option value="">Cadastre uma organização</option>';
  document.body.className=temaAtual().theme;
  document.getElementById('tenantLogo').innerHTML=icone(temaAtual().icon);
  document.getElementById('tenantBadge').textContent=orgAtual()?.segmento||'Organizações';
  renderPortal();renderDashboard();Object.keys(telas).forEach(chave=>renderCrud(chave));
}
async function changeTenantSegment(id) {
  fecharFormulario();fecharExclusao();currentTenantId=Number(id)||null;limparErro();
  try { await carregarDados(); } catch(e) { mostrarErro(e); }
}
async function selecionarOrganizacao(id) { await changeTenantSegment(id);switchView('view-inicio'); }

function switchView(id) {
  if(!document.getElementById(id)?.classList.contains('view-section'))return;
  currentView=id;limparErro();
  document.querySelectorAll('.view-section').forEach(s=>s.classList.toggle('active',s.id===id));
  document.querySelectorAll('.nav-item').forEach(n=>{const ativo=n.dataset.target===id;n.classList.toggle('active',ativo);if(ativo)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');});
  const chave=Object.keys(telas).find(k=>telas[k]===id);
  document.getElementById('topbarTitle').textContent=chave?textos[chave].titulo:({'view-inicio':'Visão Geral & Painel Corporativo','view-login':'Acesso ao Portal ReservaFlex','view-patterns':'Motor de Regras & Serviços','view-integracoes':'Central de Integrações'}[id]||'ReservaFlex');
  if(id==='view-integracoes')renderIntegracoes();
}

function abrirCrud(chave) { switchView(telas[chave]); }
async function recarregarTela() { try { await carregarDados();showToast('Registros atualizados.'); } catch(e) { mostrarErro(e); } }

function renderPortal() {
  document.getElementById('portalOrganizacoes').innerHTML=(dados.organizacoes||[]).map(o=>{const t=tenantConfigs[o.segmento]||tenantConfigs.Universidade;return `<button class="action-card portal-option" onclick="selecionarOrganizacao(${o.id_organizacao})"><span class="action-icon">${icone(t.icon)}</span><span class="action-info"><strong>${esc(o.nome)}</strong><span class="action-sub">${esc(t.resumo)}</span></span></button>`;}).join('')||'<p>Nenhuma organização cadastrada. Acesse Organizações para começar.</p>';
}
function renderDashboard() {
  document.getElementById('greetingTitle').textContent='Bem-vindo ao ReservaFlex';
}
function hoje(dias=0) { const d=new Date();d.setDate(d.getDate()+dias);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10); }
function badge(status) {const classe=['Ativo','Disponível','Confirmada'].includes(status)?'positive':(['Inativo','Bloqueado','Cancelada','Cancelado'].includes(status)?'muted':'attention');return `<span class="pill ${classe}"><span aria-hidden="true">●</span> ${esc(status)}</span>`;}
function nomeRelacionado(chave,id) {return dados[chave]?.find(x=>x[entidades[chave].pk]===id)?.nome||'#'+id;}



function renderCrud(chave) {
  const sec=document.getElementById(telas[chave]),t=textos[chave];
  const novo=chave==='reservas'?"novaReserva()":`abrirFormulario('${chave}')`;
  const semOrganizacao=chave!=='organizacoes'&&!currentTenantId;
  const botao=chave==='configuracoes'&&configAtual()?'':`<button class="btn btn-primary" onclick="${novo}" ${semOrganizacao?'disabled':''}>${icone(t.icon)}${t.novo}</button>`;
  sec.innerHTML=`<div class="page-heading"><div><span class="section-context">${esc(chave==='organizacoes'?'Ambientes de trabalho':orgAtual()?.nome||'Selecione uma organização')}</span><h2>${t.titulo}</h2><p>${t.descricao}</p></div>${botao}</div>`;
  if(semOrganizacao){sec.innerHTML+='<div class="empty-panel"><h3>Comece cadastrando uma organização</h3><p>Os cadastros serão vinculados ao ambiente escolhido no topo.</p><button class="btn btn-primary" onclick="abrirCrud(\'organizacoes\');abrirFormulario(\'organizacoes\')">Cadastrar organização</button></div>';return;}
  if(chave==='recursos') {
    sec.innerHTML+=`<div class="catalog-toolbar"><label class="search-box">${icone('fa-magnifying-glass')}<input type="search" placeholder="Buscar por nome, categoria ou localização" aria-label="Buscar espaços" oninput="filtrarCatalogo()" id="catalogSearch"></label><label class="catalog-state"><span>Situação</span><select class="form-control" id="catalogStatus" onchange="filtrarCatalogo()"><option value="Disponível">Disponíveis</option><option value="">Todos os espaços</option><option>Em Manutenção</option><option>Ocupado</option></select></label></div><div class="resources-list" id="variabilityCatalog"></div>`;
    renderVariabilityCatalog();return;
  }
  if(chave==='reservas') {
    sec.innerHTML+=`<div class="reservation-layout"><div class="reservation-form-card"><div class="form-card-heading"><span class="service-tag">AGENDAMENTO</span><h3 id="reservaFormTitle">Solicitação de Agendamento</h3><p>Preencha os dados e confirme o período desejado.</p></div><div id="reservaFormMount"></div></div><aside id="reservaResumoCard" class="reservation-summary"></aside></div><div class="list-panel"><div class="section-line"><div><h3>Agendamentos da organização</h3><p>${dados.reservas.length} registro(s) encontrado(s)</p></div>${buscaLista('reservas')}</div>${tabela('reservas')}</div>`;
    renderFormularioReserva();return;
  }
  if(chave==='configuracoes'){renderConfiguracoes(sec);return;}
  sec.innerHTML+=`<div class="list-panel"><div class="section-line"><div><h3>${chave==='organizacoes'?'Organizações cadastradas':'Registros cadastrados'}</h3><p>${dados[chave].length} registro(s) encontrado(s)</p></div>${buscaLista(chave)}</div>${tabela(chave)}</div>`;
}



function buscaLista(chave) {return `<label class="search-box compact-search">${icone('fa-magnifying-glass')}<input type="search" placeholder="Buscar nesta lista" aria-label="Buscar ${esc(entidades[chave].titulo)}" oninput="filtrarLinhas(this)"></label>`;}
function tabela(chave) {
  const linhas=dados[chave]||[],pk=entidades[chave].pk;
  return `<div class="table-scroll"><table class="records-table"><thead><tr><th>Referência</th>${colunas[chave].map(([,n])=>`<th>${n}</th>`).join('')}<th class="actions-column">Ações</th></tr></thead><tbody>${linhas.length?linhas.map(l=>`<tr data-row="${l[pk]}"><td><span class="record-id">#${l[pk]}</span></td>${colunas[chave].map(([c])=>`<td>${celula(chave,c,l)}</td>`).join('')}<td class="row-actions">${botoesRegistro(chave,l[pk])}</td></tr>`).join(''):`<tr><td colspan="${colunas[chave].length+2}"><div class="quiet-empty">Nenhum registro cadastrado. Use o botão “${textos[chave].novo}” para começar.</div></td></tr>`}</tbody></table></div>`;
}
function botoesRegistro(chave,id) {return `<button class="row-button" onclick="editarRegistro('${chave}',${id})" aria-label="Editar ${textos[chave].singular.toLowerCase()} #${id}">${icone('fa-pen-to-square')}<span>Editar</span></button><button class="row-button delete-button" onclick="excluirRegistro('${chave}',${id})" aria-label="Excluir ${textos[chave].singular.toLowerCase()} #${id}">${icone('fa-trash-can')}<span>Excluir</span></button>`;}
function celula(chave,c,l) {
  if(c==='status')return badge(l[c]);
  if(c==='tipo_usuario')return `<span class="profile-chip">${l[c]==='ADMINISTRADOR'?'Administrador':'Usuário'}</span>`;
  if(c==='nome')return `<strong class="record-name">${esc(l[c])}</strong>`;
  if(c==='codigo_reserva')return `<strong class="record-name">${esc(l[c])}</strong><small class="cell-detail">${esc(l.finalidade)}</small>`;
  if(c==='periodo')return chave==='reservas'?`${dataBR(l.data_reserva)}<small class="cell-detail">${l.horario_inicio}–${l.horario_fim}</small>`:`${dataBR(l.data_inicio)} ${l.data_inicio.slice(11)}<small class="cell-detail">até ${dataBR(l.data_fim)} ${l.data_fim.slice(11)}</small>`;
  if(c==='valor_total')return `<strong>${dinheiro(l[c])}</strong>`;
  if(c==='necessita_aprovacao')return l[c]?'<span class="pill attention">Manual</span>':'<span class="pill positive">Automática</span>';
  if(c==='duracao_max_horas'||c==='antecedencia_min_horas')return `${l[c]} h`;
  if(c==='limite_reservas_semana')return `${l[c]} por usuário`;
  const campo=entidades[chave].campos.find(f=>f.nome===c);
  if(campo?.tipo==='relation')return esc(nomeRelacionado(campo.entidade,l[c]));
  return esc(l[c]||'—');
}
function filtrarLinhas(input) {const busca=input.value.toLocaleLowerCase('pt-BR');input.closest('.list-panel').querySelectorAll('tbody tr').forEach(tr=>tr.hidden=!tr.textContent.toLocaleLowerCase('pt-BR').includes(busca));}
function renderVariabilityCatalog() {
  const box=document.getElementById('variabilityCatalog');if(!box)return;
  box.innerHTML=[...(dados.recursos||[])].sort((a,b)=>a.id_recurso-b.id_recurso).map(r=>`<article class="resource-item-card" data-recurso="${r.id_recurso}" data-status="${esc(r.status)}" data-search="${esc([r.nome,r.categoria,r.localizacao].join(' ').toLocaleLowerCase('pt-BR'))}"><span class="resource-symbol">${icone(temaAtual().icon)}</span><div class="resource-details"><div class="res-header-line"><span class="res-category-badge">${esc(r.categoria)}</span>${badge(r.status)}</div><h3 class="res-name-title">${esc(r.nome)}</h3><div class="res-sub-info"><span>Capacidade: <strong>${r.capacidade} pessoas</strong></span><span>Local: <strong>${esc(r.localizacao)}</strong></span></div>${r.descricao?`<p class="resource-description">${esc(r.descricao)}</p>`:''}<span class="resource-reference">Referência #${r.id_recurso}</span></div><div class="resource-actions"><strong class="resource-price">${dinheiro(r.preco_hora)} <small>/h</small></strong><button class="btn btn-primary btn-sm" onclick="reservarEspaco(${r.id_recurso})" ${r.status!=='Disponível'?'disabled':''}>Reservar Espaço</button><div class="resource-management">${botoesRegistro('recursos',r.id_recurso)}</div></div></article>`).join('')||'';
  box.innerHTML+='<div id="catalogEmpty" class="empty-panel" hidden><i class="fa-solid fa-door-open" aria-hidden="true"></i><h3>Nenhum espaço encontrado</h3><p>Altere a busca ou cadastre um novo espaço nesta organização.</p></div>';
  filtrarCatalogo();
}
function filtrarCatalogo() {
  const busca=document.getElementById('catalogSearch')?.value.toLocaleLowerCase('pt-BR')||'',status=document.getElementById('catalogStatus')?.value||'';let visiveis=0;
  document.querySelectorAll('[data-recurso]').forEach(card=>{const mostrar=(!status||card.dataset.status===status)&&card.dataset.search.includes(busca);card.hidden=!mostrar;if(mostrar)visiveis++;});
  document.getElementById('catalogEmpty').hidden=visiveis>0;
}
function renderConfiguracoes(sec) {
  const cfg=configAtual();
  if(!cfg){sec.innerHTML+='<div class="empty-panel"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i><h3>Personalize seu ambiente</h3><p>Crie a configuração desta organização para escolher suas características.</p><button class="btn btn-primary" onclick="abrirFormulario(\'configuracoes\')">Criar configuração</button></div>';return;}
  const modulos=[['modulo_academico','Portal Acadêmico','fa-graduation-cap'],['modulo_coworking','Espaço Coworking','fa-briefcase'],['modulo_condominio','Áreas do Condomínio','fa-building'],['modulo_esportivo','Arena Esportiva','fa-futbol']];
  sec.innerHTML+=`<div class="settings-heading"><div><span class="record-id">Configuração #${cfg.id_configuracao}</span><p>Características de ${esc(orgAtual()?.nome)}</p></div><div class="button-row">${botoesRegistro('configuracoes',cfg.id_configuracao)}</div></div><div class="toggle-grid">${modulos.map(([flag,n,i])=>`<div class="toggle-card"><div class="feature-title"><span class="action-icon">${icone(i)}</span><span><strong>${n}</strong><small>Característica do segmento</small></span></div><span class="pill ${cfg[flag]?'positive':'muted'}">${cfg[flag]?'Ativo':'Inativo'}</span></div>`).join('')}</div><div class="settings-details"><h3>Fluxo de agendamento</h3><div><span><strong>Aprovação manual</strong><small>Novas reservas aguardam a confirmação do responsável.</small></span><span class="pill ${cfg.aprovacao_habilitada?'attention':'positive'}">${cfg.aprovacao_habilitada?'Habilitada':'Automático'}</span></div><div><span><strong>Créditos de horas</strong><small>Característica demonstrativa; não movimenta saldo.</small></span><span class="pill muted">${cfg.creditos_habilitados?'Configurado':'Desabilitado'}</span></div><div><span><strong>Divisão PIX</strong><small>Característica demonstrativa; não realiza pagamentos.</small></span><span class="pill muted">${cfg.racha_pix_habilitado?'Configurado':'Desabilitado'}</span></div></div>`;
}

function padrao(c) {
  if(c.nome==='organizacao_id')return currentTenantId||'';
  if(c.tipo==='date')return hoje(1);
  if(c.nome==='horario_inicio')return '14:00';if(c.nome==='horario_fim')return '15:00';
  if(c.nome==='data_inicio')return hoje(1)+'T08:00';if(c.nome==='data_fim')return hoje(1)+'T18:00';
  return c.valor??'';
}
function renderCampo(chave,c,registro) {
  const valor=registro[c.nome]??padrao(c),id=`campo-${chave}-${c.nome}`;
  const rotulo=c.nome==='documento_vinculo'?temaAtual().campo:c.rotulo;
  const comum=`name="${c.nome}" id="${id}" class="form-control" ${c.required?'required':''}`;
  if(c.tipo==='checkbox')return `<label class="toggle-field" for="${id}"><span>${esc(rotulo)}</span><span class="switch"><input type="checkbox" name="${c.nome}" id="${id}" ${Number(valor)?'checked':''}><span class="slider"></span></span></label>`;
  let controle;
  if(c.tipo==='relation') {
    let opcoes=dados[c.entidade]||[];
    if(c.entidade==='organizacoes')opcoes=opcoes.filter(o=>o.id_organizacao===currentTenantId);
    if(c.perfil)opcoes=opcoes.filter(o=>(o.tipo_usuario===c.perfil&&o.status==='Ativo')||o[entidades[c.entidade].pk]===valor);
    controle=`<select ${comum} onchange="atualizarResumoReserva()"><option value="">${opcoes.length?'Selecione…':'Nenhum registro cadastrado'}</option>${opcoes.map(o=>`<option value="${o[entidades[c.entidade].pk]}" ${Number(valor)===o[entidades[c.entidade].pk]?'selected':''}>${esc(o.nome)}</option>`).join('')}</select>`;
  } else if(c.tipo==='select')controle=`<select ${comum}>${c.opcoes.map(o=>`<option value="${esc(o)}" ${o===valor?'selected':''}>${esc(o==='ADMINISTRADOR'?'Administrador':o==='USUARIO'?'Usuário':o)}</option>`).join('')}</select>`;
  else if(c.tipo==='textarea')controle=`<textarea ${comum} maxlength="2000" rows="3">${esc(valor)}</textarea>`;
  else controle=`<input ${comum} type="${c.tipo}" value="${esc(valor)}" ${c.min!==undefined?`min="${c.min}" step="${c.step}"`:''} ${c.nome==='documento_vinculo'?`placeholder="${esc(temaAtual().dica)}"`:''} maxlength="250" onchange="atualizarResumoReserva()">`;
  return `<div class="form-group ${['nome','descricao','finalidade','documento_vinculo','motivo','organizacao_id'].includes(c.nome)||(chave==='reservas'&&c.nome==='data_reserva')?'span-two':''}"><label for="${id}">${esc(rotulo)}${c.required?' <span class="required-mark">*</span>':''}</label>${controle}</div>`;
}

function formulario(chave,registro={}) {
  const e=entidades[chave],id=registro[e.pk]||'',reserva=chave==='reservas';
  return `<form id="form-${chave}" onsubmit="salvarRegistro(event,'${chave}')" data-periodo="${esc(JSON.stringify([registro.recurso_id,registro.data_reserva,registro.horario_inicio,registro.horario_fim]))}" data-valor="${registro.valor_total??''}"><input type="hidden" name="id" value="${id}"><div class="form-grid">${e.campos.map(c=>renderCampo(chave,c,registro)).join('')}</div>${reserva?'<div id="reservaResumo" class="price-estimate"></div>':''}<p class="form-error" role="alert" hidden></p><div class="form-footer"><span>* Campos obrigatórios</span><div class="button-row"><button class="btn btn-secondary" type="button" onclick="${reserva?'limparReserva()':'fecharFormulario()'}">${reserva?(id?'Cancelar edição':'Limpar formulário'):'Cancelar'}</button><button class="btn btn-primary" type="submit">${icone(id?'fa-check':'fa-plus')}${id?'Salvar alterações':reserva?'Confirmar Agendamento':'Cadastrar '+textos[chave].singular.toLowerCase()}</button></div></div></form>`;
}


function abrirFormulario(chave,registro={}) {
  if(!entidades[chave])return;
  if(chave!=='organizacoes'&&!currentTenantId){showToast('Cadastre uma organização para continuar.','warning');return;}
  if(chave==='reservas'){abrirCrud('reservas');renderFormularioReserva(registro);document.getElementById('form-reservas')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
  ultimoFoco=document.activeElement;formularioAtual=chave;
  const id=registro[entidades[chave].pk];
  document.getElementById('dialogEyebrow').textContent=chave==='organizacoes'?'Ambientes de trabalho':orgAtual()?.nome||'';
  document.getElementById('dialogTitle').textContent=id?`Editar ${textos[chave].singular.toLowerCase()} #${id}`:textos[chave].novo;
  document.getElementById('dialogFormMount').innerHTML=formulario(chave,registro);
  document.getElementById('crudDialog').showModal();
}



function fecharFormulario() {const d=document.getElementById('crudDialog');if(d.open)d.close();}
function renderFormularioReserva(registro={}) {
  const mount=document.getElementById('reservaFormMount');if(!mount)return;
  mount.innerHTML=formulario('reservas',registro);
  document.getElementById('reservaFormTitle').textContent=registro.id_reserva?`Editar Agendamento #${registro.id_reserva}`:'Solicitação de Agendamento';atualizarResumoReserva();
}
function limparReserva() {renderFormularioReserva();limparErro();}
function novaReserva() {abrirCrud('reservas');renderFormularioReserva();document.getElementById('form-reservas')?.scrollIntoView({behavior:'smooth',block:'start'});}
function reservarEspaco(id) {abrirCrud('reservas');renderFormularioReserva({recurso_id:id});document.getElementById('form-reservas')?.scrollIntoView({behavior:'smooth',block:'start'});}
function atualizarResumoReserva() {
  const f=document.getElementById('form-reservas'),box=document.getElementById('reservaResumoCard'),preco=document.getElementById('reservaResumo');if(!f||!box||!preco)return;
  const r=dados.recursos?.find(x=>x.id_recurso===Number(f.elements.recurso_id.value));
  const mins=h=>{const[a,b]=(h||'0:0').split(':').map(Number);return a*60+b;};
  const duracao=(mins(f.elements.horario_fim.value)-mins(f.elements.horario_inicio.value))/60;
  const periodo=[Number(f.elements.recurso_id.value),f.elements.data_reserva.value,f.elements.horario_inicio.value,f.elements.horario_fim.value];
  const manter=f.elements.id.value&&JSON.stringify(periodo)===f.dataset.periodo;
  const valor=manter?Number(f.dataset.valor):(r&&duracao>0?r.preco_hora*duracao:0);
  preco.innerHTML=`<span>Valor estimado</span><strong>${dinheiro(valor)}</strong>`;
  const regra=dados.regras?.find(x=>x.recurso_id===r?.id_recurso);
  const aprovacao=Boolean(configAtual()?.aprovacao_habilitada||regra?.necessita_aprovacao);
  box.innerHTML=r?`<span class="summary-icon">${icone(temaAtual().icon)}</span><span class="res-category-badge">${esc(r.categoria)}</span><h3>${esc(r.nome)}</h3><p>${esc(r.localizacao)}</p><dl><div><dt>Capacidade</dt><dd>${r.capacidade} pessoas</dd></div><div><dt>Valor por hora</dt><dd>${dinheiro(r.preco_hora)}</dd></div>${regra?`<div><dt>Duração máxima</dt><dd>${regra.duracao_max_horas} horas</dd></div>`:''}<div><dt>Aprovação</dt><dd>${aprovacao?'Manual':'Automática'}</dd></div></dl><p class="summary-note">${icone('fa-circle-info')} A disponibilidade será conferida ao confirmar o agendamento.</p>`:`<span class="summary-icon">${icone('fa-calendar-days')}</span><h3>Sua próxima reserva</h3><p>Escolha o espaço para conferir capacidade, valor e condições de uso.</p>`;
}
async function editarRegistro(chave,id) {try {limparErro();abrirFormulario(chave,(await api(enderecoCrud(chave,id))).dados);}catch(e){mostrarErro(e);}}


async function salvarRegistro(event,chave) {
  event.preventDefault();limparErro();
  const form=event.currentTarget,id=form.elements.id.value,entrada={};
  for(const c of entidades[chave].campos)entrada[c.nome]=c.tipo==='checkbox'?Number(form.elements[c.nome].checked):form.elements[c.nome].value;
  const botao=form.querySelector('[type=submit]'),aviso=form.querySelector('.form-error');botao.disabled=true;aviso.hidden=true;
  try {
    const resultado=await api(enderecoCrud(chave,id),{method:id?'PUT':'POST',body:JSON.stringify(entrada)});
    if(chave==='organizacoes'&&!id)currentTenantId=resultado.dados.id_organizacao;
    fecharFormulario();await carregarDados();
    const ref=resultado.dados[entidades[chave].pk];
    showToast(`${textos[chave].singular}: ${id?'alterações salvas':'cadastro realizado'}. Referência #${ref}.`,'success');
  }catch(e){aviso.textContent=e.message;aviso.hidden=false;showToast(e.message,'error');}
  finally {botao.disabled=false;}
}

function excluirRegistro(chave,id) {
  const registro=dados[chave]?.find(x=>x[entidades[chave].pk]===id);if(!registro)return;
  ultimoFoco=document.activeElement;exclusaoPendente={chave,id};
  document.getElementById('deleteTitle').textContent=`Excluir ${textos[chave].singular.toLowerCase()}?`;
  const nome=registro.nome||registro.codigo_reserva||registro.motivo||(chave==='configuracoes'?orgAtual()?.nome:nomeRelacionado('recursos',registro.recurso_id));
  document.getElementById('deleteDescription').textContent=`${nome||'Registro'} · referência #${id}. A exclusão será concluída se não houver vínculos que a impeçam.`;
  document.getElementById('deleteError').hidden=true;document.getElementById('deleteDialog').showModal();
}
function fecharExclusao() {const d=document.getElementById('deleteDialog');if(d.open)d.close();}
async function confirmarExclusao() {
  if(!exclusaoPendente||excluindo)return;
  const {chave,id}=exclusaoPendente,botao=document.getElementById('confirmDeleteButton');excluindo=true;botao.disabled=true;
  try {await api(enderecoCrud(chave,id),{method:'DELETE'});fecharExclusao();await carregarDados();showToast(`${textos[chave].singular} #${id} excluído.`,'success');}
  catch(e){const aviso=document.getElementById('deleteError');aviso.textContent=e.message;aviso.hidden=false;}
  finally {excluindo=false;botao.disabled=false;}
}
async function testPatternAPI(tipo) {const box=document.getElementById('patternOutputConsole');box.textContent='Executando serviço…';try{box.textContent=JSON.stringify(await api('/api/patterns/'+tipo),null,2);}catch(e){box.textContent=e.message;mostrarErro(e);}}
async function renderIntegracoes() {
  const box=document.getElementById('integracoesCards');
  const fontes=[['Acadêmico','Matrículas e vínculos','fa-graduation-cap'],['Condominial','Unidades e moradores','fa-building'],['Coworking','Membros e planos','fa-briefcase'],['Clube Esportivo','Associados e equipes','fa-futbol'],['Financeiro','Transações de pagamento','fa-credit-card'],['Agenda Corporativa','Eventos institucionais','fa-calendar-days'],['Autenticação SSO','Diretório corporativo','fa-user-shield'],['Acesso Físico','Catracas e fechaduras','fa-door-open']];
  try {const aies=(await api('/api/aies')).dados;box.innerHTML=fontes.map(([nome,descricao,i],n)=>`<article class="integration-card"><span class="action-icon">${icone(i)}</span><span class="pill muted">Exemplo</span><h3>${nome}</h3><p>${descricao}</p><small>${aies['aie0'+(n+1)]?.length||0} registro(s) de referência</small></article>`).join('');}catch(e){mostrarErro(e);}
}
function showToast(msg,tipo='primary') {const t=document.createElement('div');t.className='toast '+tipo;const i=document.createElement('i');i.className='fa-solid '+(tipo==='success'?'fa-circle-check':tipo==='error'?'fa-circle-exclamation':'fa-circle-info');i.setAttribute('aria-hidden','true');t.append(i,document.createTextNode(msg));document.getElementById('toastContainer').append(t);setTimeout(()=>t.remove(),5000);}
