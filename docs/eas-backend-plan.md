# CrewPact — Plano do lote backend / EAS

> Itens da auditoria *Offline/Privacy First* (2026-06-22). **Estado (2026-07-01):**
> **A. Apagar conta = FEITO + verificado** (falta só o *deploy*, do user) · **C. Verificação de
> email = FEITA + a funcionar** (Resend + `crewpact.app`) · **B. Cifra em repouso = por fazer**
> (precisa dev build). Vitórias verificáveis em Expo Go já feitas: **#1** `reconcileDayLog`,
> **#5 (acesso)** export RGPD (`data/dataExport.js`), **#6** cleanup.

## Sequenciamento (importante)

Nem tudo precisa da dev build. Por **gate**:

| Item | Gate real | Estado |
|---|---|---|
| **A. Apagar conta** | Edge Function + `service_role` (**backend**) | ✅ **FEITO + verificado** — falta o *deploy* (do user) |
| **C. Verificação de email** | Config Supabase + SMTP (**backend/config**) | ✅ **FEITA + a funcionar** (Resend + `crewpact.app`) |
| **B. Cifra em repouso** | expo-secure-store + aes-js (**Expo Go OK**; nativo p/ velocidade = dev build) | 🟡 **código pronto atrás de flag** (v1 = blobs; sessão adiada v1.1); falta VALIDAR no device |

Ordem sugerida: **A → C → B** — **A e C feitos**; **B com código pronto (flag OFF)**, falta a validação no device.

---

## A. Edge Function — apagar conta (RGPD Art. 17, erasure) — ✅ FEITO + verificado (2026-07-01)

**Porquê:** o client (anon/authenticated) **não** apaga `auth.users`. Precisa do `service_role`,
que **nunca** pode ir na app → vive numa Edge Function. O cascade já está aplicado
(`schema.sql §1` auth.users→profiles, `§5` duties→profiles, ambos `ON DELETE CASCADE`),
por isso apagar o user **limpa profiles + duties automaticamente**.

**Estado:** entregue e revisto (workflow adversarial, 3 lentes: IDOR·RGPD·cliente). IDOR =
**sólido** (o uid vem só do JWT, nunca do corpo → só te apagas a ti). 2 defeitos apanhados e
corrigidos (purga local + mensagem offline). **Falta só o deploy** (do user) + confirmar as
cascades na BD ao vivo.

> **Drift resolvido:** o esboço original deste plano usava 2 clientes (anon + `SERVICE_ROLE_KEY`
> como secret) e `--no-verify-jwt`. O que ficou é mais simples e robusto: **1 admin client** com a
> `SUPABASE_SERVICE_ROLE_KEY` **auto-injetada** + `getUser(token)`, com `verify_jwt` **ligado**.

### Função — `supabase/functions/delete-account/index.ts` (Deno) [entregue]
Um **único** admin client (`SUPABASE_SERVICE_ROLE_KEY`, auto-injetada pelo runtime) que:
1. tira o token do header `Authorization` e valida-o com `admin.auth.getUser(token)` (assinatura+expiração+revogação no servidor, não é decode local);
2. apaga **só** `user.id` — o do JWT, **nunca** um uid do corpo — via `admin.auth.admin.deleteUser`.
`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` vêm do runtime → **sem `secrets set`**. (Ver o ficheiro para o código real.)

### Deploy (do user)
```bash
supabase functions deploy delete-account
```
`verify_jwt` fica **LIGADO** (default): o gateway exige um JWT válido antes de a função correr (a
app envia-o via `functions.invoke`) e a função **RE-valida** para extrair o uid → **dupla barreira**.
**Nenhum segredo a definir** (auto-injetados). Alternativa Dashboard: Edge Functions → Deploy →
nome `delete-account` → colar `index.ts` → Deploy.

### App [entregue]
- `data/auth.js` → `deleteAccount()`: `supabase.functions.invoke('delete-account')` (o JWT vai
  automático) → `signOut`. `isNetworkError` reforçado (vê `.name`/`.context` → apanha o
  `FunctionsFetchError` que o `invoke` devolve offline, cuja *message* não tem "fetch").
- `screens/SettingsScreen.js` → `handleDeleteAccount`: após `ok`, **purga as caches locais deste
  user** — `AsyncStorage.getAllKeys().filter(k => k.endsWith('_' + uid))` + `multiRemove` (apanha
  chaves futuras sozinho; **não** no `logout`, que é não-destrutivo de propósito) → depois `logout()`.
- `SettingsScreen` → secção **"Os meus dados"**: linha **danger** *"Apagar conta"* → CenterDialog
  com **gate por palavra escrita** (APAGAR/DELETE) + aviso + botão vermelho travado até escreveres.

### A confirmar na BD ao vivo (do user) — SQL Editor
Que os FKs cascade `§1`/`§5` já correram (senão o delete falha):
```sql
select tc.table_name, rc.delete_rule
from information_schema.referential_constraints rc
join information_schema.table_constraints tc on tc.constraint_name = rc.constraint_name
where tc.table_name in ('profiles','duties') and rc.delete_rule is not null;
```
Esperado: **2 linhas, ambas `CASCADE`**. Se faltar ou for `NO ACTION`, re-correr o DO-block
respetivo do `schema.sql` (idempotente).

### Checklist de teste (no device, pós-deploy)
- [ ] Conta de teste + duties → "Apagar conta" → escrever APAGAR → confirma.
- [ ] `auth.users` apagado (dashboard); `profiles`/`duties` desse user **vazios** (cascade).
- [ ] Local limpo (reabrir → onboarding/login, sem escala/validades antigas).
- [ ] Cancelar/fechar o diálogo **não** apaga nada.
- [ ] Sem rede → mensagem "Sem ligação à internet" (não o genérico) e **nada** apagado.

### Fast-follow (FEITO 2026-07-01) — período de graça de 7 dias

> **Estado: CONSTRUÍDO.** `delete-account` passou a SOFT-DELETE (marca `app_metadata.deletion_scheduled_at`
> = agora+7d, preserva o resto, desloga; devolve `scheduledAt`). NOVO `reactivate-account` (limpa a marca,
> uid do JWT). NOVO `supabase/cron-purge-deletions.sql` (pg_cron 1×/dia → `purge_scheduled_deletions()`
> apaga `auth.users` cujo prazo expirou; cascades limpam o resto). App: `mapUser.deletionAt`, `deleteAccount`
> devolve a data, `reactivateAccount` (refresca a sessão), **gate `ReactivateScreen`** no App.js (qualquer
> `deletionAt` → reativar/sair), copy do diálogo mudada (7 dias, reativável), **NÃO purga o local** (a
> reativação precisa da escala). **DEPLOY do user:** deploy das 2 funções + correr o SQL do cron (ativar pg_cron).
> **Trade-off aceite:** dados LOCAIS no dispositivo não se purgam ao agendar (a reativação precisa deles);
> após o cron apagar no servidor, o local fica órfão até o user reinstalar/entrar (device-only, sandbox).

**Decisão:** o hard-delete acima serve **agora** (requisito das stores cumprido). Como *melhoria*
(não bloqueador), o apagar passa depois a **soft-delete com 7 dias de graça + reativação** —
padrão Apple ("até 7 dias") / Meta. **7 dias** (não 5, arbitrário; não 30 — guardamos validades =
dado de saúde Art. 9, não deve marinar). Compatível com RGPD (Art. 17 não exige eliminação
*instantânea*, só prazo razoável + aviso) e com as app stores (reativação é aceite).

**3 peças (a construir quando houver apetite para o cron):**
1. **Flag** `deletion_scheduled_at` (em `profiles` ou `app_metadata`) — a função `delete-account`
   passa a *marcar* em vez de `deleteUser`; devolve a data-limite para a UI.
2. **Cron server-side** (Supabase Cron / `pg_cron`, 1×/dia) → apaga de vez quem tem
   `deletion_scheduled_at < now()`. Peça **irredutível**: a app não pode garantir apagar daqui a
   7 dias (pode nunca mais abrir).
3. **Ecrã de reativação** — no bootstrap/login, se a flag existir e estiver no futuro, mostrar
   *"conta agendada para eliminação em X dias — reativar?"* → limpa a flag.

**Ajustes que isto obriga:** (a) a **purga local** deixa de ser na hora (senão a reativação perde a
escala local) → passa a acontecer quando a sessão for inválida (conta já eliminada pelo cron);
(b) a **copy** do diálogo muda de "definitivo/irreversível" para "desativada agora, eliminada em
7 dias, podes reativar entrando". **Verificação bloqueada** no setup atual (cron + estados =
precisam de device/dev build).

---

## B. Cifra de dados em repouso (defesa-em-profundidade) — 🟡 v1 CÓDIGO PRONTO, flag OFF (2026-07-01)

> **Estado:** `data/secureStorage.js` (NOVO) — wrapper drop-in do AsyncStorage, envelope AES-CTR
> (aes-js) + chave 256-bit no expo-secure-store. Import trocado em `App.js`, `EscalaScreen`,
> `SettingsScreen` (mantendo o nome `AsyncStorage`); `data/supabase.js` **intocado** (sessão adiada).
> **Flag `ENCRYPT = false`** (topo do módulo) → passthrough PURO por agora = comportamento idêntico
> ao atual. **v1 = SÓ os blobs da app** (cp_duties/daylog/validades/profile/ae_extras/record/…);
> a **sessão Supabase fica para v1.1** (assimetria de risco: blob falha=re-sync; sessão falha=brick).
> Revisão adversarial (2 lentes) apanhou 2 críticos de gestão-de-chave (rotação em falha de leitura +
> chave efémera → perda silenciosa), **ambos CORRIGIDOS**: nunca roda a chave, get-after-set,
> `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`, sentinela de integridade (chave-errada/corrupção → null,
> nunca lixo), e não-escreve quando a chave está indisponível (não clobbera). Envelope provado em
> Node (round-trip + chave-errada→null). Deps instaladas: `expo-secure-store ~15.0.8`,
> `expo-crypto ~15.0.9`, `aes-js ^3.1.2`.
>
> **ATIVAR (só no device — não verificável em Windows):** pôr `ENCRYPT = true` em
> `data/secureStorage.js` e correr a checklist abaixo (login → reiniciar → editar escala/validades →
> reinstalar). Se algo falhar, `ENCRYPT = false` recua sem perda (o fallback lê o plaintext legado).
> **A sessão (v1.1)** só depois de o adaptador ter quilómetros de device.

**Porquê / âmbito:** AsyncStorage é texto simples (sandbox já protege; isto cobre
root/jailbreak/backups). Cifrar **só os blobs sensíveis** — `cp_duties`, `cp_daylog`,
`cp_profile`, `cp_ae_extras`, `cp_record` **+ a sessão Supabase**. **Não** cifrar público
(`cp_airlines`, `cp_lang`, `cp_theme`, flag `cp_lock`).

### Padrão "envelope" (canónico Supabase RN)
Chave aleatória de 256-bit no **`expo-secure-store`** (Keychain/Keystore, hardware) que
cifra (AES) os **valores**; o **ciphertext** fica no AsyncStorage. Um adaptador serve a
`auth.storage` da Supabase **e** um wrapper para os `cp_*`.

```js
// data/secureStorage.js (esboço)
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';      // getRandomBytes
import aesjs from 'aes-js';                  // Expo Go OK (lento p/ blobs grandes)

async function key() {
  let hex = await SecureStore.getItemAsync('cp_enc_key');
  if (!hex) { hex = aesjs.utils.hex.fromBytes(Crypto.getRandomBytes(32)); await SecureStore.setItemAsync('cp_enc_key', hex); }
  return aesjs.utils.hex.toBytes(hex);
}
const PREFIX = 'enc1:';                       // marca de versão → permite fallback/migração
export async function setItem(k, v) {
  const iv = Crypto.getRandomBytes(16);
  const aesCtr = new aesjs.ModeOfOperation.ctr(await key(), new aesjs.Counter(iv));
  const ct = aesCtr.encrypt(aesjs.utils.utf8.toBytes(v));
  await AsyncStorage.setItem(k, PREFIX + aesjs.utils.hex.fromBytes(iv) + ':' + aesjs.utils.hex.fromBytes(ct));
}
export async function getItem(k) {
  const raw = await AsyncStorage.getItem(k);
  if (raw == null) return null;
  if (!raw.startsWith(PREFIX)) return raw;    // FALLBACK: plaintext antigo (migração)
  const [, ivHex, ctHex] = raw.split(':');
  const aesCtr = new aesjs.ModeOfOperation.ctr(await key(), new aesjs.Counter(aesjs.utils.hex.toBytes(ivHex)));
  return aesjs.utils.utf8.fromBytes(aesCtr.decrypt(aesjs.utils.hex.toBytes(ctHex)));
}
// removeItem → AsyncStorage.removeItem
```
> **Dev build (preferível):** trocar `aes-js` por cripto **nativa** (ex.: `react-native-aes-crypto`,
> ou `react-native-mmkv` com `encryptionKey`) — muito mais rápido. O `aes-js` é o
> fallback que corre em Expo Go.

### Integração
- `data/supabase.js` → `auth: { storage: secureStorage, autoRefreshToken: true, persistSession: true }`.
- `App.js` → trocar os `AsyncStorage.getItem/setItem` dos `cp_*` **sensíveis** pelo wrapper
  (manter `cp_airlines`/prefs em claro).
- **Migração 1×:** o `getItem` já cai para plaintext quando não há `enc1:`; ao reescrever
  (próximo `setItem`) fica cifrado. Opcional: um passo de "re-key" no arranque que lê→reescreve.

### Checklist de teste (no device)
- [ ] Login → reiniciar app → sessão restaurada (sem novo login).
- [ ] Inspecionar o storage → valores **cifrados** (não legíveis).
- [ ] Reinstalar → re-login → duties re-sincronizam (a chave do Keystore some no Android no uninstall; no iOS pode persistir — tratar `decrypt fail` como plaintext/limpar).
- [ ] `decrypt` falha (chave perdida) → **fallback** não tranca (re-sync do servidor).
- [ ] Blob grande (daylog de meses) → desempenho aceitável (medir; se mau → nativo).

### Riscos / gotchas
- **SecureStore só guarda a CHAVE** (pequena), nunca os dados (tem limite ~2 KB Android).
- IV **único por valor** (o esboço gera por escrita). Nunca reutilizar IV com a mesma chave.
- **Perda de chave = dados ilegíveis** → desenhar para re-sync do servidor (duties) e
  aceitar perda do local-only (daylog reconstrói-se via `reconcileDayLog`; extras AE perdem-se).
- **Crítico de auth:** testar login/restart/reinstall **antes** de confiar (um adaptador
  errado = logout forçado / perda). Não fazer às cegas.

---

## C. Verificação de email (posse do email) — ✅ FEITA + a funcionar (2026-07-01)

> **Estado:** autoconfirm **desligado** + SMTP **Resend** + domínio **`crewpact.app`** verificado +
> sender `noreply@crewpact.app`; registo e reset por **OTP 6 díg** (`verifyOtp` `signup`/`recovery`),
> templates bilingues, OTP expira em **15 min**. Detalhes em `memory/auth-login-audit.md`. O texto
> abaixo é o plano histórico que originou isto.

**Porquê:** hoje `mailer_autoconfirm: true` → conta criada **sem** verificar posse do email
(impersonação/contas-lixo). O ramo `if(!data.session) confirmEmail` em `data/auth.js`
`register()` é **código morto** (nunca alcançado) — ligá-lo torna-o vivo.

### Config Supabase (dashboard)
1. **Auth → Providers → Email:** **desligar** "Confirm email" autoconfirm (passa a exigir confirmação).
2. **SMTP:** o default da Supabase tem limites baixos → configurar **SMTP próprio** para produção.
3. **Email templates:** "Confirm signup" (link **ou** OTP de 6 dígitos).

### App
- `register()`: com confirmação ligada, o `signUp` devolve **sem sessão** → mostrar estado
  *"confirma o email"* + **reenviar** (`supabase.auth.resend({ type: 'signup', email })`).
- Confirmar: reaproveitar o fluxo OTP que já existe para reset (`verifyOtp`), mas
  `type: 'signup'` (OTP de 6 dígitos — **mais simples** que magic-link/deep-link).
- A mensagem `notConfirmed` ("Confirm your email…") e o ramo morto passam a **vivos** → testar.

### Checklist de teste
- [ ] Registar → email chega → **login bloqueado** até confirmar.
- [ ] Confirmar (OTP) → login ok.
- [ ] Reenviar funciona; OTP expirado → erro tratado.
- [ ] Email inexistente/errado → fluxo não deixa entrar.

### Trade-off (decisão de produto)
Liga **fricção** (passo de email) e exige **SMTP fiável** (deliverability). Alternativa:
manter autoconfirm e aceitar explicitamente o risco. Decidir antes de ligar.

---

## Notas transversais
- **Nada acima toca nos motores** (`ftl/`, `ae/`) nem na lógica pura já testada.
- O `service_role` **nunca** entra no bundle da app (só secret de função).
- Depois de A/C, atualizar a memória `db-state-supabase` (autoconfirm/erasure resolvidos).
- B fica fechado quando testado no device; até lá, o risco at-rest é **baixo** (sandbox).
