# Guião de verificação no device — o que construímos (2026-07-01)

Passo-a-passo para confirmar no telemóvel o que não dá para verificar no Windows. Tudo corre em
**Expo Go** (não precisa de dev build). Marca ✅/❌ em cada linha; se ❌, diz-me o quê.

## Arrancar
1. No PC: `npm start` (na pasta do projeto).
2. Telemóvel: abre o **Expo Go** → lê o QR code do terminal.
3. A app abre. Se crashar logo no arranque → copia o erro vermelho e manda.

---

## 1 · Reset de palavra-passe (OTP + cooldown do reenviar)
_Ecrã de login → "Esqueci-me da palavra-passe"._
- [ ] Escreves o email → **Verificar** → passa ao ecrã de **inserir código**.
- [ ] Por baixo do botão **VERIFICAR** aparece **"Reenviar em 30s"** (esbatido, a contar para baixo).
- [ ] Aos 0s → vira **"Reenviar código"** (tocável). Tocas → banner **verde** "Código reenviado." + o cooldown recomeça.
- [ ] Código **errado** → banner **vermelho** de erro.
- [ ] O link **"‹ Mudar e-mail"** volta atrás para reintroduzir o email.
- [ ] Com o código REAL do email (chega pelo Resend) → nova password → entra.

## 2 · Apagar conta + período de graça + reativação  ⚠️ usa uma CONTA DESCARTÁVEL
_As 2 Edge Functions + o cron já estão no ar._
- [ ] Cria/entra numa conta de teste com 1-2 serviços na escala.
- [ ] **Perfil** (avatar no cabeçalho) → secção **"Os meus dados"** → **"Apagar conta"** (a vermelho).
- [ ] Diálogo: texto dos **7 dias** (desativada agora, reativável) + campo "Escreve **APAGAR**".
- [ ] O botão vermelho **só ativa** quando escreves APAGAR certo.
- [ ] Confirmas → **popup "Conta desativada — eliminada de vez a [data]..."** → **OK** → volta ao login.
- [ ] **Entras de novo** (mesma conta) → aparece o **ecrã de reativação** ("eliminada em X dias — [data]", botões Reativar / Sair).
- [ ] **Reativar** → entra na app normal, **escala intacta**.
- [ ] (Opcional, dashboard: **Auth → Users** → o `app_metadata.deletion_scheduled_at` aparece ao agendar e some ao reativar.)

## 3 · Mudar e-mail  ⚠️ precisa de 2 passos no dashboard PRIMEIRO
_Dashboard: Auth → Email → **desligar "Secure email change"** + colar o template `email-change-address.html` em "Change Email Address"._
- [ ] **Perfil → Segurança → "Mudar e-mail"** (mostra o email atual).
- [ ] Passo 1: pede a **palavra-passe** (re-auth) → Continuar.
- [ ] Passo 2: escreves o **e-mail novo** → Enviar código.
- [ ] Passo 3: **código de 6 dígitos** (chega ao email NOVO) + reenviar com cooldown → Confirmar.
- [ ] "E-mail alterado" → o **cabeçalho/cartão do Perfil mostra o email novo**.

## 4 · FTL — toggle de alojamento no formulário
_Escala → toca num dia de voo importado → **toque longo = Editar** (correção de importados). O
"+ adicionar serviço" MORREU a 2026-07-10 — o calendário é a fonte; não há criação à mão._
- [ ] No formulário, abre **"Casos especiais (FTL)"** (o disclosure).
- [ ] No fundo há o toggle **"Alojamento na pausa (split)"** com o selo **220(d)(e)**.
- [ ] Ligado → mostra a dica ("só conta se houver pausa em terra ≥3h…").
- [ ] O ponto vermelho no cabeçalho do disclosure acende com o toggle ligado.

## 5 · Escala / split-duty (relance)
_Como chegar (o calendário é a fonte): no calendário de teste, hoje, `HSBY` 05:00–09:00 + `EZY7841 LIS-FNC`
14:00–15:35 — intervalo ≥ 6 h → 2 serviços SEPARADOS (não fundem)._
- [ ] Um dia com **2 serviços** mostra "N×" na grelha; o detalhe empilha os serviços (standby, depois voo).
- [x] Botão **Sincronizar** (se tens calendário ligado) → toast "em dia" / "X mudanças". _(✅ device 2026-09-03, API legacy do SDK 57)_
- [ ] Os veredictos de PSV ("estou legal?") aparecem coerentes (sem falsos-ilegais óbvios). _Variante: voo a chegar 23:30 → dia 05:00–23:30 com o standby a contar da chamada; continua coerente._

---

## 6 · Cifra-em-repouso — ~~VALIDAR~~ **FEITO E REPROVADO (2026-07-02)** → `ENCRYPT=false` definitivo
_A v1 (AES em JS) corrompia emoji e congelava o "Guardar serviço" no Hermes; recuou sem perda. A v2 é
cifra NATIVA no dev build (`docs/dev-build.md` item 5). A checklist abaixo fica como guião da v2. A
SESSÃO Supabase, essa, já vive no Keychain por fatias (2026-09-03, `data/supabase.js`)._
_Isto liga a cifra a sério. Testa com calma; se falhar, recua sem perda._
1. Em `data/secureStorage.js`, muda `const ENCRYPT = false` → **`true`**. Recarrega a app.
2. - [ ] **Entrar** → funciona.
   - [ ] **Reiniciar a app** (fechar/abrir) → a **sessão restaura** (não pede login de novo).
   - [ ] **Editar a escala** → grava e lê bem.
   - [ ] **Reinstalar a app** → arranca **limpo** (login) e **re-sincroniza** a escala do servidor.
3. Se algo falhar (logout forçado, dados em falta) → volta a `ENCRYPT = false` (recua sem perda — o fallback lê o plaintext antigo) e diz-me.

---

**Prioridade se tiveres pouco tempo:** 1 (reset), 2 (apagar/reativar), 4 (toggle) — são os que mexem em fluxos novos. O 6 (cifra) é o mais delicado, faz devagar. O 3 (mudar-email) só depois dos passos do dashboard.

---

# Guião · TESTAR OS ESTADOS da Living Interface (2026-07-09)

_Quando disseres **"testar os estados"**, percorremos isto juntos, um estado de cada vez._
_Alavanca: `FORCE_HOME_STATE` no topo do `screens/HomeScreen.js` ('setup' | 'folga' | 'hoje' |
'disrupcao' | 'vespera' | 'posvoo' | 'pernoita' | null=real). O Fast Refresh aplica ao guardar.
**No fim, voltar a `null`.** Para conteúdo realista, melhor combinar a alavanca com dados reais._

## 0 · Setup (primeira vez)
_Dados reais: conta sem calendário ligado. Ou `FORCE='setup'`._
- [ ] "Bem-vindo, <nome>" + fantasma = AVIÃO + "Olá!" + kick amarelo do calendário.
- [ ] Passo "1 Ligar o calendário" (toca → fluxo de ligar na Escala) + placa amarela da dica eCrew.
- [ ] Donut 15% SETUP · chip "PASSO 1" · ações **Ligar calendário** (preta) / **Ver exemplo**.
- [ ] "Ver exemplo" mostra um dia demo (desaparece ao trocar de app — é espreitadela).

## 1 · Folga
_Dados reais: hoje sem serviço. Com e sem serviço futuro marcado._
- [ ] Fantasma = **dia de HOJE** (nunca o do próximo) + **símbolo do tempo** no expoente.
- [ ] Rótulo `FOLGA · QUARTA-FEIRA` (dia por extenso, sem número).
- [ ] **Halo** suave atrás do fantasma (âmbar sol · azulado chuva) — quase subliminar.
- [ ] **Voz**: "descansa — está tudo em dia. …" (2 tons; muda com o tempo/dia).
- [ ] Com próximo serviço: kick "próximo serviço quinta · LIS→FNC · 05:30 · 18°–27°" + agenda (3, tocáveis) + chip "N DIAS até ao report".
- [ ] Sem nada: "sem serviços marcados" + "nada marcado — desfruta ✌️".
- [ ] Com AE: € do mês (cêntimos!) + donut % do mês.

## 2 · Véspera 🌙 (NOTURNO)
_Dados reais: serviço amanhã com report cedo + serem ≥18h. Ou `FORCE='vespera'` (com o serviço criado)._
- [ ] Ecrã ESCURO (azul-noite) + **glow de candeeiro** no topo · avatar visível · rótulo claro.
- [ ] Fantasma = countdown H:MM · "Amanhã" · kick "report às 05:30 · Z · repouso mínimo ✓ · acordar ~04:15".
- [ ] Horas de amanhã em neutro · útil "Amanhã" · **chip INVERTIDO** (placa clara, dígitos escuros).
- [ ] SEM € do mês (noite calma) · voz "está tudo verificado — dorme."
- [ ] Legibilidade geral no escuro (o teste das 22h no sofá).

## 3 · Pré-report (hoje)
_Dados reais: serviço HOJE ainda por começar._
- [ ] Fantasma = countdown ao report · "Report" · kick "às HH:MM · Z" (+ "avião ✓ · aeroporto ✓" se live limpo).
- [ ] Horas PARTIDA/CHEGADA grandes (verdes com live ok) + **tempo do destino** na célula da chegada (ícone desenhado).
- [ ] Per-diem de hoje + donut PSV · chip report·Z · ações **Partilhar**/Hotel(se 🌙)/Simular.
- [ ] Partilhar abre o cartão editorial + envia imagem+link.

## 3b · Disrupção
_Difícil de forçar com dados reais (precisa de atraso ao vivo) — `FORCE='disrupcao'` mostra o esqueleto; o teste verdadeiro é num dia de atraso a sério._
- [ ] Banda laranja com a CAUSA · fantasma "+N" · "Atenção" laranja.
- [ ] Horas com a planeada **rasurada** → ~nova · "derrapa/projeção" · chip "0̶6̶:̶4̶0̶ ~07:05".
- [ ] NUNCA aparece "a tempo ✓" em lado nenhum.

## 4 · Standby (hoje)
_Dados reais: serviço standby/reserva HOJE._
- [ ] Linha do serviço (tipo + janela) + linha **"SE CHAMADO → PSV até HH:MM"** com o máx por baixo.

## 5 · Pós-voo
_Dados reais: serviço de HOJE já terminado (report 06:00, fim 10:00). Na BASE (sem 🌙)._
- [ ] Fantasma = duty total · "Fechado" · kick = veredicto legal (PSV real/máx · dentro ✓).
- [ ] DUTY · BLOCK · SETORES (toque → detalhe do dia) · per-diem hoje + donut PSV.
- [ ] Útil "Fecho": repouso + próximo serviço + nudge do sign-off · ações **Sign-off**/Simular.
- [ ] Multi-serviço (2 serviços no dia): só fecha quando os DOIS acabam; fechado NÃO mostra números de 1 só.

## 6 · Pernoita 🌙 (NOTURNO)
_Dados reais: serviço de hoje terminado com 🌙 fora da base. Ou `FORCE='pernoita'`._
- [ ] Escuro com candeeiro · fantasma = **ESTAÇÃO** (FNC) + tempo de lá no expoente.
- [ ] Kick: hotel a amarelo + "amanhã report HH:MM" · meio = cartão do hotel (toque→mapas · longo→editar; sem hotel → convite).
- [ ] Útil "Fora": repouso 10h (235) · pernoita +€ (cêntimos) · temperatura na estação.
- [ ] Ações **Hotel**(preta)/**Partilhar**(o voo que aterrou — o link diz "Aterrou ✓")/Simular.

## Transversais (em todos)
- [ ] Rótulo lateral começa no MESMO ponto em todas as abas/ecrãs (Início·Números·Escala·INFO·Perfil·Validades·Detalhe).
- [ ] Fantasma nunca pisa o rótulo · nunca desaparece após uns segundos (o bug do re-render morreu).
- [ ] Banda de alerta só quando há motivo; aviso de documento crítico vive AO PÉ do Estado (vermelho).
- [ ] Pull-to-refresh funciona · trocar de aba e voltar não parte nada.
- **Afinações prováveis (diz o número):** posição do expoente do tempo · força do halo · `top` do rótulo (344) · tamanhos do fantasma (190/160/140).

## 4b · Em voo (upgrade)
_Dados reais: serviço HOJE com o report ja passado (setor a decorrer)._
- [ ] Barra de PROGRESSO do setor (amarela, anda com o relogio; com live 1-setor usa partida real→ETA).
- [ ] Util: "PSV 05:12 / max 13:00" a ACUMULAR ao vivo.
- [ ] Standby aeroporto: util diz com/sem alojamento.
- [ ] Formacao com papel instrutor: util diz "papel: instrutor — conta no mes (AE)".

## 7b · Ferias
_Dados reais: evento de ferias HOJE (mini-+ → Extra → Ferias, bloco com hoje dentro). Ou FORCE='ferias'._
- [ ] Fantasma = dias que RESTAM no ano + tempo no expoente; "Ferias"; kick "ficam 9 de 22 · regressas sexta 18".
- [ ] Halo + voz "ferias a serio." · SEM acoes · chip = dias restantes.

## 7c · Doenca
_Dados reais: evento de doenca HOJE. Ou FORCE='doenca'._
- [ ] Fantasma = dia N do episodio; "As melhoras" (coracao amarelo); kick Art. 48 (piloto: 1-3 pago).
- [ ] Tom baixo: sem halo, sem numeros a gritar; acao unica Extra (estender); voz "cuida de ti."

## 7d · Fecho do mes
_Dados reais: ultimos 3 dias do mes com AE. Ou FORCE='fecho'._
- [ ] Fantasma = dias p/ fechar; "Fecho do mes"; kick "estimado ate agora **N NNN,NN €**" (amarelo, centimos).
- [ ] Meio = PARCELAS (BASE·PER-DIEM·PERNOITAS·EXTRAS — somam; toque → Estatisticas).
- [ ] Datarow = total € + donut do mes · util nudge "faltam extras? regista no +".
- [ ] Acoes Extra (preta) / Numeros.

## 8b · Repouso-ate + escala-mudou
- [ ] Pos-voo/pernoita: util e chip dizem "repouso ate HH:MM (+1 se vira o dia) (235)" — confere com o motor.
- [ ] Com alteracoes de escala por rever: banda "A tua escala mudou — N por rever" (toca → Escala).
