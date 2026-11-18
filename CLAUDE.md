# CrewPact — CLAUDE.md do projeto

## O que é
Aplicação de telemóvel para tripulantes de voo em Portugal (pilotos e cabine; easyJet, TAP, Ryanair,
Hi Fly). Lê a escala do calendário do telemóvel e, **no próprio dispositivo**, calcula limites de
fadiga (FTL — Reg. UE 83/2014 · CS-FTL.1) e a remuneração prevista pelos acordos de empresa (AE).
É **consultiva**: estima, nunca declara legalidade nem processa salários. Sem AI: tudo determinístico.

- **Uma companhia de cada vez (decisão de 2026-11-12):** a **easyJet primeiro**, até ficar pronta. As outras ficam na app
  como "em breve" (visíveis, sem acesso) e fazem-se depois, uma a uma. **O lançamento para o mercado só com todas
  prontas.** Trabalho que é só da TAP, da Hi Fly ou da Ryanair não entra na fila: anota-se para a vez delas. O código da
  TAP não se apaga.
- **Cliente:** o próprio Nuno (produto próprio, sem cliente externo). Decide tudo.
- **Ramo:** aplicação de **telemóvel** (iOS primeiro; Android não montado neste PC).
- **Caminho:** Expo (React Native) SDK 58 (RN 0.88) · Supabase (contas, sync, Edge Functions) · GitHub.
- **Teste:** Expo Go no iPhone do Nuno. Dev build (EAS) **adiado para o fim** — lista em `docs/dev-build.md`.
- **Idioma:** português de Portugal, na app e nas respostas.

## Onde está cada coisa
- `screens/` 20 ecrãs · `components/` · `data/` motores puros e acesso a dados · `ftl/` motor FTL ·
  `ae/` acordos de empresa (easyJet SPAC/SNPVAC, TAP; pilotos easyJet = BTE 29/2026, com o de 2023 na linha do tempo — `docs/ae-easyjet-pilotos-2026.md`) · `supabase/` schema, SQL, Edge Functions ·
  `legal/` termos e privacidade (HTML) · `design/` mockups HTML (mandam à letra) · `scripts/` testes golden.
- **O mapa da app** (ecrãs, folhas, ligações e o que foi verificado): `docs/sitemap.md` — atualizar quando um ecrã ou uma ligação mudar.
- **Lei interna:** `docs/CONSTITUICAO.md` (Q1–Q5 trancadas, contrato AI §6, Carta de Design §11).
- **Canon visual:** `docs/design-system.md` + `docs/motion-design-system.md` + `docs/living-interface.md`.
- **Decisões e pendências:** `docs/decisoes.md` — ler PRIMEIRO em cada sessão nova.
- **Guiões de verificação no device:** `docs/verificacao-device.md` · `docs/verificacao-calendario.md`.

## Regras do projeto (resumo; detalhe na Constituição)
1. **Golden-first.** Nenhum número FTL/AE muda sem o teste golden mudar antes. `npm test` corre 43 suites (contadas a 2026-11-18; a 2.ª, `test:ftl-fontes`, confere cada número FTL no texto oficial de `fontes/ftl/`; `test:unknown` e `test:incomplete` são as do que a escala não diz — os códigos que a app não conhece e os serviços a que faltam horas; a última é o guardião do design);
   o `pre-push` bloqueia se falhar.
2. **Citar a lei.** Onde é lei, o artigo; onde é convenção, dizê-lo e escolher o conservador.
3. **Dinheiro sem arredondar.** Todo o € mostra cêntimos.
4. **Calendário é a fonte.** Criar serviços à mão morreu; editar é só corrigir importados.
5. **Mockups mandam na hierarquia; os números vêm da escala** (Design System 2.0, 2026-11-02). Ler o mockup
   em `design/` antes de tocar num ecrã (os de `design/arquivo/` não se seguem). Texto em `TXT`, espaço em
   `SPACE`, fechar com o "Fechar" escrito (`PillButton`) e voltar com `IconButton`, cabeçalhos de janela com `SheetHeader`, ecrãs antes da app com `Porta`
   (placa de tinta + folha; nunca com barra de abas) — regras em
   `docs/design-system.md` §9–§12. O `npm run test:design` tranca-as (a dívida só pode descer). Papel permanente: designer sénior
   da Apple — "a Apple lançava isto?".
   **Cores: o mapa B "frio e quente" (2026-11-13, `docs/design-system.md` §14, esboço `design/cores.html`)** — frio = a escala
   (`CARD.flight/ground/rest`), quente = olhar (`alert` com "!", `stop` com "✕"), dentro sem cor, incerto neutro, verde só no
   dinheiro (`CARD.gain`/`MONEY`; o guardião tranca o verde da PELE).
   **O modo noite N3 segue o iPhone (no código a 2026-11-17):** os ecrãs usam as cores VIVAS (`PELE`, `CARD.auto`, `BRAND`, `MONEY`),
   que o iOS troca sozinho; a paleta em bruto (`CARD.day`, `PELE_DAY`…) só com motivo — o guardião tranca-o (`docs/design-system.md`
   §14, "O modo noite no código"); o que é sempre escuro com letra branca usa a placa (`PELE.slab`).
   **Direção 3.0 "cartões de cor" (aprovada 2026-11-11):** esboço `design/inicio-cartoes.html`, regras em `docs/design-system.md`
   §14. **O Início e a barra de abas já estão no código** (2026-11-11, por ver no iPhone): o que vai para onde decide-o
   `data/homeCards.js` (golden `test:homecards`), o desenho é `components/HomeCards.js`, tokens `CARD`/`TXT3`. **A Escala
   também** (2026-11-13, por ver no iPhone): SÓ O MÊS, com o dia num círculo (o anel com uma fatia por serviço; esboço
   `design/escala-circulos.html`, A); tocar num dia mostra os serviços dele por baixo do mês (`design/escala-dia-por-baixo.html`,
   V1) e tocar num serviço abre a folha dele com o Detalhe inteiro (`components/ServiceSheet.js`, com o `DutyDetailBody` de
   `screens/DutyDetailScreen.js` — **a mesma folha no Início e nos Números**, F1 de `design/abrir-dia.html`, 2026-11-16); a legenda:
   na 1.ª vez a guiada, depois o dia escolhido explica os seus sinais (`design/escala-legenda-5.html`, P1). **As guias da app** (balões na 1.ª vez, só onde
   faz sentido): regras e sítios em `docs/guias.md`; a peça é `components/GuideBubble.js`; o piloto é a Escala;
   `data/escalaDay.js` (golden `test:escala`); o topo é o `HomeTop` do Início. Aplica-se ecrã a ecrã; o que ainda não migrou segue o 2.0. **Uma só app:** as
   referências de `referencias/Para a app/` traduzem-se para esta linguagem (índice no README de lá; peças em §14).
   **Em CADA janela, página e esboço (regra do Nuno, 2026-11-14): consultar esse índice e citar as imagens que se aplicam**, ao lado do Mobbin.
   **A regra das folhas (2026-11-14):** nas folhas que sobem por cima, campos (rótulo pequeno, valor grande, fio — `Field`/`FieldInput`);
   nos ecrãs, os cartões (`docs/design-system.md` §11).
6. **Dados de teste só.** Nunca dados reais de tripulantes durante a construção. RGPD: sem ficheiros,
   fotos nem saúde; dose de radiação nunca guardada.
7. **Versões nativas = as que o `npx expo install` escolhe** (SDK 58: worklets 0.13.0, reanimated 4.7.1); nunca
   subir à mão, senão a Expo Go crasha no arranque. Expo Go não suporta Face ID (cai no código do telemóvel).
8. **Deploy de Edge Functions só por CLI.**
9. **As skills ao fazermos as coisas (o Nuno, 2026-11-16).** A skill certa no momento certo; as regras deste projeto ganham sempre
   (a Hanken e não a SF, o português sem Title Case, os 3 esboços, o golden primeiro). Antes de mexer num ecrã: as regras de base da
   **Impeccable** (`reference/craft-floor.md`). No fim de cada ecrã construído, antes do "ver no iPhone": a **crítica + auditoria
   nativa da Impeccable** (corrigir os erros objetivos; o resto vai para escolha, com esboços). Com movimento: **animacoes** (as
   regras, o Reanimated, os movimentos reduzidos, a verificação) e a **emil-design-eng** para o acabamento das interações (o toque, a
   pressão, o tempo e a curva, de onde nasce uma folha, o arrastar — só o que se traduz para React Native; o que é de web fica). Na
   verificação final: as **regras da Vercel** e a lista da **UI/UX Pro Max** só para a acessibilidade, com o Playwright nos esboços.
   Correções pequenas (uma cor, um texto): nenhuma. Não guardar relatórios em `.impeccable/` sem o Nuno pedir; o gancho dela fica
   desligado (só lê web). Porquê: no teste da Simulação a crítica da Impeccable deu os dois achados maiores.

## Frases-gatilho do Nuno
- **"testar os estados"** → sessão guiada no device dos estados da Living Interface (`docs/verificacao-device.md`).
- **"testar o calendário"** → pipeline da escala com eventos sintéticos (`docs/verificacao-calendario.md`).
- **"vamos às leis"** → retomar `legal/*.html` (placeholders, e-mails, regiões, publicar).
- **"vamos ao advogado"** → pack jurídico completo.

## Modelo e esforço
Segue a tabela do método global. Verificação de uma mudança: Opus 5.5 Alto. Verificação completa: UltraCode.
Fable 5.2 (Alto, sessão própria) só para arquitetura, bug que o Opus não resolveu à segunda tentativa, e auditar ou corrigir cálculos
FTL/AE. Construir ecrãs a partir de um esboço aprovado: Opus 5.5. Rever a segurança: Opus 5.5 (o Fable desvia esses pedidos).
