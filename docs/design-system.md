# CrewPact — Design System

> O canon visual **executável**. Quando o código e este documento divergem, um dos dois está errado — reconciliar é obrigatório (mesma regra da Constituição).
> Companions: [motion-design-system.md](motion-design-system.md) (movimento) · [living-interface.md](living-interface.md) (os estados do Início) · [auditoria-ux.md](auditoria-ux.md) (as 43 correções UX, todas aplicadas).
> Criado 2026-07-09 — extraiu para o repo o canon que vivia disperso (memória do parceiro AI + mockups).

---

## §1 · Fontes de verdade (por ordem — a de cima ganha)

1. **Mockups `design/*.html`** — seguem-se **à letra** em todos os ecrãs (decisão 2026-07-05, depois de um § da lei inventado na Escala). O mockup manda em tudo o que cobre. **Ler o mockup ANTES de codificar.**
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

**Gramática da pele:**
- **Fantasma** — numeral/sigla gigante em `PELE.ghost` atrás do herói. Tamanhos **determinísticos por comprimento** (TUNE.ghost s3/s4/s5). ⚠️ **Nunca `adjustsFontSizeToFit` em `Text` absoluto** — bug iOS: fica invisível quando um irmão re-renderiza.
- **PeleSide** — rótulo lateral rodado 90°, início ancorado no TOPO em todos os ecrãs (wrap width 320 + textAlign left; a rotação ancora o FIM, o wrap fixo devolve o início).
- **PeleHeader** — **fonte única do cabeçalho** (o fantasma tinha divergido 74/92/130 entre ecrãs antes da consolidação). Régua 130/44/108; slots avatar/back · actions · sino · word/kick. Fora da régua por decisão deliberada: DutyDetail 104 · Perfil 150 · Início (sem fantasma de header).
- **Amarelo** = marca/realce: numeração bento, kicks, seleção, pontinhos de atenção suave.
- **Tema noturno** — conduzido pelo **ESTADO do dia** (véspera/pernoita), NÃO pelo dark-mode do sistema. Fábrica `makeSkin(P, night)` → `sDay`/`sNight`.
- **Navegação = TAB BAR com ＋ central** (`components/TabBar.js`, 2026-07-09 — referência aprovada pelo user): barra inteira em **papel + hairline no topo**, **em layout** (o conteúdo termina acima dela, nada fica tapado), simetria **`Início · Escala · ＋ · Números · Perfil`**, ativa = **ink + ponto amarelo** (espaço reservado, fade+scale 180ms + pop do ícone, reduce-motion salta); tema noturno herdado do Início via `homeNight`; ponto âmbar em "Escala" (alterações por rever); háptico; `useTabBarSpace` = só folga (20).
- **O ＋ central abre o speed-dial em pílulas rotuladas** (Modal + scrim + cascata; back do Android fecha; × = clone pixel-perfect que roda): **Serviço** (→ Escala, novo serviço hoje) · **Simulação** · **Evento** (gate AE). O ＋ é só CRIAR — a Pesquisa vive na Biblioteca. Criar também continua na grelha da Escala (tocar num dia insere NESSE dia) e nos acts contextuais do Início.
- **Topos LIMPOS (2026-07-09): sem avatar e sem sino em nenhuma página.** O **Perfil é ABA** (a 4.ª); o **sino-arquivo vive no header do Perfil**; a antiga aba INFO virou o cartão **"Biblioteca"** dentro do Perfil (empurrada com ‹, `size="detail"` — lei FTL + AE + fontes + procura, conteúdo intacto).
- **Notificações à Apple: o botão só existe quando tem algo para dizer.** No Início, ao lado da saudação, a **pílula "● N novidades"** (`NotificationsBell variant="pill"`) aparece SÓ com por-ler e desaparece ao ler — zero mobília em repouso. O crítico continua em-contexto (banda do Início · ponto âmbar da Escala · push).
- **Primeira entrada (2026-07-10, mockup `design/boas-vindas.html`): folha de boas-vindas + 2 dicas contextuais — SEM tour de passos** (a Apple não faz; a maioria salta). Folha (`WelcomeSheet`): 1 ecrã, 4 linhas com numeração bento amarela, 1× na vida, só nasce do funil (flag `cp_welcome_<uid>` 'pending'→'seen'). Dicas (`Tip`, padrão iOS-Tips): ＋ central (1.ª visita ao Início PÓS-folha) e grelha da Escala (1.ª abertura) — balão ink que APONTA sem trancar, morre a qualquer toque, uma de cada vez, flags por utilizador. O estado 0 continua a ser a introdução real ao Início.

---

## §3 · Living Interface

O Início muda automaticamente conforme o dia de trabalho — **o coração da app**. 15 estados, motor puro `data/crewState.js` (golden `test:crewstate`), voz curada determinística `data/stateVoice.js` (golden `test:voice`), atmosfera = halo/candeeiro subtis + tema noturno. Doc próprio: [living-interface.md](living-interface.md). Regra transversal: **uma banda de alerta única, priorizada** — nunca empilhar avisos.

---

## §4 · Componentes canónicos

| Componente | Papel | Regra |
|---|---|---|
| `PeleHeader` | cabeçalho de todos os ecrãs-pele | única fonte; não recriar fantasma/sino à mão |
| `PeleSide` | rótulo lateral rodado | label muda com o estado/ecrã |
| `PeleSheet` | folha modal da pele | gesto de arrasto + teclado já resolvidos |
| `Icon` + `design/icons.js` | pictogramas SVG próprios | emoji proibido |
| `HeaderActions` | sino + avatar (ecrãs-aba) | avatar navega ao Perfil |
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

## Overlays tocáveis (regra técnica, RN 0.86 / Fabric — 2026-09-03)

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
