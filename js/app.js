// Arranque do painel do Município de Viçosa/MG: controles, navegação entre abas e carga dos dados.

import { aoProgredir, zerarProgresso, limparCache } from './api.js';
import { MUNICIPIO } from './config.js';
import { carregarPacote, carregarSerieAnexo01, BIMESTRES, rotuloPeriodoRGF } from './modelo.js';
import { ABAS, DESENHAR } from './abas.js';
import { instalarDicas, aviso } from './ui.js';
import { dataHora, esc } from './formato.js';

const PRIMEIRO_ANO = 2015;              // início da série do SICONFI
const $ = id => document.getElementById(id);

const anoCorrente = new Date().getFullYear();
const estado = { ano: anoCorrente, anoAutomatico: true, bim: null, modo: 'periodo', aba: 'visao' };
let pacote = null;
let carga = 0;

// ---------------------------------------------------------------- endereço (hash)

function lerEndereco() {
  const q = new URLSearchParams(location.hash.slice(1));
  const ano = Number(q.get('ano'));
  if (ano >= PRIMEIRO_ANO && ano <= anoCorrente) { estado.ano = ano; estado.anoAutomatico = false; }
  const bim = Number(q.get('bim'));
  estado.bim = bim >= 1 && bim <= 6 ? bim : null;
  if (['periodo', 'fechado'].includes(q.get('modo'))) estado.modo = q.get('modo');
  if (ABAS.some(a => a.id === q.get('aba'))) estado.aba = q.get('aba');
}

function gravarEndereco() {
  const q = new URLSearchParams({ ano: estado.ano, modo: estado.modo, aba: estado.aba });
  if (estado.bim) q.set('bim', estado.bim);
  history.replaceState(null, '', '#' + q.toString());
}

// ---------------------------------------------------------------- controles

function montarControles() {
  const anos = [];
  for (let a = anoCorrente; a >= PRIMEIRO_ANO; a--) anos.push(a);
  $('ano').innerHTML = anos.map(a => `<option value="${a}">${a}</option>`).join('');
  $('bim').innerHTML = '<option value="">Último entregue</option>' + BIMESTRES.map((n, i) => `<option value="${i + 1}">${n}</option>`).join('');
  sincronizarControles();
  $('controles').addEventListener('submit', ev => ev.preventDefault());
  $('ano').addEventListener('change', () => { estado.ano = Number($('ano').value); estado.anoAutomatico = false; estado.bim = null; carregar(); });
  $('bim').addEventListener('change', () => { estado.bim = $('bim').value ? Number($('bim').value) : null; carregar(); });
  $('modo').addEventListener('change', () => { estado.modo = $('modo').value; gravarEndereco(); desenhar(); });
  $('atualizar').addEventListener('click', async () => { await limparCache(); carregar(true); });
}

function sincronizarControles() {
  $('ano').value = String(estado.ano);
  $('bim').value = estado.bim ? String(estado.bim) : '';
  $('modo').value = estado.modo;
}

function montarAbas() {
  $('abas').innerHTML = ABAS.map(a => `<button type="button" role="tab" data-aba="${a.id}" aria-selected="${a.id === estado.aba}">${esc(a.nome)}</button>`).join('');
  $('abas').addEventListener('click', ev => { const b = ev.target.closest('[data-aba]'); if (b) irPara(b.dataset.aba); });
}

function irPara(aba, { filtro = null } = {}) {
  if (!DESENHAR[aba]) return;
  estado.aba = aba;
  if (filtro) estado.filtroSev = new Set([filtro]);
  gravarEndereco();
  desenhar();
  $('abas').querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  window.scrollTo({ top: 0 });
}

// ---------------------------------------------------------------- carga e desenho

async function carregar(forcar = false) {
  const minha = ++carga;
  sincronizarControles();
  gravarEndereco();
  zerarProgresso();
  $('progresso').hidden = false;
  $('conteudo').innerHTML = aviso(`Consultando o SICONFI: ${esc(MUNICIPIO.titulo)}, exercícios de ${estado.ano}, ${estado.ano - 1} e ${estado.ano - 2}…`, 'info');
  $('faixa').innerHTML = '';
  try {
    const p = await carregarPacote({ ano: estado.ano, bim: estado.bim, forcar });
    if (minha !== carga) return;
    if (p.semRREO && estado.anoAutomatico && estado.ano > PRIMEIRO_ANO) {   // início de ano: ainda sem RREO do exercício corrente
      estado.ano -= 1; estado.anoAutomatico = false;
      return carregar(forcar);
    }
    pacote = p;
    desenhar();
    carregarSerieAnexo01(p, { forcar }).then(() => {
      if (minha === carga && estado.aba === 'art167') desenhar();
    }).finally(() => { if (minha === carga) $('progresso').hidden = true; });
  } catch (erro) {
    if (minha !== carga) return;
    $('progresso').hidden = true;
    $('conteudo').innerHTML = aviso(`<strong>Não foi possível carregar os dados.</strong> ${esc(erro.message || erro)} <br>A API do SICONFI pode estar indisponível; tente novamente em alguns minutos.`, 'critico');
  }
}

function faixa(p) {
  const pop = p.demoRREO(p.ano).populacao || p.demoRREO(p.ano - 1).populacao;
  const rgf = `RGF: ${rotuloPeriodoRGF(p.periodicidadeExec, Math.floor(p.mesRGF / (p.periodicidadeExec === 'S' ? 6 : 4)))} de ${p.anosRGF[0]}`;
  const itens = [
    pop ? `${Number(pop).toLocaleString('pt-BR')} habitantes` : null,
    `Referência: ${BIMESTRES[p.bim - 1]} de ${p.ano}`,
    rgf,
    `Comparado com ${p.ano - 1} e ${p.ano - 2}`,
  ].filter(Boolean);
  const avisos = p.avisos.length ? `<details class="avisos"><summary>${p.avisos.length} observação(ões) sobre a carga</summary><ul>${p.avisos.map(a => `<li>${esc(a)}</li>`).join('')}</ul></details>` : '';
  return `<ul class="faixa-itens">${itens.map(i => `<li>${i}</li>`).join('')}</ul>${avisos}`;
}

function desenhar() {
  if (!pacote) return;
  const el = $('conteudo');
  const aba = ABAS.find(a => a.id === estado.aba);
  $('abas').querySelectorAll('[data-aba]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.aba === estado.aba)));
  $('faixa').innerHTML = faixa(pacote);
  $('obtido').textContent = pacote.obtidoEm ? `Dados obtidos em ${dataHora(pacote.obtidoEm)}${pacote.defasado ? ' (parte do cache local)' : ''}.` : '';
  document.title = `${aba.nome} · Viçosa/MG · KRATIS 4.0`;
  try {
    DESENHAR[estado.aba](el, { p: pacote, estado, ir: irPara, redesenhar: desenhar });
  } catch (erro) {
    console.error(erro);
    el.innerHTML = aviso(`<strong>Erro ao montar a aba.</strong> ${esc(erro.message || erro)}`, 'critico');
  }
}

// ---------------------------------------------------------------- início

function iniciar() {
  lerEndereco();
  montarControles();
  montarAbas();
  instalarDicas(document);
  aoProgredir(({ total, feitas }) => { $('progresso-barra').style.width = (total ? Math.round(feitas / total * 100) : 0) + '%'; });
  $('conteudo').addEventListener('click', ev => {
    const alvo = ev.target.closest('[data-ir]');
    if (!alvo) return;
    ev.preventDefault();
    irPara(alvo.dataset.ir, { filtro: alvo.dataset.filtro || null });
  });
  $('conteudo').addEventListener('keydown', ev => {
    if (ev.key === 'Enter' && ev.target.matches?.('[data-ir]')) irPara(ev.target.dataset.ir);
  });
  window.addEventListener('hashchange', () => {
    const antes = `${estado.ano}|${estado.bim}`;
    lerEndereco();
    if (`${estado.ano}|${estado.bim}` !== antes) carregar(); else { sincronizarControles(); desenhar(); }
  });
  carregar();
}

iniciar();
