# design/ — mockups

**Regra (Design System 2.0, 2026-11-02, decisão do Nuno):** o mockup decide a **hierarquia e a disposição**
(o que existe, a ordem, o que pesa mais). **Os números vêm sempre da escala** (`data/constants.js`:
`TXT`, `TYPE`, `SPACE`, `RADIUS`, `ICON_BTN`) — nunca do píxel do HTML. Se o mockup diz 12,5 px, o ecrã
usa o estilo da escala mais próximo (tabela em `docs/design-system.md` §9).

Porquê: cada mockup foi desenhado com os seus números e portado "à letra"; a app acabou com 206
combinações de letra e 924 espaçamentos fora da escala (medido a 2026-11-02).

## O que está aqui

- **`*.html` nesta pasta** — os mockups que contam (aprovados, ou o mais recente de cada ecrã).
- **`icons.js`** — fonte única dos pictogramas (portada para `components/Icon.js`).
- **`arquivo/`** — explorações recusadas ou ultrapassadas, guardadas como história. **Não se seguem.**
  Arquivados a 2026-11-02 com prova na memória do projeto: as 6 rondas da navegação (a decisão final é a
  tab bar com ＋ central), FAB e dock (mortos), referências e variantes da pele (a canónica é
  `pele-tipografica-final.html`), `julgamento`, `fids-2-led`, `splash-2` (a escolha está em `splash-3`),
  `perfil-acesso`/`perfil-topo`/`perfil-sino` (a canónica é `perfil-final.html`, e o sino mudou-se para o
  header do Perfil), `icons-test`.

## Direção 3.0 · cartões de cor (aprovada pelo Nuno a 2026-11-11, por construir)

- **`inicio-cartoes.html`** é o mockup que manda no Início novo (16 estados medidos, a fila do iPhone pequeno, a barra de
  abas em cápsula, as regras e o contraste). As regras estão em `docs/design-system.md` §14.
- `inicio-v6.html` descreve o Início que ainda está no código; deixa de valer quando o novo for construído.
- `inicio-extremos.html` é o diagnóstico que abriu este trabalho (o estado mais cheio e o mais vazio do v6).
- Arquivados a 2026-11-11 (recusados no caminho): `inicio-v7`, `inicio-alternativas`, `inicio-mistura`,
  `inicio-instrumento`, `inicio-uau`, `app-painel-instrumento`.
- **`escala-cartoes.html`** (aprovado pelo Nuno a 2026-11-13; no código no mesmo dia, por ver no iPhone) é o mockup que manda na Escala nova: o mês
  na secretária, o dia numa folha (dobrado em mês, aberto na semana; no iPhone pequeno abre na semana), as peças B1–B4
  do §14 e o acerto 9. Seis estados medidos.
- `escala-dois-servicos.html` (2026-11-13) — três maneiras de marcar um dia com dois serviços; o Nuno escolheu a C (dois pontos), já no código.
- `escala-layouts.html` (2026-11-13) — três páginas novas para a Escala (A agenda · B o dia em foco · C o mês em miniatura), depois de o Nuno não gostar da página de `escala-cartoes` no iPhone. O Nuno gostou da A.
- **`escala-agenda.html`** (2026-11-13) — três variantes da A com ideias das imagens dele: A1 o ano em meses · A2 acordeão · A3 o mês inteiro. **Escolhida: A2 + o ano em meses da A1 — é o mockup que manda na Escala** (no código, por ver no iPhone).
- **`escala-passado.html`** (2026-11-13) — três maneiras de os dias que já passaram se distinguirem à vista, sem os apagar. **Escolhida: D** (cinzento com um ponto da cor do tipo), no código.
- **`escala-mes.html`** (2026-11-13, **por escolher**) — o Mês da Escala: os dias (como está · A número limpo + etiqueta · B círculo · C faixas sem códigos) e a legenda (L1 botão "Legenda" · L2 pílulas que filtram · L3 aberta na 1.ª vez, depois recolhe), com o movimento tocável. Recomendo A + L2.
- **`cores.html`** (2026-11-13, **escolhida a B, tom 2 — no código**) — manda nas cores: as cores dos esboços anteriores (areia = voo) estão substituídas por ele. — as cores da app toda: o que está mal hoje (contado no código), o mapa de cinco famílias (base · tipo · estado · dinheiro · ação) e três maneiras de o aplicar — A arrumar os sentidos · B frio e quente (o voo passa a céu; recomendada) · C só o estado tem cor —, medidas (contraste e daltonismo).
- **`escala-acertos.html`** (2026-11-13, **escolhidos 1B + 2B, no código**) — depois de o Nuno ver a agenda no iPhone: três maneiras de dizer "dois serviços" numa barra e três de mostrar o mês com as legendas.
- `escala-cartoes.html` foi a página aprovada e construída de manhã; substituída à tarde pela agenda (fica como história das peças B1–B4).
- `escala-v2.html` descrevia a Escala antiga; o código já é a 3.0 — passa a `arquivo/` quando a 3.0 for vista no iPhone.
- Arquivado a 2026-11-13: `escala-v3` (a ronda de 2026-11-03 que ficou sem escolha; a Escala seguiu a linguagem do Início).

## Referências de outras apps

Vêm do Mobbin (MCP) e guardam-se em `referencias/` na raiz do projeto, com a escolha do Nuno. São
inspiração: não se copiam imagens, textos nem marcas.
