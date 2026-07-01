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
_Escala → toca num dia de voo → **Editar** (ou "+ adicionar serviço")._
- [ ] No formulário, abre **"Casos especiais (FTL)"** (o disclosure).
- [ ] No fundo há o toggle **"Alojamento na pausa (split)"** com o selo **220(d)(e)**.
- [ ] Ligado → mostra a dica ("só conta se houver pausa em terra ≥3h…").
- [ ] O ponto vermelho no cabeçalho do disclosure acende com o toggle ligado.

## 5 · Escala / split-duty (relance)
- [ ] Um dia com **2 serviços** mostra "N×" na grelha; o detalhe empilha os serviços.
- [ ] Botão **Sincronizar** (se tens calendário ligado) → toast "em dia" / "X mudanças".
- [ ] Os veredictos de PSV ("estou legal?") aparecem coerentes (sem falsos-ilegais óbvios).

---

## 6 · Cifra-em-repouso — VALIDAR (fazer POR ÚLTIMO, à parte)
_Isto liga a cifra a sério. Testa com calma; se falhar, recua sem perda._
1. Em `data/secureStorage.js`, muda `const ENCRYPT = false` → **`true`**. Recarrega a app.
2. - [ ] **Entrar** → funciona.
   - [ ] **Reiniciar a app** (fechar/abrir) → a **sessão restaura** (não pede login de novo).
   - [ ] **Editar a escala** → grava e lê bem.
   - [ ] **Reinstalar a app** → arranca **limpo** (login) e **re-sincroniza** a escala do servidor.
3. Se algo falhar (logout forçado, dados em falta) → volta a `ENCRYPT = false` (recua sem perda — o fallback lê o plaintext antigo) e diz-me.

---

**Prioridade se tiveres pouco tempo:** 1 (reset), 2 (apagar/reativar), 4 (toggle) — são os que mexem em fluxos novos. O 6 (cifra) é o mais delicado, faz devagar. O 3 (mudar-email) só depois dos passos do dashboard.
