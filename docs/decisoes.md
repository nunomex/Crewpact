# CrewPact — Decisões e pendências

Ficheiro vivo. Cada sessão acaba a atualizá-lo (regra 3 do método). As entradas mais recentes em cima.
A história anterior a novembro de 2026 vive na memória do Claude e nos docs de `docs/`; aqui fica o
ponto de situação consolidado a partir de 2 de novembro de 2026.

---

## 2026-11-02 (noite) — Design System 2.0 (ramo `design-system-2`, por guardar no git)

**Porquê:** o Nuno sentia problemas de layout, espaçamento, tipografia e posição dos botões. Medido:
675 tamanhos de letra à mão (29 pela escala), 149 estilos abaixo de 11, 924 espaçamentos fora da escala,
105 cores soltas, ✕ em 4 tamanhos e 2 formas, cabeçalho de janela copiado à mão em 6 sítios. Causa: cada
mockup portado "à letra" com os seus números.

**Decisões (aprovadas pelo Nuno: "faz o que recomendas"):**
- **Regra dos mockups mudou:** o mockup manda na hierarquia e na disposição; os números vêm da escala.
- **Escala fechada** em `data/constants.js`: `TXT` (13 estilos de texto com nome), `SPACE` em grelha 2/4,
  `TYPE` com os números condensados, `ICON_BTN`, `SCALE`. Densidade da casa mantida (corpo 13).
- **Componentes canónicos:** `IconButton` (36 redondo, toque 44, rótulo obrigatório) e `SheetHeader`.
- **Regras de posição** escritas (design-system §10) e **folha contra página modal** (§11).
- **Reanimated** alinhado com a skill `animacoes`: o `Animated` core fica; o Reanimated entra para
  animações de layout e gestos, ecrã a ecrã (motion §2). A razão antiga (SDK 54) acabou.
- **Guardião** `npm run test:design` no `npm test` e no pre-push: regras duras + roquete da dívida.
- **Mobbin** como referência em cada ecrã do bloco C (escolha do Nuno, guardada em `referencias/`).

**Feito e verificado no PC:**
- 13 ficheiros migrados para `IconButton`/`SheetHeader` (todas as janelas e ecrãs com ✕ ou ‹ de navegação).
  O ‹ do `PeleHeader` passa a seguir o tema noturno. O ponto do rótulo passa a amarelo (o vermelho era
  decoração, contra §2). Formulário de serviço: o ‹ que fechava a janela passou a ✕; o ‹ dos passos só
  aparece quando há para onde voltar (antes havia dois fechos).
- 6 animações de layout passaram a respeitar os movimentos reduzidos (formulário de serviço, calculadora FTL).
- 23 mockups recusados movidos para `design/arquivo/` (índice em `design/README.md`).
- `npm test` verde (25 suites) · pacote iOS gera · verificador de imports apanhou 2 erros reais
  (`SheetHeader` em falta nos cartões de partilha) — corrigidos e a regra entrou no guardião.

**Por ver no iPhone (não testado):** os cabeçalhos das 6 janelas (calendário, importar, notificações,
partilha de voo, partilha do ano, Simulação e o Avançado), o ✕/‹ novos (36 redondo) em todos os ecrãs, o
formulário de serviço (passo 1 com ✕ à direita; passos sem ‹ quando não há para onde voltar).

**Decididas pelo Nuno ("está bem", 2026-11-02):** 1 → **A** (✕ à direita) · 2 → **opção 2** (Guardar largo no
fundo; já é o padrão da app, exceto Validades e formulário de evento, que migram no bloco C). Referências em
`referencias/README.md` e na coleção do Mobbin. Fica pendente só o ponto 3.

**Opções que foram apresentadas (Mobbin, 2026-11-02):**
1. **✕ das janelas:** A) título à esquerda, ✕ à direita — Alan, Polarsteps, Beside, pliability
   (**recomendado**, é o que a app já faz) · B) ✕ à esquerda — Tinder, ElevenLabs, Insight Timer.
2. **Guardar nos formulários:** 1) Cancelar à esquerda e Guardar à direita no topo — Fi (iOS clássico) ·
   2) ✕ em cima e Guardar largo no fundo, acima do teclado — AllTrails, Mindtrip, Hypelist
   (**recomendado**: ao alcance do polegar e igual ao `PrimaryButton`) · 3) Cancelar e Guardar lado a lado
   no fundo — Perplexity · 4) Guardar e Cancelar empilhados — Expedia, X.
3. **Exceção da grelha da Escala** (etiquetas a 8–9,5): decidir no device na migração da Escala.

**Próximo:** bloco B (contas) continua primeiro. Depois o bloco C já com a revisão e a migração por ecrã.

---

## 2026-11-02 (tarde) — Atualização para o SDK 58

**Porquê:** a Expo Go do iPhone atualizou para o SDK 58 e recusa projetos no 57 ("Project is incompatible").
Sem isto, nenhuma verificação no device era possível.

**Feito no ramo `sdk-58` (por guardar no git):** `npx expo install expo@^58.0.0 --fix`. RN 0.86→0.88.1 ·
React 19.3 · reanimated 4.7.1 · worklets 0.13.0 · gesture-handler 2→3.3 · view-shot 5→6.1.1 · screens 4.30.
- `expo-doctor` 20/20 ✅ · `npm test` verde (exit 0) ✅ · pacote iOS gera sem erros (`expo export`) ✅.
- Revisto contra as mudanças do SDK 58: nenhuma API removida está em uso (InteractionManager, Modal
  `animated`, deep imports); file-system já usa `/legacy` (continua exportado); notificações têm handler
  explícito; o stack v6 ainda encontra o `PanGestureHandler` no gesture-handler 3; o view-shot 6 continua
  em pontos no iOS → a correção dos 1080 px de setembro mantém-se.
- Os 22 pacotes atrasados do bloco A ficaram resolvidos com a atualização.

**1.º arranque no iPhone → ecrã vermelho:** "InteractionManager has been removed" no `@react-navigation/stack`
v6 (Card, em cada transição). A revisão tinha procurado só no código da app, não nas bibliotecas.
- **Correção (sem tocar em `node_modules`):** `metro.config.js` faz o `react-native` resolver para
  `shims/react-native-sem-interaction-manager.js` **só** dentro do `@react-navigation/stack`; a camada devolve
  um InteractionManager vazio, igual ao que a v7 faz (`InteractionManager?.`). Provado no pacote dev: o Card
  usa a camada, nenhum outro módulo a usa. `expo-doctor` 20/20.
- **Pendência nova:** migrar para @react-navigation v7 (stack 7.12 já protege isto) e apagar a camada.
  Não agora: a v7 muda o `navigate` entre abas e ecrãs empilhados (42 chamadas a rever) — fazer depois da
  verificação, numa sessão própria.
- Lição: numa subida de RN, procurar as APIs removidas também em `node_modules` (`grep -rl` sem o próprio RN).

**2.º arranque:** compila e carrega. Aviso do Metro: `data/auth.js` importava `expo-auth-session/build/QueryParams`,
caminho interno que o SDK 58 fechou. A função (15 linhas) passou para dentro do `auth.js`; provada igual à
original em 5 URLs de retorno OAuth. Sem outros imports internos na app.

**Smoke no iPhone (Expo Go 58): ✅ confirmado pelo Nuno.** Ramo `sdk-58` junto ao `main` (local, sem push).
A pasta `android/` gerada está desatualizada; regenera-se com `npx expo prebuild --clean` quando o
Android entrar.

---

## 2026-11-02 — Ponto de situação e plano de verificação

**Estado do código:** `main` limpo, último commit 2026-09-03 (SDK 57 oficial + auditoria de segurança
corrigida). `npm test` → 24 suites, 0 falhas (FTL 302 · AE 453 · pdfRoster 65 · stats 104 · rosterDiff 33 ·
capabilities 56 · export 24 · flightDetect 33 · zulu 12 · registo 9 · disrupção 42 · biblioteca 26 ·
vigência ok · flightStatus 51 · calendar 44 · validades 54 · meteo 17 · radiação 38 · prova 33 ·
auditoria 18 · carreira 45 · voz 50 · crewState 43).

**Decisões desta sessão:**
- Criados `CLAUDE.md` do projeto e este `docs/decisoes.md` (o projeto é anterior ao método; passa a segui-lo).
- **Dev build fica para o FIM.** Tudo o que depende de build nativo (Face ID real, PDF por ficheiro, voo ao
  vivo nativo, IAP, login social, widgets, Live Activities, Android) espera. Lista canónica: `docs/dev-build.md`.
- **Verificação do resto primeiro**, por blocos, no Expo Go. Plano mestre em `docs/05-verificacao.md`
  (bloco A feito do PC hoje; B–G no device/leis).
- **Não atualizar os 22 pacotes Expo** que o `expo-doctor` aponta antes de fechar o bloco B: o smoke do
  SDK 57 (2026-09-03) foi feito com as versões atuais.

**Medido hoje do PC:** Hi Fly `long_haul=true` ✅ (pendência 5 fechada); 4 Edge Functions no ar (401 sem
sessão) ✅; `crewpact.app/termos` e `/privacidade` respondem mas com placeholders (5 e 4) ⚠️; links EUR-Lex ok ✅.

**Pendências (fora do dev build), por ordem:**
1. **Device · contas e segurança** — `docs/verificacao-device.md` §1–§3: reset de palavra-passe (OTP +
   cooldown), apagar conta + graça 7 dias + reativação (conta DESCARTÁVEL), mudar e-mail (2 passos no
   dashboard primeiro). Servidor já verificado (Edges + cron no ar).
2. **Device · passeio fino de julho/setembro** — tudo o que foi construído sem ser visto no telemóvel:
   Simulação em poster · Prova (§ inline + ProvaSheet) · Auditoria do mês · Radiação cósmica · Relatórios
   (PDF 245, CSV, logbook de carreira) · SNC/RDP (DisrupcaoScreen) · morph da pílula na Escala · Desfazer
   (3 fluxos) · marcos na voz + primeiro alerta · sistema de luz no Início · hotéis v2.
3. **Device · "testar os estados"** — estados da Living Interface 1 a 1, afinações no bloco `TUNE`.
4. **Device · "testar o calendário"** — pipeline com eventos sintéticos (`docs/verificacao-calendario.md`).
5. **Dashboard Supabase** — Auth → Email: desligar "Secure email change" + colar `email-change-address.html`
   (antes do bloco B §3). ~~Hi Fly long_haul~~ confirmado 2026-11-02.
6. **Leis** — `legal/termos.html` e `legal/privacidade.html` prontos com 7 placeholders 【…】: entidade
   responsável, e-mails suporte@/privacidade@, data de publicação, remover "RASCUNHO". Depois advogado, depois publicar.
7. **Nome novo da app** — rebatismo planeado; o ícone final e o PNG esperam a decisão. Bundle ID não muda.
8. **Prateleira (não bloqueia):** relógio solar real no Início · reconciliação na auditoria (v1.1) ·
   Validades parada à espera de documentos reais · sino fase 3 · Radar (ideia A).

**Do método global (análise 2026-11-02), a acrescentar ao caminho:**
- Verificação ganhou 4 itens que o método pede às aplicações: quem vê o quê com duas contas, modo avião,
  permissões do telemóvel, cópias de segurança. Já no `05-verificacao.md`.
- **Revisão de fora antes das lojas:** beta com 2–3 tripulantes reais pelo TestFlight (lição do Hub: quem
  desenha não deve ser o único a aprovar). Fica para a fase do dev build.
- **Página curta de descoberta** (opcional): que problema a app resolve, para quem, como se mede. As fases
  1–3 completas não se fazem retroativamente.
- **Para o método v1.4:** a CrewPact é o 1.º projeto completo. Candidatos a entrar no caminho das
  aplicações: golden-first, portão `pre-push`, citar a fonte legal, ficheiro de errata.
- Testar num Android verdadeiro e num iPhone pequeno e grande fica no fim, com o dev build.

**Prova sem sessão (PC):** todas as tabelas com dados pessoais devolvem vazio à chave pública. Encontradas
2 tabelas órfãs na BD (`rest_periods`, `user_additional_roles`), sem código nem SQL no repo: decidir.

**Sem decisão ainda:** data de lançamento; se há CI (a Constituição §9 diz que o `pre-push` local não chega).
