# referencias/Para a app/

57 imagens (54 JPG e 3 GIF) juntas pelo Nuno a 2026-11-13 como referência para o layout das páginas que faltam e
para o sistema de desenho. Não vêm do Mobbin e não têm link; as imagens ficam só neste PC (`.gitignore`), este
índice é versionado. São **inspiração**: não se copiam imagens, textos nem marcas.

**Regra de leitura (Nuno, 2026-11-13): uma só app.** A linguagem é a do Início 3.0 "cartões de cor"
(`design/inicio-cartoes.html`, `docs/design-system.md` §14). O que se aproveita traduz-se para os tokens e os
componentes que já existem (`CARD`, `TXT3`, `TXT`, `SPACE`, `IconButton`, `SheetHeader`, `Porta`); o que só funciona
noutro estilo fica de fora. Um elemento novo entra primeiro no sistema de desenho e só depois nas páginas.

Vistas uma a uma a 2026-11-13 (Opus 5.5); os GIF desmontados em fotogramas, com o tempo de cada um, e lidos com a
skill `animacoes` e `docs/motion-design-system.md`. Faltam números na sequência (3427, 3437, 3446, 3458, 3459): não
estão na pasta.

## O que se repete (candidatos ao sistema de desenho)

| Peça | Imagens | Onde |
|---|---|---|
| Limite com barra: janela · valor · máximo pequeno · barra · "faltam" (sem percentagem) | 3408 · 3415 · 3428 · 3431 · 3441 · 3462 | Números (limites FTL acumulados), Validades |
| O € do mês: barra empilhada das parcelas; cêntimos mais pequenos; nunca abreviar | 3421 · 3449 · 3433 · 3440 · 3441 | Números |
| A perna: código, hora por cima, cidade por baixo, a duração ao meio | 3417 · 3422 · 3444 | Detalhe do serviço, folha do dia |
| A régua das 24 h (o serviço, o repouso, a WOCL) | 3420 | Detalhe do serviço, folha do dia |
| Calendário: célula quadrada por tipo, semana em acordeão, vários dias → resultado | 3405 · 3406 · 3410 · 3445 · 3450–3452 · 3460 · 3462 | Escala |
| O ano em meses (estado de cada mês) e o mês em pontos | 3407 · 3411 · 3439 | Números, Estatísticas |
| Linhas de lista: quadradinho com a cor do tipo; data grande à esquerda | 3409 · 3431 · 3435 | Extras, alterações da escala, Disrupção |
| Perfil agrupado: ícone, rótulo, valor, › / interruptor / "Mudar" | 3432 · 3447 · 3448 | Perfil |
| Seletor com pílula deslizante, de um ou dois níveis | 3412 · 3434 · GIF 3D54 | Números, Estatísticas |
| Cartão apagado com "EM BREVE" | 3408 · 3415 · 3454 | Entrada (onboarding), Perfil |
| Estado vazio em mosaico tracejado; fim de importação com selo | 3433 · 3435 · 3443 | Escala, Números, importação |
| Movimento: cartão → página pela cor; algarismos que rolam; passagem de cor | GIF 7EEA | Início → Detalhe, contagem do Início |

**Regras que saíram destas imagens:** ↗ quer dizer só "abre fora da app" (fonte oficial, Maps); dentro da app abre o
cartão inteiro, e nas listas há ›. · A cor é do tipo: nunca escolha do utilizador, nunca uma cor por mês ou por dia,
e nunca sozinha (vai sempre com texto). · O € nunca se abrevia ("56k", "256k") e os cêntimos vão mais pequenos, nunca
fora. · Ficam sempre de fora: vidro e desfoque, degradés, néon, fundo escuro de dia, letra fina, avatares, dados de
saúde (sono, humor, ritmo cardíaco).

**Decisões antigas que estas imagens confirmam ou que mandam sobre elas:** hoje = número num círculo a tinta e dias
vazios em branco (`../escala/`, 2026-11-03) · o mês com título médio e o resumo numa linha ("mês está enorme",
`../escala/`, ronda 2), por isso o mês gigante de 3406 e 3460 não entra · o limite diz o que falta, não uma
percentagem (`../limites/`) · o zoom do cartão para o detalhe ficou para o dev build (`../inicio/`, Apple Invites).

## As 54 imagens

| Ficheiro | O que é | Aproveita-se → onde | Fica de fora (porquê) |
|---|---|---|---|
| `IMG_3405.JPG` | Calendário mensal de círculos, pega por baixo, lista do dia | Grelha num cartão com pega que recolhe (mês ↔ semana) e a lista do dia por baixo; célula com serviço na cor do tipo → Escala | Células redondas ("LGW" + lua = 38,9 px não cabem num círculo de 40); cinzento-azulado; botão flutuante (o ＋ está na barra); apagar ao deslizar (o calendário é a fonte) |
| `IMG_3406.JPG` | pocket cal: células quadradas grandes, chips com contagem | Célula quadrada de cantos redondos (leva a etiqueta); legenda em chips com contagem que filtra ("Voo 12 · Repouso 8 · Terra 3") → Escala | Texto da célula a ~6 pt (mínimo 11); contornos grossos; o mês gigante (ronda 2: título médio) |
| `IMG_3407.JPG` | 3 ecrãs: data gigante + cartões de cor; agenda de dias; ano em 12 meses | Confirma a anatomia do Início; vista lista da Escala com um cartão por dia na cor do tipo; o ano em mini-meses com os dias pintados por tipo → Estatísticas | Uma cor por mês (sem significado); "+" em cada dia (criar à mão morreu); avatares |
| `IMG_3408.JPG` | trakmac: mosaico escuro, "1,213 of 1,880", "SOON" | "Número / de limite" para os limites FTL acumulados → Números; meios cartões dois a dois; "EM BREVE" das companhias | Fundo preto de dia; laranja como cartão principal (laranja = pede atenção); cartão amarelo (o amarelo é só o ponto do estado); coach (sem IA) |
| `IMG_3409.JPG` | Événements: cartões pretos com a data grande; entrada com desfoque | Listas datadas: data grande na coluna da esquerda, mês como eyebrow → Extras, alterações, Disrupção | Cartões pretos; entrada com desfoque (a Porta decide); ✕ à esquerda (§10); campos de linha |
| `IMG_3410.JPG` | Tarefas: tira da semana com anéis, 3 mosaicos, vários dias escolhidos | Escolher vários dias → o resultado da rotação → Escala (é número: golden primeiro); 3 mosaicos com o máximo pequeno → Números | Faixa de cor na lateral; caixas de visto; barra preta |
| `IMG_3411.JPG` | Calendário de pontos: data gigante, um círculo por dia | "O mês em pontos", um por dia na cor do tipo → Estatísticas | Laranja para hoje (laranja = atenção); passado a preto |
| `IMG_3412.JPG` | Bloom: Dia/Semana/Mês em pílulas, barras finas | Período em pílulas; barras finas, a tocada destaca-se e mostra o valor → Estatísticas; ícone num círculo branco dentro do cartão | Castanhos; barra de abas em círculos soltos; humor e sono (saúde) |
| `IMG_3413.JPG` | Ecrã bloqueado: hora condensada gigante em cartões | Só confirma o número a encher um cartão (futuro widget, dev build) | Letra condensada (a Barlow sai); vermelho e verde-petróleo; autocolantes |
| `IMG_3414.JPG` | Arcanum: cartões sobrepostos em degraus de castanho | A pílula branca dentro do cartão (o nosso chip) | Degraus tonais (obrigavam a tons novos de cada cor); serifa; avatares; hambúrguer |
| `IMG_3415.JPG` | daybase laranja: dois números lado a lado, cartões apagados "Day Off" | "Este mês" · "últimos 28 dias" com fio de progresso → Números; folga como cartão apagado → Escala; "em breve" apagado | Tudo laranja; fundo preto; alturas desencontradas (perde a ordem de leitura) |
| `IMG_3416.JPG` | humbleteam: "Content" + botão de filtro, cartões com ↗ | Título à esquerda e um só `IconButton` à direita nas abas; cartões da Biblioteca: fonte em cima, ↗, título em baixo | Fotografia; laranja de fundo; letra fina; palavras gigantes como separadores |
| `IMG_3416(1).JPG` | A mesma imagem que `IMG_3416.JPG` (outro ficheiro) | — | Duplicada |
| `IMG_3417.JPG` | My Flights: rota grande, bilhetes, formulário de valores grandes | A perna "LIS – LGW" com cidades e hora, nº do voo numa faixa com ✈ → Detalhe; formulário com rótulo pequeno, valor grande, `IconButton` e fio → corrigir importado, Perfil, Simulação | Verde (a salva é repouso); texto vertical; carrossel (nunca mais de dois cartões grandes); reservas |
| `IMG_3418.JPG` | Viagens: hotéis em cartões sobrepostos, bilhete picotado | Um cartão por hotel com o nome em duas linhas → Hotéis (salva); bilhete picotado → imagem de partilha do voo | Fundo de céu (recusado); fotos; preços e estrelas (hotel sem preços); itálico serifado |
| `IMG_3419.JPG` | Estilo Nothing: número em pontos, 3 números com unidade, cartões | Fila de 3 números com unidade pequena; cartão com eyebrow, data, ícone e valores empilhados → Números | Letra de pontos (identidade alheia); pesos finos; saúde |
| `IMG_3420.JPG` | Nothing (2): anéis, mini-barras 00:00–24:00 | A régua das 24 h: serviço, repouso e WOCL → Detalhe, folha do dia (a WOCL só se desenha quando o motor a dá, no fuso de aclimatação) | Anéis (comparam-se mal); saúde |
| `IMG_3421.JPG` | Rosca de duas cores, legenda com números grandes | "De onde vem o dinheiro do mês", mas numa barra empilhada horizontal → Números | Rosca gigante; botão redondo "More"; vermelho |
| `IMG_3422.JPG` | Reservas: "12:30 WAW ··· PRG 21:30", tira de datas | A perna com a duração ao meio (o selo do intervalo deitado) → Detalhe, folha do dia; tira de datas no topo da folha do dia | Fundo escuro em degradé; laranja; deslizar para aceitar; avatares |
| `IMG_3423.JPG` | Ecrã bloqueado "cassete" | — | Decoração retro sem estrutura |
| `IMG_3424.JPG` | Recrutamento: "94%" em duas linhas, mosaico de verdes, chips | Confirma o número em duas linhas; rótulo em cima, número em baixo → Números; chip de estado no cartão ("PERTO DO LIMITE", "INCERTO") | Degraus de verde (a cor diz o tipo, não a intensidade); letra fina |
| `IMG_3425.JPG` | daybase lilás: número principal vs referência | Principal e referência distinguem-se pela cor (tinta vs `CARD.grey`) | Fundo preto; pesos finos |
| `IMG_3426.JPG` | Casa em néon: mosaicos, interruptores, botões redondos | Botão redondo dentro do cartão (já no §14); interruptores no Perfil | Néon; fundo preto; deslizar para trancar; separadores em texto |
| `IMG_3428.JPG` | Planning: mancha em degradé, cartão "Stage progress 33%" | Cartão de progresso (título, linha, número à direita, barra) → limites, Validades; chip do período por cima do título | Mancha em degradé; serifa; voltar quadrado |
| `IMG_3429.JPG` | Fatura: "67 Items", folha com recorte | Só o número com a palavra ao lado (já existe) | Degradé; recorte ondulado; contadores nos ícones |
| `IMG_3430.JPG` | Insights: menu em arco, cartões com ↗ | Pílula por baixo do total ("estimado · bruto") | Menu em arco; vidro; letra fina; comparar com o mês anterior; ↗ para um detalhe interno (fica para "abre fora") |
| `IMG_3431.JPG` | Objetivos: barras de progresso, barras por mês, movimentos | Barra "de X a Y · faltam N"; barras grossas por mês → Estatísticas; lista de movimentos → eventos e parcelas | Cartão bancário; emoji; cor arbitrária por objetivo |
| `IMG_3432.JPG` | Pesse: saldo, "Money hold", "Change" nas linhas | Linhas com "Mudar" à direita → Perfil (Companhia, Base, Contrato); pílula cinza por baixo do número | Lima; avatares; teclado próprio; "Close" ao centro |
| `IMG_3433.JPG` | Finanças: cêntimos mais pequenos, "Add widget" tracejado, bolhas | Cêntimos visíveis, mais pequenos e mais claros (regra de todos os € grandes); estado vazio tracejado | Bolhas (áreas não se comparam); cartão preto; avatares |
| `IMG_3434.JPG` | Finanças lima: Income/Expenses, barra com etiqueta | Seletor de duas opções com a ativa a tinta; barra escolhida com etiqueta → Estatísticas | Lima; entrada preta com letra em traço |
| `IMG_3435.JPG` | Banksad: movimentos com ícone em quadrado pastel | Quadradinho do ícone na cor do tipo → eventos, alterações, Disrupção | Cartão bancário; memoji; teclado próprio |
| `IMG_3436.JPG` | Credit Factors: 2×2 com número + mini-gráfico | Mini-cartões com número e mini-gráfico; contagens pequenas em pontos → Números, Estatísticas | Vidro e degradé (recusados) |
| `IMG_3438.JPG` | Carteira cripto em vidro | — (aqui mandam as decimais; no € manda o inteiro) | Vidro; deslizar; mercado |
| `IMG_3439.JPG` | Empréstimo: o ano em meses com ✓ / ✕ / atual | O ano em meses com o estado da Auditoria do mês (✓ · ! · atual · por vir) → Números | Vidro escuro com néon; arco; separadores em pasta |
| `IMG_3440.JPG` | Wallets: total com pílulas Income/Expense | Duas pílulas com subvalores no cartão do total ("base" · "variável") → Números | Cartão preto; ícones sobrepostos; botão azul |
| `IMG_3441.JPG` | Overview: "Last 30 days ▾", cartões com variação | Pílula da janela por secção (7 / 14 / 28 dias, 12 meses, ano civil) → limites | "256k" (viola "dinheiro sem arredondar"); setas vs mês passado; avatares |
| `IMG_3442.JPG` | Criar sala: campos agrupados, mini-cartões de definições | Campos agrupados num cartão neutro com fios, ícone num círculo branco → formulários em folha | Dois botões no topo; azul; avatares; foto de fundo |
| `IMG_3443.JPG` | Sucesso: selo ✓, frase, "Done" | Fim da importação: selo redondo, uma frase, um botão | Desfocar o fundo; selo recortado |
| `IMG_3444.JPG` | Orix: data gigante + dois fusos, cartões com o selo "30 Min" | Confirma o Início 3.0; hora local da estação e UTC → Detalhe | Avatares |
| `IMG_3445.JPG` | Orix (2): "SEP ‹ OCT › NOV", dias em cartões de cor | Mês com os vizinhos apagados → Escala, Números; vista lista com um cartão por dia | Uma cor por dia; "+" em cada hora |
| `IMG_3447.JPG` | Perfil: listas agrupadas, "Upgrade to Pro" | Perfil agrupado em cartões (`RADIUS.xxl`), ícone, valor, ›, interruptor; Premium numa linha escura (dev build) | Avatar ilustrado; pesquisa no Perfil |
| `IMG_3448.JPG` | Settings: secções, ícones em círculos pastel | Secções com eyebrow | Cores pastel arbitrárias (os círculos ficam neutros); › dentro de um quadrado |
| `IMG_3449.JPG` | Painel: barra empilhada "$56k", pílulas de números | Barra empilhada do € com legenda; pílulas número+palavra → Números | "$56k"; palavras finas gigantes; lima |
| `IMG_3450.JPG` | Semana em acordeão (claro e escuro) | "A semana": o dia aberto em cima, os outros em barras na cor do tipo → Escala (modo semana) | Maiúsculas condensadas gigantes; caixas de visto |
| `IMG_3451.JPG` | O mesmo, em degraus de cinzento | (ver 3450) | Degraus que escurecem sem significado |
| `IMG_3452.JPG` | Miniatura (236 × 184) do mesmo | (ver 3450) | — |
| `IMG_3453.JPG` | Harbor: "18 / 42" em duas linhas, fio de progresso | Confirma o número em duas linhas e o par dia/noite; fio por baixo → o repouso a decorrer na pernoita | Letra mono; botões quadrados |
| `IMG_3454.JPG` | Entrada por passos: tracinhos, cartões de opção, roda | Tracinhos na folha da Porta; opção escolhida a tinta (`OptCard`); roda (já existe); "EM BREVE" | "Previous step" em texto (voltar é ‹ em cima à esquerda) |
| `IMG_3455.JPG` | Registo: entrar, criar conta, código, sucesso | — (o funil, a conta criada e o bloqueio já existem) | Campos de linha; teclado próprio |
| `IMG_3456.JPG` | Pagamentos: mês num cartão escuro, "Upcoming payments" | Lista "o que vem a seguir" por baixo da grelha → Escala | Ponto por baixo do dia (a etiqueta diz mais); cartão escuro com brilho |
| `IMG_3457.JPG` | "Your Tasks (24)": círculos em diagonal | Só o tracejado nos dias sem dados | Escuro; letra fina; diagonal; amarelo para hoje |
| `IMG_3460.JPG` | Calendário: "Dec Jan" gigante, folha "Plans", "New Task" | Início e fim lado a lado nos formulários; folha do dia sobre a grelha (já é a Escala v2) | Mês gigante (ronda 2); escolher a cor (a cor é do tipo); fim de semana a vermelho; "+" |
| `IMG_3461.JPG` | Calendários integrados: diálogos nativos | Só confirma os seletores do sistema dentro das folhas | Criar eventos (o calendário só se lê); caderno escuro |
| `IMG_3462.JPG` | Nutrition: tira da semana, "153/165g" com barra e "12g left" | Os limites FTL em três mini-cartões ("62:15 /100 h", barra, "faltam 37:45") → Números; tira da semana em quadrados arredondados → Escala | Arco; botão flutuante; ✕ em cada linha |

## Os 3 GIF

| Ficheiro | O que é | Aproveita-se → onde | Fica de fora |
|---|---|---|---|
| `3D5428BE-BD2A-4BBB-8F43-5A3CBAE9C2D1.GIF` (6,1 s) | Seletor "Free \| Premium": a pílula desliza (~0,27 s) e o lado escolhido abre um 2.º seletor "Monthly \| Annual" | Seletor de dois níveis → Números "Mês \| Ano" e, dentro de Ano, "civil · 12 meses"; mais tarde o Premium. 220 ms out(cubic), Animated core; com movimentos reduzidos salta | — |
| `7EEAB312-3D7F-4999-8B8C-27E3BC356B8B.GIF` (19,3 s) | Casa (DHNS): o cartão cresce até ao ecrã (~0,35 s), o ecrã toma a cor do estado, algarismos que rolam | Agora: o Detalhe abre com o cabeçalho na cor do cartão; algarismos que rolam na contagem do Início; passagem de cor em 260 ms. O zoom geométrico fica para o dev build | Azul e amarelo saturados a ecrã inteiro; arrastar para mudar valores |
| `ED30F515-5B02-4F80-8158-9DEDE0233D36.GIF` (8 s) | Agenda: puxar para baixo desfoca a lista e revela uma frase-resumo | — (a folha a descer sobre o fundo já é o Início) | Gesto escondido como único caminho; desfoque; frase que repete o topo; sono (saúde) |
