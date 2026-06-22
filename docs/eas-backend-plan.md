# CrewPact — Plano do lote backend / EAS

> Itens adiados da auditoria *Offline/Privacy First* (2026-06-22). **Nada disto está
> implementado** — é o guia para executar na fase de **dev build EAS / backend**.
> As vitórias verificáveis já foram feitas em Expo Go: **#1** reconstruir histórico FTL
> (`reconcileDayLog`), **#5 (acesso)** export RGPD (`data/dataExport.js`), **#6** cleanup.

## Sequenciamento (importante)

Nem tudo precisa da dev build. Por **gate**:

| Item | Gate real | Pode fazer-se… |
|---|---|---|
| **A. Apagar conta** | Edge Function + `service_role` (**backend**) | Já em Expo Go, assim que a função estiver no ar (é só um `fetch`) |
| **C. Verificação de email** | Config Supabase + SMTP (**backend/config**) | Já em Expo Go |
| **B. Cifra em repouso** | Cripto **nativa** (Keystore/Keychain) | **Dev build EAS** (em Expo Go só `aes-js`, mais lento) |

Ordem sugerida: **A → C → B** (A e C são backend/config e dão valor já; B fica para a dev build).

---

## A. Edge Function — apagar conta (RGPD Art. 17, erasure)

**Porquê:** o client (anon/authenticated) **não** apaga `auth.users`. Precisa do `service_role`,
que **nunca** pode ir na app → tem de viver numa Edge Function. O cascade já está aplicado
(`schema.sql §1` auth.users→profiles, `§5` profiles→duties, ambos `ON DELETE CASCADE`),
por isso apagar o user **limpa profiles + duties automaticamente**.

### Função (esboço — `supabase/functions/delete-account/index.ts`, Deno)
```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' };
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const auth = req.headers.get('Authorization');
  if (!auth) return json({ error: 'no auth' }, 401);
  // 1) Identifica o chamador pelo JWT dele
  const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: auth } } });
  const { data: { user }, error } = await asUser.auth.getUser();
  if (error || !user) return json({ error: 'invalid token' }, 401);
  // 2) Apaga com service_role → cascade limpa profiles + duties
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SERVICE_ROLE_KEY')!);
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) return json({ error: delErr.message }, 500);
  return json({ ok: true });
});
```

### Deploy
```bash
supabase functions deploy delete-account --no-verify-jwt   # verificamos o JWT à mão
supabase secrets set SERVICE_ROLE_KEY=<service_role da dashboard>
# SUPABASE_URL e SUPABASE_ANON_KEY já estão disponíveis às funções
```
> `--no-verify-jwt` porque validamos o token manualmente (e queremos a 401 nossa). O
> `service_role` vai como **secret da função**, nunca no bundle da app.

### App (Expo-Go-compatível — só `fetch`)
- `data/auth.js` → `deleteAccount()`:
  ```js
  export const deleteAccount = async () => {
    const { error } = await supabase.functions.invoke('delete-account'); // JWT vai automático
    if (error) return false;
    await supabase.auth.signOut();
    return true;
  };
  ```
- `App.js` → após sucesso, **limpar TODAS as chaves locais** do user antes do signOut/reset:
  `cp_duties_<uid>`, `cp_daylog_<uid>`, `cp_ae_extras_<uid>`, `cp_read_<uid>`,
  `cp_record_<uid>`, `cp_profile_<uid>` (e opcional `cp_airlines`). Reaproveitar o reset
  do `logout` existente + um `AsyncStorage.multiRemove([...])`.
- `SettingsScreen` → secção **"Os meus dados"** (já existe) ganha linha **danger**
  *"Apagar a minha conta"* com **confirmação forte** (CenterDialog; escrever "APAGAR"
  ou duplo-confirm). Reaproveitar o padrão do `pwModal`.

### Checklist de teste (no device)
- [ ] Conta de teste + algumas duties → "Apagar conta" → confirma.
- [ ] `auth.users` apagado (dashboard); `profiles` e `duties` desse user **vazios** (cascade).
- [ ] Local limpo (reabrir → onboarding/login, sem escala antiga).
- [ ] Cancelar no diálogo **não** apaga nada.
- [ ] Sem rede → erro tratado (não "apaga" localmente sem confirmar servidor).

### Riscos / gotchas
- A função **tem** de validar o JWT (senão qualquer um apagava users). ✔ no esboço.
- Confirmar que os FKs cascade existem (`§1`/`§5` do schema) — se faltarem, o delete falha.
- Apagar local **só depois** do servidor confirmar `ok` (evitar perda sem erasure real).

---

## B. Cifra de dados em repouso (defesa-em-profundidade)

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

## C. Verificação de email (posse do email)

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
