// Receitas e despesas por fonte de recursos, a partir da Matriz de Saldos Contábeis (MSC) do SICONFI.
// Os demonstrativos fiscais (RREO/RGF) não trazem a fonte; a MSC traz, e seus totais conferem com o RREO.

import { consultar } from './api.js';
import { MUNICIPIO } from './config.js';

/**
 * Tabela padronizada de fontes ou destinações de recursos – Portaria STN nº 710/2021, consolidada até a
 * Portaria STN/MF nº 1.701, de 4/8/2025. Na MSC a fonte tem quatro dígitos: o primeiro indica o exercício
 * do recurso (1 = exercício corrente; 2 = exercícios anteriores) e os três seguintes são o código abaixo.
 */
export const FONTES = {
  500: 'Recursos não vinculados de impostos',
  501: 'Outros recursos não vinculados',
  502: 'Recursos não vinculados da compensação de impostos',
  503: 'Apoio financeiro da União em decorrência de estado de calamidade pública',
  540: 'Transferências do FUNDEB – impostos e transferências de impostos',
  541: 'Transferências do FUNDEB – complementação da União – VAAF',
  542: 'Transferências do FUNDEB – complementação da União – VAAT',
  543: 'Transferências do FUNDEB – complementação da União – VAAR',
  544: 'Recursos de precatórios do FUNDEF',
  545: 'Recursos de precatórios do FUNDEB (2007-2020)',
  550: 'Transferência do salário-educação',
  551: 'Transferências do FNDE – Programa Dinheiro Direto na Escola (PDDE)',
  552: 'Transferências do FNDE – Programa Nacional de Alimentação Escolar (PNAE)',
  553: 'Transferências do FNDE – Programa Nacional de Apoio ao Transporte Escolar (PNATE)',
  569: 'Outras transferências de recursos do FNDE',
  570: 'Transferências do Governo Federal – convênios e congêneres vinculados à educação',
  571: 'Transferências do Estado – convênios e congêneres vinculados à educação',
  572: 'Transferências de municípios – convênios e congêneres vinculados à educação',
  573: 'Royalties e participação especial de petróleo e gás natural vinculados à educação',
  574: 'Operações de crédito vinculadas à educação',
  575: 'Outras transferências de convênios e congêneres vinculados à educação',
  576: 'Transferências de recursos dos Estados para programas de educação',
  599: 'Outros recursos vinculados à educação',
  600: 'SUS – transferências fundo a fundo do Governo Federal – bloco de manutenção',
  601: 'SUS – transferências fundo a fundo do Governo Federal – bloco de estruturação',
  602: 'SUS – Governo Federal – bloco de manutenção – enfrentamento da COVID-19',
  603: 'SUS – Governo Federal – bloco de estruturação – enfrentamento da COVID-19',
  604: 'Transferências do Governo Federal – vencimento dos agentes comunitários de saúde e de combate às endemias',
  605: 'Assistência financeira da União – complementação do piso salarial da enfermagem',
  621: 'SUS – transferências fundo a fundo do Governo Estadual',
  622: 'SUS – transferências fundo a fundo dos governos municipais',
  631: 'Transferências do Governo Federal – convênios e congêneres vinculados à saúde',
  632: 'Transferências do Estado – convênios e congêneres vinculados à saúde',
  633: 'Transferências de municípios – convênios e congêneres vinculados à saúde',
  634: 'Operações de crédito vinculadas à saúde',
  635: 'Royalties e participação especial de petróleo e gás natural vinculados à saúde',
  636: 'Outras transferências de convênios e congêneres vinculados à saúde',
  659: 'Outros recursos vinculados à saúde',
  660: 'Transferência de recursos do Fundo Nacional de Assistência Social (FNAS)',
  661: 'Transferência de recursos dos fundos estaduais de assistência social',
  662: 'Transferências de recursos dos fundos municipais de assistência social',
  665: 'Transferências de convênios e congêneres vinculados à assistência social',
  669: 'Outros recursos vinculados à assistência social',
  700: 'Outras transferências de convênios ou congêneres da União',
  701: 'Outras transferências de convênios ou congêneres dos Estados',
  702: 'Outras transferências de convênios ou congêneres dos municípios',
  703: 'Outras transferências de convênios ou congêneres de outras entidades',
  704: 'Transferências da União – compensações financeiras pela exploração de recursos naturais',
  705: 'Transferências dos Estados – compensações financeiras pela exploração de recursos naturais',
  706: 'Transferência especial da União',
  707: 'Transferências da União – inciso I do art. 5º da LC nº 173/2020',
  708: 'Transferência da União – compensação financeira de recursos minerais',
  709: 'Transferência da União – compensação financeira de recursos hídricos',
  710: 'Transferência especial dos Estados',
  711: 'Demais transferências obrigatórias não decorrentes de repartições de receitas',
  712: 'Transferências fundo a fundo do Fundo Penitenciário (FUNPEN)',
  713: 'Transferências fundo a fundo do Fundo de Segurança Pública (FSP)',
  714: 'Transferências fundo a fundo do Fundo de Amparo ao Trabalhador (FAT)',
  715: 'Transferências ao setor cultural – LC nº 195/2022, art. 5º – audiovisual',
  716: 'Transferências ao setor cultural – LC nº 195/2022, art. 8º – demais setores da cultura',
  717: 'Assistência financeira ao transporte coletivo – EC nº 123/2022',
  718: 'Auxílio financeiro – outorga de crédito tributário de ICMS – EC nº 123/2022',
  719: 'Transferências da Política Nacional Aldir Blanc de Fomento à Cultura – Lei nº 14.399/2022',
  720: 'Transferências da União – participações na exploração de petróleo e gás natural destinadas ao FEP',
  721: 'Transferências da União – cessão onerosa de petróleo – Lei nº 13.885/2019',
  722: 'Transferências do Fundo de Equalização Federativa (FEF) – LC nº 212/2025',
  747: 'Outras vinculações de transferências da União',
  748: 'Outras vinculações de transferências dos Estados',
  749: 'Outras vinculações de transferências',
  750: 'Recursos da Contribuição de Intervenção no Domínio Econômico (CIDE)',
  751: 'Recursos da Contribuição para o Custeio do Serviço de Iluminação Pública (COSIP)',
  752: 'Recursos vinculados ao trânsito',
  753: 'Recursos provenientes de taxas, contribuições e preços públicos',
  754: 'Recursos de operações de crédito',
  755: 'Recursos de alienação de bens/ativos – administração direta',
  756: 'Recursos de alienação de bens/ativos – administração indireta',
  757: 'Recursos de depósitos judiciais – lides das quais o ente faz parte',
  758: 'Recursos de depósitos judiciais – lides das quais o ente não faz parte',
  759: 'Recursos vinculados a fundos',
  760: 'Recursos de emolumentos, taxas e custas',
  761: 'Recursos vinculados ao Fundo de Combate e Erradicação da Pobreza',
  799: 'Outras vinculações legais',
  800: 'Recursos vinculados ao RPPS – fundo em capitalização (plano previdenciário)',
  801: 'Recursos vinculados ao RPPS – fundo em repartição (plano financeiro)',
  802: 'Recursos vinculados ao RPPS – taxa de administração',
  803: 'Recursos vinculados ao Sistema de Proteção Social dos Militares (SPSM)',
  804: 'Demais recursos previdenciários',
  860: 'Recursos extraorçamentários vinculados a precatórios',
  861: 'Recursos extraorçamentários vinculados a depósitos judiciais',
  862: 'Recursos de depósitos de terceiros',
  869: 'Outros recursos extraorçamentários',
  880: 'Recursos próprios dos consórcios',
  898: 'Recursos a classificar',
  899: 'Outros recursos vinculados',
};

export const GRUPOS_FONTE = [
  { id: 'livres', nome: 'Recursos não vinculados', de: 500, ate: 539 },
  { id: 'educacao', nome: 'Recursos vinculados à educação', de: 540, ate: 599 },
  { id: 'saude', nome: 'Recursos vinculados à saúde', de: 600, ate: 659 },
  { id: 'assistencia', nome: 'Recursos vinculados à assistência social', de: 660, ate: 699 },
  { id: 'transferencias', nome: 'Demais vinculações decorrentes de transferências', de: 700, ate: 749 },
  { id: 'legais', nome: 'Demais vinculações legais', de: 750, ate: 799 },
  { id: 'previdencia', nome: 'Recursos vinculados à previdência', de: 800, ate: 859 },
  { id: 'outros', nome: 'Recursos extraorçamentários e outras vinculações', de: 860, ate: 999 },
];

export const grupoDaFonte = cod => GRUPOS_FONTE.find(g => Number(cod) >= g.de && Number(cod) <= g.ate) || GRUPOS_FONTE.at(-1);
export const nomeDaFonte = cod => FONTES[cod] || 'Fonte não listada na tabela padronizada consultada';

export const ORIGENS_RECEITA = {
  11: 'Impostos, taxas e contribuições de melhoria', 12: 'Contribuições', 13: 'Receita patrimonial', 14: 'Receita agropecuária',
  15: 'Receita industrial', 16: 'Receita de serviços', 17: 'Transferências correntes', 19: 'Outras receitas correntes',
  21: 'Operações de crédito', 22: 'Alienação de bens', 23: 'Amortização de empréstimos', 24: 'Transferências de capital',
  29: 'Outras receitas de capital',
};
export const GRUPOS_DESPESA = {
  31: 'Pessoal e encargos sociais', 32: 'Juros e encargos da dívida', 33: 'Outras despesas correntes',
  44: 'Investimentos', 45: 'Inversões financeiras', 46: 'Amortização da dívida',
};

/** Poder ou órgão informado na MSC (é o maior detalhe institucional que o SICONFI publica). */
export const PODER_ORGAO = {
  10131: 'Poder Executivo – Prefeitura e demais unidades',
  10132: 'Regime Próprio de Previdência Social (RPPS)',
  20231: 'Poder Legislativo – Câmara Municipal',
};
export const nomeDoOrgao = cod => PODER_ORGAO[cod] || `Órgão ${cod}`;

/** Subfunções de governo (Portaria MOG nº 42/1999 e atualizações). */
export const SUBFUNCOES = {
  '031': 'Ação Legislativa', '032': 'Controle Externo', '061': 'Ação Judiciária', '062': 'Defesa do Interesse Público no Processo Judiciário',
  '091': 'Defesa da Ordem Jurídica', '092': 'Representação Judicial e Extrajudicial', 121: 'Planejamento e Orçamento', 122: 'Administração Geral',
  123: 'Administração Financeira', 124: 'Controle Interno', 125: 'Normatização e Fiscalização', 126: 'Tecnologia da Informação',
  127: 'Ordenamento Territorial', 128: 'Formação de Recursos Humanos', 129: 'Administração de Receitas', 130: 'Administração de Concessões',
  131: 'Comunicação Social', 181: 'Policiamento', 182: 'Defesa Civil', 183: 'Informação e Inteligência',
  241: 'Assistência ao Idoso', 242: 'Assistência ao Portador de Deficiência', 243: 'Assistência à Criança e ao Adolescente', 244: 'Assistência Comunitária',
  271: 'Previdência Básica', 272: 'Previdência do Regime Estatutário', 273: 'Previdência Complementar', 274: 'Previdência Especial',
  301: 'Atenção Básica', 302: 'Assistência Hospitalar e Ambulatorial', 303: 'Suporte Profilático e Terapêutico', 304: 'Vigilância Sanitária',
  305: 'Vigilância Epidemiológica', 306: 'Alimentação e Nutrição', 331: 'Proteção e Benefícios ao Trabalhador', 332: 'Relações de Trabalho',
  333: 'Empregabilidade', 334: 'Fomento ao Trabalho', 361: 'Ensino Fundamental', 362: 'Ensino Médio', 363: 'Ensino Profissional',
  364: 'Ensino Superior', 365: 'Educação Infantil', 366: 'Educação de Jovens e Adultos', 367: 'Educação Especial', 368: 'Educação Básica',
  391: 'Patrimônio Histórico, Artístico e Arqueológico', 392: 'Difusão Cultural', 421: 'Custódia e Reintegração Social',
  422: 'Direitos Individuais, Coletivos e Difusos', 423: 'Assistência aos Povos Indígenas', 451: 'Infraestrutura Urbana', 452: 'Serviços Urbanos',
  453: 'Transportes Coletivos Urbanos', 481: 'Habitação Rural', 482: 'Habitação Urbana', 511: 'Saneamento Básico Rural', 512: 'Saneamento Básico Urbano',
  541: 'Preservação e Conservação Ambiental', 542: 'Controle Ambiental', 543: 'Recuperação de Áreas Degradadas', 544: 'Recursos Hídricos',
  545: 'Meteorologia', 571: 'Desenvolvimento Científico', 572: 'Desenvolvimento Tecnológico e Engenharia',
  573: 'Difusão do Conhecimento Científico e Tecnológico', 601: 'Promoção da Produção Vegetal', 602: 'Promoção da Produção Animal',
  603: 'Defesa Sanitária Vegetal', 604: 'Defesa Sanitária Animal', 605: 'Abastecimento', 606: 'Extensão Rural', 607: 'Irrigação',
  608: 'Promoção da Produção Agropecuária', 609: 'Defesa Agropecuária', 631: 'Reforma Agrária', 632: 'Colonização',
  661: 'Promoção Industrial', 662: 'Produção Industrial', 663: 'Mineração', 664: 'Propriedade Industrial', 665: 'Normalização e Qualidade',
  691: 'Promoção Comercial', 692: 'Comercialização', 693: 'Comércio Exterior', 694: 'Serviços Financeiros', 695: 'Turismo',
  721: 'Comunicações Postais', 722: 'Telecomunicações', 751: 'Conservação de Energia', 752: 'Energia Elétrica', 753: 'Combustíveis Minerais',
  754: 'Biocombustíveis', 781: 'Transporte Aéreo', 782: 'Transporte Rodoviário', 783: 'Transporte Ferroviário', 784: 'Transporte Hidroviário',
  785: 'Transportes Especiais', 811: 'Desporto de Rendimento', 812: 'Desporto Comunitário', 813: 'Lazer',
  841: 'Refinanciamento da Dívida Interna', 842: 'Refinanciamento da Dívida Externa', 843: 'Serviço da Dívida Interna',
  844: 'Serviço da Dívida Externa', 845: 'Outras Transferências', 846: 'Outros Encargos Especiais', 847: 'Transferências para a Educação Básica',
  997: 'Reserva de Contingência do RPPS', 999: 'Reserva de Contingência',
};
export const nomeDaSubfuncao = cod => SUBFUNCOES[cod] || `Subfunção ${cod}`;

const sinal = it => it.natureza_conta === 'C' ? 1 : -1;

/** Resume a MSC orçamentária (classe 6) de um mês em receitas e despesas por fonte. */
export function resumir(itens) {
  const receitas = new Map(), despesas = new Map();
  for (const it of itens) {
    const conta = String(it.conta_contabil || ''), fr = String(it.fonte_recursos || '');
    if (fr.length !== 4) continue;
    const exerc = fr[0], fonte = fr.slice(1), valor = sinal(it) * (it.valor || 0);
    if (conta.startsWith('6212') || conta.startsWith('6213')) {            // receita realizada e suas deduções
      const nat = String(it.natureza_receita || '');
      const ded = conta.startsWith('6213') ? 1 : 0;                         // 1 = dedução da receita
      const chave = `${fonte}|${exerc}|${nat.slice(0, 7)}|${ded}`;
      const r = receitas.get(chave) || { fonte, exerc, origem: nat.slice(0, 2), nat: nat.slice(0, 7), ded, valor: 0 };
      r.valor += valor; receitas.set(chave, r);
    } else if (conta.startsWith('62213')) {                                 // crédito empenhado, em suas fases
      const nat = String(it.natureza_despesa || ''), funcao = String(it.funcao || ''), subfuncao = String(it.subfuncao || '');
      const orgao = String(it.poder_orgao || ''), co = String(it.complemento_fonte || '');
      const chave = `${fonte}|${exerc}|${nat.slice(0, 4)}|${funcao}|${subfuncao}|${orgao}|${co}`;
      const d = despesas.get(chave) || { fonte, exerc, grupo: nat.slice(0, 2), modalidade: nat.slice(2, 4), funcao, subfuncao, orgao, co, emp: 0, liq: 0, pago: 0 };
      d.emp += valor;
      const fase = conta.slice(5, 7);                                       // 01 a liquidar · 02 em liquidação · 03 liquidado a pagar · 04 pago
      if (fase === '03' || fase === '04' || fase === '07') d.liq += valor;
      if (fase === '04') d.pago += valor;
      despesas.set(chave, d);
    }
  }
  return { receitas: [...receitas.values()], despesas: [...despesas.values()] };
}

const memoMSC = new Map();

/**
 * MSC orçamentária (execução do orçamento) acumulada até um mês, já resumida por fonte.
 * Devolve { tem, receitas, despesas }; falhas de consulta resultam em tem = false.
 */
export function mscOrcamentaria(ano, mes, { forcar = false } = {}) {
  const chave = `${ano}-${mes}`;
  if (!forcar && memoMSC.has(chave)) return memoMSC.get(chave);
  const promessa = consultar('msc_orcamentaria', { id_ente: MUNICIPIO.c, an_referencia: ano, me_referencia: mes,
    co_tipo_matriz: 'MSCC', classe_conta: 6, id_tv: 'ending_balance' }, { forcar, reduzir: resumir, nome: 'por-fonte-2' })
    .then(r => ({ ...r.itens, tem: r.itens.receitas.length + r.itens.despesas.length > 0, erro: null }))
    .catch(erro => ({ receitas: [], despesas: [], tem: false, erro: erro.message }));
  memoMSC.set(chave, promessa);
  return promessa;
}

/**
 * Despesas correntes de uma MSC resumida: total e parcela custeada com recursos de exercícios
 * anteriores (primeiro dígito da fonte igual a 2), isto é, com superávit financeiro.
 */
export function correntesESuperavit(msc) {
  const t = { totLiq: 0, totEmp: 0, supLiq: 0, supEmp: 0 };
  for (const d of msc.despesas) {
    if (d.grupo[0] !== '3') continue;
    t.totLiq += d.liq; t.totEmp += d.emp;
    if (d.exerc === '2') { t.supLiq += d.liq; t.supEmp += d.emp; }
  }
  return t;
}

/**
 * Carrega (uma vez por modo de comparação) a execução por fonte dos três exercícios.
 * Devolve { pronto, promessa, anos: { [ano]: { mes, tem, receitas, despesas } }, fontes: [códigos] }.
 */
export function execucaoPorFonte(p, modo) {
  p.porFonte ||= {};
  if (p.porFonte[modo]) return p.porFonte[modo];
  const estado = { pronto: false, erro: null, anos: {}, fontes: [] };
  estado.promessa = Promise.all(p.anos.map(async ano => {
    const mes = p.bimDe(ano, modo) * 2;
    const msc = await mscOrcamentaria(ano, mes);
    if (msc.erro) estado.erro = msc.erro;
    estado.anos[ano] = { mes, tem: msc.tem, receitas: msc.receitas, despesas: msc.despesas };
  })).then(() => {
    const codigos = new Set();
    Object.values(estado.anos).forEach(a => { a.receitas.forEach(r => codigos.add(r.fonte)); a.despesas.forEach(d => codigos.add(d.fonte)); });
    estado.fontes = [...codigos].sort();
    estado.pronto = true;
    return estado;
  });
  p.porFonte[modo] = estado;
  return estado;
}

// ---------------------------------------------------------------- mínimos constitucionais

// Naturezas de receita (sete primeiros dígitos) que formam a base de impostos e transferências constitucionais.
const NAT_IMPOSTOS = ['1112500', '1112530', '111303', '1114511'];                    // IPTU, ITBI, IRRF e ISS (com multas, juros e dívida ativa)
const NAT_TRANSFERENCIAS = ['1711511', '1711520', '1721500', '1721510', '1721520'];  // FPM (cota mensal), ITR, ICMS, IPVA e IPI-exportação
const NAT_FPM_ADICIONAL = ['1711512', '1711513', '1711514'];                         // parcelas adicionais de 1% do FPM (CF, art. 159, I, "d", "e" e "f")
const comeca = (nat, lista) => lista.some(p => nat.startsWith(p));
const FONTES_FUNDEB = ['540', '541', '542'];                                         // a complementação VAAR (543) não entra nos 70%

/**
 * Componentes dos mínimos constitucionais de educação (CF, art. 212), saúde (LC nº 141/2012) e da
 * remuneração dos profissionais da educação com o FUNDEB (CF, art. 212-A, XI), a partir da MSC.
 * As despesas são as que o próprio Município marcou com os códigos de acompanhamento da execução
 * orçamentária definidos pela STN: 1001 (MDE), 1002 (ASPS) e 1070 (remuneração – FUNDEB).
 */
export function componentesMinimos(msc) {
  const c = { impostos: 0, transferencias: 0, fpmAdicional: 0, deducaoFundeb: 0, mdeLiq: 0, mdeEmp: 0, aspsLiq: 0, aspsEmp: 0,
    fundebReceitas: 0, fundebLiq: 0, fundebEmp: 0, remuneracaoLiq: 0, remuneracaoEmp: 0 };
  for (const r of msc.receitas) {
    const constitucional = comeca(r.nat, NAT_TRANSFERENCIAS) || comeca(r.nat, NAT_FPM_ADICIONAL);
    if (r.ded && constitucional) c.deducaoFundeb -= r.valor;                         // dedução para formação do FUNDEB
    else if (comeca(r.nat, NAT_IMPOSTOS)) c.impostos += r.valor;
    else if (comeca(r.nat, NAT_TRANSFERENCIAS)) c.transferencias += r.valor;
    else if (comeca(r.nat, NAT_FPM_ADICIONAL)) c.fpmAdicional += r.valor;
    if (r.exerc === '1' && FONTES_FUNDEB.includes(r.fonte)) c.fundebReceitas += r.valor;
  }
  for (const d of msc.despesas) {
    if (d.co === '1001') { c.mdeLiq += d.liq; c.mdeEmp += d.emp; }
    else if (d.co === '1002') { c.aspsLiq += d.liq; c.aspsEmp += d.emp; }
    else if (d.co === '1070') { c.remuneracaoLiq += d.liq; c.remuneracaoEmp += d.emp; }
    if (d.exerc === '1' && FONTES_FUNDEB.includes(d.fonte)) { c.fundebLiq += d.liq; c.fundebEmp += d.emp; }
  }
  return c;
}

/** Filtro: { sel: Set de códigos de três dígitos ou null (todas), exerc: 'todos' | '1' | '2' }. */
export const passa = (filtro, x) => (!filtro.sel || filtro.sel.has(x.fonte)) && (filtro.exerc === 'todos' || x.exerc === filtro.exerc);
export const filtroAtivo = filtro => !!filtro.sel || filtro.exerc !== 'todos';

/** Soma de um campo, por chave, das linhas que passam no filtro. */
export function somarPor(linhas, filtro, chaveDe, campo = 'valor') {
  const mapa = new Map();
  for (const x of linhas) {
    if (!passa(filtro, x)) continue;
    const k = chaveDe(x);
    mapa.set(k, (mapa.get(k) || 0) + x[campo]);
  }
  return mapa;
}
