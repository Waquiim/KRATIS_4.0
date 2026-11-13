// Indicadores gerenciais e possíveis apontamentos do controle externo (TCE-MG) para o Município de
// Viçosa/MG, calculados exclusivamente com os demonstrativos publicados no SICONFI.

import { norm, prazoEntrega, poderDaInstituicao, NOME_PODER, rotuloPeriodoRGF, BIMESTRES } from './modelo.js';
import { moeda, moedaCurta, pct, pp, variacao, pctVariacao, data, vazio } from './formato.js';

export const A1 = 'RREO-Anexo 01', A2 = 'RREO-Anexo 02', A3 = 'RREO-Anexo 03', A4 = 'RREO-Anexo 04',
  A6 = 'RREO-Anexo 06', A7 = 'RREO-Anexo 07', A14 = 'RREO-Anexo 14';
export const G1 = 'RGF-Anexo 01', G2 = 'RGF-Anexo 02', G3 = 'RGF-Anexo 03', G4 = 'RGF-Anexo 04', G5 = 'RGF-Anexo 05', G6 = 'RGF-Anexo 06';

export const COL = {
  real: /^ATE O BIMESTRE/, prevIni: /^PREVISAO INICIAL/, prev: /^PREVISAO ATUALIZADA/,
  dotIni: /^DOTACAO INICIAL/, dot: /^DOTACAO ATUALIZADA/,
  emp: /^DESPESAS EMPENHADAS ATE O BIMESTRE/, liq: /^DESPESAS LIQUIDADAS ATE O BIMESTRE/,
  pago: /^DESPESAS PAGAS ATE O BIMESTRE/, rpnp: /^INSCRITAS EM RESTOS A PAGAR NAO PROCESSADOS/,
  doze: /^TOTAL \(ULTIMOS 12 MESES\)/, valor: /^VALOR$/, pctRcl: /^% SOBRE A RCL/,
};

export const LIMITES = {
  dcRc: { alerta: 85, limite: 95 },            // CF/88, art. 167-A, caput e § 1º
  dcl: 120,                                    // Resolução SF nº 40/2001, art. 3º, II (municípios)
  operacoesCredito: 16, aro: 7,                // Resolução SF nº 43/2001, arts. 7º e 10
  garantias: 22,                               // Resolução SF nº 43/2001, art. 9º
};

const soma = (...xs) => xs.every(vazio) ? null : xs.reduce((a, b) => a + (b || 0), 0);
const razao = (a, b) => vazio(a) || vazio(b) || b === 0 ? null : a / b * 100;

// ---------------------------------------------------------------- execução orçamentária (RREO Anexo 01)

const memoExec = new WeakMap();

/** Resumo da execução orçamentária de um RREO (Anexo 01 – Balanço Orçamentário). */
export function execucao(d) {
  if (!d || !d.tem(A1)) return null;
  if (memoExec.has(d)) return memoExec.get(d);
  const v = (cod, col) => d.v(A1, cod, col);
  const e = {
    recPrevIni: v('TotalReceitas', COL.prevIni), recPrev: v('TotalReceitas', COL.prev), recReal: v('TotalReceitas', COL.real),
    rc: v('ReceitasCorrentes', COL.real), rcPrev: v('ReceitasCorrentes', COL.prev),
    rcIntra: v('ReceitasCorrentesIntra', COL.real) ?? v('ReceitasIntraOrcamentariasTotal', COL.real) ?? 0,
    rk: v('ReceitasDeCapital', COL.real), rkPrev: v('ReceitasDeCapital', COL.prev),
    opCred: v('ReceitasDeOperacoesDeCredito', COL.real) ?? 0, opCredPrev: v('ReceitasDeOperacoesDeCredito', COL.prev) ?? 0,
    alienacao: v('AlienacaoDeBens', COL.real) ?? 0,
    superavitFin: v('SuperavitFinanceiro', COL.real) ?? 0,
    dotIni: v('TotalDespesas', COL.dotIni), dot: v('TotalDespesas', COL.dot),
    emp: v('TotalDespesas', COL.emp), liq: v('TotalDespesas', COL.liq), pago: v('TotalDespesas', COL.pago),
    dcDot: v('DespesasCorrentes', COL.dot), dcEmp: v('DespesasCorrentes', COL.emp), dcLiq: v('DespesasCorrentes', COL.liq),
    dcRpnp: v('DespesasCorrentes', COL.rpnp),
    dcIntraEmp: v('DespesasCorrentesIntra', COL.emp) ?? v('DespesasIntraOrcamentariasTotal', COL.emp) ?? 0,
    dcIntraLiq: v('DespesasCorrentesIntra', COL.liq) ?? v('DespesasIntraOrcamentariasTotal', COL.liq) ?? 0,
    dcIntraRpnp: v('DespesasCorrentesIntra', COL.rpnp) ?? v('DespesasIntraOrcamentariasTotal', COL.rpnp),
    pessoalEmp: v('PessoalEEncargosSociais', COL.emp), pessoalLiq: v('PessoalEEncargosSociais', COL.liq),
    jurosLiq: v('JurosEEncargosDaDivida', COL.liq), outrasLiq: v('OutrasDespesasCorrentes', COL.liq),
    dkDot: v('DespesasDeCapital', COL.dot), dkEmp: v('DespesasDeCapital', COL.emp), dkLiq: v('DespesasDeCapital', COL.liq),
    invDot: v('Investimentos', COL.dot), invEmp: v('Investimentos', COL.emp), invLiq: v('Investimentos', COL.liq),
    amortLiq: v('AmortizacaoDaDivida', COL.liq),
  };
  e.rcTot = soma(e.rc, e.rcIntra);
  e.dcLiqTot = soma(e.dcLiq, e.dcIntraLiq);
  e.dcEmpTot = soma(e.dcEmp, e.dcIntraEmp);
  e.dcRpnpTot = vazio(e.dcRpnp) && vazio(e.dcIntraRpnp)
    ? (vazio(e.dcEmpTot) || vazio(e.dcLiqTot) ? null : e.dcEmpTot - e.dcLiqTot)
    : soma(e.dcRpnp, e.dcIntraRpnp);
  e.resultado = vazio(e.recReal) || vazio(e.emp) ? null : e.recReal - e.emp;
  e.resultadoLiq = vazio(e.recReal) || vazio(e.liq) ? null : e.recReal - e.liq;
  e.poupancaEmp = vazio(e.rcTot) || vazio(e.dcEmpTot) ? null : e.rcTot - e.dcEmpTot;
  e.poupancaLiq = vazio(e.rcTot) || vazio(e.dcLiqTot) ? null : e.rcTot - e.dcLiqTot;
  memoExec.set(d, e);
  return e;
}

/** Demonstrativo de (ano, bimestre): usa a série do Anexo 01, quando carregada, ou os RREO do pacote. */
function demoDe(p, ano, bim) { return p.serie167?.[ano]?.[bim] || p.rreo[ano]?.[bim] || null; }

/**
 * Relação despesas correntes / receitas correntes em 12 meses (CF/88, art. 167-A), pela
 * metodologia do TCE-MG (IN nº 07/2025): despesas liquidadas nos 12 meses + empenhadas e não
 * liquidadas inscritas em RPNP em dezembro; receitas correntes líquidas de deduções;
 * intraorçamentárias dos dois lados.
 */
export function relacao167(p, ano, bim) {
  const at = execucao(demoDe(p, ano, bim));
  if (!at || vazio(at.rcTot) || vazio(at.dcLiqTot)) return null;
  let rc, liq, emp, rpnp, origemRpnp;
  if (bim === 6) {
    rc = at.rcTot; liq = at.dcLiqTot; emp = at.dcEmpTot; rpnp = at.dcRpnpTot; origemRpnp = ano;
  } else {
    const fim = execucao(demoDe(p, ano - 1, 6)), ant = execucao(demoDe(p, ano - 1, bim));
    if (!fim || !ant || vazio(fim.rcTot) || vazio(ant.rcTot)) return null;
    rc = at.rcTot + fim.rcTot - ant.rcTot;
    liq = at.dcLiqTot + fim.dcLiqTot - ant.dcLiqTot;
    emp = at.dcEmpTot + fim.dcEmpTot - ant.dcEmpTot;
    rpnp = fim.dcRpnpTot; origemRpnp = ano - 1;
  }
  if (!rc) return null;
  const dc = liq + (rpnp || 0);
  return { ano, bim, rc, liq, emp, rpnp: rpnp || 0, origemRpnp, dc,
    pct: dc / rc * 100, pctLiq: liq / rc * 100, pctEmp: emp / rc * 100, poupanca: rc - dc };
}

/**
 * Projeção da relação em dezembro, pela sazonalidade do exercício anterior: receitas e despesas
 * liquidadas crescem até o fim do ano na mesma proporção de então, e os RPNP de dezembro mantêm
 * a mesma proporção sobre a despesa liquidada.
 */
export function projecao167(p, ano, bim) {
  if (bim === 6) return null;
  const at = execucao(demoDe(p, ano, bim)), fim = execucao(demoDe(p, ano - 1, 6)), ant = execucao(demoDe(p, ano - 1, bim));
  if (!at || !fim || !ant || !ant.rcTot || !ant.dcLiqTot || !fim.dcLiqTot) return null;
  const rc = at.rcTot * fim.rcTot / ant.rcTot;
  const liq = at.dcLiqTot * fim.dcLiqTot / ant.dcLiqTot;
  const rpnp = liq * (fim.dcRpnpTot || 0) / fim.dcLiqTot;
  const dc = liq + rpnp;
  return { rc, liq, rpnp, dc, pct: dc / rc * 100 };
}

/** Série da relação por bimestre para os três exercícios (requer a série do Anexo 01). */
export function serie167(p) {
  return p.anos.map(ano => ({
    ano,
    pontos: [1, 2, 3, 4, 5, 6].map(b => (ano === p.ano && !p.bimEntregues[ano].includes(b)) ? null : relacao167(p, ano, b)),
  }));
}

// ---------------------------------------------------------------- gestão fiscal (RGF)

const colPeriodo = (periodicidade, periodo) =>
  new RegExp(`^ATE O ${periodo}º ${periodicidade === 'S' ? 'SEMESTRE' : 'QUADRIMESTRE'}`);

export function pessoal(item) {
  if (!item || !item.demo.tem(G1)) return null;
  const d = item.demo;
  const par = cod => ({ valor: d.v(G1, cod, COL.valor), pct: d.v(G1, cod, COL.pctRcl) });
  const dtp = par('DespesaComPessoalTotal');
  const bruta = d.v(G1, 'DespesaComPessoalBruta', COL.doze);
  const naoComputada = d.v(G1, 'DespesaComPessoalNaoComputada', COL.doze);
  return {
    instituicao: item.instituicao, poder: item.poder, periodicidade: item.periodicidade, periodo: item.periodo,
    bruta, naoComputada,
    rcl: d.v(G1, 'ReceitaCorrenteLiquidaLimiteLegal', COL.valor), rclAjustada: d.v(G1, 'ReceitaCorrenteLiquidaAjustada', COL.valor),
    dtp: dtp.valor, pct: dtp.pct,
    maximo: par('LimiteMaximoDespesaComPessoalTotal'), prudencial: par('LimitePrudencialDespesaComPessoalTotal'),
    alerta: par('LimiteDeAlertaDespesaComPessoalTotal'),
  };
}

export function divida(item) {
  if (!item) return null;
  const d = item.demo, col = colPeriodo(item.periodicidade, item.periodo);
  const limitePct = LIMITES.dcl;
  return {
    tem: d.tem(G2),
    dc: d.v(G2, 'DividaConsolidada', col), deducoes: d.v(G2, 'DeducoesDaDividaConsolidada', col),
    dcl: d.v(G2, 'DividaConsolidadaLiquida', col), dclAnterior: d.v(G2, 'DividaConsolidadaLiquida', /^SALDO DO EXERCICIO ANTERIOR/),
    rclAjustada: d.v(G2, 'ReceitaCorrenteLiquidaAjustadaParaCalculoDosLimitesDeEndividamento', col),
    pctDcl: d.v(G2, 'PercentualDaDCLSobreARCL', col), limitePct,
    garantias: d.v(G3, 'TotalGarantiasConcedidas', col), pctGarantias: d.v(G3, 'PercentualDoTotalDasGarantiasSobreARCL', col),
    opCredito: d.v(G4, 'TotalConsideradoParaFinsDaApuracaoDoCumprimentoDoLimiteOperacoesDeCredito', COL.valor),
    pctOpCredito: d.v0(G4, 'TotalConsideradoParaFinsDaApuracaoDoCumprimentoDoLimiteOperacoesDeCredito', COL.pctRcl),
    temG4: d.tem(G4), temG3: d.tem(G3),
  };
}

/** Disponibilidade de caixa por vinculação (RGF Anexo 05 – publicado no último período do exercício). */
export function caixa(item) {
  if (!item || !item.demo.tem(G5)) return null;
  const porConta = new Map();
  for (const l of item.demo.linhas(G5)) {
    if (!porConta.has(l.conta)) porConta.set(l.conta, { conta: l.conta });
    porConta.get(l.conta)[l.cod] = [...l.valores.values()][0];
  }
  const linhas = [...porConta.values()].map(x => ({
    conta: x.conta, total: /^TOTAL/.test(norm(x.conta)),
    bruta: x.DisponibilidadeDeCaixaBruta ?? 0,
    liquida: x.DisponibilidadeDeCaixaLiquida ?? 0,
    rpnp: x.RestosAPagarEmpenhadosENaoLiquidadosDoExercicio ?? 0,
    aposRp: x.DisponibilidadeDeCaixaLiquidaAposRP ?? ((x.DisponibilidadeDeCaixaLiquida ?? 0) - (x.RestosAPagarEmpenhadosENaoLiquidadosDoExercicio ?? 0)),
  }));
  const geral = linhas.find(l => /^TOTAL \(IV\)/.test(norm(l.conta))) || linhas.at(-1);
  return { linhas, geral, negativas: linhas.filter(l => !l.total && l.aposRp < -0.005) };
}

// ---------------------------------------------------------------- demais indicadores do RREO

export function restosAPagar(d) {
  if (!d || !d.tem(A7)) return null;
  const t = (cod, col) => d.v(A7, cod, col, /^TOTAL/);
  const r = {
    rppInscritos: soma(t('RestosAPagarProcessadosENaoProcessadosLiquidadosInscritosEmExerciciosAnteriores', /^EM EXERCICIOS ANTERIORES/),
      t('RestosAPagarProcessadosENaoProcessadosLiquidadosInscritosEmExercicioAnterior', /^EM 31 DE DEZEMBRO/)),
    rppPagos: t('RestosAPagarProcessadosENaoProcessadosLiquidadosPagos', /^PAGOS/),
    rppCancelados: t('RestosAPagarProcessadosENaoProcessadosLiquidadosCancelados', /^CANCELADOS/) ?? 0,
    rppSaldo: t('RestosAPagarProcessadosENaoProcessadosLiquidadosAPagar', /^SALDO/),
    rpnpInscritos: soma(t('RestosAPagarNaoProcessadosInscritosEmExerciciosAnteriores', /^EM EXERCICIOS ANTERIORES/),
      t('RestosAPagarNaoProcessadosInscritosEmExercicioAnterior', /^EM 31 DE DEZEMBRO/)),
    rpnpLiquidados: t('RestosAPagarNaoProcessadosLiquidados', /^LIQUIDADOS/),
    rpnpPagos: t('RestosAPagarNaoProcessadosPagos', /^PAGOS/),
    rpnpCancelados: t('RestosAPagarNaoProcessadosCancelados', /^CANCELADOS/) ?? 0,
    rpnpSaldo: t('RestosAPagarNaoProcessadosAPagar', /^SALDO/),
    saldoTotal: t('SaldoTotal', /^SALDO TOTAL/),
  };
  r.inscritos = soma(r.rppInscritos, r.rpnpInscritos);
  return r;
}

export function resultados(d) {
  if (!d) return {};
  return {
    rcl: d.v(A3, 'RREO3ReceitaCorrenteLiquida', COL.doze),
    rclPessoal: d.v(A3, 'RREO3ReceitaCorrenteLiquidaAjustadaParaCalculoDosLimitesDaDespesaComPessoal', COL.doze),
    rclEndividamento: d.v(A3, 'RREO3ReceitaCorrenteLiquidaAjustadaParaCalculoDosLimitesDeEndividamento', COL.doze),
    primario: d.v(A6, 'ResultadoPrimarioSemRPPSAcimaDaLinha', COL.valor),
    primarioComRpps: d.v(A6, 'ResultadoPrimarioComRPPSAcimaDaLinha', COL.valor),
    nominal: d.v(A6, 'ResultadoNominalAcimaDaLinhaSemRPPS', COL.valor),
    receitaPrimaria: d.v(A6, 'RREO6TotalReceitaPrimaria', /^RECEITAS REALIZADAS/),
    despesaPrimaria: d.v(A6, 'RREO6TotalDespesaPrimaria', /^DESPESAS PAGAS/),
    dcl: d.v(A6, 'DividaConsolidadaLiquida', /^ATE O BIMESTRE/),
    dclAnterior: d.v(A6, 'DividaConsolidadaLiquida', /^EM 31\/12/),
    rppsCapResultado: d.v(A14, 'ResultadoPrevidenciarioRPPSPrevidenciarioDemonstrativoSimplificado', /^ATE O BIMESTRE/),
    rppsCapReceitas: d.v(A14, 'ReceitasPrevidenciariasRealizadasRPPSPrevidenciarioDemonstrativoSimplificado', /^ATE O BIMESTRE/),
    rppsCapDespesas: d.v(A14, 'DespesasPrevidenciariasLiquidadasRPPSPrevidenciarioDemonstrativoSimplificado', /^ATE O BIMESTRE/),
    rppsRepResultado: d.v(A14, 'ResultadoPrevidenciarioRPPSFinanceiroDemonstrativoSimplificado', /^ATE O BIMESTRE/),
    rppsRepReceitas: d.v(A14, 'ReceitasPrevidenciariasRealizadasRPPSFinanceiroDemonstrativoSimplificado', /^ATE O BIMESTRE/),
    rppsRepDespesas: d.v(A14, 'DespesasPrevidenciariasLiquidadasRPPSFinanceiroDemonstrativoSimplificado', /^ATE O BIMESTRE/),
  };
}

export const FUNCOES = ['Legislativa', 'Judiciária', 'Essencial à Justiça', 'Administração', 'Defesa Nacional', 'Segurança Pública',
  'Relações Exteriores', 'Assistência Social', 'Previdência Social', 'Saúde', 'Trabalho', 'Educação', 'Cultura',
  'Direitos da Cidadania', 'Urbanismo', 'Habitação', 'Saneamento', 'Gestão Ambiental', 'Ciência e Tecnologia', 'Agricultura',
  'Organização Agrária', 'Indústria', 'Comércio e Serviços', 'Comunicações', 'Energia', 'Transporte', 'Desporto e Lazer',
  'Encargos Especiais'];
const FUNCOES_NORM = new Map(FUNCOES.map(f => [norm(f), f]));

/** Despesa por função (RREO Anexo 02, exceto intraorçamentárias): { função: {emp, liq} }. */
export function porFuncao(d) {
  const saida = {};
  if (!d || !d.tem(A2)) return saida;
  for (const l of d.linhas(A2)) {
    if (!/EXCETO INTRA/.test(norm(l.rotulo))) continue;
    const f = FUNCOES_NORM.get(norm(l.conta));
    if (!f || saida[f]) continue;
    let emp = null, liq = null;
    for (const [col, valor] of l.valores) {
      if (COL.emp.test(col)) emp = valor;
      else if (COL.liq.test(col)) liq = valor;
    }
    saida[f] = { emp: emp ?? 0, liq: liq ?? 0 };
  }
  return saida;
}

/** Conjunto dos indicadores de um exercício no período/modo de comparação. */
export function indicadores(p, ano, modo = 'periodo') {
  const d = p.demoRREO(ano, modo), bim = p.bimDe(ano, modo);
  const anoRgf = p.anosRGF[p.anos.indexOf(ano)] ?? ano;   // a coluna do RGF pode estar deslocada (ver modelo.js)
  const lista = p.listaRGF(anoRgf, modo);
  const exec = lista.find(x => x.poder === 'E');
  return {
    ano, anoRgf, bim, exec: execucao(d), r167: relacao167(p, ano, bim), ...resultados(d), rp: restosAPagar(d),
    funcoes: porFuncao(d), pessoal: lista.map(pessoal).filter(Boolean), divida: divida(exec), caixa: caixa(exec),
    populacao: d.populacao,
  };
}

// ---------------------------------------------------------------- entregas e prazos

export function entregas(p, ano, hoje = new Date()) {
  const itens = p.extrato[ano] || [];
  const instituicoes = [...new Set((itens.length ? itens : p.extrato[ano - 1] || []).map(e => e.instituicao))];
  const principal = instituicoes.find(i => poderDaInstituicao(i) === 'E') || instituicoes[0];
  const linhas = [];
  const acha = (tipo, inst, periodo) => itens.find(e => e.tipo === tipo && e.instituicao === inst && e.periodo === periodo);
  const registrar = (tipo, inst, periodo, periodicidade, rotulo) => {
    const prazo = prazoEntrega(tipo, ano, periodo, periodicidade);
    const e = acha(tipo, inst, periodo);
    let situacao = 'aguardando';
    if (e) {
      const quando = e.data_status ? new Date(e.data_status) : null;
      const atrasoDias = quando && prazo ? Math.floor((quando - new Date(prazo.getFullYear(), prazo.getMonth(), prazo.getDate(), 23, 59, 59)) / 864e5) : 0;
      situacao = tipo === 'MSC' ? 'entregue' : e.status_relatorio === 'RE' ? 'retificado' : atrasoDias > 0 ? 'fora do prazo' : 'no prazo';
      linhas.push({ tipo, instituicao: inst, periodo, rotulo, prazo, situacao, status: e.status_relatorio, dataStatus: quando, atrasoDias: Math.max(0, atrasoDias) });
    } else {
      if (prazo && hoje > prazo) situacao = 'não entregue';
      linhas.push({ tipo, instituicao: inst, periodo, rotulo, prazo, situacao, status: null, dataStatus: null, atrasoDias: 0 });
    }
  };
  if (principal) {
    for (let b = 1; b <= 6; b++) registrar('RREO', principal, b, 'B', `RREO – ${b}º bimestre`);
    registrar('DCA', principal, 1, 'A', 'DCA – balanço anual');
  }
  for (const inst of instituicoes) {
    const amostra = (itens.find(e => e.tipo === 'RGF' && e.instituicao === inst) || (p.extrato[ano - 1] || []).find(e => e.tipo === 'RGF' && e.instituicao === inst));
    const periodicidade = amostra?.periodicidade || 'Q';
    const n = periodicidade === 'S' ? 2 : 3;
    for (let q = 1; q <= n; q++) registrar('RGF', inst, q, periodicidade, `RGF – ${rotuloPeriodoRGF(periodicidade, q)}`);
    for (let m = 1; m <= 12; m++) registrar('MSC', inst, m, 'M', `MSC – mês ${String(m).padStart(2, '0')}`);
  }
  return linhas;
}

// ---------------------------------------------------------------- apontamentos

export const SEVERIDADES = {
  critico: { rotulo: 'Crítico', icone: '⛔', ordem: 0 },
  alto: { rotulo: 'Alto', icone: '▲', ordem: 1 },
  medio: { rotulo: 'Médio', icone: '◆', ordem: 2 },
  baixo: { rotulo: 'Baixo', icone: '●', ordem: 3 },
  ok: { rotulo: 'Regular', icone: '✓', ordem: 4 },
  nd: { rotulo: 'Sem dados', icone: '○', ordem: 5 },
};

export const GRUPOS = ['Limites constitucionais e legais', 'Equilíbrio orçamentário e financeiro', 'Restos a pagar e caixa',
  'Previdência', 'Transparência e prazos', 'Consistência entre demonstrativos'];

const perRREO = (ano, bim) => `${bim}º bim./${ano}`;

/** Avalia todas as regras e devolve a lista de apontamentos, ordenada por severidade. */
export function apontamentos(p, hoje = new Date()) {
  const lista = [];
  const add = a => lista.push(a);
  const { ano, bim } = p;
  const I = Object.fromEntries(p.anos.map(a => [a, indicadores(p, a, 'periodo')]));
  const F = Object.fromEntries(p.anos.slice(1).map(a => [a, indicadores(p, a, 'fechado')]));   // encerramentos anteriores
  const at = I[ano], ant = I[ano - 1];
  const ultimoAnoMandato = a => a % 4 === 0;   // mandatos municipais: 2024, 2028, …

  // ---- L1: art. 167-A
  {
    const r = at.r167, proj = projecao167(p, ano, bim), rAnt = ant?.r167;
    if (!r) {
      add({ id: 'L1', grupo: GRUPOS[0], titulo: 'Relação despesas correntes / receitas correntes (art. 167-A)', sev: 'nd',
        resultado: 'Não há RREO suficiente no SICONFI para apurar os 12 meses.', fundamento: 'CF/88, art. 167-A; TCE-MG, IN nº 07/2025.' });
    } else {
      let sev = r.pct >= 95 ? 'critico' : r.pct >= 85 ? 'alto' : 'ok';
      let tendencia = null;
      if (proj) {
        tendencia = `Mantida a sazonalidade de ${ano - 1}, a relação projetada para dezembro de ${ano} é de ${pct(proj.pct)}.`;
        if (sev === 'ok' && proj.pct >= 95) sev = 'medio';
        else if (sev === 'ok' && proj.pct >= 85) sev = 'baixo';
      }
      add({ id: 'L1', grupo: GRUPOS[0], titulo: 'Relação despesas correntes / receitas correntes (art. 167-A)', sev,
        resultado: `${pct(r.pct)} nos 12 meses encerrados no ${perRREO(ano, bim)} (despesas correntes de ${moedaCurta(r.dc)} para receitas correntes de ${moedaCurta(r.rc)}).`
          + (rAnt ? ` No mesmo período de ${ano - 1}: ${pct(rAnt.pct)} (${pp(r.pct - rAnt.pct)}).` : ''),
        tendencia, referencia: 'Alerta: 85% (§ 1º) · Limite: 95% (caput)',
        fundamento: 'CF/88, art. 167-A (EC nº 109/2021); TCE-MG, Consulta nº 1.160.617 e Instrução Normativa nº 07/2025.',
        recomendacao: r.pct >= 95
          ? 'Acima de 95%: avaliar a adoção dos mecanismos de ajuste fiscal do art. 167-A (vedação a reajustes, criação de cargos, admissões, concursos, novas despesas obrigatórias, benefícios tributários etc.). Enquanto as medidas não forem adotadas por todos os Poderes e órgãos, ficam vedadas a concessão de garantias por outro ente e a contratação de operações de crédito com outro ente (§ 6º).'
          : r.pct >= 85 ? 'Entre 85% e 95%: as medidas do art. 167-A podem ser adotadas, no todo ou em parte, por ato do Chefe do Executivo com vigência imediata, submetido ao Legislativo em regime de urgência (§§ 1º e 2º). Conter o crescimento das despesas correntes obrigatórias.'
            : 'Manter o acompanhamento bimestral da relação e a declaração exigida pelo § 6º do art. 167-A.',
        metodologia: 'Base móvel de 12 meses com o RREO Anexo 01: despesas correntes liquidadas (inclusive intraorçamentárias) + despesas empenhadas e não liquidadas inscritas em RPNP em dezembro, divididas pelas receitas correntes realizadas, líquidas de deduções (inclusive intraorçamentárias). O SICONFI não detalha a despesa por fonte; por isso não é feita a exclusão das despesas custeadas com superávit financeiro do exercício anterior, admitida pelo TCE-MG – o percentual exibido é conservador.',
        fonte: 'RREO – Anexo 01', aba: 'art167' });
    }
  }

  // ---- L2: despesa com pessoal por poder/órgão
  if (!at.pessoal.length) {
    add({ id: 'L2', grupo: GRUPOS[0], titulo: 'Despesa total com pessoal', sev: 'nd',
      resultado: 'RGF do período de referência não localizado no SICONFI.', fundamento: 'LRF, arts. 19, 20, 22, 23 e 59.' });
  }
  for (const ps of at.pessoal) {
    if (vazio(ps.pct)) continue;
    const anoRGF = p.anosRGF[0];
    const psAnt = ant?.pessoal.find(x => x.instituicao === ps.instituicao);
    const max = ps.maximo.pct, prud = ps.prudencial.pct ?? max * 0.95, alerta = ps.alerta.pct ?? max * 0.9;
    let sev = !vazio(max) && ps.pct > max ? 'critico' : !vazio(prud) && ps.pct > prud ? 'alto' : !vazio(alerta) && ps.pct > alerta ? 'medio' : 'ok';
    let tendencia = null;
    if (psAnt && !vazio(psAnt.pct)) {
      const deriva = ps.pct - psAnt.pct, projetado = ps.pct + deriva;
      const crescDtp = variacao(ps.dtp, psAnt.dtp), crescRcl = variacao(ps.rclAjustada, psAnt.rclAjustada);
      tendencia = `Em 12 meses o percentual variou ${pp(deriva)} (despesa ${pctVariacao(crescDtp)}; RCL ajustada ${pctVariacao(crescRcl)}).`;
      if (deriva > 0 && !vazio(max)) {
        const proximo = projetado > max ? 'o limite máximo' : projetado > prud ? 'o limite prudencial' : projetado > alerta ? 'o limite de alerta' : null;
        if (proximo && ((projetado > max && ps.pct <= max) || (projetado > prud && ps.pct <= prud) || (projetado > alerta && ps.pct <= alerta))) {
          tendencia += ` Mantido esse ritmo, ultrapassará ${proximo} em até 12 meses (projeção: ${pct(projetado)}).`;
          if (sev === 'ok') sev = 'baixo';
        }
      }
    }
    add({ id: 'L2-' + ps.poder, grupo: GRUPOS[0], titulo: `Despesa total com pessoal – ${ps.instituicao}`, sev,
      resultado: `${pct(ps.pct)} da RCL ajustada no ${rotuloPeriodoRGF(ps.periodicidade, ps.periodo)} de ${anoRGF} (${moedaCurta(ps.dtp)}).`,
      tendencia, referencia: `Alerta: ${pct(alerta)} · Prudencial: ${pct(prud)} · Máximo: ${pct(max)}`,
      fundamento: 'LRF, arts. 19, 20, 22, parágrafo único, 23 e 59, § 1º, II; CF/88, art. 169.',
      recomendacao: sev === 'critico' ? 'Eliminar o excedente nos dois quadrimestres seguintes, pelo menos um terço no primeiro (LRF, art. 23), sob pena de vedação a transferências voluntárias, garantias e operações de crédito (§ 3º). Aplicam-se desde já as vedações do art. 22.'
        : sev === 'alto' ? 'Acima do limite prudencial aplicam-se as vedações do art. 22, parágrafo único, da LRF (vantagens, aumentos, criação de cargos, admissões, horas extras).'
          : sev === 'medio' ? 'Acima de 90% do limite o Tribunal de Contas emite alerta (LRF, art. 59, § 1º, II). Revisar a trajetória da folha antes de novos atos que aumentem a despesa.'
            : 'Dentro dos limites. Acompanhar a evolução a cada quadrimestre.',
      fonte: 'RGF – Anexo 01', aba: 'pessoal' });
  }

  // ---- L3 a L5: dívida, operações de crédito e garantias
  {
    const dv = at.divida, anoRGF = p.anosRGF[0];
    if (dv && dv.tem && !vazio(dv.pctDcl)) {
      const lim = dv.limitePct;
      const sev = dv.pctDcl > lim ? 'critico' : dv.pctDcl > lim * 0.9 ? 'medio' : 'ok';
      add({ id: 'L3', grupo: GRUPOS[0], titulo: 'Dívida consolidada líquida', sev,
        resultado: `${pct(dv.pctDcl)} da RCL ajustada (${moedaCurta(dv.dcl)}) em ${anoRGF}.` + (dv.dcl < 0 ? ' As disponibilidades superam a dívida consolidada.' : ''),
        referencia: `Alerta: ${pct(lim * 0.9)} · Limite: ${pct(lim)}`,
        fundamento: 'Resolução do Senado Federal nº 40/2001, art. 3º; LRF, arts. 31 e 59, § 1º, III.',
        recomendacao: sev === 'critico' ? 'Reconduzir a dívida ao limite em até três quadrimestres, com redução de pelo menos 25% no primeiro (LRF, art. 31); enquanto perdurar o excesso, fica vedada a contratação de operações de crédito.' : 'Sem providências além do acompanhamento.',
        fonte: 'RGF – Anexo 02', aba: 'divida' });
    }
    if (dv && dv.temG4) {
      const sev = dv.pctOpCredito > LIMITES.operacoesCredito ? 'critico' : dv.pctOpCredito > LIMITES.operacoesCredito * 0.9 ? 'medio' : 'ok';
      add({ id: 'L4', grupo: GRUPOS[0], titulo: 'Operações de crédito no exercício', sev,
        resultado: `${pct(dv.pctOpCredito)} da RCL ajustada (${moedaCurta(dv.opCredito ?? 0)}) em ${anoRGF}.`,
        referencia: `Alerta: ${pct(LIMITES.operacoesCredito * 0.9)} · Limite: ${pct(LIMITES.operacoesCredito)}`,
        fundamento: 'Resolução do Senado Federal nº 43/2001, art. 7º, I; LRF, art. 32.',
        recomendacao: sev === 'ok' ? 'Sem providências além do acompanhamento.' : 'Rever o cronograma de contratações e liberações para respeitar o limite anual.',
        fonte: 'RGF – Anexo 04', aba: 'divida' });
    }
    if (dv && dv.temG3 && !vazio(dv.pctGarantias)) {
      const sev = dv.pctGarantias > LIMITES.garantias ? 'critico' : dv.pctGarantias > LIMITES.garantias * 0.9 ? 'medio' : 'ok';
      add({ id: 'L5', grupo: GRUPOS[0], titulo: 'Garantias concedidas', sev,
        resultado: `${pct(dv.pctGarantias)} da RCL ajustada em ${anoRGF}.`, referencia: `Limite: ${pct(LIMITES.garantias)}`,
        fundamento: 'Resolução do Senado Federal nº 43/2001, art. 9º; LRF, art. 40.', recomendacao: 'Sem providências além do acompanhamento.',
        fonte: 'RGF – Anexo 03', aba: 'divida' });
    }
  }

  // ---- L6: regra de ouro
  {
    const e = at.exec;
    if (e && !vazio(e.dkEmp)) {
      const excede = e.opCred > e.dkEmp + 0.005;
      add({ id: 'L6', grupo: GRUPOS[0], titulo: 'Regra de ouro – operações de crédito × despesas de capital', sev: excede ? (bim === 6 ? 'critico' : 'alto') : 'ok',
        resultado: `Operações de crédito realizadas: ${moedaCurta(e.opCred)}; despesas de capital empenhadas: ${moedaCurta(e.dkEmp)} (até o ${perRREO(ano, bim)}).`,
        fundamento: 'CF/88, art. 167, III; LRF, art. 53, § 1º, I.',
        recomendacao: excede ? 'As operações de crédito não podem superar as despesas de capital do exercício, salvo créditos suplementares ou especiais com finalidade precisa aprovados por maioria absoluta.' : 'Sem providências.',
        fonte: 'RREO – Anexo 01', aba: 'despesas' });
    }
  }

  // ---- E1: resultado da execução orçamentária
  {
    const e = at.exec;
    if (e && !vazio(e.resultado)) {
      // No encerramento vale a despesa empenhada; durante o exercício os empenhos globais e por estimativa
      // antecipam despesa do ano inteiro, então a severidade considera a despesa liquidada.
      const fechado = bim === 6;
      const base = fechado ? e.resultado : e.resultadoLiq;
      let sev = 'ok';
      let texto = `Até o ${perRREO(ano, bim)}: receitas realizadas de ${moedaCurta(e.recReal)}; despesas empenhadas de ${moedaCurta(e.emp)} e liquidadas de ${moedaCurta(e.liq)}. `
        + `Resultado sobre a despesa empenhada: ${moedaCurta(e.resultado)}` + (fechado ? '.' : `; sobre a liquidada: ${moedaCurta(e.resultadoLiq)}.`);
      if (base < 0) {
        const descoberto = -base - (e.superavitFin || 0);
        sev = descoberto > 0 ? (fechado ? 'alto' : 'medio') : 'baixo';
        texto += ` Superávit financeiro de exercícios anteriores utilizado em créditos adicionais: ${moedaCurta(e.superavitFin)}.`
          + (descoberto > 0 ? ` Parcela do déficit sem essa cobertura: ${moedaCurta(descoberto)}.` : '');
      } else if (!fechado && e.resultado < 0 && -e.resultado > (e.superavitFin || 0)) {
        sev = 'baixo';
        texto += ` Os empenhos ainda não liquidados superam a folga de arrecadação; superávit financeiro utilizado: ${moedaCurta(e.superavitFin)}.`;
      }
      const fechadoAnt = F[ano - 1]?.exec;
      add({ id: 'E1', grupo: GRUPOS[1], titulo: 'Resultado da execução orçamentária', sev, resultado: texto,
        tendencia: fechadoAnt && !vazio(fechadoAnt.resultado) ? `O exercício de ${ano - 1} encerrou com ${fechadoAnt.resultado >= 0 ? 'superávit' : 'déficit'} de execução de ${moedaCurta(Math.abs(fechadoAnt.resultado))} (receita realizada − despesa empenhada).` : null,
        fundamento: 'Lei nº 4.320/1964, art. 48, "b"; LRF, arts. 1º, § 1º, e 9º.',
        recomendacao: sev === 'ok' ? 'Sem providências.' : 'Déficit de execução não amparado por superávit financeiro do exercício anterior exige limitação de empenho e movimentação financeira (LRF, art. 9º) e é apontado na prestação de contas. Durante o exercício, acompanhar o saldo de empenhos a liquidar frente à arrecadação esperada.',
        fonte: 'RREO – Anexo 01', aba: 'despesas' });
      const poupanca = fechado ? e.poupancaEmp : e.poupancaLiq;
      if (!vazio(poupanca) && poupanca < 0) {
        add({ id: 'E1b', grupo: GRUPOS[1], titulo: 'Poupança corrente negativa', sev: 'alto',
          resultado: `As despesas correntes ${fechado ? 'empenhadas' : 'liquidadas'} superam as receitas correntes do período em ${moedaCurta(-poupanca)}: o custeio está sendo financiado por receitas de capital ou por saldos de exercícios anteriores.`,
          fundamento: 'LRF, art. 1º, § 1º, e art. 44; CF/88, art. 167-A.', recomendacao: 'Readequar as despesas correntes à capacidade de arrecadação corrente.',
          fonte: 'RREO – Anexo 01', aba: 'art167' });
      }
    }
  }

  // ---- E2: ritmo de arrecadação
  {
    const e = at.exec, fim = F[ano - 1]?.exec, mesmo = ant?.exec;
    if (e && !vazio(e.rc) && !vazio(e.rcPrev) && e.rcPrev > 0) {
      let proj = null;
      if (bim === 6) proj = e.rc;
      else if (fim && mesmo && mesmo.rc > 0) proj = e.rc * fim.rc / mesmo.rc;
      if (proj !== null) {
        const realiz = proj / e.rcPrev * 100;
        const sev = realiz < 90 ? 'alto' : realiz < 95 ? 'medio' : 'ok';
        add({ id: 'E2', grupo: GRUPOS[1], titulo: 'Arrecadação das receitas correntes frente à previsão', sev,
          resultado: `Realizado até o ${perRREO(ano, bim)}: ${moedaCurta(e.rc)} (${pct(razao(e.rc, e.rcPrev), 1)} da previsão atualizada de ${moedaCurta(e.rcPrev)}).`,
          tendencia: bim === 6 ? null : `Projeção para o encerramento, pela sazonalidade de ${ano - 1}: ${moedaCurta(proj)} (${pct(realiz, 1)} da previsão).`,
          fundamento: 'LRF, arts. 9º, 12 e 13.',
          recomendacao: sev === 'ok' ? 'Sem providências.' : 'Tendência de frustração de receita: promover limitação de empenho e movimentação financeira nos 30 dias subsequentes ao bimestre (LRF, art. 9º) e evitar a abertura de créditos por excesso de arrecadação.',
          fonte: 'RREO – Anexo 01', aba: 'receitas' });
      }
    }
    // E3: superestimativa de receitas de capital
    const hist = p.anos.slice(1).map(a => F[a]?.exec).filter(x => x && x.rkPrev > 0);
    const baixas = hist.filter(x => razao(x.rk, x.rkPrev) < 50);
    if (e && e.rkPrev > 0) {
      const realizAtual = razao(e.rk, e.rkPrev);
      const esperado = bim / 6 * 100;
      let sev = 'ok';
      if (baixas.length && realizAtual < esperado * 0.5) sev = 'medio';
      else if (realizAtual < esperado * 0.25 && bim >= 3) sev = 'baixo';
      if (sev !== 'ok' || baixas.length) {
        add({ id: 'E3', grupo: GRUPOS[1], titulo: 'Previsão de receitas de capital com baixa realização', sev: sev === 'ok' ? 'baixo' : sev,
          resultado: `Receitas de capital realizadas até o ${perRREO(ano, bim)}: ${moedaCurta(e.rk)} de ${moedaCurta(e.rkPrev)} previstos (${pct(realizAtual, 1)}).`
            + (e.opCredPrev > 0 ? ` Operações de crédito previstas: ${moedaCurta(e.opCredPrev)}; realizadas: ${moedaCurta(e.opCred)}.` : ''),
          tendencia: baixas.length ? `Realização no encerramento dos exercícios anteriores: ${p.anos.slice(1).map(a => F[a]?.exec && F[a].exec.rkPrev > 0 ? `${a}: ${pct(razao(F[a].exec.rk, F[a].exec.rkPrev), 1)}` : null).filter(Boolean).join('; ')}.` : null,
          fundamento: 'LRF, art. 12; Lei nº 4.320/1964, arts. 29 e 30.',
          recomendacao: 'Previsões de capital sem lastro inflam o orçamento e dão suporte aparente a dotações sem recurso. Ajustar a previsão à efetiva capacidade de captação e condicionar o empenho ao ingresso do recurso.',
          fonte: 'RREO – Anexo 01', aba: 'receitas' });
      }
    }
  }

  // ---- E4: resultado primário
  if (!vazio(at.primario)) {
    add({ id: 'E4', grupo: GRUPOS[1], titulo: 'Resultado primário (acima da linha, sem RPPS)', sev: at.primario < 0 ? 'baixo' : 'ok',
      resultado: `${at.primario < 0 ? 'Déficit' : 'Superávit'} primário de ${moedaCurta(Math.abs(at.primario))} até o ${perRREO(ano, bim)}.`
        + (!vazio(ant?.primario) ? ` No mesmo período de ${ano - 1}: ${moedaCurta(ant.primario)}.` : ''),
      fundamento: 'LRF, arts. 4º, § 1º, 9º e 53, III.',
      recomendacao: 'Confrontar com a meta de resultado primário do Anexo de Metas Fiscais da LDO (a meta não é publicada na API do SICONFI). O descumprimento da meta exige limitação de empenho (LRF, art. 9º).',
      fonte: 'RREO – Anexo 06', aba: 'resultados' });
  }

  // ---- R1/R2: restos a pagar
  {
    const rp = at.rp, rpAnt = ant?.rp;
    if (rp) {
      if (rp.rppCancelados > 0.005) {
        const prop = razao(rp.rppCancelados, rp.rppInscritos);
        add({ id: 'R1', grupo: GRUPOS[2], titulo: 'Cancelamento de restos a pagar processados', sev: prop > 5 ? 'alto' : 'medio',
          resultado: `${moedaCurta(rp.rppCancelados)} cancelados até o ${perRREO(ano, bim)} (${pct(prop, 1)} do saldo inscrito).`,
          fundamento: 'Lei nº 4.320/1964, arts. 36, 37 e 63; LRF, art. 50.',
          recomendacao: 'Restos a pagar processados correspondem a despesas já liquidadas (direito adquirido do credor). O cancelamento só se justifica por prescrição, erro de inscrição ou duplicidade e deve estar documentado; é item recorrente de apontamento nas prestações de contas.',
          fonte: 'RREO – Anexo 07', aba: 'caixa' });
      }
      if (rpAnt && !vazio(rp.inscritos) && rpAnt.inscritos > 0) {
        const cresc = variacao(rp.inscritos, rpAnt.inscritos);
        add({ id: 'R2', grupo: GRUPOS[2], titulo: 'Estoque de restos a pagar', sev: cresc > 30 ? 'medio' : cresc > 15 ? 'baixo' : 'ok',
          resultado: `Restos a pagar inscritos (processados e não processados): ${moedaCurta(rp.inscritos)} em ${ano}, contra ${moedaCurta(rpAnt.inscritos)} em ${ano - 1} (${pctVariacao(cresc)}). Saldo a pagar no ${perRREO(ano, bim)}: ${moedaCurta(rp.saldoTotal)}.`,
          fundamento: 'LRF, arts. 1º, § 1º, 42 e 55, III, "b".',
          recomendacao: cresc > 15 ? 'O crescimento do estoque pressiona o caixa dos exercícios seguintes. Rever empenhos sem perspectiva de liquidação e priorizar o pagamento dos processados.' : 'Sem providências além do acompanhamento.',
          fonte: 'RREO – Anexo 07', aba: 'caixa' });
      }
    }
    // R3: caixa por vinculação (último RGF de encerramento disponível)
    const comCaixa = [at, F[ano - 1], F[ano - 2]].find(x => x?.caixa);
    const cx = comCaixa?.caixa, anoCx = comCaixa?.anoRgf;
    if (cx) {
      const neg = cx.negativas, mandato = ultimoAnoMandato(anoCx);
      const sev = neg.length ? (mandato || neg.some(n => /NAO VINCULADOS/.test(norm(n.conta))) ? 'critico' : 'alto') : 'ok';
      add({ id: 'R3', grupo: GRUPOS[2], titulo: `Disponibilidade de caixa por vinculação – encerramento de ${anoCx}`, sev,
        resultado: neg.length
          ? `Insuficiência financeira após a inscrição em restos a pagar não processados em ${neg.length} vinculação(ões): ${neg.slice(0, 4).map(n => `${n.conta} (${moedaCurta(n.aposRp)})`).join('; ')}${neg.length > 4 ? '…' : ''}.`
          : `Todas as vinculações apresentam disponibilidade líquida suficiente. Total: ${moedaCurta(cx.geral?.aposRp)}.`,
        tendencia: ultimoAnoMandato(ano) && anoCx !== ano ? `${ano} é o último ano de mandato: as obrigações contraídas nos dois últimos quadrimestres precisam de disponibilidade de caixa em 31/12 (LRF, art. 42).`
          : mandato ? `${anoCx} foi o último ano de mandato (LRF, art. 42).` : null,
        fundamento: 'LRF, arts. 8º, parágrafo único, 42, 50, I, e 55, III; Lei nº 4.320/1964, art. 43.',
        recomendacao: neg.length ? 'Fonte com disponibilidade líquida negativa indica despesa sem lastro financeiro. Recompor a vinculação, cancelar empenhos não liquidados sem cobertura e limitar novos empenhos na fonte.' : 'Sem providências.',
        fonte: 'RGF – Anexo 05', aba: 'caixa' });
    }
  }

  // ---- P1: RPPS (fundo em capitalização e fundo em repartição)
  {
    const fundos = [['Fundo em capitalização (plano previdenciário)', at.rppsCapResultado, ant?.rppsCapResultado, 'medio'],
      ['Fundo em repartição (plano financeiro)', at.rppsRepResultado, ant?.rppsRepResultado, 'baixo']].filter(f => !vazio(f[1]));
    if (fundos.length) {
      const negativos = fundos.filter(f => f[1] < 0);
      const sev = negativos.some(f => f[3] === 'medio') ? 'medio' : negativos.length ? 'baixo' : 'ok';
      add({ id: 'P1', grupo: GRUPOS[3], titulo: 'Resultado previdenciário do RPPS', sev,
        resultado: fundos.map(([nome, v, vAnt]) => `${nome}: ${v < 0 ? 'déficit' : 'superávit'} de ${moedaCurta(Math.abs(v))} até o ${perRREO(ano, bim)}`
          + (!vazio(vAnt) ? ` (${moedaCurta(vAnt)} no mesmo período de ${ano - 1})` : '')).join('. ') + '.',
        fundamento: 'CF/88, art. 40; LRF, arts. 53, II, e 69; Lei nº 9.717/1998.',
        recomendacao: negativos.length ? 'O déficit do fundo em repartição é coberto por aportes do Tesouro e pressiona a despesa com pessoal; o do fundo em capitalização compromete a solvência do regime. Acompanhar a avaliação atuarial e o plano de amortização do déficit.' : 'Sem providências além do acompanhamento atuarial.',
        fonte: 'RREO – Anexos 04 e 14', aba: 'resultados' });
    }
  }

  // ---- D1: patrimônio líquido negativo no último balanço
  {
    const anoBal = p.anosDCA.find(a => p.dca[a] && !p.dca[a].vazio), bal = p.dca[anoBal];
    const pl = bal?.v('DCA-Anexo I-AB', 'P2.3.0.0.0.00.00', /^31\/12/), ativo = bal?.v('DCA-Anexo I-AB', 'P1.0.0.0.0.00.00', /^31\/12/);
    if (!vazio(pl) && pl < 0) {
      add({ id: 'D1', grupo: GRUPOS[1], titulo: `Passivo a descoberto no balanço de ${anoBal}`, sev: 'medio',
        resultado: `Patrimônio líquido negativo de ${moedaCurta(pl)} em 31/12/${anoBal} (ativo total de ${moedaCurta(ativo)}).`,
        fundamento: 'Lei nº 4.320/1964, arts. 104 e 105; LRF, art. 50; MCASP.',
        recomendacao: 'Verificar a origem do aumento do passivo (em geral, provisões matemáticas previdenciárias ou precatórios) e a evidenciação em notas explicativas.',
        fonte: 'DCA – Anexo I-AB', aba: 'dca' });
    }
  }

  // ---- T1/T2: entregas e prazos
  {
    const linhas = entregas(p, ano, hoje);
    const faltas = linhas.filter(l => l.situacao === 'não entregue');
    const faltasDemonstrativos = faltas.filter(l => l.tipo !== 'MSC');
    const faltasMSC = faltas.filter(l => l.tipo === 'MSC');
    // DCA do exercício anterior
    const dcaAnt = entregas(p, ano - 1, hoje).find(l => l.tipo === 'DCA');
    if (dcaAnt && dcaAnt.situacao === 'não entregue') faltasDemonstrativos.push({ ...dcaAnt, rotulo: `DCA de ${ano - 1}` });
    if (faltasDemonstrativos.length) {
      add({ id: 'T1', grupo: GRUPOS[4], titulo: 'Demonstrativos fiscais não entregues no prazo', sev: 'critico',
        resultado: `${faltasDemonstrativos.length} entrega(s) vencida(s) sem registro no SICONFI: ${faltasDemonstrativos.slice(0, 6).map(l => `${l.rotulo}${l.tipo === 'RGF' ? ' (' + l.instituicao + ')' : ''}, prazo ${data(l.prazo)}`).join('; ')}${faltasDemonstrativos.length > 6 ? '…' : ''}.`,
        fundamento: 'LRF, arts. 51, § 2º, 52, § 2º, e 55, § 3º; CF/88, art. 163-A.',
        recomendacao: 'Enquanto não regularizado o envio, o Município fica impedido de receber transferências voluntárias e de contratar operações de crédito (exceto refinanciamento do principal da dívida mobiliária).',
        fonte: 'Extrato de entregas', aba: 'entregas' });
    } else {
      add({ id: 'T1', grupo: GRUPOS[4], titulo: 'Entrega do RREO, do RGF e da DCA', sev: 'ok',
        resultado: `Não há RREO, RGF ou DCA com prazo vencido sem registro no SICONFI em ${ano}.`,
        fundamento: 'LRF, arts. 51, 52 e 55.', recomendacao: 'Sem providências.', fonte: 'Extrato de entregas', aba: 'entregas' });
    }
    if (faltasMSC.length) {
      add({ id: 'T2', grupo: GRUPOS[4], titulo: 'Matriz de Saldos Contábeis pendente', sev: 'medio',
        resultado: `${faltasMSC.length} MSC mensal(is) com prazo vencido sem registro: ${faltasMSC.slice(0, 6).map(l => `${String(l.periodo).padStart(2, '0')}/${ano} (${l.instituicao})`).join('; ')}${faltasMSC.length > 6 ? '…' : ''}.`,
        fundamento: 'CF/88, art. 163-A; LRF, art. 48, § 2º; Portaria STN nº 642/2019.',
        recomendacao: 'A MSC deve ser enviada até o último dia do mês seguinte ao de referência; a pendência repercute no CAUC e no ranking da qualidade da informação contábil.',
        fonte: 'Extrato de entregas', aba: 'entregas' });
    }
    const foraPrazo = linhas.filter(l => l.situacao === 'fora do prazo' && l.tipo !== 'MSC');
    const retificados = linhas.filter(l => l.situacao === 'retificado');
    if (foraPrazo.length || retificados.length) {
      add({ id: 'T3', grupo: GRUPOS[4], titulo: 'Homologações após o prazo e retificações', sev: foraPrazo.length ? 'medio' : 'baixo',
        resultado: [foraPrazo.length ? `${foraPrazo.length} demonstrativo(s) com último status posterior ao prazo legal (${foraPrazo.slice(0, 4).map(l => `${l.rotulo}: ${data(l.dataStatus)}`).join('; ')})` : null,
          retificados.length ? `${retificados.length} demonstrativo(s) retificado(s) em ${ano}` : null].filter(Boolean).join('. ') + '.',
        fundamento: 'LRF, arts. 48, 52 e 55; Lei nº 10.028/2000, art. 5º, I.',
        recomendacao: 'A API informa apenas a data do último status; confirme no SICONFI se a primeira homologação ocorreu no prazo. Retificações frequentes indicam fragilidade no fechamento contábil.',
        fonte: 'Extrato de entregas', aba: 'entregas' });
    }
  }

  // ---- C1 a C3: consistência entre demonstrativos
  {
    const tol = (a, b) => Math.abs(a - b) > Math.max(1, Math.abs(b) * 0.001);
    const exec = p.listaRGF(ano, 'periodo').find(x => x.poder === 'E');
    const mesmoPeriodo = exec && p.anosRGF[0] === ano && bim * 2 === p.mesRGF;
    if (mesmoPeriodo) {
      const rclRgf = exec.demo.v(G1, 'ReceitaCorrenteLiquidaLimiteLegal', COL.valor);
      if (!vazio(rclRgf) && !vazio(at.rcl)) {
        const dif = tol(at.rcl, rclRgf);
        add({ id: 'C1', grupo: GRUPOS[5], titulo: 'RCL: RREO × RGF', sev: dif ? 'medio' : 'ok',
          resultado: `RCL no RREO Anexo 03: ${moeda(at.rcl)}; no RGF Anexo 01: ${moeda(rclRgf)}${dif ? ` (diferença de ${moeda(at.rcl - rclRgf)})` : ''}.`,
          fundamento: 'LRF, arts. 2º, IV, 48 e 50; MDF/STN.', recomendacao: dif ? 'Divergência entre demonstrativos do mesmo período compromete a apuração dos limites; retificar o demonstrativo incorreto.' : 'Valores coincidentes.',
          fonte: 'RREO – Anexo 03; RGF – Anexo 01', aba: 'rcl' });
      }
      const dv = at.divida;
      if (dv && !vazio(dv.dcl) && !vazio(at.dcl)) {
        const dif = tol(at.dcl, dv.dcl);
        add({ id: 'C2', grupo: GRUPOS[5], titulo: 'Dívida consolidada líquida: RREO × RGF', sev: dif ? 'medio' : 'ok',
          resultado: `DCL no RREO Anexo 06: ${moeda(at.dcl)}; no RGF Anexo 02: ${moeda(dv.dcl)}${dif ? ` (diferença de ${moeda(at.dcl - dv.dcl)})` : ''}.`,
          fundamento: 'LRF, arts. 48, 50, 53 e 55; MDF/STN.', recomendacao: dif ? 'Conciliar os saldos da dívida e das deduções entre os dois demonstrativos.' : 'Valores coincidentes.',
          fonte: 'RREO – Anexo 06; RGF – Anexo 02', aba: 'divida' });
      }
    }
    // C4: RCL do RREO apurada com menos de 12 meses preenchidos (erro de declaração que distorce todos os limites)
    const incompletos = p.anos.map(a => {
      const d = p.demoRREO(a, 'periodo');
      const linhaRcl = d.linhas(A3).find(l => l.cod === 'RREO3ReceitaCorrenteLiquida');
      if (!linhaRcl) return null;
      const meses = [...linhaRcl.valores.keys()].filter(c => /^<MR/.test(c)).length;
      return meses < 12 ? { ano: a, meses, rcl: d.v(A3, 'RREO3ReceitaCorrenteLiquida', COL.doze) } : null;
    }).filter(Boolean);
    if (incompletos.length) {
      add({ id: 'C4', grupo: GRUPOS[5], titulo: 'RCL declarada com menos de 12 meses', sev: incompletos.some(x => x.ano === ano) ? 'alto' : 'medio',
        resultado: incompletos.map(x => `${perRREO(x.ano, p.bim)}: apenas ${x.meses} mês(es) preenchido(s) no RREO Anexo 03, RCL de ${moedaCurta(x.rcl)}`).join('; ')
          + '. Os percentuais de pessoal e de dívida calculados sobre essa RCL ficam distorcidos e a comparação entre exercícios fica prejudicada.',
        fundamento: 'LRF, arts. 2º, IV e § 3º, e 53, I; MDF/STN.',
        recomendacao: 'A RCL deve somar o mês de referência e os onze anteriores. Retificar o demonstrativo no SICONFI; enquanto isso, prefira o modo "Anteriores encerrados" para comparar.',
        fonte: 'RREO – Anexo 03', aba: 'rcl' });
    }

    const anoDca = p.anosDCA[0], dca = p.dca[anoDca], fecha = p.rreo[anoDca]?.[6];
    if (dca && !dca.vazio && fecha && fecha.tem(A1)) {
      const empDca = dca.v('DCA-Anexo I-D', 'TotalDespesas', /^DESPESAS EMPENHADAS/, /^TOTAL GERAL/);
      const empRreo = execucao(fecha)?.emp;
      if (!vazio(empDca) && !vazio(empRreo)) {
        const dif = tol(empDca, empRreo);
        add({ id: 'C3', grupo: GRUPOS[5], titulo: `Despesa empenhada de ${anoDca}: DCA × RREO do 6º bimestre`, sev: dif ? 'medio' : 'ok',
          resultado: `DCA: ${moeda(empDca)}; RREO Anexo 01: ${moeda(empRreo)}${dif ? ` (diferença de ${moeda(empDca - empRreo)})` : ''}.`,
          fundamento: 'LRF, arts. 50 e 51; Lei nº 4.320/1964, art. 101.',
          recomendacao: dif ? 'A despesa do balanço anual deve coincidir com a do RREO de encerramento; verificar ajustes posteriores ao 6º bimestre e retificar o demonstrativo divergente.' : 'Valores coincidentes.',
          fonte: 'DCA – Anexo I-D; RREO – Anexo 01', aba: 'dca' });
      }
    }
  }

  lista.sort((a, b) => SEVERIDADES[a.sev].ordem - SEVERIDADES[b.sev].ordem || GRUPOS.indexOf(a.grupo) - GRUPOS.indexOf(b.grupo));
  return lista;
}

export function contagemSeveridades(lista) {
  const c = Object.fromEntries(Object.keys(SEVERIDADES).map(k => [k, 0]));
  lista.forEach(a => c[a.sev]++);
  return c;
}

export { BIMESTRES, NOME_PODER };
