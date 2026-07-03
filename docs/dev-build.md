# Vamos a dev build — lista canónica

> Documento a abrir quando se disser **"vamos a dev build"**. Tudo o que ficou
> deliberadamente à espera de sair do Expo Go está aqui; nada disto bloqueia o
> resto da app. Atualizado: 2026-07-03.

## Contexto

- **SÓ iOS por agora** — dev build no Mac/iPhone via `npx expo run:ios --device`.
  Android fica para o "dia Android" (SDK não montado neste PC; o código Android
  existente FICA — os guards são inertes no iOS).
- **CNG puro**: `android/` e `ios/` são efémeros (gerados pelo prebuild) — não se
  commitam nem se editam à mão.
- **Pin obrigatório**: `react-native-worklets` **0.5.1** no SDK 54 (mais recente
  crasha no arranque — "Exception in HostFunction").
- Convenção iOS 26: **nunca** `presentationStyle="fullScreen"` em Modais com
  inputs (SIGABRT com teclado pinado) — os Modais da app já são `transparent`.

## O que ESPERA o dev build

1. **Lembretes reais (expo-notifications)**
   Hard-gate em Expo Go (`data/reminders.js`: em `storeClient` nem faz require —
   toggle honesto, não liga). No dev build volta tudo sem mexer em nada: agendamento
   por-dia do report, deduped. Validar: ativar o toggle no Perfil e receber a
   notificação de teste.

2. **Voo ao vivo — superfície nativa (Dynamic Island / Live Activities)**
   O motor JÁ está na app (reconcile AirLabs, `liveFdpVerdict` crew-aware, card no
   Início, aviso "sincroniza eCrew"). Falta só a Live Activity/Dynamic Island (módulo
   nativo, fora do Expo Go). Edge Function AirLabs já deployed e ativa.
   *Bússola visual*: estética de painel de aeroporto (FIDS) — "uma linha por voo,
   50 anos a apurar o que é importante" (Flighty) — a mesma direção já escolhida
   para o card Serviços (`design/fids-*.html`).

2b. **Widgets — ecrã inicial + ecrã bloqueado (WidgetKit)**
   O widget que um tripulante quer: **próximo report** — serviço, hora de report
   (local + Zulu), countdown e estado "estou legal". Dados todos já calculados na
   app (Início/motores); falta só a superfície WidgetKit (target nativo, fora do
   Expo Go). Provavelmente o melhor rácio valor/esforço da lista.

3. **Import do PDF por ficheiro**
   Upload nativo com `expo-pdf-text-extract` (extração on-device, apaga a cópia;
   RGPD-limpo — a coluna Crew nunca é extraída). **Deps já instaladas**; o parser
   (`data/pdfRoster.js`) é puro e tem 65 golden — só a extração precisa do build.
   - **Extensão a fazer com isto**: detetar **LVE (férias)** no PDF e sugerir o
     bloco como eventos `vacDays` no "Confirmar import" — o registo em bloco
     (de–até) e o saldo anual já existem na app; o parser é testável golden-first
     ANTES do build.

4. **IAP / RevenueCat (premium)**
   Subscrição freemium (compras in-app exigem build nativo). Regra trancada:
   **nunca trancar segurança FTL** atrás do paywall; bundle adaptativo por perfil
   (live/insights/lembretes universais · salário=AE · logbook=pilotos ·
   validades=universal).

5. **Cifra-em-repouso v2 (nativa)**
   A v1 em JS puro (aes-js) REPROVOU no device (utf8 corrompe emoji + AES em Hermes
   congela o guardar) → `ENCRYPT=false` definitivo com o porquê no cabeçalho de
   `data/secureStorage.js`. v2 = cifra nativa (`react-native-quick-crypto` ou MMKV
   cifrado); a sessão (v1.1) vai atrás dela. Validar SecureStore no device na mesma
   passagem.

> Ideias Flighty→crew que NÃO precisavam de dev build (partilha com a família ·
> "Ano de voo" partilhável · inbound do avião) saíram desta lista — feitas já
> (2026-07-03). Descartado e registado: Shared with You · Friends' Flights ·
> milhas (não encaixam em crew/local-first).

## Depois do primeiro build — checklist de validação

- [ ] Lembretes: toggle liga + notificação chega
- [ ] PDF: importar um roster real por ficheiro (e conferir a sugestão LVE quando feita)
- [ ] Dynamic Island: voo ao vivo aparece/atualiza
- [ ] Widget "próximo report": dados certos + atualiza à meia-noite/alteração de escala
- [ ] Cifra v2: gravar/ler com emoji na escala + tempos de arranque aceitáveis
- [ ] IAP sandbox: comprar/restaurar em conta de teste

## Ideias guardadas para mais tarde (também não é dev build)

- **Mapa na página da família** (`web/chegada`) — a evolução natural do live-share, ao
  estilo Flighty: posição do avião + rota num mapa. Custa o que o resto não custa:
  biblioteca de mapas + tiles externos (a página deixa de ser um ficheiro auto-contido)
  e mais 1 chamada AirLabs por minuto por página aberta (posição — quota). O countdown
  "aterra em ~N min" + barra de progresso (FEITOS 2026-07-03) dão ~80% do valor por ~0%
  do custo — o mapa só se a partilha ganhar tração.
- **Notificações à família ("aterrou ✓")** — NÃO é dev build (a família não tem app;
  seria sempre servidor): web push é grátis mas no iPhone exige adicionar a página ao
  ecrã inicial (fricção); WhatsApp automático = API paga; a variante realista é EMAIL
  via o Resend já existente + um relógio no servidor (pg_cron a vigiar voos — come
  quota AirLabs). Adiado por custo/fricção; a página que atualiza sozinha e fixa o
  "Aterrou ✓" cobre o grosso. (A camada 1 — links permanentes — FICOU FEITA 2026-07-03.)

## Fora desta lista (não é dev build)

- **Dashboard do user (Supabase)**: desligar "Secure email change" + template
  `{{ .Token }}`; deploy `delete-account` (feito) + `reactivate-account` +
  `cron-purge-deletions.sql` — ver `docs/eas-backend-plan.md`.
- **Validades — formulário manual**: parado à espera de o user rever documentos
  reais (estrutura dos campos, nunca valores).
- **Dia Android**: QA visual + Live Update (equivalente Android do Dynamic Island).
