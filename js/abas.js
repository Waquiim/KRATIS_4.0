// Abas do painel. Cada aba recebe o elemento de conteúdo e o contexto { p, estado, ir, redesenhar }.

import { consultar } from './api.js';
import { MESES, BIMESTRES, NOME_PODER, rotuloPeriodoRGF, norm } from './modelo.js';
import {
  A1, A3, A6, COL, LIMITES, FUNCOES, SEVERIDADES, GRUPOS,
  indicadores, apontamentos, contagemSeveridades, relacao167, projecao167, serie167, entregas, execucao,
} from './analise.js';
import { moeda, moedaCurta, pct, pp, numero, variacao, pctVariacao, data, dataHora, vazio, esc } from './formato.js';
import { selo, cartao, medidor, tabelaComparativa, linhasDoAnexo, graficoBarras, graficoLinhas, aviso, secao, CORES_SERIE } from './ui.js';

export const ABAS = [
  { id: 'visao', nome: 'Visão geral' },
  { id: 'apontamentos', nome: 'Apontamentos TCE-MG' },
  { id: 'art167', nome: 'Art. 167-A' },
  { id: 'receitas', nome: 'Receitas' },
  { id: 'despesas', nome: 'Despesas' },
  { id: 'rcl', nome: 'RCL' },
  { id: 'pessoal', nome: 'Pessoal' },
  { id: 'divida', nome: 'Dívida e crédito' },
  { id: 'caixa', nome: 'Caixa e restos a pagar' },
  { id: 'resultados', nome: 'Resultados e previdência' },
  { id: 'dca', nome: 'Balanço anual' },
  { id: 'msc', nome: 'Matriz de saldos' },
  { id: 'entregas', nome: 'Entregas e prazos' },
  { id: 'explorador', nome: 'Explorador' },
  { id: 'sobre', nome: 'Metodologia' },
];

// ---------------------------------------------------------------- utilitários das abas

const tres = (p, modo) => p.anos.map(a => indicadores(p, a, modo));

function cabRREO(p, modo) {
  return p.anos.map(a => ({ titulo: String(a), sub: p.semRREO && a === p.ano ? 'sem RREO' : `até o ${p.bimDe(a, modo)}º bim.` }));
}
function cabRGF(p, modo) {
  return p.anosRGF.map((a, i) => {
    const mes = modo === 'fechado' && i > 0 ? 12 : p.mesRGF;
    return { titulo: String(a), sub: `até ${MESES[mes - 1]}.` };
  });
}
const cabDCA = p => p.anosDCA.map(a => ({ titulo: String(a), sub: '31/12' }));
const rot = p => p.anos.map(String);

function notaModo(p, modo) {
  return modo === 'fechado'
    ? `Comparação: ${p.ano} até o ${p.bim}º bimestre × exercícios anteriores encerrados (6º bimestre).`
    : `Comparação no mesmo período: acumulado até o ${p.bim}º bimestre de cada exercício.`;
}

const linha = (rotulo, valores, extra = {}) => ({ rotulo, valores, ...extra });
const col3 = (lista, fn) => lista.map(x => { try { return fn(x); } catch { return null; } });

function baixarCSV(nome, cabecalho, linhas) {
  const cel = v => { const s = v === null || v === undefined ? '' : typeof v === 'number' ? String(v).replace('.', ',') : String(v); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const texto = '﻿' + [cabecalho, ...linhas].map(l => l.map(cel).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nome });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------- visão geral

function visao(el, { p, estado }) {
  const m = estado.modo, [a, b, c] = tres(p, m), r = rot(p);
  const aps = apontamentos(p), cont = contagemSeveridades(aps);
  const sevDe = id => aps.find(x => x.id === id)?.sev || null;
  const pes = i => i.pessoal.find(x => x.poder === 'E');
  const cartoes = [
    cartao({ titulo: 'Despesa corrente / receita corrente (art. 167-A)', tipo: 'pct', valores: [a.r167?.pct, b.r167?.pct, c.r167?.pct], rotulos: r, sev: sevDe('L1'), nota: '12 meses · alerta 85% · limite 95%', aba: 'art167' }),
    cartao({ titulo: 'Receita realizada', valores: [a.exec?.recReal, b.exec?.recReal, c.exec?.recReal], rotulos: r, sev: sevDe('E2'), nota: a.exec ? `${pct(a.exec.recReal / a.exec.recPrev * 100, 1)} da previsão atualizada` : '', aba: 'receitas' }),
    cartao({ titulo: 'Despesa empenhada', valores: [a.exec?.emp, b.exec?.emp, c.exec?.emp], rotulos: r, nota: a.exec ? `${pct(a.exec.emp / a.exec.dot * 100, 1)} da dotação atualizada` : '', aba: 'despesas' }),
    cartao({ titulo: 'Resultado da execução orçamentária', valores: [a.exec?.resultado, b.exec?.resultado, c.exec?.resultado], rotulos: r, sev: sevDe('E1'), nota: 'receitas realizadas − despesas empenhadas', aba: 'despesas' }),
    cartao({ titulo: 'Receita corrente líquida (12 meses)', valores: [a.rcl, b.rcl, c.rcl], rotulos: r, aba: 'rcl' }),
    cartao({ titulo: 'Pessoal do Executivo / RCL ajustada', tipo: 'pct', valores: [pes(a)?.pct, pes(b)?.pct, pes(c)?.pct], rotulos: p.anosRGF.map(String), sev: sevDe('L2-E'), nota: pes(a) ? `limite máximo ${pct(pes(a).maximo.pct, 1)}` : 'RGF não localizado', aba: 'pessoal' }),
    cartao({ titulo: 'Dívida consolidada líquida / RCL', tipo: 'pct', valores: [a.divida?.pctDcl, b.divida?.pctDcl, c.divida?.pctDcl], rotulos: p.anosRGF.map(String), sev: sevDe('L3'), nota: a.divida ? `limite ${pct(a.divida.limitePct, 0)}` : '', aba: 'divida' }),
    cartao({ titulo: 'Resultado primário', valores: [a.primario, b.primario, c.primario], rotulos: r, sev: sevDe('E4'), nota: 'acima da linha, sem RPPS', aba: 'resultados' }),
    cartao({ titulo: 'Investimentos liquidados', valores: [a.exec?.invLiq, b.exec?.invLiq, c.exec?.invLiq], rotulos: r, aba: 'despesas' }),
    cartao({ titulo: 'Saldo de restos a pagar', valores: [a.rp?.saldoTotal, b.rp?.saldoTotal, c.rp?.saldoTotal], rotulos: r, sev: sevDe('R2'), aba: 'caixa' }),
  ].join('');

  const destaque = aps.filter(x => ['critico', 'alto', 'medio'].includes(x.sev)).slice(0, 6);
  const resumo = `<div class="resumo-sev">${['critico', 'alto', 'medio', 'baixo', 'ok'].map(s => `<button class="chip-sev" data-ir="apontamentos" data-filtro="${s}">${selo(s)}<strong>${cont[s]}</strong></button>`).join('')}</div>
    ${destaque.length ? `<ul class="lista-achados">${destaque.map(x => `<li data-ir="${x.aba || 'apontamentos'}" tabindex="0" role="link">${selo(x.sev)}<div><strong>${esc(x.titulo)}</strong><span>${esc(x.resultado)}</span></div></li>`).join('')}</ul>`
      : aviso('Nenhum apontamento de severidade média ou superior com os dados disponíveis.', 'ok')}`;

  const serie = (nome, f) => ({ nome, valores: f });
  const grafico = graficoBarras({
    titulo: 'Execução orçamentária – três exercícios',
    categorias: ['Receita realizada', 'Despesa empenhada', 'Despesa liquidada', 'Despesa paga'],
    series: [a, b, c].map((i, k) => serie(r[k], [i.exec?.recReal, i.exec?.emp, i.exec?.liq, i.exec?.pago])),
  });

  el.innerHTML = `
    ${secao('Possíveis apontamentos', resumo, 'Situações que tendem a ser objeto de apontamento ou alerta do TCE-MG, apuradas com os dados do SICONFI.')}
    ${secao('Indicadores – exercício atual e dois anteriores', `<p class="sub">${notaModo(p, m)}</p><div class="grade-cartoes">${cartoes}</div>`)}
    ${secao('Receita × despesa', grafico)}`;
}

// ---------------------------------------------------------------- apontamentos

function abaApontamentos(el, { p, estado }) {
  const aps = apontamentos(p), cont = contagemSeveridades(aps);
  const ativos = estado.filtroSev || new Set(['critico', 'alto', 'medio', 'baixo']);
  estado.filtroSev = ativos;
  const cartaoAp = x => `<details class="achado achado-${x.sev}" ${['critico', 'alto'].includes(x.sev) ? 'open' : ''}>
      <summary>${selo(x.sev)}<span class="achado-titulo"><strong>${esc(x.titulo)}</strong><span>${esc(x.resultado)}</span></span></summary>
      <dl>
        ${x.tendencia ? `<dt>Tendência</dt><dd>${esc(x.tendencia)}</dd>` : ''}
        ${x.referencia ? `<dt>Referência</dt><dd>${esc(x.referencia)}</dd>` : ''}
        ${x.fundamento ? `<dt>Fundamento</dt><dd>${esc(x.fundamento)}</dd>` : ''}
        ${x.recomendacao ? `<dt>Orientação</dt><dd>${esc(x.recomendacao)}</dd>` : ''}
        ${x.metodologia ? `<dt>Metodologia</dt><dd>${esc(x.metodologia)}</dd>` : ''}
        ${x.fonte ? `<dt>Fonte</dt><dd>${esc(x.fonte)}${x.aba ? ` · <a href="#" data-ir="${x.aba}">abrir a aba</a>` : ''}</dd>` : ''}
      </dl></details>`;
  const visiveis = aps.filter(x => ativos.has(x.sev));
  const porGrupo = GRUPOS.map(g => [g, visiveis.filter(x => x.grupo === g)]).filter(([, l]) => l.length);
  const tendencias = aps.filter(x => x.tendencia && x.sev !== 'nd');
  el.innerHTML = `
    ${secao('Possíveis apontamentos do controle externo', `
      <div class="barra-acoes">
        <div class="resumo-sev" role="group" aria-label="Filtrar por severidade">${Object.keys(SEVERIDADES).map(s => `<button class="chip-sev ${ativos.has(s) ? 'ativo' : ''}" data-sev="${s}" aria-pressed="${ativos.has(s)}">${selo(s)}<strong>${cont[s]}</strong></button>`).join('')}</div>
        <span class="espaco"></span>
        <button class="botao" data-acao="csv">Baixar CSV</button><button class="botao" data-acao="imprimir">Imprimir / PDF</button>
      </div>
      ${porGrupo.map(([g, l]) => `<h3 class="grupo">${esc(g)}</h3>${l.map(cartaoAp).join('')}`).join('') || aviso('Nenhum apontamento nas severidades selecionadas.', 'ok')}`,
    `Referência: ${esc(p.ente.n)}, ${p.bim}º bimestre de ${p.ano}. As análises são indicativas, baseadas nos demonstrativos declarados ao SICONFI, e não substituem a apuração oficial do TCE-MG.`)}
    ${tendencias.length ? secao('Tendências – possíveis apontamentos futuros', `<ul class="lista-tendencias">${tendencias.map(x => `<li>${selo(x.sev)}<div><strong>${esc(x.titulo)}</strong><span>${esc(x.tendencia)}</span></div></li>`).join('')}</ul>`,
      'Projeções simples, pela sazonalidade do exercício anterior ou pela variação dos últimos 12 meses. Servem de alerta antecipado, não de previsão.') : ''}`;
  el.querySelectorAll('[data-sev]').forEach(b => b.addEventListener('click', () => {
    const s = b.dataset.sev; ativos.has(s) ? ativos.delete(s) : ativos.add(s); abaApontamentos(el, { p, estado });
  }));
  el.querySelector('[data-acao="imprimir"]').addEventListener('click', () => { el.querySelectorAll('details').forEach(d => { d.open = true; }); window.print(); });
  el.querySelector('[data-acao="csv"]').addEventListener('click', () => baixarCSV(`apontamentos-vicosa-${p.ano}-b${p.bim}.csv`,
    ['Severidade', 'Grupo', 'Apontamento', 'Resultado', 'Tendência', 'Referência', 'Fundamento', 'Orientação', 'Fonte'],
    aps.map(x => [SEVERIDADES[x.sev].rotulo, x.grupo, x.titulo, x.resultado, x.tendencia, x.referencia, x.fundamento, x.recomendacao, x.fonte])));
}

// ---------------------------------------------------------------- art. 167-A

function art167(el, { p, estado }) {
  const m = estado.modo;
  const rs = p.anos.map(a => relacao167(p, a, p.bimDe(a, m)));
  const [ra] = rs, proj = projecao167(p, p.ano, p.bim);
  const cab = cabRREO(p, m);
  const v = f => rs.map(r => r ? f(r) : null);
  const tabela = tabelaComparativa({
    cabecalhos: cab, primeira: 'Componente (12 meses)',
    linhas: [
      linha('Receitas correntes realizadas, inclusive intraorçamentárias (A)', v(r => r.rc), { forte: true }),
      linha('Despesas correntes liquidadas, inclusive intraorçamentárias (B)', v(r => r.liq)),
      linha('Despesas correntes inscritas em RPNP em dezembro (C)', v(r => r.rpnp), { nota: 'empenhadas e não liquidadas' }),
      linha('Despesas correntes consideradas (D = B + C)', v(r => r.dc), { forte: true }),
      linha('Relação despesa corrente / receita corrente (D ÷ A) – metodologia TCE-MG', v(r => r.pct), { tipo: 'pct', forte: true }),
      linha('Relação receita corrente / despesa corrente (A ÷ D)', v(r => r.rc / r.dc * 100), { tipo: 'pct' }),
      linha('Poupança corrente (A − D)', v(r => r.poupanca)),
      { secao: 'Outras leituras da mesma relação' },
      linha('Somente despesas liquidadas (B ÷ A)', v(r => r.pctLiq), { tipo: 'pct' }),
      linha('Despesas empenhadas nos 12 meses ÷ A', v(r => r.pctEmp), { tipo: 'pct' }),
      linha('Folga até o limite de 95%', v(r => r.rc * 0.95 - r.dc)),
      linha('Folga até o alerta de 85%', v(r => r.rc * 0.85 - r.dc)),
    ],
  });
  const sev = !ra ? 'nd' : ra.pct >= 95 ? 'critico' : ra.pct >= 85 ? 'alto' : 'ok';
  const heroi = `<div class="heroi">
      <div class="heroi-valor"><span class="heroi-numero">${ra ? pct(ra.pct) : '—'}</span>${selo(sev, !ra ? 'Sem dados' : ra.pct >= 95 ? 'Acima do limite de 95%' : ra.pct >= 85 ? 'Acima do alerta de 85%' : 'Abaixo de 85%')}
        <p>Despesas correntes sobre receitas correntes nos 12 meses encerrados no ${p.bim}º bimestre de ${p.ano}.</p></div>
      <div class="heroi-medidor">${medidor({ valor: ra?.pct, marcos: [{ valor: 85, rotulo: 'Alerta' }, { valor: 95, rotulo: 'Limite' }], maximo: Math.max(110, (ra?.pct || 0) * 1.05), rotulo: 'Relação DC/RC' })}
        ${proj ? `<p class="heroi-projecao"><strong>Projeção para dezembro de ${p.ano}: ${pct(proj.pct)}</strong> (despesas correntes de ${moedaCurta(proj.dc)} para receitas correntes de ${moedaCurta(proj.rc)}, mantida a sazonalidade de ${p.ano - 1}).</p>` : ''}</div>
    </div>`;

  let blocoSerie;
  if (!p.serie167) {
    blocoSerie = aviso('Carregando a série bimestral dos quatro últimos exercícios…', 'info');
  } else {
    const s = serie167(p);
    const grafico = graficoLinhas({
      titulo: 'Relação DC/RC em 12 meses, por bimestre', rotulosX: ['1º bim', '2º bim', '3º bim', '4º bim', '5º bim', '6º bim'],
      series: s.map(x => ({ nome: String(x.ano), valores: x.pontos.map(r => r?.pct ?? null) })),
      refs: [{ valor: 85, rotulo: 'Alerta 85%', classe: 'medio' }, { valor: 95, rotulo: 'Limite 95%', classe: 'critico' }],
    });
    const corpo = [1, 2, 3, 4, 5, 6].map(b => `<tr><th scope="row">${b}º bimestre</th>${s.map(x => {
      const r = x.pontos[b - 1];
      return `<td>${r ? `${pct(r.pct)} ${r.pct >= 95 ? selo('critico', '> 95%') : r.pct >= 85 ? selo('alto', '> 85%') : ''}` : '—'}</td><td class="menor">${r ? moedaCurta(r.dc) : '—'}</td><td class="menor">${r ? moedaCurta(r.rc) : '—'}</td>`;
    }).join('')}</tr>`).join('');
    blocoSerie = `${grafico}<div class="tabela-rolagem"><table class="tabela"><thead>
        <tr><th rowspan="2" scope="col">Apuração</th>${s.map((x, i) => `<th colspan="3" scope="colgroup"><span class="marca-serie" style="background:${CORES_SERIE[i]}"></span>${x.ano}</th>`).join('')}</tr>
        <tr>${s.map(() => '<th scope="col">DC/RC</th><th scope="col">Desp. correntes</th><th scope="col">Rec. correntes</th>').join('')}</tr></thead>
      <tbody>${corpo}</tbody></table></div>`;
  }

  el.innerHTML = `
    ${secao('Art. 167-A da Constituição – despesas correntes × receitas correntes', heroi + tabela, notaModo(p, m))}
    ${secao('Evolução bimestral', blocoSerie, 'A apuração é bimestral, sobre base móvel de 12 meses (CF/88, art. 167-A, § 4º).')}
    ${secao('O que a Constituição determina', `<div class="texto">
      <p><strong>Acima de 95%</strong> (caput): é facultado aos Poderes Executivo, Legislativo e Judiciário, ao Ministério Público, ao Tribunal de Contas e à Defensoria Pública aplicar o mecanismo de ajuste fiscal, que veda, entre outros: concessão de vantagem, aumento ou reajuste de remuneração; criação de cargo, emprego ou função que implique aumento de despesa; alteração de estrutura de carreira; admissão ou contratação de pessoal (salvo reposições); realização de concurso (salvo reposições); criação ou majoração de auxílios e benefícios; criação de despesa obrigatória; reajuste de despesa obrigatória acima da inflação; criação ou expansão de linhas de financiamento, subsídios e subvenções; concessão ou ampliação de incentivo ou benefício tributário.</p>
      <p><strong>Entre 85% e 95%</strong> (§ 1º): as medidas podem ser implementadas, no todo ou em parte, por ato do Chefe do Poder Executivo com vigência imediata, submetido em regime de urgência ao Legislativo.</p>
      <p><strong>Consequência prática</strong> (§ 6º): ocorrendo a hipótese do caput, até que todas as medidas tenham sido adotadas por todos os Poderes e órgãos, ficam vedadas a concessão, por outro ente, de garantias ao ente envolvido e a tomada de operação de crédito com outro ente, inclusive refinanciamentos. O TCE-MG disciplinou a apuração e a declaração correspondente na Instrução Normativa nº 07/2025.</p>
      <p class="sub"><strong>Metodologia aplicada.</strong> RREO Anexo 01 em base móvel de 12 meses: valor acumulado no exercício até o bimestre + valor do exercício anterior encerrado − valor do exercício anterior até o mesmo bimestre. Despesas correntes liquidadas somadas às empenhadas e não liquidadas inscritas em RPNP em dezembro (do exercício anterior, nas apurações de janeiro a outubro; do próprio exercício, na de dezembro); receitas correntes realizadas, líquidas de deduções; intraorçamentárias dos dois lados. Limitações: o SICONFI não informa a despesa por fonte, de modo que não se exclui a despesa custeada com superávit financeiro do exercício anterior, nem se abatem os RPNP cancelados – o percentual exibido tende a ser igual ou superior ao da apuração oficial.</p></div>`)}`;
}

// ---------------------------------------------------------------- receitas

const RECEITAS = [
  ['ReceitasCorrentes', 'Receitas correntes', 0, true],
  ['ReceitaTributaria', 'Impostos, taxas e contribuições de melhoria', 1], ['Impostos', 'Impostos', 2], ['Taxas', 'Taxas', 2],
  ['ReceitaDeContribuicoes', 'Contribuições', 1], ['ReceitaPatrimonial', 'Receita patrimonial', 1], ['ReceitaAgropecuaria', 'Receita agropecuária', 1],
  ['ReceitaIndustrial', 'Receita industrial', 1], ['ReceitaDeServicos', 'Receita de serviços', 1],
  ['TransferenciasCorrentes', 'Transferências correntes', 1],
  ['TransferenciasCorrentesDaUniaoEDeSuasEntidades', 'Da União', 2], ['TransferenciasCorrentesDosEstadosEDoDistritoFederalEDeSuasEntidades', 'Do Estado', 2],
  ['OutrasReceitasCorrentes', 'Outras receitas correntes', 1],
  ['ReceitasDeCapital', 'Receitas de capital', 0, true],
  ['ReceitasDeOperacoesDeCredito', 'Operações de crédito', 1], ['AlienacaoDeBens', 'Alienação de bens', 1],
  ['AmortizacoesDeEmprestimos', 'Amortização de empréstimos', 1], ['TransferenciasDeCapital', 'Transferências de capital', 1],
  ['OutrasReceitasDeCapital', 'Outras receitas de capital', 1],
  ['ReceitasIntraOrcamentariasTotal', 'Receitas intraorçamentárias', 0, true],
  ['TotalReceitas', 'Total das receitas', 0, true],
];

function receitas(el, { p, estado }) {
  const m = estado.modo, demos = p.anos.map(a => p.demoRREO(a, m)), ind = tres(p, m), r = rot(p);
  const monta = col => RECEITAS.map(([cod, nome, nivel, forte]) => linha(nome, demos.map(d => d.v(A1, cod, col)), { nivel, forte }))
    .filter(l => l.valores.some(v => !vazio(v)));
  const realiz = RECEITAS.map(([cod, nome, nivel, forte]) => linha(nome, demos.map(d => {
    const prev = d.v(A1, cod, COL.prev), real = d.v(A1, cod, COL.real);
    return prev > 0 ? (real || 0) / prev * 100 : null;
  }), { nivel, forte, tipo: 'pct1' })).filter(l => l.valores.some(v => !vazio(v)));
  const principais = ['ReceitaTributaria', 'ReceitaDeContribuicoes', 'ReceitaPatrimonial', 'ReceitaDeServicos', 'TransferenciasCorrentes', 'OutrasReceitasCorrentes', 'ReceitasDeCapital'];
  const nomes = ['Tributária', 'Contribuições', 'Patrimonial', 'Serviços', 'Transf. correntes', 'Outras correntes', 'Capital'];
  const grafico = graficoBarras({ titulo: 'Receitas realizadas por origem', categorias: nomes,
    series: demos.map((d, k) => ({ nome: r[k], valores: principais.map(c => d.v(A1, c, COL.real)) })) });
  const e = ind[0].exec, fim = indicadores(p, p.ano - 1, 'fechado').exec, mesmo = indicadores(p, p.ano - 1, 'periodo').exec;
  let projecao = '';
  if (e && fim && mesmo && p.bim < 6 && mesmo.rc > 0) {
    const proj = e.rc * fim.rc / mesmo.rc;
    projecao = aviso(`<strong>Projeção das receitas correntes para o encerramento de ${p.ano}:</strong> ${moeda(proj)}, ou ${pct(proj / e.rcPrev * 100, 1)} da previsão atualizada (${moeda(e.rcPrev)}). Em ${p.ano - 1}, até o ${p.bim}º bimestre havia sido arrecadado ${pct(mesmo.rc / fim.rc * 100, 1)} do total do ano.`, proj / e.rcPrev < 0.95 ? 'alerta' : 'info');
  }
  el.innerHTML = `
    ${secao('Receitas realizadas', projecao + tabelaComparativa({ cabecalhos: cabRREO(p, m), linhas: monta(COL.real), primeira: 'Origem' }) + grafico, notaModo(p, m))}
    ${secao('Realização da previsão atualizada', tabelaComparativa({ cabecalhos: cabRREO(p, m), linhas: realiz, primeira: 'Origem (realizado ÷ previsão atualizada)' }),
      'Percentuais muito baixos em receitas de capital e operações de crédito sinalizam superestimativa orçamentária (LRF, art. 12).')}
    ${secao('Previsão atualizada', tabelaComparativa({ cabecalhos: cabRREO(p, m), linhas: monta(COL.prev), primeira: 'Origem' }))}`;
}

// ---------------------------------------------------------------- despesas

const DESPESAS = [
  ['DespesasCorrentes', 'Despesas correntes', 0, true], ['PessoalEEncargosSociais', 'Pessoal e encargos sociais', 1],
  ['JurosEEncargosDaDivida', 'Juros e encargos da dívida', 1], ['OutrasDespesasCorrentes', 'Outras despesas correntes', 1],
  ['DespesasDeCapital', 'Despesas de capital', 0, true], ['Investimentos', 'Investimentos', 1], ['InversoesFinanceiras', 'Inversões financeiras', 1],
  ['AmortizacaoDaDivida', 'Amortização da dívida', 1],
  ['DespesasIntraOrcamentariasTotal', 'Despesas intraorçamentárias', 0, true], ['TotalDespesas', 'Total das despesas', 0, true],
];
const ESTAGIOS = { emp: ['Empenhada', COL.emp], liq: ['Liquidada', COL.liq], pago: ['Paga', COL.pago], dot: ['Dotação atualizada', COL.dot] };

function despesas(el, ctx) {
  const { p, estado } = ctx, m = estado.modo, demos = p.anos.map(a => p.demoRREO(a, m)), ind = tres(p, m), r = rot(p);
  const est = estado.estagio || 'liq', [nomeEst, colEst] = ESTAGIOS[est];
  const porGrupo = DESPESAS.map(([cod, nome, nivel, forte]) => linha(nome, demos.map(d => d.v(A1, cod, colEst)), { nivel, forte })).filter(l => l.valores.some(v => !vazio(v)));
  const exec = ind.map(i => i.exec);
  const resumo = [
    linha('Dotação atualizada', exec.map(e => e?.dot)), linha('Despesa empenhada', exec.map(e => e?.emp), { forte: true }),
    linha('Despesa liquidada', exec.map(e => e?.liq)), linha('Despesa paga', exec.map(e => e?.pago)),
    linha('Empenhado ÷ dotação', exec.map(e => e ? e.emp / e.dot * 100 : null), { tipo: 'pct1' }),
    linha('Liquidado ÷ empenhado', exec.map(e => e ? e.liq / e.emp * 100 : null), { tipo: 'pct1' }),
    linha('Receita realizada − despesa empenhada', exec.map(e => e?.resultado), { forte: true }),
    linha('Superávit financeiro usado em créditos adicionais', exec.map(e => e?.superavitFin)),
    linha('Investimentos ÷ despesa total (liquidada)', exec.map(e => e && e.liq ? (e.invLiq || 0) / e.liq * 100 : null), { tipo: 'pct1' }),
  ];
  const campo = est === 'emp' ? 'emp' : 'liq';
  const funcoes = FUNCOES.map(f => ({ f, valores: ind.map(i => i.funcoes[f]?.[campo] ?? null) }))
    .filter(x => x.valores.some(v => v)).sort((x, y) => (y.valores[0] ?? y.valores[1] ?? 0) - (x.valores[0] ?? x.valores[1] ?? 0));
  const totais = ind.map(i => Object.values(i.funcoes).reduce((s, x) => s + (x[campo] || 0), 0) || null);
  const tabFuncoes = [...funcoes.map(x => linha(x.f, x.valores)), linha('Total (exceto intraorçamentárias)', totais, { forte: true })];
  const partic = funcoes.slice(0, 12).map(x => linha(x.f, x.valores.map((v, k) => totais[k] ? (v || 0) / totais[k] * 100 : null), { tipo: 'pct1' }));
  const top = funcoes.slice(0, 8);
  const grafico = graficoBarras({ titulo: `Despesa ${campo === 'emp' ? 'empenhada' : 'liquidada'} por função – oito maiores`, categorias: top.map(x => x.f.replace('Assistência Social', 'Assist. Social').replace('Encargos Especiais', 'Enc. Especiais').replace('Previdência Social', 'Previdência')),
    series: r.map((nome, k) => ({ nome, valores: top.map(x => x.valores[k]) })) });
  el.innerHTML = `
    ${secao('Execução da despesa', tabelaComparativa({ cabecalhos: cabRREO(p, m), linhas: resumo, primeira: 'Indicador' }), notaModo(p, m))}
    ${secao('Despesa por categoria econômica e grupo', `<div class="barra-acoes"><label>Estágio <select data-estagio>${Object.entries(ESTAGIOS).map(([k, [n]]) => `<option value="${k}" ${k === est ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>`
      + tabelaComparativa({ cabecalhos: cabRREO(p, m), linhas: porGrupo, primeira: `Grupo – despesa ${nomeEst.toLowerCase()}` }))}
    ${secao('Despesa por função', grafico + tabelaComparativa({ cabecalhos: cabRREO(p, m), linhas: tabFuncoes, primeira: `Função – despesa ${campo === 'emp' ? 'empenhada' : 'liquidada'}` }),
      'RREO Anexo 02, exceto intraorçamentárias.')}
    ${secao('Participação de cada função na despesa', tabelaComparativa({ cabecalhos: cabRREO(p, m), linhas: partic, primeira: 'Função (% do total)' })
      + aviso('Os índices constitucionais de educação (CF, art. 212 – 25%) e de saúde (LC nº 141/2012 – 15%) são apurados no SIOPE e no SIOPS e não são publicados na API do SICONFI. A despesa nas funções Educação e Saúde acima é informação gerencial e não equivale a esses índices.', 'info'))}`;
  el.querySelector('[data-estagio]').addEventListener('change', ev => { estado.estagio = ev.target.value; despesas(el, ctx); });
}

// ---------------------------------------------------------------- RCL

function rcl(el, { p, estado }) {
  const m = estado.modo, demos = p.anos.map(a => p.demoRREO(a, m)), ind = tres(p, m), r = rot(p);
  const linhas = linhasDoAnexo(demos, A3, COL.doze);
  const grafico = graficoBarras({ titulo: 'Receita corrente líquida – 12 meses', categorias: ['RCL', 'RCL ajustada (endividamento)', 'RCL ajustada (pessoal)'],
    series: ind.map((i, k) => ({ nome: r[k], valores: [i.rcl, i.rclEndividamento, i.rclPessoal] })) });
  const pc = ind.map(i => i.rcl && i.populacao ? i.rcl / i.populacao : null);
  el.innerHTML = `
    ${secao('Receita corrente líquida', grafico + tabelaComparativa({ cabecalhos: cabRREO(p, m), primeira: 'Indicador', linhas: [
      linha('RCL (12 meses)', ind.map(i => i.rcl), { forte: true }),
      linha('RCL ajustada para os limites de endividamento', ind.map(i => i.rclEndividamento)),
      linha('RCL ajustada para os limites da despesa com pessoal', ind.map(i => i.rclPessoal)),
      linha('População considerada pelo SICONFI', ind.map(i => i.populacao), { tipo: 'num' }),
      linha('RCL por habitante', pc),
    ] }), notaModo(p, m))}
    ${secao('Composição da RCL', tabelaComparativa({ cabecalhos: cabRREO(p, m), linhas, primeira: 'RREO Anexo 03 – total dos últimos 12 meses' }))}`;
}

// ---------------------------------------------------------------- pessoal

function abaPessoal(el, { p, estado }) {
  const m = estado.modo, ind = tres(p, m), cab = cabRGF(p, m);
  const instituicoes = [...new Set(ind.flatMap(i => i.pessoal.map(x => x.instituicao)))];
  if (!instituicoes.length) { el.innerHTML = secao('Despesa com pessoal', aviso('O SICONFI não registra RGF de Viçosa para os períodos comparados.', 'alerta')); return; }
  const blocos = instituicoes.map(inst => {
    const ps = ind.map(i => i.pessoal.find(x => x.instituicao === inst) || null), at = ps.find(Boolean);
    const v = f => ps.map(x => x ? f(x) : null);
    const marcos = at ? [{ valor: at.alerta.pct ?? at.maximo.pct * 0.9, rotulo: 'Alerta' }, { valor: at.prudencial.pct ?? at.maximo.pct * 0.95, rotulo: 'Prudencial' }, { valor: at.maximo.pct, rotulo: 'Máximo' }].filter(x => !vazio(x.valor)) : [];
    const periodo = at ? rotuloPeriodoRGF(at.periodicidade, at.periodo) : '';
    return secao(`${inst}`, `
      <div class="heroi"><div class="heroi-valor"><span class="heroi-numero">${pct(ps[0]?.pct)}</span><p>Despesa total com pessoal sobre a RCL ajustada · ${NOME_PODER[at.poder]} · ${esc(periodo)} de ${p.anosRGF[0]}</p></div>
        <div class="heroi-medidor">${medidor({ valor: ps[0]?.pct, marcos, rotulo: 'Despesa com pessoal' })}</div></div>
      ${tabelaComparativa({ cabecalhos: cab, primeira: 'RGF Anexo 01 – 12 meses', linhas: [
        linha('Despesa bruta com pessoal', v(x => x.bruta)), linha('(−) Despesas não computadas (LRF, art. 19, § 1º)', v(x => x.naoComputada)),
        linha('Despesa total com pessoal – DTP', v(x => x.dtp), { forte: true }),
        linha('RCL ajustada', v(x => x.rclAjustada)),
        linha('DTP ÷ RCL ajustada', v(x => x.pct), { tipo: 'pct', forte: true }),
        linha('Limite de alerta (90% do máximo)', v(x => x.alerta.pct), { tipo: 'pct' }),
        linha('Limite prudencial (95% do máximo)', v(x => x.prudencial.pct), { tipo: 'pct' }),
        linha('Limite máximo', v(x => x.maximo.pct), { tipo: 'pct' }),
        linha('Margem até o limite prudencial', v(x => vazio(x.prudencial.valor) || vazio(x.dtp) ? null : x.prudencial.valor - x.dtp)),
        linha('Margem até o limite máximo', v(x => vazio(x.maximo.valor) || vazio(x.dtp) ? null : x.maximo.valor - x.dtp)),
      ] })}`);
  }).join('');
  el.innerHTML = blocos + secao('Regras aplicáveis', `<div class="texto"><p>Acima de <strong>90%</strong> do limite, o Tribunal de Contas alerta o Poder ou órgão (LRF, art. 59, § 1º, II). Acima de <strong>95%</strong> (limite prudencial), ficam vedados aumentos, criação de cargos, admissões e horas extras (art. 22, parágrafo único). Acima do <strong>limite máximo</strong>, o excedente deve ser eliminado em dois quadrimestres, sob pena de suspensão de transferências voluntárias, garantias e operações de crédito (art. 23).</p></div>`);
}

// ---------------------------------------------------------------- dívida e crédito

function abaDivida(el, { p, estado }) {
  const m = estado.modo, ind = tres(p, m), cab = cabRGF(p, m), ds = ind.map(i => i.divida);
  if (!ds.some(d => d?.tem)) { el.innerHTML = secao('Dívida e operações de crédito', aviso('O SICONFI não registra o RGF do Poder Executivo para os períodos comparados.', 'alerta')); return; }
  const v = f => ds.map(d => d ? f(d) : null), at = ds[0];
  el.innerHTML = secao('Dívida consolidada líquida', `
      <div class="heroi"><div class="heroi-valor"><span class="heroi-numero">${pct(at?.pctDcl)}</span><p>Dívida consolidada líquida sobre a RCL ajustada · ${p.anosRGF[0]}</p></div>
        <div class="heroi-medidor">${medidor({ valor: Math.max(0, at?.pctDcl ?? 0), marcos: [{ valor: (at?.limitePct || 120) * 0.9, rotulo: 'Alerta' }, { valor: at?.limitePct || 120, rotulo: 'Limite' }], rotulo: 'DCL' })}</div></div>
      ${tabelaComparativa({ cabecalhos: cab, primeira: 'RGF Anexo 02', linhas: [
        linha('Dívida consolidada', v(d => d.dc)), linha('(−) Deduções (disponibilidade de caixa e haveres)', v(d => d.deducoes)),
        linha('Dívida consolidada líquida – DCL', v(d => d.dcl), { forte: true }), linha('DCL no encerramento do exercício anterior', v(d => d.dclAnterior)),
        linha('RCL ajustada para endividamento', v(d => d.rclAjustada)),
        linha('DCL ÷ RCL ajustada', v(d => d.pctDcl), { tipo: 'pct', forte: true }), linha('Limite (Resolução SF nº 40/2001)', v(d => d.limitePct), { tipo: 'pct' }),
      ] })}`)
    + secao('Operações de crédito e garantias', tabelaComparativa({ cabecalhos: cab, primeira: 'RGF Anexos 03 e 04', linhas: [
        linha('Operações de crédito consideradas para o limite', v(d => d.temG4 ? d.opCredito ?? 0 : null)),
        linha('Operações de crédito ÷ RCL ajustada', v(d => d.temG4 ? d.pctOpCredito : null), { tipo: 'pct', forte: true }),
        linha('Limite anual (Resolução SF nº 43/2001, art. 7º, I)', v(() => LIMITES.operacoesCredito), { tipo: 'pct' }),
        linha('Garantias concedidas', v(d => d.temG3 ? d.garantias ?? 0 : null)),
        linha('Garantias ÷ RCL ajustada', v(d => d.temG3 ? d.pctGarantias ?? 0 : null), { tipo: 'pct', forte: true }),
        linha('Limite de garantias (Resolução SF nº 43/2001, art. 9º)', v(() => LIMITES.garantias), { tipo: 'pct' }),
      ] }))
    + secao('Regra de ouro', tabelaComparativa({ cabecalhos: cabRREO(p, m), primeira: 'RREO Anexo 01', linhas: [
        linha('Receitas de operações de crédito realizadas', ind.map(i => i.exec?.opCred)),
        linha('Despesas de capital empenhadas', ind.map(i => i.exec?.dkEmp)),
        linha('Margem (despesas de capital − operações de crédito)', ind.map(i => i.exec ? i.exec.dkEmp - i.exec.opCred : null), { forte: true }),
      ] }), 'As operações de crédito não podem exceder as despesas de capital (CF/88, art. 167, III).');
}

// ---------------------------------------------------------------- caixa e restos a pagar

function abaCaixa(el, { p, estado }) {
  const m = estado.modo, ind = tres(p, m), rps = ind.map(i => i.rp), v = f => rps.map(x => x ? f(x) : null);
  const fech = p.anos.map(a => indicadores(p, a, 'fechado'));
  const cxs = fech.map(i => i.caixa);
  const contas = [...new Set(cxs.flatMap(c => c ? c.linhas.map(l => l.conta) : []))];
  const tabCaixa = campo => contas.map(conta => {
    const vals = cxs.map(c => c?.linhas.find(l => l.conta === conta)?.[campo] ?? null);
    return linha(conta, vals, { forte: /^TOTAL/.test(norm(conta)), nivel: /^TOTAL/.test(norm(conta)) ? 0 : 1 });
  });
  const cabCx = p.anosRGF.map((a, i) => ({ titulo: String(a), sub: cxs[i] ? '31/12' : 'não publicado' }));
  const negativas = cxs[0]?.negativas || cxs[1]?.negativas || [];
  el.innerHTML = secao('Restos a pagar', tabelaComparativa({ cabecalhos: cabRREO(p, m), primeira: 'RREO Anexo 07', linhas: [
      { secao: 'Processados (e não processados liquidados)' },
      linha('Inscritos', v(x => x.rppInscritos)), linha('Pagos', v(x => x.rppPagos)), linha('Cancelados', v(x => x.rppCancelados)), linha('Saldo a pagar', v(x => x.rppSaldo), { forte: true }),
      { secao: 'Não processados' },
      linha('Inscritos', v(x => x.rpnpInscritos)), linha('Liquidados', v(x => x.rpnpLiquidados)), linha('Pagos', v(x => x.rpnpPagos)), linha('Cancelados', v(x => x.rpnpCancelados)), linha('Saldo a pagar', v(x => x.rpnpSaldo), { forte: true }),
      { secao: 'Total' },
      linha('Restos a pagar inscritos', v(x => x.inscritos)), linha('Saldo total a pagar', v(x => x.saldoTotal), { forte: true }),
      linha('Inscritos ÷ RCL', ind.map(i => i.rp && i.rcl ? i.rp.inscritos / i.rcl * 100 : null), { tipo: 'pct1' }),
    ] }), notaModo(p, m))
    + secao('Disponibilidade de caixa líquida por vinculação, após os restos a pagar não processados',
      (contas.length ? (negativas.length ? aviso(`<strong>Insuficiência financeira</strong> no último encerramento publicado em ${negativas.length} vinculação(ões): ${negativas.map(n => `${esc(n.conta)} (${moedaCurta(n.aposRp)})`).join('; ')}.`, 'critico') : '')
        + tabelaComparativa({ cabecalhos: cabCx, linhas: tabCaixa('aposRp'), primeira: 'RGF Anexo 05 – vinculação' }) : aviso('O RGF Anexo 05 é publicado apenas no último período do exercício e não foi localizado para os exercícios comparados.', 'info')),
      'Valores negativos indicam obrigações sem lastro financeiro na fonte (LRF, arts. 8º, parágrafo único, 42 e 50, I). O demonstrativo só existe no encerramento do exercício.')
    + (contas.length ? secao('Disponibilidade de caixa bruta por vinculação', tabelaComparativa({ cabecalhos: cabCx, linhas: tabCaixa('bruta'), primeira: 'RGF Anexo 05 – vinculação' })) : '');
}

// ---------------------------------------------------------------- resultados e previdência

function abaResultados(el, { p, estado }) {
  const m = estado.modo, ind = tres(p, m), demos = p.anos.map(a => p.demoRREO(a, m)), r = rot(p);
  const grafico = graficoBarras({ titulo: 'Resultados fiscais', categorias: ['Primário (sem RPPS)', 'Primário (com RPPS)', 'Nominal'],
    series: ind.map((i, k) => ({ nome: r[k], valores: [i.primario, i.primarioComRpps, i.nominal] })) });
  const rpps = linhasDoAnexo(demos, 'RREO-Anexo 04', /^(RECEITAS REALIZADAS ATE O BIMESTRE|DESPESAS LIQUIDADAS ATE O BIMESTRE)/, { filtro: l => /^(TOTAL|RESULTADO|RECEITAS CORRENTES|BENEFICIOS)/.test(norm(l.conta)) });
  el.innerHTML = secao('Resultado primário e nominal', grafico + tabelaComparativa({ cabecalhos: cabRREO(p, m), primeira: 'RREO Anexo 06', linhas: [
      linha('Receita primária total (realizada)', ind.map(i => i.receitaPrimaria)), linha('Despesa primária total (paga)', ind.map(i => i.despesaPrimaria)),
      linha('Resultado primário – acima da linha, sem RPPS', ind.map(i => i.primario), { forte: true }),
      linha('Resultado primário – acima da linha, com RPPS', ind.map(i => i.primarioComRpps)),
      linha('Resultado nominal – acima da linha, sem RPPS', ind.map(i => i.nominal), { forte: true }),
      linha('Dívida consolidada líquida no período', ind.map(i => i.dcl)), linha('Dívida consolidada líquida em 31/12 do exercício anterior', ind.map(i => i.dclAnterior)),
    ] }) + aviso('A meta de resultado primário fixada no Anexo de Metas Fiscais da LDO não é publicada na API do SICONFI; confronte o resultado apurado com a meta fixada pelo Município (LRF, arts. 4º, § 1º, e 9º).', 'info'), notaModo(p, m))
    + secao('Regime próprio de previdência (RPPS)', tabelaComparativa({ cabecalhos: cabRREO(p, m), primeira: 'RREO Anexo 14', linhas: [
      { secao: 'Fundo em capitalização (plano previdenciário)' },
      linha('Receitas previdenciárias realizadas', ind.map(i => i.rppsCapReceitas)), linha('Despesas previdenciárias liquidadas', ind.map(i => i.rppsCapDespesas)),
      linha('Resultado previdenciário', ind.map(i => i.rppsCapResultado), { forte: true }),
      { secao: 'Fundo em repartição (plano financeiro)' },
      linha('Receitas previdenciárias realizadas', ind.map(i => i.rppsRepReceitas)), linha('Despesas previdenciárias liquidadas', ind.map(i => i.rppsRepDespesas)),
      linha('Resultado previdenciário', ind.map(i => i.rppsRepResultado), { forte: true }),
    ].filter(l => l.secao || l.valores.some(v => !vazio(v))) }) + (rpps.length ? tabelaComparativa({ cabecalhos: cabRREO(p, m), linhas: rpps, primeira: 'RREO Anexo 04 – principais linhas' }) : ''));
}

// ---------------------------------------------------------------- balanço anual (DCA)

function abaDCA(el, { p }) {
  const demos = p.anosDCA.map(a => p.dca[a]), cab = cabDCA(p);
  if (demos.every(d => !d || d.vazio)) { el.innerHTML = secao('Balanço anual (DCA)', aviso('O SICONFI não registra DCA de Viçosa para os exercícios comparados.', 'alerta')); return; }
  const nivel = cod => { const n = cod.replace(/^[A-Z]+/, '').split('.'); let k = n.length; while (k > 1 && /^0+$/.test(n[k - 1])) k--; return k; };
  const patrimonial = (anexo, max) => linhasDoAnexo(demos, anexo, /^31\/12/, { filtro: l => /^P\d/.test(l.cod) && nivel(l.cod) <= max })
    .map(l => { const cod = l.chave.split('|')[1]; return { ...l, nivel: nivel(cod) - 1, forte: nivel(cod) === 1, rotulo: l.rotulo.replace(/^[\d.]+ - /, '') }; });
  const bp = patrimonial('DCA-Anexo I-AB', 2), dvp = patrimonial('DCA-Anexo I-HI', 2);
  const val = (anexo, cod) => demos.map(d => d ? d.v(anexo, cod, /^31\/12/) : null);
  const ac = val('DCA-Anexo I-AB', 'P1.1.0.0.0.00.00'), ativo = val('DCA-Anexo I-AB', 'P1.0.0.0.0.00.00');
  const pc = val('DCA-Anexo I-AB', 'P2.1.0.0.0.00.00'), pnc = val('DCA-Anexo I-AB', 'P2.2.0.0.0.00.00'), pl = val('DCA-Anexo I-AB', 'P2.3.0.0.0.00.00');
  const vpd = val('DCA-Anexo I-HI', 'P3.0.0.0.0.00.00'), vpa = val('DCA-Anexo I-HI', 'P4.0.0.0.0.00.00');
  const k = (f) => [0, 1, 2].map(i => { try { const x = f(i); return Number.isFinite(x) ? x : null; } catch { return null; } });
  const despesa = col => demos.map(d => d ? d.v('DCA-Anexo I-D', 'TotalDespesas', col, /^TOTAL GERAL/) : null);
  const funcoes = linhasDoAnexo(demos, 'DCA-Anexo I-E', /^DESPESAS EMPENHADAS/, { filtro: l => /^\d\d - /.test(l.conta) }).map(l => ({ ...l, forte: false }));
  el.innerHTML = aviso(p.anosDCA[0] === p.ano ? '' : `A DCA de ${p.ano} só é exigível após o encerramento do exercício (prazo: 30 de abril de ${p.ano + 1}); a aba compara os três últimos balanços entregues.`, 'info')
    + secao('Indicadores patrimoniais', tabelaComparativa({ cabecalhos: cab, primeira: 'Indicador', linhas: [
      linha('Ativo total', ativo), linha('Passivo exigível (circulante + não circulante)', k(i => (pc[i] || 0) + (pnc[i] || 0))), linha('Patrimônio líquido', pl, { forte: true }),
      linha('Liquidez corrente (ativo circulante ÷ passivo circulante)', k(i => ac[i] / pc[i]), { tipo: 'num' }),
      linha('Endividamento geral (passivo exigível ÷ ativo total)', k(i => ((pc[i] || 0) + (pnc[i] || 0)) / ativo[i] * 100), { tipo: 'pct1' }),
      linha('Resultado patrimonial (VPA − VPD)', k(i => vpa[i] - vpd[i]), { forte: true }),
      linha('Despesa empenhada', despesa(/^DESPESAS EMPENHADAS/)), linha('Despesa liquidada', despesa(/^DESPESAS LIQUIDADAS/)), linha('Despesa paga', despesa(/^DESPESAS PAGAS/)),
      linha('Inscrição de restos a pagar não processados', despesa(/^INSCRICAO DE RESTOS A PAGAR NAO PROCESSADOS/)), linha('Inscrição de restos a pagar processados', despesa(/^INSCRICAO DE RESTOS A PAGAR PROCESSADOS/)),
    ] }), 'Declaração de Contas Anuais – base da consolidação das contas públicas (LRF, art. 51).')
    + secao('Balanço patrimonial', tabelaComparativa({ cabecalhos: cab, linhas: bp, primeira: 'DCA Anexo I-AB' }))
    + secao('Variações patrimoniais', tabelaComparativa({ cabecalhos: cab, linhas: dvp, primeira: 'DCA Anexo I-HI' }))
    + (funcoes.length ? secao('Despesa empenhada por função', tabelaComparativa({ cabecalhos: cab, linhas: funcoes, primeira: 'DCA Anexo I-E' })) : '');
}

// ---------------------------------------------------------------- matriz de saldos contábeis

const CLASSES_MSC = { 1: 'Ativo', 2: 'Passivo e patrimônio líquido', 3: 'Variações patrimoniais diminutivas', 4: 'Variações patrimoniais aumentativas',
  5: 'Controles da aprovação do planejamento e orçamento', 6: 'Controles da execução do planejamento e orçamento', 7: 'Controles devedores', 8: 'Controles credores' };
const GRUPOS_MSC = { 11: 'Ativo circulante', 12: 'Ativo não circulante', 21: 'Passivo circulante', 22: 'Passivo não circulante', 23: 'Patrimônio líquido',
  31: 'Pessoal e encargos', 32: 'Benefícios previdenciários e assistenciais', 33: 'Uso de bens, serviços e consumo de capital fixo', 34: 'VPD financeiras',
  35: 'Transferências e delegações concedidas', 36: 'Desvalorização e perda de ativos e incorporação de passivos', 37: 'Tributárias', 38: 'Custo das mercadorias e produtos vendidos e dos serviços prestados', 39: 'Outras VPD',
  41: 'Impostos, taxas e contribuições de melhoria', 42: 'Contribuições', 43: 'Exploração e venda de bens, serviços e direitos', 44: 'VPA financeiras', 45: 'Transferências e delegações recebidas',
  46: 'Valorização e ganhos com ativos e desincorporação de passivos', 49: 'Outras VPA',
  51: 'Planejamento aprovado', 52: 'Orçamento aprovado', 53: 'Inscrição de restos a pagar', 61: 'Execução do planejamento', 62: 'Execução do orçamento', 63: 'Execução de restos a pagar',
  71: 'Atos potenciais', 72: 'Administração financeira', 73: 'Dívida ativa', 74: 'Riscos fiscais', 75: 'Consórcios públicos', 78: 'Custos', 79: 'Outros controles',
  81: 'Execução dos atos potenciais', 82: 'Execução da administração financeira', 83: 'Execução da dívida ativa', 84: 'Execução dos riscos fiscais', 85: 'Execução dos consórcios públicos', 88: 'Apuração de custos', 89: 'Outros controles' };
const mascara = c => [c.slice(0, 1), c.slice(1, 2), c.slice(2, 3), c.slice(3, 4), c.slice(4, 5), c.slice(5, 7), c.slice(7, 9)].filter(Boolean).join('.');

function abaMSC(el, ctx) {
  const { p, estado } = ctx;
  const ultimo = Math.max(0, ...(p.extrato[p.ano] || []).filter(e => e.tipo === 'MSC').map(e => e.periodo)) || 12;
  const f = estado.msc ||= { classe: 1, mes: ultimo, valor: 'ending_balance', nivel: 2, matriz: 'MSCC' };
  const opc = (lista, atual) => lista.map(([v, n]) => `<option value="${v}" ${String(v) === String(atual) ? 'selected' : ''}>${esc(n)}</option>`).join('');
  el.innerHTML = secao('Matriz de saldos contábeis (MSC)', `
    <form class="barra-acoes" data-form>
      <label>Classe <select name="classe">${opc(Object.entries(CLASSES_MSC).map(([k, n]) => [k, `${k} – ${n}`]), f.classe)}</select></label>
      <label>Mês <select name="mes">${opc(MESES.map((n, i) => [i + 1, n]), f.mes)}</select></label>
      <label>Valor <select name="valor">${opc([['ending_balance', 'Saldo final'], ['period_change', 'Movimento do mês'], ['beginning_balance', 'Saldo inicial']], f.valor)}</select></label>
      <label>Detalhe <select name="nivel">${opc([[1, 'Classe'], [2, 'Grupo'], [3, 'Subgrupo'], [4, 'Título'], [5, 'Subtítulo'], [7, 'Item'], [9, 'Subitem']], f.nivel)}</select></label>
      <label>Matriz <select name="matriz">${opc([['MSCC', 'Agregada (mensal)'], ['MSCE', 'Encerramento (dezembro)']], f.matriz)}</select></label>
      <button class="botao botao-primario" type="submit">Consultar</button>
    </form><div data-saida>${aviso('Escolha a classe e o mês e clique em Consultar. A consulta traz o mesmo mês dos três exercícios; classes orçamentárias (5 e 6) são volumosas e podem levar alguns segundos.', 'info')}</div>`,
    'Saldos contábeis do Município (Prefeitura, Câmara e demais unidades consolidadas), no padrão do PCASP. A API não fornece o nome das contas; os níveis de classe e grupo são rotulados pelo painel.');
  const saida = el.querySelector('[data-saida]');
  el.querySelector('[data-form]').addEventListener('submit', async ev => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    Object.assign(f, { classe: +fd.get('classe'), mes: +fd.get('mes'), valor: fd.get('valor'), nivel: +fd.get('nivel'), matriz: fd.get('matriz') });
    const recurso = f.classe <= 4 ? 'msc_patrimonial' : f.classe <= 6 ? 'msc_orcamentaria' : 'msc_controle';
    const mes = f.matriz === 'MSCE' ? 12 : f.mes;
    saida.innerHTML = aviso('Consultando a MSC no SICONFI…', 'info');
    try {
      const respostas = await Promise.all(p.anos.map(a => consultar(recurso, { id_ente: p.ente.c, an_referencia: a, me_referencia: mes, co_tipo_matriz: f.matriz, classe_conta: f.classe, id_tv: f.valor }).catch(() => ({ itens: [] }))));
      const devedora = [1, 3, 5, 7].includes(f.classe);
      const mapa = new Map();
      respostas.forEach((r, i) => r.itens.forEach(it => {
        const chave = String(it.conta_contabil).slice(0, f.nivel);
        const sinal = (it.natureza_conta === 'D') === devedora ? 1 : -1;
        if (!mapa.has(chave)) mapa.set(chave, [null, null, null]);
        mapa.get(chave)[i] = (mapa.get(chave)[i] || 0) + sinal * it.valor;
      }));
      const linhas = [...mapa.entries()].sort(([x], [y]) => x.localeCompare(y)).map(([cod, valores]) =>
        linha(`${mascara(cod)}${cod.length === 1 ? ' – ' + CLASSES_MSC[cod] : cod.length === 2 && GRUPOS_MSC[cod] ? ' – ' + GRUPOS_MSC[cod] : ''}`, valores));
      const cab = p.anos.map(a => ({ titulo: String(a), sub: `${MESES[mes - 1]}.` }));
      saida.innerHTML = linhas.length
        ? tabelaComparativa({ cabecalhos: cab, linhas, primeira: `Conta contábil – natureza ${devedora ? 'devedora' : 'credora'} positiva`, legenda: `${respostas.reduce((s, r) => s + r.itens.length, 0).toLocaleString('pt-BR')} registros agregados` })
        : aviso('O SICONFI não devolveu registros para essa combinação.', 'alerta');
    } catch (erro) { saida.innerHTML = aviso(esc(erro.message), 'critico'); }
  });
}

// ---------------------------------------------------------------- entregas

function abaEntregas(el, { p }) {
  const hoje = new Date();
  const porAno = p.anos.map(a => entregas(p, a, hoje));
  const chaves = [];
  porAno.forEach(l => l.forEach(x => { const k = `${x.instituicao}|${x.rotulo}`; if (!chaves.includes(k)) chaves.push(k); }));
  const sevSit = { 'no prazo': 'ok', 'entregue': 'ok', 'retificado': 'baixo', 'fora do prazo': 'medio', 'não entregue': 'critico', 'aguardando': 'nd' };
  const cel = x => !x ? '<td>—</td>' : `<td>${selo(sevSit[x.situacao], x.situacao === 'aguardando' ? 'A vencer' : x.situacao[0].toUpperCase() + x.situacao.slice(1))}<small>${x.dataStatus ? `${x.tipo === 'MSC' ? 'último envio' : 'status'} em ${data(x.dataStatus)}` : `prazo ${data(x.prazo)}`}</small></td>`;
  const instituicoes = [...new Set(chaves.map(k => k.split('|')[0]))];
  const tabelas = instituicoes.map(inst => {
    const linhas = chaves.filter(k => k.startsWith(inst + '|')).map(k => {
      const rotulo = k.split('|')[1];
      return `<tr><th scope="row">${esc(rotulo)}</th>${porAno.map(l => cel(l.find(x => `${x.instituicao}|${x.rotulo}` === k))).join('')}</tr>`;
    }).join('');
    return `<h3 class="grupo">${esc(inst)}</h3><div class="tabela-rolagem"><table class="tabela tabela-entregas"><thead><tr><th scope="col">Entregável</th>${p.anos.map((a, i) => `<th scope="col"><span class="marca-serie" style="background:${CORES_SERIE[i]}"></span>${a}</th>`).join('')}</tr></thead><tbody>${linhas}</tbody></table></div>`;
  }).join('');
  const conta = (l, s) => l.filter(x => x.situacao === s).length;
  el.innerHTML = secao('Resumo das entregas', tabelaComparativa({ cabecalhos: p.anos.map(a => ({ titulo: String(a) })), primeira: 'Situação', linhas: [
      linha('Entregas registradas', porAno.map(l => l.filter(x => x.status !== null || x.dataStatus).length), { tipo: 'num0' }),
      linha('MSC mensais enviadas', porAno.map(l => conta(l, 'entregue')), { tipo: 'num0' }),
      linha('RREO, RGF e DCA com último status no prazo', porAno.map(l => conta(l, 'no prazo')), { tipo: 'num0' }),
      linha('RREO, RGF e DCA com último status após o prazo', porAno.map(l => conta(l, 'fora do prazo')), { tipo: 'num0' }),
      linha('RREO, RGF e DCA retificados', porAno.map(l => conta(l, 'retificado')), { tipo: 'num0' }),
      linha('Vencidas e não entregues', porAno.map(l => conta(l, 'não entregue')), { tipo: 'num0', forte: true }),
    ] }), 'Prazos: RREO – 30 dias após o bimestre (LRF, art. 52); RGF – 30 dias após o quadrimestre ou semestre (art. 55, § 2º); DCA – 30 de abril (art. 51, § 1º, I); MSC – último dia do mês seguinte.')
    + secao('Extrato por instituição', tabelas + aviso('A API informa a data do <em>último</em> status de cada entrega (homologação, retificação ou reenvio), não a da primeira homologação. "Fora do prazo" e "Retificado" pedem conferência no próprio SICONFI; para a MSC, que costuma ser reenviada, o painel indica apenas se há envio registrado.', 'info'));
}

// ---------------------------------------------------------------- explorador

function explorador(el, ctx) {
  const { p, estado } = ctx, m = estado.modo;
  const fontes = [['rreo', 'RREO – Relatório Resumido da Execução Orçamentária']];
  const insts = [...new Set(p.anosRGF.flatMap(a => p.listaRGF(a, m).map(x => x.instituicao)))];
  insts.forEach(i => fontes.push(['rgf:' + i, `RGF – ${i}`]));
  fontes.push(['dca', 'DCA – Declaração de Contas Anuais']);
  const f = estado.exp ||= { fonte: 'rreo', anexo: null, coluna: null };
  if (!fontes.some(([k]) => k === f.fonte)) f.fonte = 'rreo';
  const demos = f.fonte === 'rreo' ? p.anos.map(a => p.demoRREO(a, m))
    : f.fonte === 'dca' ? p.anosDCA.map(a => p.dca[a])
      : p.anosRGF.map(a => p.rgfDe(a, f.fonte.slice(4), m));
  const cab = f.fonte === 'rreo' ? cabRREO(p, m) : f.fonte === 'dca' ? cabDCA(p) : cabRGF(p, m);
  const anexos = [...new Set(demos.flatMap(d => d ? d.nomesAnexos() : []))].sort((a, b) => a.localeCompare(b, 'pt', { numeric: true }));
  if (!anexos.includes(f.anexo)) f.anexo = anexos[0] || null;
  const colunas = new Map();
  demos.forEach(d => d && d.colunas(f.anexo).forEach((rotulo, chave) => { if (!colunas.has(chave)) colunas.set(chave, rotulo); }));
  if (!colunas.has(f.coluna)) f.coluna = [...colunas.keys()].find(c => /ATE O BIMESTRE|LIQUIDADAS ATE|TOTAL \(ULTIMOS|^VALOR$|^31\/12/.test(c)) || [...colunas.keys()][0] || null;
  const exata = f.coluna ? new RegExp('^' + f.coluna.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') : /^$/;
  const linhas = f.anexo ? linhasDoAnexo(demos, f.anexo, exata) : [];
  const grupos = [...new Set(linhas.map(l => l.grupo))];
  const comSecoes = grupos.length > 1 ? grupos.flatMap(g => [{ secao: g }, ...linhas.filter(l => l.grupo === g)]) : linhas;
  const opc = (lista, atual) => lista.map(([v, n]) => `<option value="${esc(v)}" ${v === atual ? 'selected' : ''}>${esc(n)}</option>`).join('');
  el.innerHTML = secao('Explorador de demonstrativos', `
    <div class="barra-acoes">
      <label>Demonstrativo <select data-campo="fonte">${opc(fontes, f.fonte)}</select></label>
      <label>Anexo <select data-campo="anexo">${opc(anexos.map(a => [a, a]), f.anexo)}</select></label>
      <label>Coluna <select data-campo="coluna">${opc([...colunas.entries()], f.coluna)}</select></label>
      <span class="espaco"></span><button class="botao" data-acao="csv">Baixar CSV</button>
    </div>
    ${tabelaComparativa({ cabecalhos: cab, linhas: comSecoes, primeira: `${f.anexo || ''} – ${colunas.get(f.coluna) || ''}`, legenda: `${linhas.length} contas` })}`,
    'Todas as contas de qualquer anexo do RREO, do RGF e da DCA, lado a lado nos três exercícios. ' + (f.fonte === 'rreo' ? notaModo(p, m) : ''));
  el.querySelectorAll('[data-campo]').forEach(s => s.addEventListener('change', () => {
    f[s.dataset.campo] = s.value;
    if (s.dataset.campo === 'fonte') { f.anexo = null; f.coluna = null; }
    if (s.dataset.campo === 'anexo') f.coluna = null;
    explorador(el, ctx);
  }));
  el.querySelector('[data-acao="csv"]').addEventListener('click', () => baixarCSV(`${norm(f.anexo || 'anexo').replace(/\W+/g, '-').toLowerCase()}-vicosa.csv`,
    ['Grupo', 'Conta', ...cab.map(c => `${c.titulo} ${c.sub || ''}`.trim())], linhas.map(l => [l.grupo, l.rotulo, ...l.valores])));
}

// ---------------------------------------------------------------- metodologia

function sobre(el, { p }) {
  el.innerHTML = secao('Fonte dos dados', `<div class="texto">
      <p>Todos os valores vêm, em tempo real, da <a href="https://apidatalake.tesouro.gov.br/docs/siconfi/" target="_blank" rel="noopener">API de dados abertos do SICONFI</a> (Sistema de Informações Contábeis e Fiscais do Setor Público Brasileiro), mantida pela Secretaria do Tesouro Nacional. Este painel é exclusivo do <strong>Município de Viçosa/MG</strong> (código IBGE 3171303): mostra os demonstrativos declarados e homologados pela Prefeitura e pela Câmara Municipal – RREO, RGF, DCA, MSC e extrato de entregas. O painel não altera os valores – apenas os organiza, compara e confronta com os limites legais.</p>
      <p>As consultas ficam guardadas no navegador por 12 horas para acelerar a navegação. Use <strong>Atualizar dados</strong> para buscar novamente no SICONFI.</p>
      <p>Dados deste carregamento obtidos em ${dataHora(p.obtidoEm)}${p.defasado ? ' (parte veio do cache local porque a API não respondeu)' : ''}.</p></div>`)
    + secao('Comparação entre exercícios', `<div class="texto">
      <p>Cada aba compara o exercício selecionado com os dois anteriores. No modo <strong>mesmo período</strong>, os três exercícios são lidos no mesmo bimestre (RREO) e no mesmo quadrimestre ou semestre (RGF). No modo <strong>anteriores encerrados</strong>, o exercício atual é comparado com o fechamento (6º bimestre / último período) dos anteriores.</p>
      <p>A DCA é anual: enquanto a do exercício selecionado não é entregue, a aba Balanço anual compara os três últimos balanços disponíveis. O RGF Anexo 05 (disponibilidade de caixa) só existe no último período de cada exercício.</p></div>`)
    + secao('Regras dos apontamentos', `<div class="tabela-rolagem"><table class="tabela tabela-texto"><thead><tr><th>Verificação</th><th>Critério</th><th>Fundamento</th></tr></thead><tbody>
      <tr><th>Despesa corrente / receita corrente</th><td>12 meses; despesas liquidadas + RPNP de dezembro; alerta a 85% e limite a 95%; projeção para dezembro</td><td>CF/88, art. 167-A; TCE-MG, IN nº 07/2025</td></tr>
      <tr><th>Despesa com pessoal</th><td>Percentual e limites declarados no RGF Anexo 01 de cada Poder/órgão; tendência de 12 meses</td><td>LRF, arts. 19 a 23 e 59</td></tr>
      <tr><th>Dívida, operações de crédito e garantias</th><td>120% da RCL; 16%; 22%</td><td>Resoluções SF nº 40 e 43/2001</td></tr>
      <tr><th>Regra de ouro</th><td>Operações de crédito × despesas de capital</td><td>CF/88, art. 167, III</td></tr>
      <tr><th>Resultado da execução</th><td>Receita realizada − despesa empenhada, considerado o superávit financeiro utilizado</td><td>Lei nº 4.320/1964, art. 48; LRF, arts. 1º e 9º</td></tr>
      <tr><th>Arrecadação</th><td>Projeção de encerramento abaixo de 95% (médio) ou 90% (alto) da previsão</td><td>LRF, arts. 9º e 12</td></tr>
      <tr><th>Receitas de capital</th><td>Realização muito inferior à previsão, de forma recorrente</td><td>LRF, art. 12</td></tr>
      <tr><th>Restos a pagar</th><td>Cancelamento de processados; crescimento do estoque acima de 15% / 30%</td><td>Lei nº 4.320/1964, arts. 36 e 63; LRF, art. 42</td></tr>
      <tr><th>Caixa por vinculação</th><td>Disponibilidade líquida negativa após RPNP em qualquer fonte</td><td>LRF, arts. 8º, 42 e 50</td></tr>
      <tr><th>RPPS</th><td>Resultado previdenciário negativo</td><td>CF/88, art. 40; LRF, art. 69</td></tr>
      <tr><th>Entregas</th><td>RREO, RGF, DCA e MSC vencidos sem registro; status após o prazo; retificações</td><td>LRF, arts. 51, 52 e 55; CF/88, art. 163-A</td></tr>
      <tr><th>Consistência</th><td>RCL e DCL iguais no RREO e no RGF; despesa da DCA igual à do RREO do 6º bimestre</td><td>LRF, arts. 48 e 50; MDF/STN</td></tr>
    </tbody></table></div>`)
    + secao('Limitações', `<div class="texto"><ul>
      <li>As análises são <strong>indicativas</strong> e não substituem a apuração oficial do TCE-MG, que utiliza o SICOM e documentos que não estão no SICONFI.</li>
      <li>Os índices de educação (25%), FUNDEB e saúde (15%) são apurados no SIOPE e no SIOPS e não constam da API do SICONFI.</li>
      <li>O SICONFI não detalha a despesa por fonte de recursos nos demonstrativos fiscais; por isso a relação do art. 167-A não exclui as despesas custeadas com superávit financeiro do exercício anterior.</li>
      <li>A meta de resultado primário da LDO e o limite de gastos do Legislativo (CF, art. 29-A) dependem de dados que não estão na API.</li>
      <li>O extrato de entregas traz a data do último status, não a da primeira homologação.</li></ul></div>`);
}

export const DESENHAR = { visao, apontamentos: abaApontamentos, art167, receitas, despesas, rcl, pessoal: abaPessoal, divida: abaDivida,
  caixa: abaCaixa, resultados: abaResultados, dca: abaDCA, msc: abaMSC, entregas: abaEntregas, explorador, sobre };
