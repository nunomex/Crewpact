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
