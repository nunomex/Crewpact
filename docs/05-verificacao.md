# CrewPact — Verificação (fase 6)

Plano mestre. O dev build fica para o FIM (decisão 2026-11-02): tudo aqui corre em **Expo Go** no iPhone
do Nuno, ou a partir do PC. Marca ✅/❌ por linha; um ❌ abre uma correção com golden antes do código.
"Dou a app por pronta" só quando este ficheiro estiver todo ✅ e o Nuno disser que sim.

Guiões detalhados (passo a passo) que este plano aponta:
- `docs/verificacao-device.md` — contas, segurança, Living Interface, estados.
- `docs/verificacao-calendario.md` — pipeline da escala com eventos sintéticos.

---

## A · Verificado a partir do PC (2026-11-02)

| O quê | Resultado |
| --- | --- |
| `npm test` (24 suites golden + vigência) | ✅ 0 falhas |
| Supabase `airlines.long_haul` (Hi Fly) | ✅ `true` (7 companhias no catálogo; 2 AE, 5 FTL) |
| Edge Functions `delete-account` · `reactivate-account` · `flight-status` · `share-day` | ✅ no ar, 401 sem sessão |
| Links legais na app (`crewpact.app/termos` · `/privacidade`) | ✅ respondem 200; ⚠️ ainda com placeholders 【…】 (termos 5, privacidade 4) |
| Links EUR-Lex da Biblioteca (965/2012 · 2013/59 · 83/2014) | ✅ respondem |
| Leitura sem sessão (chave pública) em todas as tabelas | ✅ dados pessoais fechados: `profiles`, `duties`, `family_links`, `shared_days`, `flight_live`, `airport_stats`, `wx_cache`, `rest_periods`, `user_additional_roles` devolvem vazio. Catálogos `airlines`, `bases`, `countries` abertos de propósito |
| Tabelas órfãs na BD | ⚠️ `rest_periods` e `user_additional_roles` existem na Supabase mas não aparecem no código nem no `supabase/*.sql`. Decisão do Nuno: apagar ou documentar |
| Marcas TODO/FIXME no código | ✅ 1 real (comentário em `YearShareCard.js`), sem dívida escondida |
| `npx expo-doctor` | ✅ 20/20 depois da atualização para o SDK 58 (2026-11-02, a Expo Go do iPhone já só abre o 58) |

**Não verificado do PC (precisa do telemóvel):** tudo o que está abaixo.

---

## B0 · Smoke do SDK 58 no iPhone  ✅ (Nuno, 2026-11-02)
- [x] Arranca sem ecrã vermelho · as 5 abas abrem · gesto de voltar atrás nos ecrãs empilhados.
- [x] Animações (pílula da Escala, toast Desfazer, ＋ central) · partilhar "Ano de voo" sai a 1080 px.
- [x] Simulação · Relatórios PDF · login e sessão guardada depois de fechar a app.

## B · Device · contas e segurança  ← **próximo**
Guião: `docs/verificacao-device.md` §1–§3. Antes de começar, no dashboard Supabase: Auth → Email →
desligar "Secure email change" + colar `supabase/email-change-address.html`.
- [ ] §1 Reset de palavra-passe: OTP, cooldown 30 s, reenviar, código errado, mudar e-mail, entrar.
- [ ] §2 Apagar conta (CONTA DESCARTÁVEL): re-auth password + APAGAR → popup com data → login → ecrã de
      reativação → Reativar com a escala intacta.
- [ ] §3 Mudar e-mail: password → e-mail novo → código de 6 dígitos no e-mail NOVO → confirmar.
- [ ] Fechadura biométrica: código do telemóvel + escape por password + desligar (Face ID real = dev build).
- [ ] Criar conta → OTP → onboarding das 6 perguntas obrigatórias → estado 0 do Início.
- [ ] Exportar os meus dados (JSON RGPD) abre a folha de partilha com o ficheiro.
- [ ] Mensagens de erro: sem rede · password errada · OTP expirado — nenhuma em inglês, nenhuma silenciosa.
- [ ] **Quem vê o quê, com duas contas de teste:** a conta B não vê a escala, o perfil nem as partilhas da conta A;
      um link de partilha da família expira às 24 h; apagar a conta A não mexe na B.
- [ ] **Sem rede (modo avião):** a app abre, mostra a escala e os cálculos FTL/AE; o que precisa de rede
      (meteo, voo ao vivo, sync) diz-o com texto claro, sem rodar para sempre; ao voltar a rede, sincroniza.
- [ ] **Permissões do telemóvel:** calendário, notificações e localização — pedir na hora certa, com texto
      em português; recusar cada uma não parte a app e diz como ligar depois nas Definições.

## C · Device · o que foi construído sem ser visto (julho–setembro)
Uma secção por sessão; para cada uma, o teste "a Apple lançava isto?" e a régua: 390 px, sem cortes, sem
texto truncado, noturno célula a célula, movimentos reduzidos ligados e desligados.
- [ ] **Início** — sistema de luz (ponto, véu, temperatura horária); folga v2 (fantasma "QUI", bilhete
      manuscrito Caveat, cartão preto do countdown); marcos na voz + primeiro alerta explicado.
- [ ] **Escala** — morph pílula→cartão da legenda; família cheia >4 (stack "+N" → grelha); pontinho âmbar;
      sincronizar e confirmação 3-vias das mudanças.
- [ ] **＋ central** — speed-dial Serviço·Simulação·Evento; Simulação em gramática de poster (Legal/Não legal/E se…).
- [ ] **Números** — Prova (§ inline → ProvaSheet, crew-aware); Auditoria do mês (pernoita · rotas · SNC/RDP, € ink);
      Radiação cósmica ("≈ X,X mSv", batismo 1×); Estatísticas.
- [ ] **Perfil** — Relatórios (PDF 245 na pele, CSV, logbook de carreira assinável); DisrupcaoScreen (SNC/RDP,
      PDF-prova); Hotéis v2 (lista IATA + ficha + ETA pelo Maps); Biblioteca; Termos no rodapé; Validades (manual).
- [ ] **Desfazer** — toast 5 s nos 3 fluxos (serviço manual · validade · extra); servidor-irreversível = confirmação.
- [ ] **DutyDetail** — tap=ver, longo=editar só importados (diff 3-vias), apagar só manuais.
- [ ] **Voo ao vivo (Edge AirLabs)** — atraso + PSV real + aviso "sincroniza eCrew"; partilha família (1 voo/pessoa).

## D · Device · "testar os estados"
Guião: `docs/verificacao-device.md` (secção Living Interface). Estados 1 a 1; afinações só no bloco `TUNE`
do `HomeScreen.js`; cada afinação volta a este ficheiro como linha.
- [ ] 15 estados LI vistos no device, diurno e noturno.

## E · Device · "testar o calendário"
Guião: `docs/verificacao-calendario.md`. Só eventos SINTÉTICOS.
- [ ] Importar · filtro do ruído pessoal · multi-serviço no dia · pernoita por paridade · cancelados opt-in ·
      diff 3-vias (deteta → confirma → grava) · editar importado · Zulu por fuso.

## F · Leis (frase-gatilho "vamos às leis" → depois "vamos ao advogado")
- [ ] Preencher os 7 placeholders de `legal/termos.html` e `legal/privacidade.html` (entidade, e-mails
      suporte@ / privacidade@, data de publicação, tirar "RASCUNHO"); confirmar regiões Supabase/Resend e comarca.
- [ ] Criar os e-mails suporte@ e privacidade@ (ou decidir que é um só).
- [ ] Advogado revê. Só depois republicar em `crewpact.app`.

## G · Antes de dar por pronta (sem dev build)
- [ ] **Cópias de segurança:** a Supabase grátis não faz backups. Decidir plano pago ou cópia própria
      agendada; testar uma reposição numa base de teste.
- [ ] Decidir as duas tabelas órfãs (`rest_periods`, `user_additional_roles`).
- [ ] Nome novo da app decidido → ícone PNG final → textos da loja (fica para a fase de lojas).
- [ ] Decidir CI para o `npm test` (Constituição §9) — o `pre-push` local é contornável.
- [ ] `docs/06-manual-cliente.md` não se aplica (produto próprio); em vez disso, `docs/dev-build.md` passa a ser a fase seguinte.
