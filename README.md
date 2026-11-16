# KRATIS 4.0 · Painel fiscal do Município de Viçosa/MG

**Dados públicos a serviço de quem governa.**

Painel gerencial **exclusivo do Município de Viçosa/MG** (código IBGE 3171303), construído sobre a
[API de dados abertos do SICONFI](https://apidatalake.tesouro.gov.br/docs/siconfi/) — Tesouro Nacional.
Mostra o que a Prefeitura e a Câmara Municipal declararam ao SICONFI. Cada aba compara o **exercício selecionado
com os dois anteriores** e o painel aponta, com fundamento legal, as situações que tendem a virar **apontamento ou
alerta do TCE-MG**, inclusive por projeção.

O painel é uma página estática: roda inteiro no navegador, consulta o SICONFI em tempo real e não tem servidor,
banco de dados nem etapa de compilação. Por isso pode ficar hospedado no próprio GitHub (GitHub Pages).

## Publicar no GitHub

1. Crie um repositório no GitHub (por exemplo, `kratis`) e envie esta pasta:

   ```bash
   git remote add origin https://github.com/SEU-USUARIO/kratis.git
   ```

   ```bash
   git push -u origin main
   ```

2. No repositório, abra **Settings → Pages**, escolha **Deploy from a branch**, ramo `main`, pasta `/ (root)` e salve.
3. Em um ou dois minutos o painel estará em `https://SEU-USUARIO.github.io/kratis/`.

Cada `git push` republica o painel. O endereço guarda o exercício, o bimestre e a aba
(`…/#ano=2026&aba=art167`), de modo que um link leva direto à análise.

## Abrir no computador

- **macOS:** duplo clique em `abrir_no_computador.command`.
- **Qualquer sistema:** `python3 ferramentas/servidor_local.py` e abra <http://localhost:8765>.

Abrir o `index.html` direto do disco não funciona: o navegador exige um endereço `http://` para carregar os módulos.

## Abas

| Aba | Conteúdo | Fonte no SICONFI |
|---|---|---|
| Visão geral | Resumo dos apontamentos; **mínimos e limites constitucionais** (educação 25%, saúde 15%, FUNDEB 70%, pessoal, art. 167-A) com memória de cálculo; demais indicadores | RREO, RGF, MSC |
| Apontamentos TCE-MG | Possíveis apontamentos por severidade, com fundamento, orientação e tendência; exporta CSV e PDF | todos |
| **Art. 167-A** | Relação despesa corrente / receita corrente em 12 meses, série bimestral, projeção para dezembro | RREO Anexo 01 |
| Receitas | **Filtro por fonte de recursos**; receita por fonte e por origem; **receita prevista × realizada por fonte**; previsão, realização e projeção de encerramento | MSC; RREO Anexo 01 |
| Despesas | **Filtro por fonte de recursos**; despesa por fonte, por órgão (Prefeitura, RPPS, Câmara), por função e subfunção e por grupo; **despesa fixada × realizada por fonte** | MSC; RREO Anexos 01 e 02 |
| RCL | Receita corrente líquida e composição | RREO Anexo 03 |
| Pessoal | Despesa com pessoal da Prefeitura e da Câmara frente aos limites | RGF Anexo 01 |
| Dívida e crédito | DCL, operações de crédito, garantias, regra de ouro | RGF Anexos 02 a 04 |
| Caixa e restos a pagar | Restos a pagar e disponibilidade de caixa por vinculação | RREO Anexo 07, RGF Anexo 05 |
| Resultados e previdência | Resultado primário e nominal; RPPS | RREO Anexos 04, 06 e 14 |
| Balanço anual | Balanço patrimonial, variações patrimoniais, despesa por função | DCA |
| Matriz de saldos | Saldos contábeis no padrão PCASP, sob consulta | MSC |
| Entregas e prazos | O que foi entregue, quando, e o que está vencido | Extrato de entregas |
| Explorador | Qualquer anexo e coluna do RREO, do RGF e da DCA, lado a lado | RREO, RGF, DCA |
| Metodologia | Fontes, critérios e limitações | — |

Controles do topo: **exercício**, **bimestre de referência** (por padrão, o último entregue) e **modo de
comparação** — *mesmo período* dos exercícios anteriores ou *anteriores encerrados* (6º bimestre).

## Art. 167-A da Constituição

A relação entre despesas correntes e receitas correntes é apurada em base móvel de 12 meses, a cada bimestre,
pela metodologia do TCE-MG (Instrução Normativa nº 07/2025):

- **despesas correntes** liquidadas nos 12 meses, somadas às empenhadas e não liquidadas inscritas em restos a pagar
  não processados em dezembro;
- **excluídas** as despesas correntes custeadas com superávit financeiro do exercício anterior (fontes de recursos
  de exercícios anteriores, identificadas na Matriz de Saldos Contábeis);
- **receitas correntes** realizadas, líquidas de deduções;
- receitas e despesas **intraorçamentárias** consideradas dos dois lados;
- alerta a **85%** (§ 1º) e limite a **95%** (caput).

A exclusão do superávit só é aplicada quando a MSC de todos os meses envolvidos existe e confere com o RREO; caso
contrário, a relação é mostrada sem a exclusão, com aviso. Os RPNP cancelados não são abatidos, porque o SICONFI não os
detalha por categoria de despesa.

## Possíveis apontamentos

| Grupo | Verificações |
|---|---|
| Limites constitucionais e legais | Educação (25%), saúde (15%) e FUNDEB (70%); art. 167-A; despesa com pessoal do Executivo e do Legislativo (LRF, arts. 19 a 23 e 59); dívida consolidada líquida, operações de crédito e garantias (Resoluções SF nº 40 e 43/2001); regra de ouro (CF, art. 167, III) |
| Equilíbrio orçamentário e financeiro | Resultado da execução; poupança corrente; ritmo de arrecadação frente à previsão (LRF, art. 9º); previsão de receitas de capital sem realização (LRF, art. 12); resultado primário; passivo a descoberto |
| Restos a pagar e caixa | Cancelamento de restos a pagar processados; crescimento do estoque; disponibilidade de caixa negativa por vinculação (LRF, arts. 8º, 42 e 50) |
| Previdência | Resultado previdenciário dos fundos do RPPS |
| Transparência e prazos | RREO, RGF, DCA e MSC vencidos sem registro; status após o prazo; retificações (LRF, arts. 51, 52 e 55) |
| Consistência entre demonstrativos | RCL e DCL iguais no RREO e no RGF; despesa da DCA igual à do RREO de encerramento; RCL declarada com menos de 12 meses |

As **tendências** projetam o encerramento do exercício pela sazonalidade do ano anterior (art. 167-A e arrecadação) e
a trajetória de 12 meses da despesa com pessoal.

## Limitações

- As análises são indicativas e não substituem a apuração oficial do TCE-MG, que usa o SICOM e documentos que não
  estão no SICONFI.
- Os índices de educação (25%), saúde (15%) e FUNDEB (70%) são estimativas feitas com a marcação da Matriz de Saldos
  Contábeis (códigos 1001, 1002 e 1070 da STN); a apuração oficial é a do SIOPE, do SIOPS e do TCE-MG.
- A despesa por unidade orçamentária (Secretaria) não é publicada no SICONFI; o painel mostra a despesa por órgão,
  função e subfunção.
- A meta de resultado primário da LDO e o limite de gastos do Legislativo (CF, art. 29-A) dependem de dados fora da API.
- O extrato de entregas informa a data do último status, não a da primeira homologação.
- O painel mostra o que o Município declarou. Erros de preenchimento aparecem como estão — e alguns são apontados na
  consistência.

## Estrutura

```
index.html                        página única
css/estilo.css                    identidade visual KRATIS
assets/                           ícone e faixa grega (SVG)
js/config.js                      identificação do Município (código IBGE 3171303)
js/api.js                         acesso à API: fila, repetição, paginação e cache local de 12 horas
js/modelo.js                      demonstrativos consultáveis e carga dos três exercícios
js/analise.js                     indicadores, art. 167-A, projeções e regras dos apontamentos
js/fontes.js                      receitas e despesas por fonte de recursos, órgão, função e subfunção (MSC)
js/ui.js                          tabelas comparativas, cartões, medidores e gráficos (SVG)
js/abas.js                        as quinze abas
js/app.js                         controles, navegação e arranque
ferramentas/servidor_local.py     servidor local (biblioteca padrão do Python)
```

Sem dependências externas: JavaScript puro em módulos, sem bibliotecas nem etapa de compilação.

