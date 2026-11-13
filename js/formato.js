// Formatação de valores em português do Brasil.

const nf = (min, max) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max });
const F0 = nf(0, 0), F1 = nf(1, 1), F2 = nf(2, 2);

export const vazio = v => v === null || v === undefined || Number.isNaN(v);

export function moeda(v) { return vazio(v) ? '—' : 'R$ ' + F2.format(v); }
export function numero(v, casas = 2) { return vazio(v) ? '—' : nf(casas, casas).format(v); }

/** Valor monetário abreviado: R$ 12,3 mi; R$ 4,56 bi; R$ 870 mil. */
export function moedaCurta(v) {
  if (vazio(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e9) return 'R$ ' + F2.format(v / 1e9) + ' bi';
  if (a >= 1e6) return 'R$ ' + F1.format(v / 1e6) + ' mi';
  if (a >= 1e3) return 'R$ ' + F0.format(v / 1e3) + ' mil';
  return 'R$ ' + F0.format(v);
}

export function pct(v, casas = 2) { return vazio(v) ? '—' : nf(casas, casas).format(v) + '%'; }
export function pp(v, casas = 2) { return vazio(v) ? '—' : (v > 0 ? '+' : '') + nf(casas, casas).format(v) + ' p.p.'; }

/** Variação percentual de `atual` sobre `base`. */
export function variacao(atual, base) {
  if (vazio(atual) || vazio(base) || base === 0) return null;
  return (atual - base) / Math.abs(base) * 100;
}
export function pctVariacao(v) {
  if (vazio(v)) return '—';
  if (Math.abs(v) > 999) return v > 0 ? '> +999%' : '< -999%';
  return (v > 0 ? '+' : '') + F1.format(v) + '%';
}

export function data(d) {
  if (!d) return '—';
  const dt = d instanceof Date ? d : new Date(d);
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}
export function dataHora(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export const esc = s => (s ?? '').toString().replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
