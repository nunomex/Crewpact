# Provas do repouso e do PSV

Scripts para comparar o motor consigo próprio em milhares de escalas geradas. Não fazem parte do `npm test`: correm-se
à mão, a partir da raiz do projeto, antes e depois de mexer em `data/today.js` ou `ftl/index.js`.

| Script | O que prova | Como correr |
|---|---|---|
| `escalas-aleatorias.js views` | Início, Simulação e Estatísticas dão o mesmo veredicto do repouso | `node scripts/provas/escalas-aleatorias.js views 1,2,3,4 1000` |
| `escalas-aleatorias.js until` | um voo posto à hora do "Repouso até" dá "Sim"; um minuto antes da ponta de baixo nunca dá | `node scripts/provas/escalas-aleatorias.js until 1,2,3 600` |
| `escalas-aleatorias.js mono` | mais repouso nunca piora o veredicto (lista as classes em que piora) | `node scripts/provas/escalas-aleatorias.js mono 1,2,3 400` |
| `assistencia-grelha.js` | a regra da assistência antes do voo (durante → certa; do fim até ao repouso mínimo → duas leituras; depois → nada), no mesmo dia e na véspera; e o voo calculado sozinho igual ao registo do dia | `node scripts/provas/assistencia-grelha.js` |
| `contra-commit.js` | o repouso do código atual contra o de outro commit, por classe de diferença | ver abaixo |

Os argumentos de `escalas-aleatorias.js` são: o modo, as sementes (separadas por vírgulas), o número de escalas por
semente, quantos exemplos mostrar e, opcionalmente, um texto para filtrar os exemplos.

## Comparar com outro commit

Tira-se uma cópia do motor desse commit para uma pasta fora do repositório e aponta-se para ela:

```sh
mkdir -p /tmp/base && git archive 3c217a5 data ftl ae | tar -x -C /tmp/base
NODE_PATH="$PWD/node_modules" MAIN=/tmp/base node scripts/provas/contra-commit.js plain 1,2,3 1200
```

Modos: `plain` (sem longo curso nem assistência em casa), `lh` (com longo curso, sem assistência em casa), `all` (tudo).
Um quarto argumento qualquer mostra um exemplo de cada classe.

## O que estes scripts não são

Não têm respostas certas escritas: comparam o motor com ele próprio. Um resultado "0 diferenças" quer dizer que duas
vistas concordam, não que o número está de acordo com a lei. Para isso servem os testes golden
(`scripts/ftl-golden.test.js`) e a revisão independente.

`h.js` é só o carregador (transpila os módulos e dá ajudas para escrever serviços: `F` voo, `G` outro serviço, `sbD`
assistência em casa). Lê `ROOT` (de onde carrega o código; por omissão a raiz) e `PROJ` (onde está o `node_modules`).
