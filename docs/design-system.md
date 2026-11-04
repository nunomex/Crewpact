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
- `PELE_FONT` — **Barlow Condensed** (display: fantasma, números grandes, palavra condensada) + **Hanken Grotesk** (corpo, rótulos) + **Caveat** (`hand` — manuscrita, USO ÚNICO: a voz do Início, o bilhete pessoal com marcador amarelo). **NUNCA `fontWeight`** — as fontes são estáticas, a FAMÍLIA carrega o peso.
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
