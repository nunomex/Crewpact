# Verificação do pipeline do CALENDÁRIO — guião de device

> Ritual: o founder diz **"testar o calendário"** → sessão guiada por este guião.
> Doutrina selada (2026-07-11): **calendário = a fonte · manual = correção e exceção ·
> PDF = dev build · simulação = e-se.** O parser não precisa da lista teórica do AIMS —
> precisa de cobrir o que aparece no calendário e falhar com segurança no resto
> (código desconhecido → "—" no diagnóstico, nunca inventa serviço).

## A · Preparar o calendário SINTÉTICO (sem roster real)

Criar no telemóvel um calendário novo ("CrewPact Teste") e eventos com os TÍTULOS
que o eCrew escreveria — cada um testa um ramo do parser:

| Evento (título) | Horas | Deve virar |
|---|---|---|
| `EZY7841 LIS-FNC` | 06:40–08:15 | voo (1 setor) — **SEM report → SEM PSV** (o parser nunca inventa dep−1h; o Início diz "Partida às…" + "sem hora de report — PSV não calculado") |
| idem + notas `RP 05:40` (ou `REPORT`/`C/I`/`CHECK-IN` hh:mm) | 06:40–08:15 | voo COM report → PSV máx/realizado no Início e no Detalhe, § Prova |
| `EZY7842 FNC-LIS` | 09:00–10:35 | funde com o anterior (2 setores, gap < 6h) |
| `EJU7625 LIS-OPO` + `EJU7626 OPO-LIS` no dia seguinte 23:50→00:55 | red-eye | serviço a cruzar a meia-noite |
| `HSBY` | 06:00–14:00 | standby casa |
| `ADTY LIS` | 06:00–10:00 | standby aeroporto (ADTY < 4h → € certo no dia) |
| `CBTB` | 09:00–12:00 | treino **e-learning** (piloto: €0 — SEM abono de 3 NS) |
| `SEP TRAINING LGW` | 08:00–16:00 | treino presencial (piloto: 3 NS no € do dia) |
| `OFC8 LIS` | 09:00–17:00 | escritório dia inteiro (3 NS, não 1,5) |
| `LVE` all-day, 3 dias seguidos | dia inteiro | NÃO importa + linha "Férias: 3 dia(s)" no Confirmar |
| `GDO` / `DOWE` / `P/T` all-day | dia inteiro | ignorados (folga — nunca propostos) |
| `Aniversário da Ana` all-day | dia inteiro | ignorado (ruído pessoal) |
| `Reserva de mesa` | 20:00–22:00 | ⚠️ FALSO-POSITIVO conhecido (casa "Reserva"→standby) — confirmar que o utilizador o vê e desmarca |

## B · A sessão (por ordem)

1. **Ligar**: estado 0 → "Ligar ao calendário" → escolher "CrewPact Teste" → toast
   "Calendário ligado ✓ + dica eCrew" → abre o Confirmar import.
2. **🔧 Diagnóstico** (no Importar): percorrer TODOS os eventos → cada classificação
   errada ou "—" **anota-se** (é um fixture novo para o golden).
3. **Confirmar import**: contagens certas (prontas/a corrigir), linha das FÉRIAS com
   visto amarelo (desligar → não regista; ligar → toast "· 3 dia(s) de férias"),
   voo sem rota → "Corrigir" abre o formulário manual (manual = correção).
4. **€ do dia** (grelha → dia): CBTB SEM €; SEP com "formação +€"; OFC8 com o valor
   de 3 NS; ADTY com a matriz (chamado/não, ±4h); voo com per-diem.
5. **Sincronizar + alterações**: mudar as horas de um evento no calendário → voltar à
   Escala → sincronizar → pontinho âmbar + rever a alteração (3-vias). Apagar um evento
   → o cancelado só apaga se marcado.
6. **Números**: o mês soma o que os dias mostram (caminho único — o total do Perfil,
   Cálculos e Números tem de ser o MESMO).
7. **Pernas que não batem certo** (correção de 2026-11-11): dois eventos no mesmo dia com a
   volta a sair antes de a ida chegar (ida 17:30–20:35, volta 19:50–21:30) → sincronizar →
   o dia ENTRA (visto verde, com o €) e a linha diz "Incerto — falta saber as horas certas
   das pernas: as da escala não batem certo (ORO.FTL.105) · toca para corrigir", com as
   duas horas à vista; tocar abre o formulário com elas; acertar a volta (21:20–23:00) → o
   aviso sai. Confirmar SEM corrigir: o dia fica na Escala e conta (serviço 5:30 com 30 min
   de pós-voo; voo 4:45); no Detalhe e no Início o PSV máximo é 11:15–13:30 (garantido e
   possível), sem "repartido", com "Incerto — falta as horas certas das pernas…". Com a volta certa pela meia-noite (ida
   até 23:50, volta 00:30–01:30) → entra sem aviso e sem "repartido".
8. **Perna do meio** (correção de 2026-11-11): num dia de 2 voos já importado, mudar no
   calendário só a CHEGADA do 1.º voo (a partida do 1.º e a chegada do 2.º ficam) →
   sincronizar → pontinho âmbar + "Perna 1 06:40-08:15→06:40-08:35". Repor a hora →
   sincronizar → nada a rever.
9. **Dois serviços no mesmo dia** (correção de 2026-11-11): dois voos de manhã (apresentação
   05:00, chegada 08:40) e um à noite (apresentação 19:10, chegada 21:55), tudo em Lisboa —
   10 h entre o fim do 1.º (com o pós-voo) e o 2.º. Na Escala, a linha entre os dois diz
   "Incerto · 10:00 entre serviços (mín 12:00 base) → serviço repartido ou repouso curto"; o
   PSV fica "incerto" com "falta saber se o tempo em terra … foi um intervalo … ou um
   repouso" (antes: "excede"). Com o 2.º às 18:40 (9 h 30) → repartido, como antes; às 21:10
   (12 h) → dois serviços com repouso, como antes.
10. **Horas das pernas no Detalhe** (2026-11-11): com o dia do passo 7 importado SEM corrigir,
    abrir o Detalhe → secção Completar com "Horas das pernas · Não batem certo" em primeiro
    → a folha mostra a partida e a chegada de cada perna → com as mesmas horas não deixa
    gravar; acertar a volta (21:20–23:00) → grava, o PSV deixa de estar incerto e a linha
    desaparece.
11. **Repouso reduzido** (2026-11-11): um serviço de 13 h (apresentação 06:00, chegada 18:30)
    e, no dia seguinte, apresentação às 07:30 (12 h 30 depois) → "Tenho descanso?" diz
    "Incerto · 12:30 (mín 13:00)" com o texto do repouso reduzido (antes: "Não"). Com a
    apresentação às 06:45 (11 h 45) → "Não", como antes.
12. **Assistência + voo** (2026-11-11): assistência em casa 08:00–10:00 e um voo com
    apresentação às 20:30 e chegada às 02:00 → o PSV fica "incerto" com "falta saber se
    entre a assistência e a apresentação houve um repouso mínimo…" (antes: "excede 1:00").
13. **Partir um serviço em dois** (2026-11-12): um dia com dois voos de manhã e um à noite, com
    13 h ou mais em terra pelo meio, guardado como UM serviço (só à mão ou por PDF: o
    calendário já os separa) → Detalhe → "Horas das pernas" → a folha tem as duas saídas;
    "As horas estão certas: são dois serviços" + a apresentação do 2.º → grava; a Escala
    passa a mostrar dois serviços nesse dia e o PSV deixa de estar incerto.
    Sem a apresentação do 2.º: grava na mesma, e no dia seguinte "Tenho descanso?" diz
    "Incerto" e pede a hora de apresentação desse serviço (não diz "Sim").
    Uma apresentação do 2.º antes do fim do 1.º (calços + pós-voo) não se deixa gravar.
    Se o 2.º só parte depois da meia-noite, a folha não oferece "são dois serviços" (só corrigir
    as horas).
14. **Assistência em casa** (2026-11-12): assistência em casa 06:00–20:00 e, no dia seguinte,
    apresentação às 09:00 (13 h depois) → "Tenho descanso?" diz "Sim" (antes "Não", pedia 14 h).
    Sem nenhum voo comprido nos dias antes. Com um voo de 13 h na véspera da assistência e só
    12 h livres entre os dois, 12 h 30 depois da assistência dão "Incerto · mín. entre 12:00 e
    13:00" (a lei não diz por que serviço se mede; fixa-o a companhia).
15. **Estatísticas** (2026-11-12): Números → mosaico Corpo → "N curtos · M incertos" quando há
    repousos que só são legais como repouso reduzido.
16. **Assistência em casa e voo: chamada ou repouso curto** (2026-11-12): assistência em casa
    06:00–12:00 e um voo com apresentação às 16:00 do MESMO dia → depois do meio-dia, "Tenho
    descanso?" diz "Incerto · 4:00 (mín 12:00)" com o texto da chamada (antes: "Sim"). Com a
    apresentação às 10:00 (durante a assistência) → "Sim". Assistência 14:00–02:00 e, no dia
    seguinte, apresentação à 01:00 e chegada às 11:30 → "Dentro dos limites?" diz excede, com o
    máximo 6:00 (antes: 11:00, dentro), e o Detalhe desse voo mostra o mesmo máximo.
    Assistência 07:00–18:00 e apresentação às 18:00 com chegada às 04:30 → "Dentro dos
    limites?" diz "Incerto", máximo entre 6:00 e 11:00, com "se o voo te foi atribuído durante a
    assistência…" (antes: excede); o texto cabe no cartão e no Detalhe?
    Assistência 14:00–22:00 e, no dia seguinte, apresentação às 07:00 (17 h desde o início) →
    "Tenho descanso?" diz "Não · 9:00 (mín 12:00)" com o texto das duas hipóteses ("Se o voo já
    estava na escala, o repouso é curto. Se te foi atribuído durante a assistência… acima do
    máximo de 16 h"); o texto cabe?
17. **A série de assistências e a 4.ª/5.ª revisões** (2026-11-12, motor v20; nada visto no iPhone). Ao abrir, o registo
    dos dias recalcula-se: os Números de um mês com assistências podem mudar uns minutos (a assistência da véspera acaba na
    apresentação do voo). Eventos sintéticos, `HSBY` = assistência em casa, `ADTY LIS` = no aeroporto:
    a) **Partida à meia-noite:** `HSBY` 18:00–00:00 e, no dia seguinte, `HSBY` 00:00–06:00 + voo com apresentação às 05:00
       e chegada às 16:00 → Detalhe do voo e "Dentro dos limites?": PSV 11:00, máximo 07:00, excede (antes: 12:00, dentro).
    b) **Duas seguidas no mesmo dia:** `HSBY` 07:00–11:00 + `HSBY` 11:00–17:00 + voo às 16:00 com chegada às 02:00 → PSV
       10:00, máximo 08:30, excede. Sem o voo, o dia das duas assistências não mostra PSV nenhum.
    c) **Com tempo livre no mesmo dia:** `HSBY` 04:00–08:00, `HSBY` 09:00–12:00 e voo às 11:00 → "Tenho descanso?":
       "Incerto · 1:00 (mín 12:00)" com o texto da chamada (antes: "Sim").
    d) **Mais de 16 h:** `HSBY` 00:00–17:00 e voo às 19:00 → "Dentro dos limites?" diz assistência acima de 16 h.
    e) **Aeroporto à hora do fim:** `ADTY LIS` 18:00–02:00 e, no dia seguinte, voo com apresentação às 02:00 → "Tenho
       descanso?": "Incerto · 0:00 (mín 12:00)"; o texto cita o aeroporto, "(a)(2)" (antes: "Não · 0:00").
    f) **Declarada à mão:** `HSBY` 07:00–19:00 + voo às 18:00 com chegada às 04:30; no Detalhe → Completar → "Assistência
       antes do voo" → em casa, 7 h → máximo "06:00 a 10:00" e o motivo "as horas que indicaste não batem com a assistência
       que está na escala"; com 11 h → máximo 06:00, sem dúvida. O texto cabe?
    g) **Voo e assistência depois:** voo 06:00–10:00 e `HSBY` 11:00–21:00 no mesmo dia → PSV 04:00, dentro (antes: um
       "PSV" de 15:00, excede).

## C · Colheita (o produto da sessão)

Cada divergência vira: título exato → regex/fixture → asserção no golden
(`test:calendar` / `test:pdf`). Fontes por ordem de valor: legenda do eCrew (se o
founder a encontrar no portal — fecha o parser por fonte primária) > calendário real >
sintético > convenção. **Nenhum código novo sem exemplo real ou legenda.**

## Estado

- Sessão sintética: POR FAZER (aguarda device).
- Legenda oficial do eCrew: por obter (founder vai procurar no portal).
- Colhidos até hoje (calendário real do founder): GDO · P/T · DOWE · CBTB · WD/O ·
  SEP · CEET · RTW — todos com golden.
