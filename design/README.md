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

## Referências de outras apps

Vêm do Mobbin (MCP) e guardam-se em `referencias/` na raiz do projeto, com a escolha do Nuno. São
inspiração: não se copiam imagens, textos nem marcas.
