# Auditoria do motor FTL — findings

Comparação do motor (`ftl/`, `data/ftl.js`) com os PDFs **Reg. (UE) 83/2014** (ORO.FTL)
e **CS-FTL.1** (Initial Issue 2014 + Amendment 1, ED Decision 2023/023/R).

**Estado geral:** o núcleo está **conforme**. Todas as tabelas e limiares "duros" batem
exatamente com os PDFs — verificado por `npm run test:ftl` (69 asserções golden).
Os itens abaixo são as **únicas** divergências/lacunas, nenhuma no cálculo das tabelas.

> O motor **não foi alterado** nesta auditoria. Este documento é a lista de trabalho.

---

## ✅ Confirmado conforme (sem ação)
Quadros 2/3/4 (PSV base), tabela de extensão, repouso a bordo (cabina), repouso por
fusos, repouso reduzido (pisos 12h/10h), standby (4/6/8/16h · 25%/100% · 18h),
discrição (+2h/+3h · piso 10h), delayed reporting (<4h/≥4h/≥10h), split duty
(≥3h · +50% · exclusão >6h/WOCL), limites cumulativos (60/110/190 · 100/900/1000),
WOCL (02:00–05:59), serviço noturno (02:00–04:59), 4 setores em noturno
(CS FTL.1.205(a)(1) — **citação correta**, ao contrário do que a 1.ª auditoria suspeitou).

---

## ✅ Issue 1 — Repouso pelo período de serviço (RESOLVIDO)
**Era:** [ftl/index.js](../ftl/index.js) `computeDuty` baseava o repouso no PSV
(`prevDutyMin: fdp.actualFdpMin`). ORO.FTL.235(a/b) exige repouso ≥ **período de serviço**
(PSV + serviço pós-voo, por ORO.FTL.210(c) + 105(11)).
**Correção:** `computeDuty` aceita `postFlightMin` e calcula `dutyPeriodMin = PSV + pós-voo`;
o repouso (235) usa o período de serviço. Default `postFlightMin = 0` mantém o
comportamento anterior quando o pós-voo não é fornecido.
**UI:** `DutyCalc` ([components/FtlCalcs.js](../components/FtlCalcs.js)) ganhou o campo
"Serviço pós-voo (min)"; o repouso mostrado já reflete o período de serviço.
**Golden:** 4 casos novos (`Duty …`) em `scripts/ftl-golden.test.js`.

## ✅ Issue 2 — Acumulado de serviço inclui o período de serviço (RESOLVIDO p/ serviços de voo)
**Era:** ao registar uma duty, gravava-se em `dayLog.servico` só as horas de PSV.
ORO.FTL.210(a) conta **todo** o serviço.
**Correção:** o registo de uma duty grava agora o **período de serviço** (PSV + pós-voo)
em `servico` — `DutyCalc` passou a usar `dutyPeriodMin` na carga `limits.servico` e em
`rest.prev`. A fórmula `computeDutyTime` já estava correta.
**Standby/posicionamento (RESOLVIDO):** o `StandbyCalc` ganhou botão **Registar** que
grava o serviço (100% aeroporto / 25% outro, `computeStandby().dutyCountMin`) em
`dayLog.servico`; e há uma nova **calculadora de Posicionamento** (ORO.FTL.215) que
regista 100% como serviço. Ambos via o pipeline `kind:'limits'` existente (com diálogo
de confirmação). Assim o acumulado 210(a) cobre PSV+pós-voo, standby e posicionamento.

## 🟡 Issue 3 — Refinamentos não modelados (menores / lado seguro)
1. **Standby (b)(9)** — standby iniciado **23:00–07:00**: o tempo nessa janela não conta
   para a redução do PSV até haver contacto. Não modelado → redução pode ficar **mais
   severa** que o regulamento (lado seguro). Ref. CS FTL.1.225(b)(9).
2. **Split duty (b)** — a pausa exclui **30 min** de pré/pós-voo+deslocação antes de contar
   para a extensão. O código conta a pausa inteira → pode **sobrestimar** ligeiramente.
   Ref. CS FTL.1.220(b).
3. **205(a)(1) "consecutivos"** — o teto de 4 setores é aplicado a *qualquer* serviço
   noturno, não só a noturnos **consecutivos** → ligeiramente conservador (lado seguro).
4. **235(a) horários disruptivos** (noite→manhã = 1 noite local; ≥4 disruptivos → recovery
   seguinte 60h) e **235(b)(3)(ii)** (fora da base, ≥4h fuso → repouso ≥ serviço anterior
   ou 14h) — não modelados (exigem lógica de sequência de escala).
5. **205(c)(6)** — repouso no destino ≥14h: `INFLIGHT_DEST_REST_FLOOR_MIN` (840 min)
   está **declarada mas não consumida** por nenhum cálculo.
6. **200(b)** mudança de base (72h/3 noites) e **235(d)** "2 dias locais 2×/mês" — referência,
   não calculados (consistente com o âmbito declarado em [ftl/index.js](../ftl/index.js)).
7. ~~Registo de standby/posicionamento no acumulado (210a)~~ — **RESOLVIDO** (ver Issue 2):
   `StandbyCalc` regista o serviço; nova `PositioningCalc` (ORO.FTL.215) regista 100%.

---

## Testes golden
`scripts/ftl-golden.test.js` fixa os valores das tabelas/limiares contra os PDFs.
Correr antes de qualquer alteração ao motor:

```
npm run test:ftl
```

Ao corrigir um issue, **adicionar primeiro o caso golden** (estado atual vs esperado)
para travar a regressão.
