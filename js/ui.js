// Componentes de interface: selos, cartões, tabelas comparativas e gráficos em SVG.

import { moeda, moedaCurta, pct, pp, numero, variacao, pctVariacao, vazio, esc } from './formato.js';
import { SEVERIDADES } from './analise.js';
import { norm } from './modelo.js';

export const CORES_SERIE = ['var(--serie-1)', 'var(--serie-2)', 'var(--serie-3)'];

const FORMATOS = {
  moeda: v => moeda(v), curta: v => moedaCurta(v), pct: v => pct(v), num: v => numero(v), num0: v => numero(v, 0), pct1: v => pct(v, 1),
};
export const formatar = (v, tipo = 'moeda') => (FORMATOS[tipo] || FORMATOS.moeda)(v);

// ---------------------------------------------------------------- selos e cartões

export function selo(sev, texto = null) {
  const s = SEVERIDADES[sev] || SEVERIDADES.nd;
  return `<span class="selo selo-${sev}"><span class="selo-icone" aria-hidden="true">${s.icone}</span>${esc(texto ?? s.rotulo)}</span>`;
}

/** Variação entre dois valores, formatada conforme o tipo (percentual para moeda, p.p. para índices). */
export function delta(atual, base, tipo = 'moeda') {
  if (vazio(atual) || vazio(base)) return '—';
  if (tipo === 'pct' || tipo === 'pct1') return pp(atual - base);
  return pctVariacao(variacao(atual, base));
}

/**
 * Cartão de indicador com o exercício atual em destaque e os dois anteriores abaixo.
 * valores: [atual, anterior, anterior-2]; rotulos: rótulos curtos das colunas.
 */
export function cartao({ titulo, valores, rotulos, tipo = 'curta', sev = null, nota = '', aba = null }) {
  const [v0, v1, v2] = valores;
  const tipoDelta = tipo === 'curta' ? 'moeda' : tipo;
  return `<article class="cartao"${aba ? ` data-ir="${aba}" tabindex="0" role="link"` : ''}>
    <header><h3>${esc(titulo)}</h3>${sev ? selo(sev) : ''}</header>
    <p class="cartao-valor">${formatar(v0, tipo)}</p>
    <dl class="cartao-comparativo">
      <div><dt>${esc(rotulos[1])}</dt><dd>${formatar(v1, tipo)} <span class="delta">${delta(v0, v1, tipoDelta)}</span></dd></div>
      <div><dt>${esc(rotulos[2])}</dt><dd>${formatar(v2, tipo)} <span class="delta">${delta(v0, v2, tipoDelta)}</span></dd></div>
    </dl>
    ${nota ? `<p class="cartao-nota">${nota}</p>` : ''}
  </article>`;
}

/**
 * Cartão de índice com meta legal: mostra o percentual, uma barra com o marco do mínimo (ou do máximo)
 * e a comparação com os dois exercícios anteriores. sentido: 'minimo' ou 'maximo'.
 */
export function cartaoMeta({ titulo, valores, rotulos, meta, sentido = 'minimo', rotuloMeta = null, sev = 'nd', textoSelo = null, nota = '', aba = null }) {
  const [v0, v1, v2] = valores;
  const temValor = !vazio(v0);
  const teto = Math.max(temValor ? v0 : 0, meta) * (sentido === 'minimo' ? 1.3 : 1.12) || 1;
  const pos = v => Math.max(0, Math.min(100, v / teto * 100));
  const classe = { critico: 'critico', alto: 'alto', medio: 'medio' }[sev] || 'ok';
  const folga = temValor ? (sentido === 'minimo' ? v0 - meta : meta - v0) : null;
  const legenda = `${rotuloMeta || (sentido === 'minimo' ? 'Mínimo' : 'Limite')} ${pct(meta, meta % 1 ? 1 : 0)}`
    + (temValor ? ` · ${folga >= 0 ? (sentido === 'minimo' ? 'acima em ' : 'folga de ') : (sentido === 'minimo' ? 'abaixo em ' : 'excesso de ')}${numero(Math.abs(folga))} p.p.` : '');
  return `<article class="cartao cartao-meta"${aba ? ` data-ir="${aba}" tabindex="0" role="link"` : ''}>
    <header><h3>${esc(titulo)}</h3>${selo(sev, textoSelo)}</header>
    <p class="cartao-valor">${formatar(v0, 'pct')}</p>
    <div class="meta" role="img" aria-label="${esc(titulo)}: ${formatar(v0, 'pct')}; ${esc(legenda)}">
      <div class="meta-trilho">${temValor ? `<div class="medidor-barra medidor-${classe}" style="width:${pos(v0)}%"></div>` : ''}<span class="medidor-marco" style="left:${pos(meta)}%"></span></div>
      <p class="meta-legenda">${esc(legenda)}</p>
    </div>
    <dl class="cartao-comparativo">
      <div><dt>${esc(rotulos[1])}</dt><dd>${formatar(v1, 'pct')} <span class="delta">${delta(v0, v1, 'pct')}</span></dd></div>
      <div><dt>${esc(rotulos[2])}</dt><dd>${formatar(v2, 'pct')} <span class="delta">${delta(v0, v2, 'pct')}</span></dd></div>
    </dl>
    ${nota ? `<p class="cartao-nota">${nota}</p>` : ''}
  </article>`;
}

/** Barra de medição de um percentual frente a limites: marcos = [{valor, rotulo}]. */
export function medidor({ valor, marcos = [], maximo = null, rotulo = '' }) {
  if (vazio(valor)) return '<div class="medidor medidor-vazio">sem dados</div>';
  const teto = maximo ?? Math.max(valor, ...marcos.map(m => m.valor)) * 1.12;
  const pos = v => Math.max(0, Math.min(100, v / teto * 100));
  const ordenados = [...marcos].sort((a, b) => a.valor - b.valor);
  const nivel = ordenados.filter(m => valor > m.valor).length;
  const classe = nivel === 0 ? 'ok' : nivel >= ordenados.length ? 'critico' : nivel === ordenados.length - 1 && ordenados.length > 2 ? 'alto' : 'medio';
  return `<div class="medidor" role="img" aria-label="${esc(rotulo)} ${pct(valor)}">
    <div class="medidor-trilho"><div class="medidor-barra medidor-${classe}" style="width:${pos(valor)}%"></div>
      ${ordenados.map(m => `<span class="medidor-marco" style="left:${pos(m.valor)}%"></span>`).join('')}</div>
    <ul class="medidor-legenda">${ordenados.map(m => `<li>${esc(m.rotulo)} <strong>${pct(m.valor, m.valor % 1 ? 1 : 0)}</strong></li>`).join('')}</ul>
  </div>`;
}

// ---------------------------------------------------------------- tabelas

/**
 * Tabela comparativa de três exercícios.
 * linhas: [{ rotulo, valores:[a,b,c], tipo, nivel, forte, nota }]; cabecalhos: [{titulo, sub}] (3).
 */
export function tabelaComparativa({ linhas, cabecalhos, legenda = '', primeira = 'Conta' }) {
  const corpo = linhas.map(l => {
    if (l.secao) return `<tr class="secao"><th colspan="6" scope="colgroup">${esc(l.secao)}</th></tr>`;
    const t = l.tipo || 'moeda';
    const [a, b, c] = l.valores;
    return `<tr class="${l.forte ? 'forte' : ''}">
      <th scope="row" class="nivel-${l.nivel || 0}">${esc(l.rotulo)}${l.nota ? ` <span class="nota-linha">${esc(l.nota)}</span>` : ''}</th>
      <td>${formatar(a, t)}</td><td>${formatar(b, t)}</td><td>${formatar(c, t)}</td>
      <td class="delta ${classeDelta(a, b)}">${delta(a, b, t)}</td><td class="delta ${classeDelta(a, c)}">${delta(a, c, t)}</td></tr>`;
  }).join('');
  const cab = cabecalhos.map((c, i) => `<th scope="col"><span class="marca-serie" style="background:${CORES_SERIE[i]}"></span>${esc(c.titulo)}${c.sub ? `<small>${esc(c.sub)}</small>` : ''}</th>`).join('');
  return `<div class="tabela-rolagem"><table class="tabela">
    ${legenda ? `<caption>${legenda}</caption>` : ''}
    <thead><tr><th scope="col">${esc(primeira)}</th>${cab}
      <th scope="col">Δ ${esc(cabecalhos[0].titulo)}/${esc(cabecalhos[1].titulo)}</th><th scope="col">Δ ${esc(cabecalhos[0].titulo)}/${esc(cabecalhos[2].titulo)}</th></tr></thead>
    <tbody>${corpo || '<tr><td colspan="6" class="vazio">Sem dados no SICONFI para este demonstrativo.</td></tr>'}</tbody></table></div>`;
}

function classeDelta(a, b) {
  if (vazio(a) || vazio(b) || a === b) return '';
  return a > b ? 'sobe' : 'desce';
}

/**
 * Linhas de um anexo inteiro nos três demonstrativos, para uma coluna (RegExp sobre o nome normalizado).
 * Une as contas pela chave rótulo|código|nome, na ordem do demonstrativo mais recente que as contenha.
 */
export function linhasDoAnexo(demos, anexo, coluna, { filtro = null, tipo = null } = {}) {
  const ordem = [];
  const vistos = new Map();
  demos.forEach((d, i) => {
    let ancora = -1;
    for (const l of d ? d.linhas(anexo) : []) {
      if (filtro && !filtro(l)) continue;
      let valor = null;
      for (const [col, v] of l.valores) if (coluna.test(col)) { valor = v; break; }
      if (valor === null) continue;
      let item = vistos.get(l.chave);
      if (!item) {
        item = { chave: l.chave, rotulo: l.conta, valores: [null, null, null], forte: ehTitulo(l.conta), grupo: l.rotulo };
        vistos.set(l.chave, item);
        ordem.splice(++ancora, 0, item);
      } else ancora = ordem.indexOf(item);
      item.valores[i] = valor;
      if (tipo) item.tipo = tipo;
      else if (/^%|PERCENTUAL/.test(norm(l.conta)) || /^%/.test(norm([...l.valores.keys()].find(c => coluna.test(c)) || ''))) item.tipo = 'pct';
    }
  });
  return ordem;
}

const ehTitulo = conta => { const letras = conta.replace(/[^A-Za-zÀ-ÿ]/g, ''); return letras.length > 3 && letras === letras.toUpperCase(); };

// ---------------------------------------------------------------- gráficos (SVG)

const L = 720, MARGEM = { topo: 16, dir: 16, base: 34, esq: 64 };

function escala(min, max, altura) {
  if (min === max) { max = min + 1; }
  const faixa = max - min;
  const bruto = faixa / 4, pot = 10 ** Math.floor(Math.log10(bruto)), f = bruto / pot;
  const passo = (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * pot;
  const y0 = Math.floor(min / passo) * passo, y1 = Math.ceil(max / passo) * passo;
  const marcas = [];
  for (let v = y0; v <= y1 + passo / 2; v += passo) marcas.push(Math.abs(v) < passo / 1e6 ? 0 : v);
  return { y0, y1, marcas, y: v => MARGEM.topo + (1 - (v - y0) / (y1 - y0)) * altura };
}

const rotuloEixo = (v, tipo) => tipo === 'pct' ? pct(v, 0) : moedaCurta(v).replace('R$ ', '');

function legenda(series) {
  if (series.length < 2) return '';
  return `<ul class="legenda">${series.map((s, i) => `<li><span class="marca-serie" style="background:${s.cor || CORES_SERIE[i]}"></span>${esc(s.nome)}</li>`).join('')}</ul>`;
}

/** Barras agrupadas: categorias no eixo X, uma barra por série (exercício). */
export function graficoBarras({ categorias, series, tipo = 'curta', altura = 250, titulo = '' }) {
  const valores = series.flatMap(s => s.valores).filter(v => !vazio(v));
  if (!valores.length) return '<p class="vazio">Sem dados para o gráfico.</p>';
  const h = altura - MARGEM.topo - MARGEM.base, w = L - MARGEM.esq - MARGEM.dir;
  const e = escala(Math.min(0, ...valores), Math.max(0, ...valores), h);
  const faixa = w / categorias.length, n = series.length;
  const larg = Math.min(26, (faixa * 0.72 - (n - 1) * 2) / n), grupo = n * larg + (n - 1) * 2;
  const base = e.y(0);
  let marcas = '';
  categorias.forEach((cat, ci) => {
    const x0 = MARGEM.esq + faixa * ci + (faixa - grupo) / 2;
    series.forEach((s, si) => {
      const v = s.valores[ci];
      if (vazio(v)) return;
      const x = x0 + si * (larg + 2), y = e.y(v), alt = Math.abs(y - base), r = Math.min(4, larg / 2, alt);
      const d = v >= 0
        ? `M${x},${base}V${y + r}a${r},${r} 0 0 1 ${r},${-r}h${larg - 2 * r}a${r},${r} 0 0 1 ${r},${r}V${base}Z`
        : `M${x},${base}V${y - r}a${r},${r} 0 0 0 ${r},${r}h${larg - 2 * r}a${r},${r} 0 0 0 ${r},${-r}V${base}Z`;
      marcas += `<path d="${d}" fill="${s.cor || CORES_SERIE[si]}" data-dica="${esc(`${cat} · ${s.nome}: ${formatar(v, tipo === 'curta' ? 'moeda' : tipo)}`)}"/>`;
    });
    marcas += `<text class="eixo-x" x="${MARGEM.esq + faixa * (ci + 0.5)}" y="${altura - 12}" text-anchor="middle">${esc(cat)}</text>`;
  });
  const grade = e.marcas.map(v => `<line class="${v === 0 ? 'eixo-zero' : 'grade'}" x1="${MARGEM.esq}" x2="${L - MARGEM.dir}" y1="${e.y(v)}" y2="${e.y(v)}"/>
    <text class="eixo-y" x="${MARGEM.esq - 8}" y="${e.y(v) + 4}" text-anchor="end">${rotuloEixo(v, tipo)}</text>`).join('');
  return `<figure class="grafico">${titulo ? `<figcaption>${esc(titulo)}</figcaption>` : ''}${legenda(series)}
    <div class="grafico-area"><svg viewBox="0 0 ${L} ${altura}" role="img" aria-label="${esc(titulo)}">${grade}${marcas}</svg></div></figure>`;
}

/** Linhas: rótulos no eixo X, uma linha por série; refs = linhas horizontais de referência. */
export function graficoLinhas({ rotulosX, series, tipo = 'pct', altura = 270, titulo = '', refs = [] }) {
  const valores = [...series.flatMap(s => s.valores), ...refs.map(r => r.valor)].filter(v => !vazio(v));
  if (!series.some(s => s.valores.some(v => !vazio(v)))) return '<p class="vazio">Sem dados para o gráfico.</p>';
  const h = altura - MARGEM.topo - MARGEM.base, w = L - MARGEM.esq - MARGEM.dir - 56;
  const min = Math.min(...valores), max = Math.max(...valores), folga = (max - min) * 0.08 || 1;
  const e = escala(min - folga, max + folga, h);
  const x = i => MARGEM.esq + (rotulosX.length === 1 ? w / 2 : w * i / (rotulosX.length - 1));
  const grade = e.marcas.map(v => `<line class="grade" x1="${MARGEM.esq}" x2="${MARGEM.esq + w}" y1="${e.y(v)}" y2="${e.y(v)}"/>
    <text class="eixo-y" x="${MARGEM.esq - 8}" y="${e.y(v) + 4}" text-anchor="end">${rotuloEixo(v, tipo)}</text>`).join('');
  const eixoX = rotulosX.map((r, i) => `<text class="eixo-x" x="${x(i)}" y="${altura - 12}" text-anchor="middle">${esc(r)}</text>`).join('');
  const linhasRef = refs.map(r => `<line class="ref ref-${r.classe || 'medio'}" x1="${MARGEM.esq}" x2="${MARGEM.esq + w}" y1="${e.y(r.valor)}" y2="${e.y(r.valor)}"/>
    <text class="ref-rotulo" x="${MARGEM.esq + w + 6}" y="${e.y(r.valor) + 4}">${esc(r.rotulo)}</text>`).join('');
  let tracos = '', pontos = '';
  series.forEach((s, si) => {
    const cor = s.cor || CORES_SERIE[si];
    let d = '', aberto = false;
    s.valores.forEach((v, i) => {
      if (vazio(v)) { aberto = false; return; }
      d += `${aberto ? 'L' : 'M'}${x(i)},${e.y(v)}`; aberto = true;
      pontos += `<circle cx="${x(i)}" cy="${e.y(v)}" r="4.5" fill="${cor}" stroke="var(--superficie)" stroke-width="2"/>
        <circle cx="${x(i)}" cy="${e.y(v)}" r="13" fill="transparent" data-dica="${esc(`${rotulosX[i]} · ${s.nome}: ${formatar(v, tipo)}`)}"/>`;
    });
    tracos += `<path d="${d}" fill="none" stroke="${cor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  });
  return `<figure class="grafico">${titulo ? `<figcaption>${esc(titulo)}</figcaption>` : ''}${legenda(series)}
    <div class="grafico-area"><svg viewBox="0 0 ${L} ${altura}" role="img" aria-label="${esc(titulo)}">${grade}${linhasRef}${eixoX}${tracos}${pontos}</svg></div></figure>`;
}

// ---------------------------------------------------------------- dica flutuante

export function instalarDicas(raiz = document) {
  const dica = document.createElement('div');
  dica.className = 'dica'; dica.hidden = true;
  document.body.appendChild(dica);
  const mostrar = ev => {
    const alvo = ev.target.closest?.('[data-dica]');
    if (!alvo) { dica.hidden = true; return; }
    dica.textContent = alvo.dataset.dica; dica.hidden = false;
    const larg = dica.offsetWidth, x = Math.min(window.innerWidth - larg - 8, Math.max(8, ev.clientX - larg / 2));
    dica.style.left = x + 'px'; dica.style.top = Math.max(8, ev.clientY - dica.offsetHeight - 14) + 'px';
  };
  raiz.addEventListener('pointermove', mostrar);
  raiz.addEventListener('pointerdown', mostrar);
  raiz.addEventListener('pointerleave', () => { dica.hidden = true; }, true);
  window.addEventListener('scroll', () => { dica.hidden = true; }, { passive: true });
}

export const aviso = (texto, classe = 'info') => `<p class="aviso aviso-${classe}">${texto}</p>`;
export const secao = (titulo, corpo, sub = '') => `<section class="bloco"><h2>${esc(titulo)}</h2>${sub ? `<p class="sub">${sub}</p>` : ''}${corpo}</section>`;
