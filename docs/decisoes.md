# CrewPact — Decisões e pendências

Ficheiro vivo. Cada sessão acaba a atualizá-lo (regra 3 do método). As entradas mais recentes em cima.
A história anterior a novembro de 2026 vive na memória do Claude e nos docs de `docs/`; aqui fica o
ponto de situação consolidado a partir de 2 de novembro de 2026.

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
