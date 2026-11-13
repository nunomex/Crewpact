# CrewPact — Design System

> O canon visual **executável**. Quando o código e este documento divergem, um dos dois está errado — reconciliar é obrigatório (mesma regra da Constituição).
> Companions: [motion-design-system.md](motion-design-system.md) (movimento) · [living-interface.md](living-interface.md) (os estados do Início) · [auditoria-ux.md](auditoria-ux.md) (as 43 correções UX, todas aplicadas).
> Criado 2026-07-09 — extraiu para o repo o canon que vivia disperso (memória do parceiro AI + mockups).

---

## §1 · Fontes de verdade (por ordem — a de cima ganha)

1. **Mockups `design/*.html`** — mandam na **hierarquia e na disposição** (o que existe, a ordem, o que pesa mais) e no conteúdo (decisão 2026-07-05, depois de um § da lei inventado na Escala). **Os números NÃO vêm do mockup: vêm da escala (§9).** Mudado a 2026-11-02 (Design System 2.0, decisão do Nuno): portar os píxeis "à letra" deu 206 combinações de letra e 924 espaçamentos fora da escala. **Ler o mockup ANTES de codificar.** Explorações recusadas vivem em `design/arquivo/` e não se seguem (`design/README.md`).
2. **Este documento** — a gramática para o que o mockup não cobre (funções, estados de erro, casos que o HTML não desenha). "O resto adaptas" — mas adapta-se COM esta gramática.
3. **Os olhos no device** — afinações finais são números vistos, não teorizados. Todas as do Início vivem no bloco `TUNE` (topo de `screens/HomeScreen.js`); fora dele só 2: rótulo lateral (`components/PeleSide.js` top=344/width=320) e fantasma dos outros ecrãs (`components/PeleHeader.js` ghost right:14). Sessão ritual: **"testar os estados"** ([verificacao-device.md](verificacao-device.md)).

---

## §2 · A pele (2026) — identidade

**Branco · preto · amarelo. Plana, hairline, tipográfica.** A tipografia condensada faz o trabalho que noutras apps fazem cores, sombras e ilustração. A interface é **calma** — desaparece, e o dia do tripulante é o protagonista.

**Proibições de identidade** (não são gosto, são lei):
- **Sem fotos, sem mascotes, sem ilustração decorativa.**
- **Sem emoji em slots de ícone** — pictogramas SVG próprios (`design/icons.js` + `components/Icon.js`).
- **Sem vidro/blur** (recusado 2026-07-08: subtil no claro + 2 módulos nativos + rebuild).
- Vermelho **disciplinado**: perigo/alarme real, nunca decoração.

**Tokens** (`data/constants.js`):
- `PELE` — paper `#FFFFFF` · ink `#141414` · ghost `#E2E1DC` · grey `#77776F` · line `#ECEAE4` · soft/soft2 · **yellow `#FFB800`** · ok/warn/red + `*Soft` (superfícies pintadas) · onInk* (placas pretas).
- `PELE_NIGHT` — a MESMA gramática sobre azul-quase-preto (`#0D131C`); amarelo mantém-se; estados sobem de luminosidade para contraste.
- `PELE_FONT` — **Barlow Condensed** (display: fantasma, números grandes, palavra condensada) + **Hanken Grotesk** (corpo, rótulos) + **Caveat** (`hand` — manuscrita, USO ÚNICO: a voz do Início, o bilhete pessoal com marcador amarelo). **NUNCA `fontWeight`** — as fontes são estáticas, a FAMÍLIA carrega o peso. **(2026-11-11: a direção 3.0, §14, passa tudo a Hanken, ecrã a ecrã.)**
- Partilhados com o tema antigo: `RADIUS` (cartão de conteúdo = `lg` 16; folhas/diálogos xl/xxl) · `SPACE` · `SHADOW` (só folhas/diálogos/toasts elevam — **cartões são planos**, borda hairline) · `GUTTER` 16.
- **Design System 2.0 (2026-11-02):** `TXT` (estilos de texto com nome — §9) · `SPACE` alargado à grelha 2/4 · `TYPE` com os números condensados (24/28/34/44) · `ICON_BTN` (36 · ícone 16 · toque 44) · `SCALE` (as escalas permitidas, lidas pelo guardião §12).
- **Cor de marca por PAPÉIS — `BRAND` (2026-11-02, base das edições por sindicato):** `signal` (sinais sem texto: pontos,
  barras, réguas, sublinhados, bordas) · `marker` (fundo com tinta por cima: bilhete, Desfazer, vistos) · `onDark` (marca
  sobre placa preta/noite: texto, ícones, spinners) · `action` (fundo do botão principal; base = tinta). Na base todos são o
  amarelo de hoje → nada visível mudou. Uma edição troca SÓ o `BRAND`. **`PELE.yellow`/`#FFB800` fora do `constants.js` = regra dura do guardião.**

**Gramática da pele:**
- **Fantasma** — numeral/sigla gigante em `PELE.ghost` atrás do herói. Tamanhos **determinísticos por comprimento** (TUNE.ghost s3/s4/s5). ⚠️ **Nunca `adjustsFontSizeToFit` em `Text` absoluto** — bug iOS: fica invisível quando um irmão re-renderiza.
- **PeleSide (A SAIR — 2026-11-02):** já saiu do Início; nos outros ecrãs sai na migração de cada um (bloco C) — nenhuma das melhores apps roda texto e a informação passa para um sítio legível (data/estado no topo). Onde é **selo funcional** (Simulação "E-SE", modo exemplo) troca por um rótulo visível no cabeçalho. *Histórico:* rótulo lateral rodado 90°, início ancorado no TOPO em todos os ecrãs (wrap width 320 + textAlign left; a rotação ancora o FIM, o wrap fixo devolve o início).
- **PeleHeader** — **fonte única do cabeçalho** (o fantasma tinha divergido 74/92/130 entre ecrãs antes da consolidação). Régua 130/44/108; slots avatar/back · actions · sino · word/kick. Fora da régua por decisão deliberada: DutyDetail 104 · Perfil 150 · Início (sem fantasma de header) · **Escala (2026-11-03): só a linha de cima do PeleHeader; o mês é um título médio (`TXT.titleLg`) com ‹ › e "Hoje", e o resumo numa linha — a grelha e o dia precisam do ecrã** (esboço `design/escala-v2.html`).
- **Amarelo** = marca/realce: numeração bento, kicks, seleção, pontinhos de atenção suave — **como FUNDO, PONTO, BARRA ou texto SOBRE PLACA PRETA, nunca como texto sobre papel** (§6, medido).
- **Cores de estado — UM significado cada, sem exagerar (Nuno, 2026-11-04; refs Fiverr/Base/DoorDash no Mobbin):**
  **amarelo** = "agora / a hora que importa" + realce (a hora do painel ao vivo, o sublinhado da frase, o ponto "ao
  vivo") · **verde** = bom: dentro dos limites ("Nos limites", "Repouso ✓") e **dinheiro que ENTRA** — os **+€ de um
  dia** (ganhos de hoje/amanhã, esta noite, "+€ hoje"); o **total do mês fica a tinta** (é estimativa, não ganho) ·
  **laranja** = atenção (atraso, ≥ 85 % de um limite, documento a expirar) · **vermelho** = acima do limite/erro ·
  **tinta** = o resto (totais, horas, números neutros). Verde de texto = `okText` (sobre o `soft` 5,64:1); nunca um
  número enorme todo a verde fora destes casos.
- **Tema noturno** — conduzido pelo **ESTADO do dia** (véspera/pernoita), NÃO pelo dark-mode do sistema. Fábrica `makeSkin(P, night)` → `sDay`/`sNight`.
- **Navegação = TAB BAR com ＋ central** (`components/TabBar.js`, 2026-07-09 — referência aprovada pelo user): barra inteira em **papel + hairline no topo**, **em layout** (o conteúdo termina acima dela, nada fica tapado), simetria **`Início · Escala · ＋ · Números · Perfil`**, ativa = **ink + ponto amarelo** (espaço reservado, fade+scale 180ms + pop do ícone, reduce-motion salta); tema noturno herdado do Início via `homeNight`; ponto âmbar em "Escala" (alterações por rever); háptico; `useTabBarSpace` = só folga (20).
- **O ＋ central abre o speed-dial em pílulas rotuladas** (Modal + scrim + cascata; back do Android fecha; × = clone pixel-perfect que roda): **Serviço** (→ Escala, novo serviço hoje) · **Simulação** · **Evento** (gate AE). O ＋ é só CRIAR — a Pesquisa vive na Biblioteca. Criar também continua na grelha da Escala (tocar num dia insere NESSE dia) e nos acts contextuais do Início.
- **Topos LIMPOS (2026-07-09): sem avatar e sem sino em nenhuma página.** O **Perfil é ABA** (a 4.ª); o **sino-arquivo vive no header do Perfil**; a antiga aba INFO virou o cartão **"Biblioteca"** dentro do Perfil (empurrada com ‹, `size="detail"` — lei FTL + AE + fontes + procura, conteúdo intacto).
- **Notificações à Apple: o botão só existe quando tem algo para dizer.** No Início, ao lado da saudação, a **pílula "● N novidades"** (`NotificationsBell variant="pill"`) aparece SÓ com por-ler e desaparece ao ler — zero mobília em repouso. O crítico continua em-contexto (banda do Início · ponto âmbar da Escala · push).
- **Primeira entrada (2026-07-10, mockup `design/boas-vindas.html`): folha de boas-vindas + 2 dicas contextuais — SEM tour de passos** (a Apple não faz; a maioria salta). Folha (`WelcomeSheet`): 1 ecrã, 4 linhas com numeração bento amarela, 1× na vida, só nasce do funil (flag `cp_welcome_<uid>` 'pending'→'seen'). Dicas (`Tip`, padrão iOS-Tips): ＋ central (1.ª visita ao Início PÓS-folha) e grelha da Escala (1.ª abertura) — balão ink que APONTA sem trancar, morre a qualquer toque, uma de cada vez, flags por utilizador. O estado 0 continua a ser a introdução real ao Início.

---

## §3 · Living Interface

O Início muda automaticamente conforme o dia de trabalho — **o coração da app**. 15 estados, motor puro `data/crewState.js` (golden `test:crewstate`), voz curada determinística `data/stateVoice.js` (golden `test:voice`). Doc próprio: [living-interface.md](living-interface.md).

**Início v6 (2026-11-03, esboço `design/inicio-v6.html`, construído no mesmo dia):** um sistema com duas intensidades.
**Ao vivo** (véspera · hoje · disrupção · pernoita) = a **placa** escura do painel de partidas (`PLATE`), a hora do próximo
marco a amarelo (`BRAND.panel`, 104 pt, fixo em todas as edições) e o estado numa pílula. **Calmo** (folga · pós-voo ·
férias · doença · fecho · configuração) = papel e o número enorme a tinta (até 150 pt). Sempre: linhas do painel
(hora · destino · dia), a frase em letra normal, **no máximo 2 secundários** pela fila de prioridades (o urgente sobe;
nunca vazio → o dinheiro do mês) e **3 teclas** no mesmo sítio, ao polegar (a 1.ª em `BRAND.action`). Saíram o halo/véu/
candeeiro, o bilhete manuscrito, o fantasma pálido e a barra de ações. Movimento: dígitos Solari (460 ms, cascata de 70)
e o ponto "ao vivo" (`BRAND.onDark`); reduzido = seco. A regra antiga da banda única continua: os avisos são
secundários, nunca se empilham mais de 2.

---

## §4 · Componentes canónicos

| Componente | Papel | Regra |
|---|---|---|
| `PeleHeader` | cabeçalho de todos os ecrãs-pele | única fonte; não recriar fantasma/sino à mão |
| `PeleSide` | rótulo lateral rodado | label muda com o estado/ecrã |
| `PeleSheet` | folha modal da pele | gesto de arrasto + teclado já resolvidos |
| `Icon` + `design/icons.js` | pictogramas SVG próprios | emoji proibido |
| `IconButton` | ✕ fechar · ‹ voltar · ações de cabeçalho | **único** botão de ícone: 36 redondo, ícone 16 (‹ 18), toque 44, `label` obrigatório, `night` para o tema noturno (§10) |
| `SheetHeader` | cabeçalho de folhas e páginas modais | rótulo (ponto amarelo) + título `TXT.titleLg` + ✕ à direita; ‹ opcional à esquerda. Não recriar à mão |
| `Porta` | ecrãs **antes da app** (entrada, código, nome, palavra-passe, Face ID, bloqueio, reativar, configuração) | placa de tinta com a marca + folha de papel com o passo; ‹ e `footer` (ação larga) como no §10; a placa encolhe para faixa com o teclado; `progress` = "Configuração · 2 de 6" + barra amarela na faixa. **Nunca** num ecrã com barra de abas (§11) |
| `MonthYearWheel` | escolher mês e ano (antiguidade, promoção) | roda de 2 colunas; `monthsAhead` (0 = nunca no futuro); o valor só nasce quando a pessoa mexe; ajustável no VoiceOver |
| `OptCard` | escolher uma opção (configuração, páginas do Perfil) | o MESMO cartão em todo o lado: código · nome · apoio · círculo vazio ou visto amarelo (ou etiqueta "atual") |
| `AeLimitsSection` / `AeLimitSheet` | limites do acordo de empresa (Números) | lista agrupada pelo resultado (Excede · Incerto · Dentro) com uma frase por regra; a folha fecha SEMPRE com o resumo da app, a citação literal do BTE (cláusula e página), a fonte oficial e "como a app conta". Nunca "legal" (esboço `design/limites-ae.html`) |
| `Pagina` | página de definição empilhada (Perfil) | ‹ em cima à esquerda · título · explicação · conteúdo · UMA ação no fundo (quando há) — à Flighty |
| `Toast` | `notify(title, sub, kind, action?)` global | toasts locais proibidos; `action={label,onPress}` = pílula "Desfazer" (5 s, kind `del`) — ver motion §7 |
| `ConfirmDialog` / `CenterDialog` | confirmação / conteúdo centrado | convenção: `Alert` nativo DENTRO de Modal; `ConfirmDialog` fora. **Fronteira do desfazer (2026-07-15): local = apaga-já + toast "Desfazer" (5 s); servidor-irreversível (conta·link família·sessão) = confirmação honesta.** |
| `Skeleton`, `CountUp`, `useEnter` | loading / números / entrada | todos respeitam reduce-motion |
| `PrimaryButton` / `GhostButton`, `Banner`, `Eyebrow` | botões/banner/rótulo partilhados | PELE-FICADOS por dentro (2026-07-09), API intacta — canónicos da pele |

---

## §5 · Tema antigo (legado em extinção)

**✅ EXTINTO A NÍVEL DE ECRÃS (2026-07-09):** todos os screens da app estão na pele — o corredor de entrada (Login+signup, Lock, BiometricOffer, Reactivate), o Onboarding (reestruturado: conta primeiro no Login → funil de 6 perguntas pós-login, tudo obrigatório), Hotéis e FtlDetail fecharam a lista; `DetailTopBar`/`PageHeader` (headers do tema antigo) apagados como órfãos. **Resíduo de componentes: ELIMINADO na raiz (2026-07-09)** — `PrimaryButton`/`GhostButton`/`Banner`/`Eyebrow` foram PELE-FICADOS por dentro (tokens PELE, Hanken, spinner amarelo no primário; Eyebrow = canon do PeleHeader 11/bodyHeavy/ls1.4; API intacta) → os consumidores rendem pele sem tocar em call-sites; passam a ser componentes CANÓNICOS da pele. (O Eyebrow chegou a ser apagado por engano — 7 componentes importavam-no; ressuscitado pele-ficado a 2026-07-09.) Regras:
- Ecrã novo **nasce na pele**.
- Ecrã legado não se "melhora" à peça — porta-se de uma vez, à letra do mockup correspondente, **re-skin não reescrita** (cálculos intactos).

---

## §6 · Acessibilidade (não-negociável — auditoria 2026-07-02, 43/43 aplicadas)

- Alvos de toque **≥44pt** (hitSlop quando o layout não dá).
- **Reduce-motion** respeitado em toda a animação ([motion §5](motion-design-system.md)).
- Dynamic type cap **1.4**.
- Contraste: cores de estado vivas só em fills ≥3px e números ≥24px; texto informativo usa tokens `*Text` escurecidos (as vivas falham AA abaixo de 18px — calculado, não estimado).
- **Amarelo sobre papel = 1,73 : 1** (medido 2026-11-02, `#FFB800` sobre `#FFFFFF`). Chumba em QUALQUER tamanho:
  texto normal pede 4,5 e texto grande/ícones pedem 3. Por isso o amarelo **nunca é texto nem ícone informativo
  sobre papel** — nem nos números grandes (a regra "≥24px" acima NÃO vale para o amarelo). Onde passa:
  tinta sobre amarelo **10,6** (o marcador do bilhete) · amarelo sobre placa preta **10,6** (avatar, cartão do
  countdown, toasts). Dinheiro e números herói = **tinta**. Se um dia for preciso amarelo como texto, o tom
  legível é `#8A6300` (5,43) — decisão de marca, não se usa sem o Nuno.
- O guardião conta os estilos de texto em `BRAND.signal`/`BRAND.marker` (`amareloTexto`, roquete — é dívida sobre papel).
  Texto da marca sobre placa preta ou na noite usa `BRAND.onDark` e é legítimo.
- **Dupla codificação** para daltónicos (marca a 90% + % em texto, além da cor).
- Labels a11y completas nos interativos.

---

## §7 · Conteúdo

- **€ sempre com cêntimos, nunca arredonda** (per-diem, pernoitas, totais, salário, import).
- **Só links oficiais** (EUR-Lex / EASA / BTE / DRE) — golden `test:library` tranca os domínios.
- Onde é lei cita-se o artigo; onde é convenção diz-se que é (Constituição §5).

---

## §8 · Ótica do utilizador (o desempate)

Decidir pela **utilidade de relance** — sem ruído, sem duplo-badge, sem erros silenciosos — não pela estética. Menos carga mental (Constituição §2.3): cada mudança **remove/esconde pelo menos um elemento, ou justifica por escrito porque adiciona**.

## Overlays tocáveis (regra técnica, RN 0.86+ / Fabric — 2026-09-03; mantém-se no RN 0.88, por reconfirmar no device)

Um fundo que fecha ao toque (scrim de folha, overlay de diálogo, scrim da speed-dial) **nunca
usa `StyleSheet.absoluteFill`**: sob a arquitetura nova, dentro de um `Modal`, um filho com
`top:0 + bottom:0` resolve a largura mas fica com **altura 0** → vê-se (é a folha do Modal por
baixo) mas não recebe toques. Provado no device com `onLayout` (`width 402, height 0`).

- Folhas e speed-dial: root `flex:1` + scrim como **filho normal `flex:1`**; o painel fica
  absoluto ancorado **só ao fundo** (`bottom:0` sem `top` mede bem). — `PeleSheet`, `TabBar`.
- Diálogos centrados: o overlay **é** o `Pressable` e o cartão engole o toque com
  `onStartShouldSetResponder={() => true}` (os botões/inputs lá dentro ganham primeiro). —
  `CenterDialog`, `ConfirmDialog`.
- Diálogos com formulário: corpo em `ScrollView` e cartão `flexShrink:1` — o teclado encolhe,
  nunca corta.
- A pega de arrasto tem **44 pt** de área útil (paddings anulados por margens; visual intacto).
- **Fantasmas e texto decorativo absoluto: sempre `pointerEvents="none"`.** O fantasma do PeleHeader
  (`top:-29`) sobrepõe a fila das ações; sob Fabric o hit-test nativo entrega o toque ao Text e o
  botão irmão (↻ da Escala) morre. Nunca deixar um Text absoluto "apanhar" toques que não são dele.

---

# Design System 2.0 (2026-11-02)

Nasceu de uma medição, não de gosto: em 58 ficheiros havia **675 tamanhos de letra escritos à mão (só 29
pela escala)**, 38 tamanhos fora dela, **149 estilos abaixo do mínimo de 11**, **924 espaçamentos fora da
escala**, 105 cores soltas, o botão de fechar em 4 tamanhos e 2 formas, e o cabeçalho de folha copiado à
mão em 6 janelas. Causa: cada mockup tinha os seus números e foi portado "à letra" (§1 mudou por isso).

## §9 · A escala e a tabela de migração

**Texto = um estilo com nome (`TXT`), nunca um número solto.** `{ ...TXT.body, color: P.ink }`.
Densidade da casa mantida (corpo 13, não o 17 da Apple). **Mínimo 11 em todo o texto informativo.**

| Estilo | Família · tamanho | Para |
|---|---|---|
| `TXT.tag` | Hanken 800 · 11 · maiúsculas · ls 0.6 | selos, chips |
| `TXT.eyebrow` | Hanken 800 · 11 · maiúsculas · ls 1.4 | rótulo de secção (= `Eyebrow`) |
| `TXT.caption` | Hanken 500 · 11 / 15 | notas, fontes, meta |
| `TXT.footnote` | Hanken 500 · 12 / 17 | linha secundária |
| `TXT.label` | Hanken 700 · 12 | rótulo/valor pequeno forte |
| `TXT.body` | Hanken 500 · 13 / 19 | corpo |
| `TXT.bodyStrong` | Hanken 700 · 13 | título de linha |
| `TXT.callout` | Hanken 700 · 15 / 20 | destaque, botões |
| `TXT.headline` | Hanken 800 · 17 / 22 | título de diálogo |
| `TXT.title` | Barlow 700 · 22 | título de cartão |
| `TXT.titleLg` | Barlow 700 · 30 | título de folha/página |
| `TXT.num` / `TXT.numLg` | Barlow 700 · 24 / 34 | números |

Tamanhos permitidos (`SCALE.type`): 11 · 12 · 13 · 14 · 15 · 16 · 17 · 20 · 22 · 24 · 26 · 28 · 30 · 34 · 44.
**≥ 48 = fantasma/decorativo**, dimensionado no `TUNE` (fora da escala por desenho).

**Migração do texto** (valor antigo → destino):

| Antigo | Destino |
|---|---|
| 8 – 10,5 em maiúsculas pesadas | `TXT.tag` (11) |
| 9,5 – 11 corpo/nota | `TXT.caption` (11) |
| 11,5 – 12 | `TXT.footnote` (500) ou `TXT.label` (700) |
| 12,5 – 13,5 | `TXT.body` (500) ou `TXT.bodyStrong` (700) |
| 14 – 14,5 | 14 (`TYPE.sub`) |
| 15 – 15,5 | `TXT.callout` |
| 16 – 17 | 16 (`TYPE.value`) ou `TXT.headline` |
| 18 – 21 | 20 (`TYPE.title`) |
| 22 – 23 | `TXT.title` |
| 24 – 25 | `TXT.num` |
| 28 – 29 | 28 · 30 – 33 → `TXT.titleLg` (título) ou 34 (número) · 36 – 46 → 34 ou 44 |

**Sem exceção na grelha da Escala (decidido 2026-11-03, medido):** as etiquetas das células passaram de 8–9,5 para
`TXT.tag` (11). Medido com as fontes da app: "LGW" a 11 pt ocupa 25,9 px e, com a lua da pernoita, 38,9 px numa
célula de 47,7 a 390 pt (45,6 a 375 → 3 pt de cada lado). O que não cabia ("2× LGW", 42,9 px) passou a outra
forma: uma 2.ª camada por baixo da etiqueta. Esboço `design/escala-v2.html`.

**Espaço** (`SPACE`): 2 · 4 · 6 · 8 · 12 · 16 · 20 · 24 · 32 · 40 (+ 1 hairline). Migração: vai para o
**mais próximo**; empate → o que mantém o ritmo dos irmãos (ex.: 10 → 8 ou 12; 14 → 12 ou 16).
Cada ecrã migrado vê-se no iPhone antes de fechar — passar de 12,5 para 13 mexe em píxeis.

## §10 · Posição dos controlos (a regra, igual em toda a app)

- **✕ fechar** — canto superior **direito** de folhas e páginas modais (`SheetHeader`). Uma página que
  sobe de baixo **fecha**, não "volta": nunca ‹ para fechar uma janela.
- **‹ voltar** — canto superior **esquerdo** de ecrãs empilhados (`PeleHeader onBack`) e de passos
  dentro de uma janela. **Só aparece quando há para onde voltar.**
- **Nunca dois fechos no mesmo ecrã** (era o caso do formulário de serviço: ‹ e ✕ faziam o mesmo).
- **Um só botão de ícone:** `IconButton` (36 redondo, toque 44, rótulo obrigatório). Remover um item
  dentro de um chip (✕ pequeno inline) não é navegação e fica fora desta regra.
- **Abrir/expandir uma secção:** a linha inteira é tocável, com um chevron à direita que roda.
- **Guardar num formulário** (decidido 2026-11-02, opção 2 do Mobbin): **uma só ação principal, larga, no
  fundo** (`PrimaryButton`), que sobe com o teclado; **sair é o ✕ do cabeçalho** — sem "Cancelar" a competir
  com o Guardar. (Os "Cancelar" dos alertas nativos do iOS ficam: são do sistema.) Por migrar no bloco C:
  Validades e formulário de evento usam um botão de Guardar feito à mão em vez do `PrimaryButton`.
- **✕ à direita confirmado** (2026-11-02, opção A do Mobbin).
- **Exceção registada:** o resultado da Simulação tem ✕ e um botão "Fechar" no fundo (gramática de poster,
  2026-07-15). Fica até a revisão do ecrã decidir se o botão do fundo passa a outra ação.

## §11 · Folha ou página modal

- **Folha (`PeleSheet`)** — consultar ou uma ação curta (Prova, hotel, auditoria, um evento). Sobe até
  onde o conteúdo pede, fecha com arrasto, toque fora (o fundo tem rótulo "Fechar" para o VoiceOver) ou
  back do Android. **Sem ✕** (a pega e o fundo chegam).
- **Página modal (`Modal` a deslizar + `SheetHeader`)** — fluxo com vários passos, formulário longo,
  lista grande ou ecrã de partilha (formulário de serviço, importar, calendário, notificações, partilhas,
  Simulação). Ocupa o ecrã, **fecha com ✕ à direita**.
- Ecrã empilhado (navegação) — detalhe que pertence a uma aba (DutyDetail, Validades, Hotéis): ‹ à esquerda.
- **Porta (`components/Porta.js`, 2026-11-02, opção A+B do Nuno)** — só **antes da app**: placa de tinta
  em cima (a marca; nas edições muda só o papel `onDark`) e folha de papel por baixo com o passo.
  `plate`: `half` (entrada, Face ID) · `tall` (bloqueio, o ecrã de todos os dias) · `band` (reativar).
  Com o teclado aberto a placa encolhe para uma faixa. **Regra:** se o ecrã tem barra de abas, não tem
  placa — a placa nunca entra na revisão das abas. Não é um céu: o céu a ecrã inteiro foi recusado em
  julho (mata o tinta/amarelo, contraste variável, decoração). Esboço: `design/login-v4.html`.

## §12 · O guardião (`npm run test:design`, no `npm test` e no pre-push)

- **Regras duras (zero tolerância):** nenhum nome usado sem estar definido (variável apagada → ecrã vermelho só no device) ·
  nenhum `fontWeight` · nenhum amarelo escrito à mão (`PELE.yellow`/`#FFB800`) fora
  do `constants.js` — só `BRAND.<papel>` · toda a `LayoutAnimation` respeita os
  movimentos reduzidos · todo o ficheiro que anima com `Animated` lê o reduce-motion · todo o componente
  usado em JSX está importado (o pacote gera sem ele, mas a app rebenta ao abrir o ecrã — apanhou 2
  casos reais na migração).
- **Roquete (dívida antiga):** por ficheiro conta tipo fora da escala, letra < 11, espaço fora, raio fora,
  cores soltas, Ionicons e ✕/‹ soltos. **Só pode descer.** Ao migrar um ecrã:
  `node scripts/design.test.js --atualizar` grava o novo chão (recusa se algo subiu).
- Linha de base a 2026-11-02 em `scripts/design-baseline.json`.

## §13 · Referências (Mobbin)

O Mobbin serve para ver como as melhores apps resolvem o mesmo problema; a escolha é do Nuno e a escolhida
guarda-se em `referencias/` (imagens só no PC; índice com links em `referencias/README.md`) e na coleção
privada "CrewPact — Design System" do Mobbin. Primeira escolha (2026-11-02): ✕ à direita (Alan,
Polarsteps, Beside, pliability) e Guardar largo no fundo (AllTrails, Mindtrip, Hypelist).

## §14 · Direção 3.0 · cartões de cor (decidida 2026-11-11 · por aplicar, ecrã a ecrã)

Esboço que manda: `design/inicio-cartoes.html` (16 estados do Início, medidos). **O Início e a barra de abas estão no código
desde 2026-11-11 (por ver no iPhone).** Enquanto um ecrã não for refeito nesta linguagem, segue as secções de cima (2.0).
Ordem: o Início primeiro; depois os outros ecrãs, janelas e menus, um de cada vez, com Mobbin.

**No código (2026-11-11):** tokens `CARD` (cores de dia e de noite, tons sobre os cartões) e `TXT3` (os estilos de texto em
Hanken) em `data/constants.js`, ao lado dos da 2.0 · `RADIUS.sheet` = 32 · o que vai para onde: `data/homeCards.js` (puro,
golden `npm run test:homecards`, que tranca as regras de conteúdo de baixo) · o desenho: `components/HomeCards.js` · o tamanho
do número gigante calcula-se com as larguras da Hanken lidas do `.ttf` (`data/fontMetrics.js`; 86 → 60 até os factos caberem)
· a barra: `components/TabBar.js`. Dois pares do esboço corrigidos por contraste: o rótulo do cartão passa de 72 % para 80 %
de opacidade (no laranja dava 4,35) e as abas inativas de #77776F para #5E5E57 (3,93 → 5,68).

O que muda em relação à §2 ("branco · preto · amarelo, plana, hairline"):

- **Cor por tipo, sempre a mesma — substituída a 2026-11-13 pelo MAPA DAS CORES (abaixo):** era areia = voo · salva =
  repouso e pernoita · lilás = serviço em terra · neutro = dinheiro e o resto · laranja = pede atenção. Fundo da página
  `#E3E1DB`, folha branca por cima. À noite: fundo `#14161B`, folha `#1F222A`, as cores dos cartões um tom abaixo.
- **A letra: Hanken Grotesk em tudo**, títulos e números incluídos (decisão do Nuno, 2026-11-11). `TXT.title`, `TXT.titleLg`,
  `TXT.num` e `TXT.numLg` passam a Hanken 700/800 **quando o ecrã migrar**; a Barlow Condensed sai de cada ecrã nessa
  altura (não se troca a família nos tokens de uma vez: a Hanken é mais larga e partia os ecrãs antigos). O número gigante
  do topo (86) continua fora da escala, afinado no `TUNE`.
- **A anatomia do Início:** pílula do estado + número em duas linhas + dois factos ao lado de um fio; folha com o cartão do
  momento e o do que vem a seguir (nunca mais de dois grandes; com um aviso, o segundo passa a linha fina). Sem teclas.
- **Raios:** cartão `RADIUS.xxl` (24); a folha pede um degrau novo, 32 (acrescentar à escala na construção); pílulas e a
  cápsula da barra = `pill`.
- **Barra de abas:** cápsula com as 4 abas (a ativa numa pílula clara) + o ＋ num botão redondo de 56.
- **Regras de conteúdo** (estão escritas no esboço): nada se repete entre o topo e os cartões · o selo entre duas horas é
  o intervalo entre elas · PSV e limites em h:mm, o que falta em "1 h 40" · o que um serviço rende vai a verde numa pílula
  branca, o total do mês a tinta com "estimado · bruto" · "Incerto" no lugar do número quando falta um facto, com o que
  falta e a barra "Completar".
- **O repouso incerto** (Nuno, 2026-11-12: "tem é que seguir a lei"): quando o mínimo do repouso depende de uma leitura que
  a lei não fecha, o cartão do repouso não escolhe uma hora. O selo diz as duas durações ("mín. 16 h–18 h", o traço do
  "PSV … de 11:45–13:00"); a hora da direita é a de cima com a etiqueta "no máximo" (sem teto conhecido: a de baixo, "no
  mínimo", e o selo "mín. 12 h ou mais"); a linha pequena diz "cumprido entre 12:00 e 14:00 · " e o motivo em menos de 50
  letras. No topo da pernoita, "Repouso até" leva "Incerto" no número e as duas pontas como factos ("no mínimo" · "no
  máximo"), como o dinheiro incerto. Nada de anatomia nova: tudo cabe nas peças do cartão.
- **A hora Zulu do report** (Nuno, 2026-11-11, opção A): um 3.º facto na coluna ao lado do número ("04:15Z · report em UTC"),
  só quando é diferente da hora local e só quando o número grande é o report. Não encolhe o número nem acrescenta altura.
- **Toque:** a pílula preta do estado não se toca; a de contorno abre esse dia na Escala (38 à vista, 44 de toque); o
  cartão inteiro abre o detalhe; partilhar é o ícone do canto (36 à vista, 44 de toque).
- **iPhone pequeno (375 × 667):** a folha desliza; o topo e a barra ficam. O primeiro cartão vê-se sempre inteiro (medido).
- **Contraste medido (WCAG 2.1):** os 12 pares do esboço passam; o mais baixo é a segunda linha a cinzento do número
  (3,24 para 3 pedidos em texto muito grande). Medidos na construção: o rótulo do cartão a 80 % ≥ 4,8 em todas as cores, de
  dia e de noite; as abas inativas 5,68 (à noite 5,70); o ganho à noite fora da pílula (#7BE3B0) 11,6.

### O mapa das cores (escolhido pelo Nuno a 2026-11-13: B, "frio e quente" — esboço `design/cores.html`)

**Porquê.** Contado no código: o verde dizia "ganhaste", "está dentro" e "toca aqui"; o laranja dizia "perto", "falta um dado",
"incerto" e "folga trabalhada"; o vermelho aparecia aos 90 %, antes de passar o limite. Uma cor com cinco sentidos não se
aprende. E a app vive no mundo do cockpit: na cabine de pilotagem o vermelho é aviso, o âmbar é cautela, e essas cores usadas
para outras coisas "devem ser limitadas" (CS-25.1322); quando está tudo normal não se acende nada (o "cockpit escuro").

**A regra para o tripulante, numa frase: frio é a tua escala, quente é para olhares.** Cinco famílias, uma tarefa cada:

| Família | Tarefa | Tokens |
| --- | --- | --- |
| Base | a secretária, a folha, a tinta, os cinzentos — quase tudo | `CARD.desk/sheet/ink/neutral` |
| Tipo (frio) | o que é: voo · serviço em terra · repouso e pernoita; só nos cartões e barras da escala, sempre com o nome escrito (A3) | `CARD.flight` céu vivo `#6DBEFA` · `CARD.ground` lilás-rosado `#C3A1BE` · `CARD.rest` salva `#B4C2A2` (noite `#58AFEC` · `#B592B0` · `#A3B490`) |
| Estado (quente) | perto do limite, falta um dado, pede uma ação = laranja com "!" e a palavra · passa o limite = vermelho com "✕" e a palavra · **dentro = sem cor** · **incerto = neutro tracejado** com as duas pontas (não é um aviso) | `CARD.alert` `#F0854A` · `CARD.stop` `#EC7A6C` (3.0) · `PELE.warn/warnText/red` (2.0) |
| Dinheiro | **verde só no que se ganha** (+€); totais e parcelas a tinta; nunca vermelho no dinheiro; o dinheiro esquecido é "pede atenção" | `CARD.gain` / `CARD.night.gainOut` (3.0) · `MONEY.gain/gainSoft` (2.0) |
| Ação | o que se toca é tinta; o amarelo da marca só no "ao vivo" (o painel, o ponto da pílula); apagar e erros: vermelho só no texto | `BRAND.action` · `BRAND.signal` (ao vivo) |

**Regras que vêm com o mapa:** "perto" é a mesma conta em toda a app — 85 % do limite (o Início, `data/today.js` e agora os
Números); "passa" é acima de 100 %. A fadiga é um risco, não um limite: alta = laranja, nunca vermelho. A radiação só fica
vermelha acima do limite de dose (20 mSv/ano, Diretiva 2013/59/Euratom art. 9.º); os 6 mSv são uma classificação (art.
40.º) → laranja. Um documento caducado é vermelho (passou a data). **O guardião tranca o verde:** `PELE.ok*`/`PLATE.ok`
fora de `data/constants.js` é regra dura (exceção: o medidor da palavra-passe, antes de entrar na app).

**Medido (WCAG 2.1 e ΔE em Lab com a simulação de Machado para deuteranopia e protanopia; abaixo de ~15 confunde-se de
relance):** voo × atenção 97 · 92 · 80 (com a areia era 33 · 12 · 16 — um aviso podia parecer só mais um voo) · voo × terra
37 · 31 · 23 (os dois sempre com o nome escrito) · pior par de todos repouso × passa 19 · tinta sobre voo 9,12 · terra 8,04 ·
repouso 9,81 · atenção 7,16 · passa 6,64 · a linha a 82 % ≥ 5,07 e o rótulo a 80 % ≥ 4,91, de dia e de noite.
**O tom, escolhido pelo Nuno ("vou pelo que recomendas", 2026-11-13):** o tom 2 de `design/cores.html` §4 — céu vivo +
lilás-rosado, procurado entre milhares de tons frios com a liberdade "podes usar todas as cores que existem, caso seja
necessário". Mantém "lilás = terra". (Os outros: tom 1, o do esboço, voo × terra 21 · 19 · 14; tom 3, céu vivo + azul-petróleo,
27 · 27 · 26 mas a terra na família do voo.)

**No código desde 2026-11-13:** os tokens com nome de tarefa (`CARD.flight/ground/rest/alert/stop`, `MONEY`), o Início, a
Escala e a régua do dia na B, e as páginas 2.0 com os sentidos arrumados (verde só no dinheiro; dentro sem cor; incerto neutro;
os 90 % dos Números, o "Amarelo", a fadiga e a radiação). **Fica para a migração de cada página:** o resto dos laranjas e
vermelhos da 2.0 revistos um a um, e o amarelo da marca (`BRAND.signal/marker`) como sinal de seleção nas páginas 2.0.

### Peças escolhidas a 2026-11-13 (das 57 referências de `referencias/Para a app/`)

**No código (2026-11-13, ainda mais tarde):** o "Ver tudo" (o corpo do Detalhe, `DutyDetailBody`) está no 3.0 — escolha B de `design/detalhe-3.html`: o cartão de cor do serviço com a perna B2 (DH marcado) e os cartões neutros (Limites com a barra B9, Completar, Horário com a régua B3, Pernoita com "Mapas ↗", Pagamento com o total em A1, Outros serviços com a linha B7). Serve a Escala e o ecrã do Detalhe.

**No código (2026-11-13, à noite — substitui os parágrafos seguintes):** a Escala é SÓ O MÊS, com o dia **Q1** de `design/escala-semana.html` (um quadrado de 56 pt, neutro quando há serviço, com o número e o destino; a cor do tipo só numa fita de 5 pt em baixo — dois serviços = a fita em duas, a rotação junta as fitas, férias e baixa a tracejado, feito = fita cinzenta; hoje = o quadrado a tinta; o escolhido, um contorno) e a legenda que filtra (L2). **Tocar num dia:** o topo recolhe para a fila das pílulas (`HomeTop compact`), o mês fica só na semana desse dia, em cima, e sobe uma FOLHA com pega logo por baixo (320 ms; reduzido = aparece): o cabeçalho com ‹ › ✕, uma linha por serviço e, no serviço aberto, o corpo inteiro do Detalhe (`DutyDetailBody`). Tocar noutro dia da semana troca o dia; deslizar na folha muda de dia, na semana muda de semana, na grelha muda de mês; a pega, puxar para baixo ou ✕ descem a folha (300 ms). A janela `pageSheet` e a agenda saíram da aba.

**Antes (2026-11-13, mais tarde):** a Escala era SÓ O MÊS (o dia A de `design/escala-mes.html`, a legenda que filtra L2) e tocar num dia abria-o numa JANELA (a folha nativa do iPhone, `pageSheet`): o cabeçalho com ‹ › ✕, uma linha por serviço, e no serviço aberto o corpo inteiro do Detalhe (`DutyDetailBody` `embedded`); deslizar para o lado muda de dia na janela e de mês na grelha. A agenda descrita a seguir saiu da aba.

**No código (2026-11-13, por ver no iPhone):** a Escala em AGENDA (esboços `design/escala-agenda.html` — A2 + o ano em
meses da A1 — e `design/escala-passado.html` — D; a página de `escala-cartoes.html` foi substituída no mesmo dia, depois de
vista no iPhone). Peças novas: **B14 · a barra do dia** (`components/DayBar.js`: a data à esquerda, o título, a lua, a 2.ª
linha com o outro serviço, a hora ou o que rendeu; hoje e o que vem na cor do tipo; **o que já passou a cinzento (neutro) com um ponto da cor do
tipo** — escolha D, o título a 16:1 e o € a 6,3:1) · **B15 · o ano em meses** (12 mosaicos: n.º de dias com serviço; o atual
com contorno; sem escala a tracejado) · **a linha das folgas** (tracejada; "Folga" só entre serviços, senão "Sem serviços na
escala"); **dois serviços no dia: uma 2.ª linha na barra diz o outro por escrito** (escolha 1B de `design/escala-acertos.html`;
os dois pontos ficam só na grelha) · **"Lista | Mês" no topo da folha** (escolha 2B; **B11** em `components/Segmented.js`, a
pílula de tinta desliza 220 ms, reduzido = salta). B1 (a célula, com os dois pontos — escolha C) vive no "Mês", com a legenda
das cores e dos símbolos por baixo (já não há botão do calendário); B2 nas pernas do cartão grande
de `components/HomeCards.js`; B3 (`components/DayRuler.js`) fica para o Detalhe do serviço; B4 no mês sem escala. O topo da
Escala é o `HomeTop` do Início. Tokens: `TXT3.month`. O que vai para onde: `data/escalaDay.js`, golden `npm run test:escala`.

O índice, imagem a imagem, está em `referencias/Para a app/README.md`. O Nuno escolheu A1–A4, B1–B4, B7–B12 e M1–M4, e a
B10 com as cores da origem. Ficam para depois: **B5** (a semana em acordeão, modo novo da Escala), **B6** (o resultado de
vários dias escolhidos na grelha — é número novo: golden primeiro) e **B13** (o ano em meses e o mês em pontos, nas
Estatísticas). Aqui fica a anatomia; as medidas fecham-se no esboço de cada página (Mobbin primeiro), e cada peça entra
no código quando migra a primeira página que a usa.

**Regras**
- **A1 · Dinheiro.** Em todo o € grande os cêntimos ficam visíveis, mais pequenos e mais claros (como o ",50 €" do Início
  em `TXT3.unit`). Nunca se abrevia ("56k") nem se arredonda.
- **A2 · ↗ só quer dizer "abre fora da app"** (fonte oficial, Maps, eCrew). Dentro da app abre o cartão inteiro; nas linhas
  de lista, ›.
- **A3 · A cor é do tipo.** Nunca a escolhe o utilizador, nunca há uma cor por mês, por dia ou por posição, e nunca vai
  sozinha: o tipo diz-se também em texto (etiqueta, legenda). As cores e as medições estão no mapa das cores (acima, B).
- **A4 · Ficam sempre de fora:** vidro e desfoque, degradés, néon, fundo escuro de dia, letra fina, avatares, dados de
  saúde.

**Peças**
- **B1 · A célula do mês.** Quadrado de cantos redondos com o fundo na cor do tipo e a etiqueta em `TXT.tag` (11,
  decidido a 2026-11-03); hoje = número num círculo a tinta, escolhido = contorno a tinta, dia vazio em branco (como em
  `design/escala-v2.html`). → Escala.
- **B2 · A perna.** As duas horas grandes (`TXT3.cardNum`), com o código e a cidade por baixo (`TXT3.cardNumLbl`);
  entre as duas, um fio com ✈ e a duração no selo do intervalo (`TXT3.dur`) — a peça das duas horas do cartão do Início.
  O número do voo numa faixa por cima; a hora Zulu só quando difere da local. (Corrigido a 2026-11-13 com o esboço da
  Escala: o Nuno aprovou as horas grandes.) → folha do dia, Detalhe do serviço, imagem de partilha.
- **B3 · A régua das 24 h.** 00:00–24:00 com o serviço (apresentação → fim) na cor do tipo e o repouso. A faixa da WOCL só
  se desenha quando o motor a devolve para esse serviço (depende do fuso de aclimatação, ORO.FTL.105); a régua não calcula
  nada. Como se mostra o que passa a meia-noite decide-se no esboço. → folha do dia, Detalhe do serviço.
- **B4 · O estado vazio.** Mosaico de contorno tracejado com uma frase e uma ação ("Sem serviços em dezembro · Ler a
  escala"). → Escala, Números, Hotéis.
- **B7 · A linha de lista com o tipo.** Quadradinho com o ícone na cor do tipo · título · linha de data ou motivo · valor
  à direita. Nas listas datadas, a data grande na coluna da esquerda e o mês como eyebrow. → alterações da importação,
  eventos dos Extras, Disrupção, parcelas dos Números.
- **B8 · O fim da importação.** Folha com um selo redondo, uma frase com os números ("Escala lida · 23 serviços · 2
  alterações") e um só botão (`PrimaryButton`). → importação.
- **B9 · A barra do limite.** Eyebrow com a janela ("28 DIAS") · o valor ("62:15") com o máximo pequeno a cinzento
  ("/100 h") · barra a tinta · "faltam 37:45" (o que falta, nunca percentagem — `referencias/limites/`, 2026-11-03). Fica
  laranja só com o estado que o motor já devolve, nunca com um limiar escolhido no desenho. Num "Incerto", a palavra no
  lugar do valor e as duas pontas. → Números (limites FTL acumulados), Validades.
- **B10 · O € do mês em barra.** Barra empilhada das parcelas; cada parcela tem o valor em texto na legenda (ponto ·
  rótulo · € com cêntimos) e há uma fenda entre parcelas. O certo vai a cheio; o que é só máximo vai em contorno (o "certo
  e máximo" do acordo dos pilotos). Cores da origem (escolha do Nuno): per diem e setores = areia, dias em terra = lilás,
  base e extras = neutro. **Por resolver no esboço dos Números, com 2–3 soluções medidas:** o neutro sobre a folha branca
  dá 1,15, e a base — quase sempre a parcela maior — desaparece. → Números.
- **B11 · O seletor com pílula deslizante.** Cápsula com a escolhida numa pílula (a mesma da barra de abas); pode abrir um
  2.º nível dentro da escolhida. → Números (Mês | Ano; dentro de Ano: civil · 12 meses), Estatísticas. **No código desde
  2026-11-13:** `components/Segmented.js`, 1.º uso "Lista | Mês" na Escala (44 pt, cápsula neutra, pílula de tinta).
- **B12 · As linhas do Perfil.** Agrupadas em cartões brancos (`RADIUS.xxl`) com fios; ícone num círculo neutro
  (`CARD.neutral`) · rótulo · valor à direita · › ou interruptor ou "Mudar"; secções com eyebrow. Leva a pergunta do SNC
  reforçado (sim / não / não sei, por ano) e a qualificação LTC / TRI / TRE, e o cartão apagado com "EM BREVE" das
  companhias que ainda não estão (o mesmo texto no Perfil e na entrada). → Perfil, entrada.

**Movimento** (`Animated` de base, só `transform` e `opacity`, sempre com o ramo de movimentos reduzidos; durações das
linhas do `motion-design-system.md` §3)
- **M1** O Detalhe abre como ecrã empilhado com o cabeçalho na cor do cartão tocado: a continuidade faz-se pela cor (o
  zoom do cartão até ao ecrã ficou para o dev build a 2026-11-03).
- **M2** Os algarismos da contagem do Início rolam quando mudam (180–260 ms); com movimentos reduzidos, trocam.
- **M3** Um cartão que passa a laranja muda por cruzamento de duas camadas em opacidade (260 ms), não num salto; com
  movimentos reduzidos, troca.
- **M4** A pílula do seletor desliza em 220 ms, out(cubic); com movimentos reduzidos, salta.

O guardião (`test:design`) continua a valer: a migração de cada ecrã baixa o roquete, nunca o sobe.
