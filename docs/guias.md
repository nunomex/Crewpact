# As guias da app

Aprovado pelo Nuno a 2026-11-13: "gosto desses guias assim para a app toda, na primeira vez que se entra ou é usada — mas meter onde faz sentido". O piloto é a legenda da Escala (esboço `design/escala-legenda-3.html`, J3).

## As regras

1. **Só onde há um sinal ou um gesto que não se adivinha.** Nunca para explicar o óbvio (um botão com o nome escrito).
2. **Curta:** no máximo 6 balões por ecrã, sobre os **dados verdadeiros** do tripulante (nada de ilustrações), e só os sinais que existem naquele momento.
3. **Na primeira vez que o ecrã é usado com dados** (depois da folha de boas-vindas). Nunca com o ecrã vazio, nunca durante um voo ou um serviço a decorrer, e um ecrã de cada vez.
4. **Sempre "Saltar".** Conta como vista ao acabar, ao saltar, ao tocar no ecrã para fazer outra coisa ou ao sair a meio. Repete-se no próprio ecrã ("Rever") e, quando houver mais de uma, num sítio só no Perfil ("Guias da app").
5. **Uma peça só:** `components/GuideBubble.js` — o balão escuro com a seta, o texto, "1 de 6", "Saltar" e "Seguinte" / "Já percebi". Substitui as dicas soltas (`components/Tip.js`) à medida que cada ecrã ganha a sua guia.
6. **Acessível:** o VoiceOver lê cada balão (`AccessibilityInfo.announceForAccessibility`); sem animação.
7. **O que vai para onde é puro e tem golden** (como `data/escalaDay.js` · `legendTour`): que dia, que cartão, que número cada balão aponta.

## Onde faz sentido

| Ecrã | O que ensina | Estado |
| --- | --- | --- |
| **Escala** | os anéis, as fatias, a lua, o ponto, o tracejado; tocar num dia (e num serviço) | **no código** (2026-11-13, por ver no iPhone) — substituiu a dica "Toca num dia" |
| **Início** | a pílula do estado, o número grande (o próximo marco), a cor dos cartões; o ＋ | proposto (3 balões) — substitui a dica do ＋ |
| **"Ver tudo" de um serviço** | o "§" que abre a lei de cada número; a barra do PSV; "Completar"; "o calendário está errado?" | proposto |
| **Números** | "estimado · bruto"; a barra laranja aos 85 %; tocar num valor abre as parcelas | proposto |
| **Simulação, Relatórios** | um balão cada | talvez |
| **Perfil, entrada, termos** | já são claros | não |

Cada ecrã proposto leva esboço (três maneiras) antes do código, como sempre.
