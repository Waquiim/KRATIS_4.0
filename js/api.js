// Acesso à API de dados abertos do SICONFI (Tesouro Nacional), com fila, repetição e cache local.
// Documentação: https://apidatalake.tesouro.gov.br/docs/siconfi/

const BASE = 'https://apidatalake.tesouro.gov.br/ords/siconfi/tt/';
const VALIDADE_MS = 12 * 3600 * 1000;   // o cache local vale 12 horas
const SIMULTANEAS = 4;                   // consultas simultâneas (a API limita o ritmo)
const TENTATIVAS = 4;

const memoria = new Map();               // chave -> Promise<{itens, em, defasado}>
const fila = [];
let ativas = 0;

export const progresso = { total: 0, feitas: 0 };
const ouvintes = new Set();
export function aoProgredir(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn); }
function avisar() { ouvintes.forEach(fn => fn(progresso)); }

// ---------------------------------------------------------------- cache (IndexedDB)

let bancoPromessa = null;
function banco() {
  if (bancoPromessa) return bancoPromessa;
  bancoPromessa = new Promise(resolve => {
    try {
      const pedido = indexedDB.open('kratis-siconfi', 1);
      pedido.onupgradeneeded = () => pedido.result.createObjectStore('consultas');
      pedido.onsuccess = () => resolve(pedido.result);
      pedido.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
  return bancoPromessa;
}

async function lerCache(chave) {
  const db = await banco();
  if (!db) return null;
  return new Promise(resolve => {
    try {
      const pedido = db.transaction('consultas').objectStore('consultas').get(chave);
      pedido.onsuccess = () => resolve(pedido.result || null);
      pedido.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

async function gravarCache(chave, valor) {
  const db = await banco();
  if (!db) return;
  try { db.transaction('consultas', 'readwrite').objectStore('consultas').put(valor, chave); } catch { /* sem cache */ }
}

export async function limparCache() {
  memoria.clear();
  const db = await banco();
  if (!db) return;
  await new Promise(resolve => {
    try {
      const t = db.transaction('consultas', 'readwrite');
      t.objectStore('consultas').clear();
      t.oncomplete = t.onerror = () => resolve();
    } catch { resolve(); }
  });
}

// ---------------------------------------------------------------- rede

const espera = ms => new Promise(r => setTimeout(r, ms));

function naFila(tarefa) {
  return new Promise((resolve, reject) => {
    fila.push({ tarefa, resolve, reject });
    proxima();
  });
}

function proxima() {
  while (ativas < SIMULTANEAS && fila.length) {
    const { tarefa, resolve, reject } = fila.shift();
    ativas++;
    tarefa().then(resolve, reject).finally(() => { ativas--; proxima(); });
  }
}

async function baixarPagina(url) {
  let ultimoErro;
  for (let i = 0; i < TENTATIVAS; i++) {
    try {
      const resposta = await fetch(url, { headers: { Accept: 'application/json' } });
      if (resposta.ok) return await resposta.json();
      ultimoErro = new Error(`HTTP ${resposta.status}`);
      if (resposta.status < 500 && resposta.status !== 429) break;   // erro do pedido: não adianta repetir
    } catch (erro) { ultimoErro = erro; }
    await espera(600 * 2 ** i);
  }
  throw ultimoErro;
}

function montarUrl(recurso, params, deslocamento) {
  const pares = Object.keys(params).sort()
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map(k => `${k}=${encodeURIComponent(params[k])}`);
  if (deslocamento) pares.push(`offset=${deslocamento}`);
  return BASE + recurso + (pares.length ? '?' + pares.join('&') : '');
}

async function baixarTudo(recurso, params) {
  const itens = [];
  let deslocamento = 0;
  for (;;) {
    const pagina = await naFila(() => baixarPagina(montarUrl(recurso, params, deslocamento)));
    itens.push(...(pagina.items || []));
    if (!pagina.hasMore) return itens;
    deslocamento += pagina.limit || (pagina.items || []).length || 5000;
  }
}

/**
 * Consulta um recurso da API (todas as páginas). Devolve { itens, em, defasado }.
 * `em` é o instante em que os dados foram obtidos; `defasado` indica que a API falhou
 * e foi usado um resultado antigo do cache.
 */
export function consultar(recurso, params = {}, { forcar = false } = {}) {
  const chave = montarUrl(recurso, params, 0);
  if (!forcar && memoria.has(chave)) return memoria.get(chave);
  const promessa = (async () => {
    const guardado = await lerCache(chave);
    if (guardado && !forcar && Date.now() - guardado.em < VALIDADE_MS) return { ...guardado, defasado: false };
    progresso.total++; avisar();
    try {
      const itens = await baixarTudo(recurso, params);
      const resultado = { itens, em: Date.now() };
      gravarCache(chave, resultado);
      return { ...resultado, defasado: false };
    } catch (erro) {
      if (guardado) return { ...guardado, defasado: true };
      memoria.delete(chave);
      throw new Error(`Falha ao consultar ${recurso} no SICONFI (${erro.message || erro})`);
    } finally {
      progresso.feitas++; avisar();
    }
  })();
  memoria.set(chave, promessa);
  return promessa;
}

export function zerarProgresso() { progresso.total = 0; progresso.feitas = 0; avisar(); }
