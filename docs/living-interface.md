# Living Interface — Design System v1

> **O coração da app.** O Início não mostra funcionalidades — acompanha o dia operacional
> do tripulante. Um motor determinístico calcula o estado; a interface veste-o.
> Este documento é a LEI: os estados, a pele, a navegação e as regras.
> Mockup canónico: `design/pele-tipografica-final.html` (+ `navbar-variantes.html` telefone B).
> Decidido com o utilizador em 2026-07-03, peça a peça. Nada aqui é sugestão.

---

## 1 · Princípios (as leis de sangue)

1. **Estrutura fixa, conteúdo adaptativo.** As zonas do ecrã nunca mudam de sítio;
   o que muda é o que cada zona mostra. (O falhanço dos menus adaptativos do Office
   2000 não se repete aqui.)
2. **1 principal + 2 secundários.** Nunca dashboard. Nunca cinco cartões.
3. **O porquê a uma linha.** Nenhum número sem a sua explicação a um olhar de
   distância. Auditável como os motores.
4. **Ruído zero / a app afasta-se.** Na folga e nas férias, a app baixa a voz.
   O silêncio também é informação.
5. **Determinístico, sem AI.** O estado é uma função pura dos dados
   (`crewState()`), golden-testável como os motores FTL/AE. Cada cartão sabe
   responder "porque estou a ver isto?".
6. **Sem mascotes, sem fotos.** O carácter vem da tipografia e da cor.
7. **Criação é contextual.** Toda a ação de criação tem casa contextual visível
   (Serviço → tocar num dia da Escala · Extra → estados certos + Cálculos ·
   Simulação → estados + FtlHub). Se um estado deixar uma ação sem porta a um
   toque, é bug de design — não pretexto para um botão global. **Não há FAB.**

---

## 2 · O motor (Context Engine)

Função pura, sem rede, golden-testável:

```
crewState({ now, duties, dayLog, live, inbound, airportStats, wx,
            validades, aeEvents, rosterDiff, profile })
  → { estado, principal, secundarios[2], porque, tone }
```

- **O estado dá o cartão principal; a fila de prioridades dá os secundários.**
  (Híbrido: máquina de estados + prioridades — os estados sobrepõem-se na vida
  real; a fila compõe.)
- **Um estado só existe se for detetável** com dados que a app tem. Sem GPS,
  sem meteo-como-gatilho, sem eventos de check-in (não existem fontes).

### Tabela de prioridades (secundários)

| Situação | Prioridade |
|---|---|
| Validade expira ≤ 7 dias | 100 |
| Disrupção ao vivo (cancelado / PSV over) | 95 |
| Report < 2 h | 90 |
| Escala mudou (diff por confirmar) | 85 |
| Janela de standby ativa | 85 |
| Em voo | 80 |
| Pós-voo (fecho do dia) | 75 |
| Pernoita fora (hotel/amanhã) | 70 |
| Véspera (repouso/alarme) | 65 |
| Fecho do mês (total + extras) | 50 |
| Validade ≤ 30 dias | 45 |
| Estatísticas / mês | 20 |
| Folga / férias (calma) | 10 |

### Eventos que reavaliam o estado (todos reais, já emitidos hoje)

tick de relógio (1 min) · diff do sync/import da escala · transições do voo ao
vivo (scheduled → en-route → landed) · limiares do inbound (`inboundGap ≥ 15 min`)
e do aeroporto (`airportDisruption`) · validade a cruzar 90/60/30/7 dias · evento
AE registado · virar de dia/mês · início de bloco de férias/doença · sign-off
registado.

---

## 3 · A pele (tipográfica final)

### Tokens

| Token | Valor | Papel |
|---|---|---|
| `paper` | `#FFFFFF` | fundo — o branco É a pele |
| `ink` | `#141414` | texto, chip, pílula ativa |
| `ghost` | `#E2E1DC` | o número fantasma do hero |
| `grey` | `#77776F` | secundário |
| `line` | `#ECEAE4` | hairlines |
| `yellow` | `#FFB800` | **marca** — acentos cirúrgicos, dígitos no chip preto, sublinhado ativo |
| `ok` | `#118A55` | confirmado / a tempo |
| `warn` | `#E86A10` | alarme (laranja — NUNCA o amarelo) |
| `warnSoft` | `#FBEAD9` | fundo da faixa de alerta |

**Regras de cor:** o amarelo NUNCA é texto sobre branco (é placa, dígito sobre
preto, ou sublinhado). O alarme é laranja/vermelho — nas zonas de alarme o
amarelo-marca sai de cena. Verde = facto confirmado. € sempre com 2 casas.

### Tipografia

- **Display / números**: Barlow Condensed 600–700, `tabular-nums`, tracking
  negativo nos gigantes.
- **Texto / rótulos**: Hanken Grotesk 500–800 (a fonte da app).
- **Hierarquia é tipográfica** — zero caixas no hero; hairlines separam zonas.

### Anatomia do Início (as zonas, de cima para baixo — FIXAS)

1. **Greet** (12px grey) + **rótulo rodado** na margem direita (identidade do
   momento: "EJU7625 · 2 SETORES").
2. **Faixa de alerta** — slot FIXO; só existe quando há alarme; laranja; nunca
   noutro sítio.
3. **Hero** — número **fantasma** 190px à direita + **palavra condensada** 56px
   sobreposta + **kick** (o porquê, com acentos amarelos) + seta amarela.
   Na disrupção a palavra fica laranja.
4. **hr** (1.5px ink).
5. **Zona do meio — ADAPTATIVA** (mesmo slot, conteúdos diferentes):
   - dias de voo → **horas gigantes coloridas pelo estado** (verde a tempo /
     laranja derrapou **com a antiga rasurada ao lado**) — sistema Flighty;
   - folga → **agenda com tracinhos** alinhada à direita (próximos serviços);
   - onboarding → o passo único + dica.
6. **Util** — micro-texto utilitário ("Hoje · G-UZHB já em LIS · PSV máx 13:00").
7. **Datarow** — dígitos amarelos 54px (per-diem/mês/PSV proj) + **donut** 52px
   (PSV % / mês % — laranja quando crítico).
8. **Barra do polegar** — **chip das horas** (preto, dígitos amarelos — a hora
   que manda: report/countdown/nova hora, com rasura) + **ações COM RÓTULO**
   (máx. 3, a primária em preto-cheio, mudam por estado).
9. **Pílula de navegação** (ver §4).

---

## 4 · Navegação

- **Pílula flutuante** (não barra de largura total): 4 abas — Início ·
  Estatísticas · Escala · FTL/AE (rótulo "FTL/AE" só em companhias com AE).
  Fundo branco translúcido, borda hairline, sombra suave, ativa em pastilha
  preta com ponto amarelo.
- **Encolhe no scroll para baixo** até à aba ativa ("● Início"); **expande** no
  scroll para cima, no topo, ou ao toque. Nunca desaparece — há sempre um alvo.
  (Padrão nativo iOS 26 `tabBarMinimizeBehavior`; no RN, mimetizar.)
- **Sem FAB** (ver princípio 7). O lugar iOS 26 do botão destacado fica
  reservado caso o uso real prove falta.
- Estados calmos (folga/férias) podem nascer com a pílula minimizada — afinar
  no port com uso real.

---

## 5 · Os estados (fichas)

> Formato: **Gatilho** (determinístico) · **Hero** · **Meio** · **Chip** ·
> **Ações** · **Desaparece** · **Animação** · **Objetivo**.
> Conteúdo sempre crew-aware: os motores FTL/AE enchem os cartões com os valores
> do perfil (piloto/cabine, companhia, categoria).

### 0 · Onboarding
- **Gatilho:** conta criada, calendário ainda não ligado.
- **Hero:** ghost ✈ · "Olá!" · kick "liga o calendário do telemóvel e o Início ganha vida".
- **Meio:** UM passo — "1 · Ligar o calendário do telemóvel — é daí que a app lê
  a tua escala; essencial" + **dica em placa amarela suave**: "No eCrew, ativa o
  sync para o calendário do telemóvel. Com ele ligado, a escala chega sempre
  atualizada — e a app trabalha sem erros."
- **Chip:** "PASSO 1 · ligar o calendário". **Ações:** Ligar calendário (hot) · Ver exemplo (demo).
- **Desaparece:** TUDO o resto. Identidade NÃO se mostra nem se pergunta — veio do registo.
- **Objetivo:** uma única missão. O vazio nunca pede desculpa: mostra o caminho e prova o valor (dia de exemplo).

### 1 · Folga
- **Gatilho:** sem duty hoje; próximo report > 24 h.
- **Hero:** ghost = dia do próximo (26) · "Folga" · kick "próximo quinta · LIS→FNC · 05:30".
- **Meio:** agenda c/ tracinhos (2–3 próximos). **Util:** sincronizada ✓ · repouso em dia · férias X de Y.
- **Datarow:** mês € estimado + donut mês %. **Chip:** "2 DIAS · até ao report".
- **Ações:** Extra (hot) · Simular. **Desaparece:** countdowns, PSV, avisos.
- **Animação:** assenta uma vez; sem refresh. **Objetivo:** silêncio merecido.

### 2 · Véspera
- **Gatilho:** report nas próximas 8–14 h, atravessando a noite.
- **Hero:** ghost = hora do report · "Amanhã" · kick "report 05:30 · repouso mínimo cumprido ✓ (235)".
- **Meio:** horas planeadas (pretas — neutras). **Util:** acordar sugerido · setores · máx PSV.
- **Chip:** countdown p/ o report. **Ações:** Simular · (Hotel se pernoita hoje).
- **Desaparece:** € do mês. **Objetivo:** deitar-se descansado — "está verificado, dorme".

### 3 · Pré-report (e variante 3b · Disrupção)
- **Gatilho:** voo hoje, report − 4 h. **3b:** `inboundGap ≥ 15` ∨ `airportDisruption` ∨ `hasDeviation`.
- **Hero:** ghost = countdown (1:05) · "Report" · kick "às 05:30 · 04:30Z · avião ✓ · aeroporto ✓".
  **3b:** ghost "+25" · "Atenção" (laranja) · kick "a partida pode derrapar ~25 min".
- **3b — faixa de alerta:** "⚠ o teu avião ainda vem a caminho — inbound ~05:10Z · LIS 54% atrasos".
- **Meio:** horas partida→chegada VERDES ("a tempo ✓ · porta 24 · meteo FNC").
  **3b:** LARANJAS com as antigas rasuradas (~~06:40~~ → ~07:05 · projeção).
- **Util:** matrícula em posição · PSV máx. **3b:** PSV projetado (liveFdpVerdict) + margem + discrição 205(f).
- **Datarow:** per-diem de hoje + donut PSV%. **3b:** PSV proj + donut laranja ~97%.
- **Chip:** report (3b: ~~antiga~~ nova hora). **Ações:** Partilhar (hot) · Hotel · Simular.
- **Desaparece:** próximas duties, cards do mês. **3b:** o "✓ a horas" — nunca se afirma o que a rotação desmente.
- **Objetivo:** sair de casa sem surpresas. 3b: minutos de avanço sobre o ops.

### 4 · Em serviço / em voo
- **Gatilho:** entre report e último on-block (janela ao vivo).
- **Hero:** setor ativo · progresso/ETA. **Meio:** perna atual + próxima (turnaround).
- **Util:** PSV real a acumular. **Chip:** ETA. **Ações:** Partilhar chegada (hot).
- **Objetivo:** espelho calmo do voo — e a família vê o mesmo sem perguntar.

### 5 · Pós-voo
- **Gatilho:** último on-block/sign-off do dia registado.
- **Hero:** ghost = duty total · "Fechado ✓" · kick veredicto legal.
- **Meio:** totais (duty c/ débrief · block · setores). **Util:** repouso até HH:MM · amanhã.
- **Datarow:** per-diem do dia + donut. **Chip:** "REPOUSO ATÉ 22:30".
- **Ações:** registar sign-off real (nudge se usou débrief do perfil) · Descanso.
- **Animação:** números finais assentam UMA vez — é história, não live.
- **Objetivo:** fechar o dia com o veredicto e o amanhã preparado.

### 6 · Pernoita fora
- **Gatilho:** nightStop ∧ ends-away ∧ já aterrou.
- **Hero:** "🌙 FNC" · hotel. **Meio:** hotel (mapas/ligar/nota: pickup, pequeno-almoço) + amanhã.
- **Util:** repouso fora-base 10 h (235) · per-diem da noite. **Meteo** da estação (wxDigest).
- **Ações:** Hotel (hot) · Partilhar. **Objetivo:** tudo o que precisas numa cidade que não é a tua, a um toque.

### 7 · Standby
- **Gatilho:** duty standby/reserve com janela ativa.
- **Hero:** janela (06:00–14:00) · "Standby". **Meio:** **"se chamado agora: PSV até HH:MM"** (225/230, recalcula ~15 min).
- **Util:** alojamento (225 e/d) · ADTY pago. **Ações:** Simular (hot).
- **Objetivo:** responder à única pergunta do standby: "até onde me podem levar hoje?".

### 8 · Formação
- **Gatilho:** duty kind training hoje.
- **Meio:** horário; papel pago se aplicável (instrutor/CCLT — do AE respetivo).
- **Objetivo:** dia de treino sem ruído de voo.

### 9 · Escala mudou
- **Gatilho:** diff do sync/import por confirmar (o pontinho azul de hoje, promovido).
- **Hero:** "A tua escala mudou" · N alterações. **Meio:** o que mudou (resumo) + candidatos SNC c/ €.
- **Ações:** Confirmar (hot). **Objetivo:** nada entra na tua vida sem confirmares — deteta→confirma→grava.

### 10 · Documento crítico
- **Gatilho:** validade ≤ N dias (7 = takeover do principal; ≤30 = secundário).
- **Hero:** "Médico expira" · ghost = dias. **Ações:** Renovar/Validades (hot).
- **Objetivo:** nunca voar com papel caducado.

### 11 · Fecho do mês
- **Gatilho:** últimos 3 dias do mês civil.
- **Hero:** total estimado ao cêntimo. **Meio:** decomposição (as parcelas SOMAM — auditável).
- **Util:** extras por registar (nudge). **Ações:** Extra (hot) · Estatísticas.
- **Objetivo:** o mês fecha-se sabendo o que se vai receber e porquê.

### 12 · Férias
- **Gatilho:** hoje dentro de bloco vacDays.
- **Hero:** "🌴" · saldo (ficam 9 de 22). **Desaparece:** quase tudo — afastamento máximo.
- **Objetivo:** a app sabe estar de férias contigo.

### 13 · Doença
- **Gatilho:** evento sickDays hoje.
- **Hero:** tom humano, baixo. **Meio:** o que a lei garante (Art. 48: dias 1–3 por episódio · episódio atual dia N).
- **Desaparece:** tudo o operacional. **Objetivo:** a app baixa a voz e diz só o que protege.

---

## 6 · Animação (regras)

- Movimento só nos **campos-chave** quando mudam (countdown, horas, estado) —
  nunca o cartão inteiro, nunca a mobília.
- Transição de estado: crossfade/slide subtil do hero; o resto assenta.
- Countdown vive (1×/min); estados fechados (pós-voo, folga) assentam **uma vez**.
- Donut anima ao entrar; `prefers-reduced-motion` respeitado sempre.
- Tema segue o sistema; modo escuro é candidato futuro (ref-1 glow — reports às 04:00).

## 7 · Fora do Início

- **Escala / Estatísticas / FTL = referência estável.** Acentos permitidos:
  hoje na grelha, pontinho azul de mudanças, realce dos limites de hoje. Nada mais.
- **Superfícies irmãs do Living Interface:** a página da família
  (voo.crewpact.app — já se comporta assim) e a futura Dynamic Island (dev build).
- **Próximas páginas a vestir** (referências do utilizador + esta pele como lei):
  login, splash (ou não), Perfil, detalhe. — *processo: referência dele →
  adaptação DENTRO desta pele, não pele nova.*

## 8 · Apêndice — fonte de cada dado (honestidade)

| Elemento | Fonte | Motor |
|---|---|---|
| Estados/horários | escala (calendário do telemóvel ← sync eCrew) | duties/roster_meta |
| PSV, repouso, limites | motores FTL golden (205/210/225/230/235/245, CS-FTL.1) | `computeDuty`, cumulativos |
| €, per-diem, extras | motores AE golden (BTE/acordos por companhia·função) | `monthlyAe`, `aeEvents` |
| Voo ao vivo, porta, matrícula | AirLabs via Edge `flight-status` | `fetchFlightStatus` |
| Inbound (o teu avião) | AirLabs modo `reg` | `inboundGap` (golden) |
| Aeroporto doente | AirLabs `/schedules` c/ cache 12 min | `airportDisruption` (golden) |
| Meteo | MET Norway (CC-BY, atribuição obrigatória) c/ cache 45 min | `wxDigest` (golden) |
| Validades, hotéis, eventos AE | introdução manual (local, RGPD-leve) | — |
| Localização | **não há GPS** — relógio + escala | — |
| Check-in/boarding/crew | **não existem fontes** — estados excluídos | — |

---

*v1 · 2026-07-03 · decidido peça a peça com o utilizador. Mockups: pele-tipografica-final.html
(4 estados demonstrados) · navbar-variantes.html (pílula B) · restantes peles arquivadas em design/.*
