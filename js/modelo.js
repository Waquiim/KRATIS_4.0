// Modelo de dados: transforma as respostas da API em demonstrativos consultáveis e monta o
// "pacote" do Município de Viçosa/MG (exercício atual e os dois anteriores).

import { consultar } from './api.js';
import { MUNICIPIO } from './config.js';
import { mscOrcamentaria, correntesESuperavit } from './fontes.js';

export const norm = s => (s ?? '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toUpperCase().replace(/\s+/g, ' ').trim();

/** Normaliza o nome de uma coluna trocando anos por posições relativas ao exercício. */
export function normColuna(coluna, ano) {
  return norm(coluna).replace(/\b(20\d\d)\b/g, m => {
    const d = Number(m) - ano;
    return d === 0 ? '<EXERCICIO>' : d < 0 ? `<EXERCICIO${d}>` : `<EXERCICIO+${d}>`;
  });
}

/** Rótulo legível de uma coluna normalizada. */
export function rotuloColuna(coluna, ano) {
  return (coluna ?? '').replace(/\b(20\d\d)\b/g, m => {
    const d = Number(m) - ano;
    return d === 0 ? 'do exercício' : d === -1 ? 'do exercício anterior' : m;
  });
}

const nomeAnexo = a => /^Anexo I-/.test(a || '') ? 'DCA-' + a : (a || '');

/** Um demonstrativo (RREO, RGF de uma instituição ou DCA) de um exercício/período. */
export class Demo {
  constructor(itens = [], ano = null, info = {}) {
    this.ano = ano;
    this.info = info;                 // { periodo, periodicidade, instituicao, poder, em, defasado }
    this.anexos = new Map();          // anexo -> { linhas: Map, porCod: Map, colunas: Map }
    this.populacao = null;
    for (const it of itens) {
      const nome = nomeAnexo(it.anexo);
      let anexo = this.anexos.get(nome);
      if (!anexo) this.anexos.set(nome, anexo = { linhas: new Map(), porCod: new Map(), colunas: new Map() });
      const chave = `${it.rotulo ?? ''}|${it.cod_conta}|${it.conta}`;
      let linha = anexo.linhas.get(chave);
      if (!linha) {
        linha = { chave, rotulo: it.rotulo ?? '', cod: it.cod_conta, conta: it.conta, valores: new Map() };
        anexo.linhas.set(chave, linha);
        if (!anexo.porCod.has(it.cod_conta)) anexo.porCod.set(it.cod_conta, []);
        anexo.porCod.get(it.cod_conta).push(linha);
      }
      const col = normColuna(it.coluna, ano);
      if (!anexo.colunas.has(col)) anexo.colunas.set(col, rotuloColuna(it.coluna, ano));
      linha.valores.set(col, it.valor);
      if (it.populacao && !this.populacao) this.populacao = it.populacao;
    }
  }

  get vazio() { return this.anexos.size === 0; }
  tem(anexo) { return this.anexos.has(anexo); }
  nomesAnexos() { return [...this.anexos.keys()].sort((a, b) => a.localeCompare(b, 'pt', { numeric: true })); }

  /**
   * Valor de uma célula. `cod` é o cod_conta; `coluna` é uma RegExp testada no nome normalizado
   * (sem acentos, maiúsculas); `conta` (opcional) é uma RegExp testada no nome normalizado da conta.
   */
  v(anexo, cod, coluna, conta = null) {
    const a = this.anexos.get(anexo);
    if (!a) return null;
    for (const linha of a.porCod.get(cod) || []) {
      if (conta && !conta.test(norm(linha.conta))) continue;
      for (const [col, valor] of linha.valores) if (coluna.test(col)) return valor;
    }
    return null;
  }

  /** Como v(), mas devolve 0 quando o anexo existe e a célula não foi informada. */
  v0(anexo, cod, coluna, conta = null) {
    const valor = this.v(anexo, cod, coluna, conta);
    return valor === null && this.tem(anexo) ? 0 : valor;
  }

  linhas(anexo) { return [...(this.anexos.get(anexo)?.linhas.values() || [])]; }
  colunas(anexo) { return this.anexos.get(anexo)?.colunas || new Map(); }
}

const DEMO_VAZIO = new Demo();

/** A partir de 2023 as fontes de recursos seguem o padrão nacional (Portaria STN nº 710/2021). */
export const ANO_FONTES_PADRONIZADAS = 2023;

// ---------------------------------------------------------------- períodos e prazos

export const BIMESTRES = ['1º bimestre (jan–fev)', '2º bimestre (jan–abr)', '3º bimestre (jan–jun)',
  '4º bimestre (jan–ago)', '5º bimestre (jan–out)', '6º bimestre (jan–dez)'];
export const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function rotuloPeriodoRGF(periodicidade, periodo) {
  return periodicidade === 'S' ? `${periodo}º semestre` : `${periodo}º quadrimestre`;
}

/** Data-limite legal de publicação/envio de cada entregável. */
export function prazoEntrega(tipo, ano, periodo, periodicidade) {
  const dia30 = (a, mesFim) => mesFim >= 12 ? new Date(a + 1, 0, 30) : new Date(a, mesFim, 30);   // 30 dias após o período
  if (tipo === 'RREO') return dia30(ano, periodo * 2);                 // LRF, art. 52
  if (tipo === 'RGF') return dia30(ano, periodo * (periodicidade === 'S' ? 6 : 4));   // LRF, art. 55, § 2º
  if (tipo === 'DCA') return new Date(ano + 1, 3, 30);                 // municípios: 30 de abril (LRF, art. 51, § 1º, I)
  if (tipo === 'MSC') return new Date(ano, periodo + 1, 0);            // último dia do mês seguinte
  return null;
}

export function tipoEntregavel(nome) {
  const n = norm(nome);
  if (n.includes('RESUMIDO')) return 'RREO';
  if (n.includes('GESTAO FISCAL')) return 'RGF';
  if (n.includes('DCA') || n.includes('BALANCO ANUAL')) return 'DCA';
  if (n.includes('MSC') && n.includes('ENCERRAMENTO')) return 'MSCE';
  if (n.includes('MSC')) return 'MSC';
  return 'OUTRO';
}

export function poderDaInstituicao(nome) {
  return /CAMARA/.test(norm(nome)) ? 'L' : 'E';   // no Município: Câmara Municipal (Legislativo) e Prefeitura (Executivo)
}

export const NOME_PODER = { E: 'Executivo', L: 'Legislativo' };

// ---------------------------------------------------------------- carga do pacote

async function tentar(promessa, avisos, descricao) {
  try { return await promessa; }
  catch (erro) { avisos.push(`${descricao}: ${erro.message}`); return { itens: [], em: null, defasado: false, falhou: true }; }
}

function agruparPorInstituicao(itens) {
  const grupos = new Map();
  for (const it of itens) {
    const nome = it.instituicao || '—';
    if (!grupos.has(nome)) grupos.set(nome, []);
    grupos.get(nome).push(it);
  }
  return grupos;
}

/**
 * Carrega tudo o que o painel usa do Município: extratos de entregas, RREO (período de referência e
 * encerramentos anteriores), RGF por poder, e DCA. Devolve o pacote consultado pelas abas.
 */
export async function carregarPacote({ ano, bim = null, forcar = false }) {
  const avisos = [];
  const anos = [ano, ano - 1, ano - 2];
  const ente = MUNICIPIO, id = MUNICIPIO.c;
  const op = { forcar };

  // 1. Extratos de entregas (dizem o que existe)
  const extrato = {};
  await Promise.all([ano, ano - 1, ano - 2, ano - 3].map(async a => {
    const r = await tentar(consultar('extrato_entregas', { id_ente: id, an_referencia: a }, op), avisos, `Extrato de entregas de ${a}`);
    extrato[a] = r.itens.map(it => ({ ...it, tipo: tipoEntregavel(it.entregavel), simplificado: /simplificado/i.test(it.entregavel || '') }));
  }));

  const bimEntregues = {};
  for (const a of Object.keys(extrato)) {
    bimEntregues[a] = [...new Set(extrato[a].filter(e => e.tipo === 'RREO').map(e => e.periodo))].sort((x, y) => x - y);
  }
  const semRREO = !bimEntregues[ano].length;
  const bimRef = bim || bimEntregues[ano].at(-1) || 6;
  if (semRREO) avisos.push(`O SICONFI ainda não registra RREO de ${ano} para Viçosa; a coluna de ${ano} ficará vazia.`);
  else if (bim && !bimEntregues[ano].includes(bim)) avisos.push(`O ${bim}º bimestre de ${ano} não consta como entregue no SICONFI.`);

  const tipoRREO = a => extrato[a]?.some(e => e.tipo === 'RREO' && e.simplificado) && !extrato[a]?.some(e => e.tipo === 'RREO' && !e.simplificado)
    ? 'RREO Simplificado' : 'RREO';

  // 2. RREO: período de referência nos três exercícios, encerramento dos anteriores e Anexo 01 de apoio
  const rreo = {};
  const guardarRREO = (a, b, demo) => { (rreo[a] ||= {})[b] = demo; };
  const pedirRREO = async (a, b, soAnexo01 = false) => {
    if (rreo[a]?.[b] && !(rreo[a][b].info.soAnexo01 && !soAnexo01)) return;
    const params = { an_exercicio: a, nr_periodo: b, co_tipo_demonstrativo: tipoRREO(a), id_ente: id };
    if (soAnexo01) params.no_anexo = 'RREO-Anexo 01';
    const r = await tentar(consultar('rreo', params, op), avisos, `RREO ${b}º bim./${a}`);
    guardarRREO(a, b, new Demo(r.itens, a, { periodo: b, periodicidade: 'B', em: r.em, defasado: r.defasado, soAnexo01, falhou: r.falhou }));
  };
  const pedidosRREO = [];
  for (const a of anos) pedidosRREO.push([a, bimRef, false]);
  if (bimRef !== 6) { pedidosRREO.push([ano - 1, 6, false], [ano - 2, 6, false]); }
  pedidosRREO.push([ano - 3, 6, true]);
  if (bimRef !== 6) pedidosRREO.push([ano - 3, bimRef, true]);

  // 3. RGF por instituição
  const periodicidadeExec = extrato[ano]?.find(e => e.tipo === 'RGF' && poderDaInstituicao(e.instituicao) === 'E')?.periodicidade
    || extrato[ano - 1]?.find(e => e.tipo === 'RGF' && poderDaInstituicao(e.instituicao) === 'E')?.periodicidade || 'Q';
  const passo = periodicidadeExec === 'S' ? 6 : 4;
  let mesRGF = Math.floor(bimRef * 2 / passo) * passo;
  let anosRGF = anos;
  if (semRREO || mesRGF === 0) {         // ainda não há RGF exigível no exercício: compara os três últimos encerramentos
    mesRGF = 12; anosRGF = [ano - 1, ano - 2, ano - 3];
    avisos.push(`Ainda não há RGF de ${ano} exigível até o período de referência; a aba de gestão fiscal compara os encerramentos de ${ano - 1}, ${ano - 2} e ${ano - 3}.`);
  }
  const rgf = {};                         // rgf[ano][mes] = [ {instituicao, poder, periodicidade, periodo, demo} ]
  const pedirRGF = async (a, mes) => {
    const cadastro = new Map();           // instituicao -> {poder, periodicidade, simplificado}
    for (const e of extrato[a] || []) {
      if (e.tipo !== 'RGF' || cadastro.has(e.instituicao)) continue;
      cadastro.set(e.instituicao, { poder: poderDaInstituicao(e.instituicao), periodicidade: e.periodicidade || 'Q', simplificado: e.simplificado });
    }
    if (!cadastro.size) {
      ['E', 'L'].forEach(p => cadastro.set('?' + p, { poder: p, periodicidade: 'Q', simplificado: false }));
    }
    const consultas = new Map();
    for (const c of cadastro.values()) {
      const periodo = Math.floor(mes / (c.periodicidade === 'S' ? 6 : 4));
      if (!periodo) continue;
      const chave = [c.poder, c.periodicidade, c.simplificado, periodo].join('|');
      consultas.set(chave, { ...c, periodo });
    }
    const lista = [];
    await Promise.all([...consultas.values()].map(async c => {
      const r = await tentar(consultar('rgf', {
        an_exercicio: a, in_periodicidade: c.periodicidade, nr_periodo: c.periodo,
        co_tipo_demonstrativo: c.simplificado ? 'RGF Simplificado' : 'RGF', co_poder: c.poder, id_ente: id,
      }, op), avisos, `RGF ${NOME_PODER[c.poder]} ${c.periodo}º ${c.periodicidade === 'S' ? 'sem.' : 'quad.'}/${a}`);
      for (const [instituicao, itens] of agruparPorInstituicao(r.itens)) {
        lista.push({ instituicao, poder: c.poder, periodicidade: c.periodicidade, periodo: c.periodo,
          demo: new Demo(itens, a, { periodo: c.periodo, periodicidade: c.periodicidade, instituicao, poder: c.poder, em: r.em, defasado: r.defasado }) });
      }
    }));
    lista.sort((x, y) => 'EL'.indexOf(x.poder) - 'EL'.indexOf(y.poder) || x.instituicao.localeCompare(y.instituicao));
    (rgf[a] ||= {})[mes] = lista;
  };
  const pedidosRGF = [];
  for (const a of anosRGF) {
    pedidosRGF.push([a, mesRGF]);
    if (mesRGF !== 12 && a !== ano) pedidosRGF.push([a, 12]);
  }
  if (mesRGF !== 12 && !anosRGF.includes(ano - 1)) pedidosRGF.push([ano - 1, 12]);

  // 4. DCA (balanço anual): os três últimos exercícios entregues
  const temDCA = a => extrato[a]?.some(e => e.tipo === 'DCA');
  const anosDCA = temDCA(ano) ? anos : [ano - 1, ano - 2, ano - 3];
  const dca = {};
  const pedirDCA = async a => {
    const r = await tentar(consultar('dca', { an_exercicio: a, id_ente: id }, op), avisos, `DCA ${a}`);
    dca[a] = new Demo(r.itens, a, { periodicidade: 'A', em: r.em, defasado: r.defasado });
  };

  // 5. MSC (execução por fonte) dos períodos que entram na apuração do art. 167-A: permite excluir as
  //    despesas correntes custeadas com superávit financeiro do exercício anterior.
  const msc = {};
  const pedirMSC = async (a, b) => {
    const r = await mscOrcamentaria(a, b * 2, op);
    (msc[a] ||= {})[b] = { tem: r.tem, ...correntesESuperavit(r) };
  };
  const pedidosMSC = [];
  for (const a of [ano, ano - 1, ano - 2, ano - 3]) {
    if (a < ANO_FONTES_PADRONIZADAS) continue;
    if (a !== ano - 3 || bimRef !== 6) pedidosMSC.push([a, bimRef]);
    if (bimRef !== 6 && a !== ano) pedidosMSC.push([a, 6]);
  }

  await Promise.all([
    ...pedidosMSC.map(([a, b]) => pedirMSC(a, b)),
    ...pedidosRREO.map(([a, b, so]) => pedirRREO(a, b, so)),
    ...pedidosRGF.map(([a, m]) => pedirRGF(a, m)),
    ...anosDCA.map(pedirDCA),
  ]);

  const instantes = [];
  let defasado = false;
  const coletar = d => { if (d?.info?.em) instantes.push(d.info.em); if (d?.info?.defasado) defasado = true; };
  Object.values(rreo).forEach(porBim => Object.values(porBim).forEach(coletar));
  Object.values(rgf).forEach(porMes => Object.values(porMes).forEach(l => l.forEach(x => coletar(x.demo))));
  Object.values(dca).forEach(coletar);

  return {
    ente, ano, anos, bim: bimRef, semRREO, bimEntregues, extrato, avisos,
    rreo, rgf, anosRGF, mesRGF, periodicidadeExec, dca, anosDCA, msc, serieMSC: false,
    obtidoEm: instantes.length ? Math.min(...instantes) : null, defasado,
    serie167: null,
    /** RREO de um exercício: no modo "fechado" os anteriores vêm do 6º bimestre. */
    demoRREO(a, modo = 'periodo') {
      const b = modo === 'fechado' && a !== ano ? 6 : bimRef;
      return rreo[a]?.[b] || DEMO_VAZIO;
    },
    bimDe(a, modo = 'periodo') { return modo === 'fechado' && a !== ano ? 6 : bimRef; },
    /** Lista de RGF (uma entrada por instituição) de um exercício. */
    listaRGF(a, modo = 'periodo') {
      const mes = modo === 'fechado' && a !== anosRGF[0] ? 12 : mesRGF;
      return rgf[a]?.[mes] || rgf[a]?.[mesRGF] || [];
    },
    rgfDe(a, instituicaoOuPoder, modo = 'periodo') {
      const lista = this.listaRGF(a, modo);
      return (lista.find(x => x.instituicao === instituicaoOuPoder) || lista.find(x => x.poder === instituicaoOuPoder))?.demo || DEMO_VAZIO;
    },
  };
}

/**
 * Série bimestral do Anexo 01 (quatro exercícios), usada na apuração móvel de 12 meses do art. 167-A.
 * Devolve a01[ano][bim] = Demo (apenas Anexo 01 quando não havia RREO completo carregado).
 */
export async function carregarSerieAnexo01(pacote, { forcar = false } = {}) {
  const { ente, ano, rreo, extrato, bimEntregues } = pacote;
  const serie = {};
  const tarefas = [];
  for (const a of [ano, ano - 1, ano - 2, ano - 3]) {
    serie[a] = {};
    const bims = a === ano ? bimEntregues[a] : [1, 2, 3, 4, 5, 6];
    const tipo = extrato[a]?.some(e => e.tipo === 'RREO' && e.simplificado) && !extrato[a]?.some(e => e.tipo === 'RREO' && !e.simplificado)
      ? 'RREO Simplificado' : 'RREO';
    for (const b of bims) {
      if (rreo[a]?.[b] && !rreo[a][b].info.falhou) { serie[a][b] = rreo[a][b]; continue; }
      tarefas.push(consultar('rreo', { an_exercicio: a, nr_periodo: b, co_tipo_demonstrativo: tipo, no_anexo: 'RREO-Anexo 01', id_ente: ente.c }, { forcar })
        .then(r => { serie[a][b] = new Demo(r.itens, a, { periodo: b, soAnexo01: true }); })
        .catch(() => { serie[a][b] = DEMO_VAZIO; }));
    }
  }
  await Promise.all(tarefas);
  pacote.serie167 = serie;
  return serie;
}

/**
 * MSC de todos os bimestres da série do art. 167-A (quatro exercícios). É uma carga volumosa, feita
 * apenas quando a aba do art. 167-A é aberta.
 */
export async function carregarSerieMSC(pacote, { forcar = false } = {}) {
  const { ano, bimEntregues, msc } = pacote;
  const tarefas = [];
  for (const a of [ano, ano - 1, ano - 2, ano - 3]) {
    if (a < ANO_FONTES_PADRONIZADAS) continue;
    for (const b of a === ano ? bimEntregues[a] : [1, 2, 3, 4, 5, 6]) {
      if (msc[a]?.[b]) continue;
      tarefas.push(mscOrcamentaria(a, b * 2, { forcar }).then(r => { (msc[a] ||= {})[b] = { tem: r.tem, ...correntesESuperavit(r) }; }));
    }
  }
  await Promise.all(tarefas);
  pacote.serieMSC = true;
}
