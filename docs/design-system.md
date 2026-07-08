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
- `PELE_FONT` — **Barlow Condensed** (display: fantasma, números grandes, palavra condensada) + **Hanken Grotesk** (corpo, rótulos). **NUNCA `fontWeight`** — as fontes são estáticas, a FAMÍLIA carrega o peso.
- Partilhados com o tema antigo: `RADIUS` (cartão de conteúdo = `lg` 16; folhas/diálogos xl/xxl) · `SPACE` · `SHADOW` (só folhas/diálogos/toasts elevam — **cartões são planos**, borda hairline) · `GUTTER` 16.

**Gramática da pele:**
- **Fantasma** — numeral/sigla gigante em `PELE.ghost` atrás do herói. Tamanhos **determinísticos por comprimento** (TUNE.ghost s3/s4/s5). ⚠️ **Nunca `adjustsFontSizeToFit` em `Text` absoluto** — bug iOS: fica invisível quando um irmão re-renderiza.
- **PeleSide** — rótulo lateral rodado 90°, início ancorado no TOPO em todos os ecrãs (wrap width 320 + textAlign left; a rotação ancora o FIM, o wrap fixo devolve o início).
- **PeleHeader** — **fonte única do cabeçalho** (o fantasma tinha divergido 74/92/130 entre ecrãs antes da consolidação). Régua 130/44/108; slots avatar/back · actions · sino · word/kick. Fora da régua por decisão deliberada: DutyDetail 104 · Perfil 150 · Início (sem fantasma de header).
- **Amarelo** = marca/realce: numeração bento, kicks, seleção, pontinhos de atenção suave.
- **Tema noturno** — conduzido pelo **ESTADO do dia** (véspera/pernoita), NÃO pelo dark-mode do sistema. Fábrica `makeSkin(P, night)` → `sDay`/`sNight`.
- **Dock** — navy sólido + esbatimento suave por cima + inset generoso (`useTabBarSpace` +32). O INSET resolve a leitura da última linha, não o efeito.
- 4 abas (Início · Estatísticas · Escala · FTL); Perfil = avatar no cabeçalho (`HeaderActions`).

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
| `Toast` | `notify(title, sub, kind)` global | toasts locais proibidos (o da Escala foi eliminado) |
| `ConfirmDialog` / `CenterDialog` | confirmação / conteúdo centrado | convenção: `Alert` nativo DENTRO de Modal; `ConfirmDialog` fora |
| `Skeleton`, `CountUp`, `useEnter` | loading / números / entrada | todos respeitam reduce-motion |
| `PrimaryButton` / `GhostButton`, `Banner`, `Eyebrow` | tema antigo | usar nos ecrãs legados; nos da pele, o mockup manda |

---

## §5 · Tema antigo (legado em extinção)

`useTheme()`/`makeStyles(C)`, Inter + Space Grotesk, escala `TYPE`. Ainda vivo em: **Onboarding · Login · Lock · BiometricOffer · Reactivate · Hoteis · FtlDetail**. Regras:
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
