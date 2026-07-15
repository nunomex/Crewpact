# CrewPact — Motion Design System

> Movimento numa interface **calma**: subtil, raro, com propósito. Companion do [design-system.md](design-system.md).
> Criado 2026-07-09 — formaliza o que a app **já pratica** (os tokens saíram do inventário real do código, não de um template).

---

## §1 · Filosofia

Cada animação tem de servir pelo menos um destes: **feedback · continuidade · orientação · hierarquia · foco**. Se não serve nenhum, não existe — a pele é tipográfica e serena, e movimento decorativo compete com ela.

- Nada aparece/desaparece instantaneamente em **superfícies** (folhas, toasts, modais).
- Conteúdo estático não "dança": **máx. 1 momento orquestrado por ecrã** (a entrada). Loops ambiente só onde comunicam estado (skeleton = a carregar).
- Celebração é rara e merecida (conta criada) — não se banaliza.

---

## §2 · Stack técnico (regra da casa)

- **`Animated` core do React Native** com `useNativeDriver: true` sempre que a propriedade permita (transform/opacity). É o idioma de TODO o motion existente.
- **Reanimated NÃO se usa.** Zero imports no código — o pacote existe só como dependência transitiva (e o pin `react-native-worklets` 0.5.1 no Expo Go SDK 54 é terreno sensível: mexer = crash no arranque). Introduzi-lo é **decisão estrutural** a discutir, nunca escolha de conveniência numa tarefa.
- Gestos: `PanResponder` (PeleSheet, carteira das Validades).
- `useNativeDriver: false` aceita-se só quando a propriedade obriga (largura de barras, teclado) — transform/opacity primeiro.

---

## §3 · Tokens de duração

Formalizados do que a app já pratica (exemplos vivos citados). Animação nova escolhe a linha, não inventa números.

| Papel | Duração | Curva | Exemplo vivo |
|---|---|---|---|
| Micro-feedback (shake, kick de swipe) | 40–110 ms | linear / out | Login shake 55/55/45/40 · Escala swipe-mês 110 |
| Fade / transição de superfície | 180–260 ms | `Easing.out(cubic)` | PeleSheet in 180 · Login/Onboarding painel 130 out/200 in · Toast out 260 |
| Reordenação / cartas | 260–280 ms | out(cubic) | carteira das Validades |
| Entrada de conteúdo de ecrã | 820 ms | out(cubic) | `useEnter` |
| Dados a crescer (barras, count-up) | 700–800 ms (+delay escalonado) | out(cubic) / linear | GrowBar 800 · MonthBar 700 |
| Loops ambiente | 650–750 ms por perna | inOut(quad) | Skeleton 750 · pulse 650 |

**Easing por defeito: `Easing.out(cubic)`** — chegada suave, arranque decidido. `in(cubic)` só em saídas.

---

## §4 · Springs

Só para **chegada física** de superfícies (folha, toast): sem overshoot exagerado.

- `bounciness ≤ 5` / `friction ≥ 9` — referências vivas: PeleSheet (speed 16, bounciness 3) · Toast (friction 9, tension 80) · Escala spring-back (speed 22, bounciness 4).
- **Exceção celebratória única:** `AccountCreated` (tick com `back(2)`) — o momento de conta criada pode ter alegria.

---

## §5 · Reduce-motion = contrato

`hooks/useReduceMotion.js` (lê `AccessibilityInfo`). **Toda** a animação de entrada, loop ou contagem salta para o valor final quando ativo; superfícies (folhas) degradam para **fade sem deslocação**. **Auditoria 2026-07-10: a app inteira cumpre** — useEnter · useCountUp · Toast · barras do Stats · TabBar · PeleSheet · Skeleton · DutyFormSheet · carteira das Validades · Login · Onboarding · AccountCreated · Lock. Exceção deliberada: **gesto direto persiste** (arrasto da folha/carteira, swipe-kick da Escala, shake de erro) — é manipulação/feedback, não animação decorativa. **Animação nova sem este ramo = bug**, não detalhe.

---

## §6 · Háptica

Wrapper único `data/haptics.js` (expo-haptics; falha em silêncio em web/sem suporte). Nunca chamar `expo-haptics` diretamente.

| Função | Quando |
|---|---|
| `tap` | impacto leve — steppers, incrementos |
| `select` | escolha: toggle, chip, segmento, opção de dial, navegação de mês |
| `success` | ação concluída — guardar, importar, partilhar, biometria ok |
| `warning` | destrutivo, erro, limite tocado |

Regra: o háptico acompanha a **AÇÃO do utilizador ou o desfecho** — nunca o scroll, nunca a animação em si, nunca o render.

---

## §7 · Inventário vivo (2026-07-09)

Onde o movimento existe hoje — atualizar quando se adiciona/remove:

- `components/TabBar.js` — navegação: ícone da ativa dá POP (spring f6/t280, só em mudança — não no arranque) + ponto amarelo fade+scale 180ms · ＋ central com press-scale 0.92 e sombra leve · speed-dial (spring f8/t90, cascata escalonada, fecho 150ms, clone × roda 0→45° em sincronia) · háptico tap/select · reduce-aware em TUDO
- `hooks/useEnter.js` — entrada de ecrã (opacity+translate, 820, reduce-aware)
- `hooks/useCountUp.js` + `components/CountUp.js` — números a contar (reduce-aware)
- `components/PeleSheet.js` — folha: fade 180 + spring; saída 200/240; teclado 220/200; arrasto PanResponder (reduce = fade sem deslocação)
- `components/Toast.js` — spring in / timing out 260 (reduce-aware) · **com AÇÃO (desfazer, 2026-07-15)**: hold fixo 5 s + barra de tempo amarela (width, linear, nativeDriver:false — reduce = texto "5 s") + pílula amarela tocável (container box-none); Desfazer fecha o toast (200ms) e repõe — o item a voltar É o feedback, sem 2.º toast
- `components/Skeleton.js` — shimmer loop 750/750 (reduce = estático a meia-opacidade)
- `components/AccountCreated.js` — celebração pele (anel ink spring + tick amarelo back(2) + texto 320 + pulse 650; reduce = estado final)
- `components/DutyFormSheet.js` — cascata de secções 820 (constantes do useEnter; reduce-aware)
- `screens/LoginScreen.js` — shake de erro + troca de painel 130 in(cubic) / 200 out(cubic) (reduce = corte)
- `screens/OnboardingScreen.js` — slide direcional entre perguntas (o gesto do Login: 130/200, topo e botão fixos; reduce = corte)
- `screens/LockScreen.js` — entrada 240 + fade 150 no DESBLOQUEIO (sem corte seco p/ a app) + shake no falhanço (reduce-aware)
- `screens/EscalaScreen.js` — swipe de mês: kick 110 + spring-back (gesto — persiste em reduce)
- `screens/ValidadesScreen.js` — carteira de cartões (PanResponder + shuffle 260–280; reduce = assenta sem viagem)
- `screens/StatsScreen.js` — GrowBar 800 / MonthBar 700 (reduce-aware)
- (2026-07-09: `SearchModal` apagado — saiu do inventário)

---

## §8 · Review de movimento (fecho de qualquer mudança com animação)

1. Que propósito do §1 serve? (nenhum → remover)
2. Usa um token do §3/§4 ou justifica por escrito o desvio?
3. Tem o ramo reduce-motion?
4. `useNativeDriver: true` (ou justificado porquê não)?
5. Compete com outra animação no mesmo ecrã? (máx. 1 momento orquestrado)
