# CrewPact — Correções pré-lançamento (auditoria dos motores FTL + AE)

> Origem: auditoria de prontidão dos motores **FTL** (EASA Reg. 83/2014 · CS-FTL.1) e
> **AE** (easyJet × SPAC/SNPVAC, BTE 40/2023) — 2026-06-23.
>
> **Enquadramento (não muda):** ambos os motores são **consultivos/de apoio**. A
> aritmética é sólida e blindada por golden tests. Lançar como **ferramenta de apoio**,
> **nunca** como autoridade legal de FTL nem processador salarial. Veredito da auditoria:
> ambos os motores **Beta** (núcleo Produção; o risco estava no *wiring* e na *atualidade*).

**Estado da suite após as correções:** FTL **171** · AE **219** · pdfRoster 35 · stats 32 ·
rosterDiff 20 · capabilities **44** · export RGPD 24 — **0 falhas** (`npm test`).

---

## ✅ FEITO (committado)

### P0.1 — AE: indexação ao IPC oficial (2,4%) em vez de placeholder
- **Era:** `IPC_2025 = null` → usava o piso de 1% (placeholder não confirmado) → inflava
  **todos** os valores de piloto ~+1% (CPT base mostrava 8 801 € vs tabela 8 714 €).
- **Agora:** `IPC_2025 = 0.024` — valor **oficial confirmado**: cláusula do **BTE 40/2023**
  (*"Incremento de IPC … média de 12 meses até novembro de 2024 … mín. 1% / máx. 5%"*)
  cruzada com o **INE** (taxa de variação média 2024 = **2,4%**). CPT base → **8 923 €**.
  `isIndexEstimated(2025)` passa a `false` → o aviso "estimativa (piso 1%)" desliga-se.
- **Ficheiros:** `ae/easyjetSpac.js` (`IPC_2025`, comentários), `scripts/ae-golden.test.js`.

### P0.2 — AE: aviso de acordo expirado (pilotos)
- **Porquê:** o AE easyJet × SPAC vigora até **31 jan 2026**; valores de 2026 são referência
  até novo acordo, sem sinal na app.
- **Agora:** `AE_VALID_FROM/UNTIL` + `isAgreementExpired()` em `ae/easyjetSpac.js`. Nota no
  **detalhe** (`components/AeCalcs.js`) e no **cartão da Home** (`screens/HomeScreen.js`:
  *"Valores de referência · AE até jan-2026"*). Cabine (SNPVAC, válido até 2027) não recebe.

### P0.3 — FTL: aviso de longo-curso (Hi Fly) — data-driven
- **Porquê:** o cálculo FTL automático assume `state:'acc'` + `inBase:true` (correto para
  curto-curso baseado). Para **longo-curso/multi-fuso/fora-base** (Hi Fly, ACMI/wet-lease)
  pode mostrar um PSV **mais generoso do que o legal**.
- **Agora:** banner na Home (só para companhias longo-curso) que avisa e remete para a
  **calculadora manual**. Deteção **data-driven**: coluna `airlines.long_haul`
  (`supabase/schema.sql` §13) lida por `isLongHaulCompany()` (`data/capabilities.js`), com
  **fallback por nome/slug** (`/hi.?fly/i`) enquanto a coluna não estiver populada.
- **Ficheiros:** `data/capabilities.js`, `screens/HomeScreen.js`, `supabase/schema.sql`,
  `scripts/capabilities.test.js`.
- **⚠️ Verificação pendente (BD):** correr na Supabase e confirmar Hi Fly = `true`:
  ```sql
  select slug, name, rule_type, long_haul from public.airlines order by long_haul desc, name;
  ```
  Se `false` → o `where` do `update` (§13) não bateu com o slug/nome → ajustar.

### P1.1 — FTL: limites de standby que estavam "mortos"
- **Era:** `awakeOver` (standby + PSV > 18 h) nunca disparava (o `computeStandby` era
  chamado sem o PSV → `fdpH=0`); o combinado de aeroporto (≤16 h) mostrava o limite mas
  **nunca verificava se era excedido**.
- **Agora:** `combinedOver` (aeroporto: standby + PSV planeado > 16 h) e `awakeOver`
  (outro: usa o PSV planeado já introduzido). Surfaced em `components/FtlCalcs.js`
  (`ftl.sbCombinedOver` em `data/i18n.js`).
- **Ficheiros:** `ftl/calculators/standbyCalculator.js`, `components/FtlCalcs.js`,
  `data/i18n.js`, `scripts/ftl-golden.test.js`.

### P1.2 — FTL: frequência de prolongamentos (máx 2 / 7 dias) deixou de estar dormente
- **Era:** `dutyToFtlDay` gravava sempre `extended: false` → o contador 205(d)(1) contava
  sempre 0 → o aviso nunca disparava.
- **Agora:** `dutyToFtlDay` **infere** o prolongamento — PSV planeado **acima do básico** mas
  **dentro do estendido**, numa banda que permite extensão. *(Heurística: da escala não se
  distingue planeado de discrição; marca-se quando cabe na extensão — direção segura.)*
- **Ficheiros:** `ftl/index.js`, `scripts/ftl-golden.test.js`.

### P1.3 — AE: bónus de performance como "ALVO", não valor garantido
- **Era:** o bónus (Art. 46 / Cl. 63) aparecia com um valor firme em € (podia ler-se como devido).
- **Agora:** sub *"ALVO · estimativa — varia"*; **pilotos** mostram também o **teto em €**
  (ex.: CPT alvo 12 200 € · **máx 24 400 €**). Cabine só tem alvo (sem teto definido).
- **Ficheiros:** `ae/easyjetSpac.js`, `ae/easyjetSnpvac.js`, `data/i18n.js`, `components/AeCalcs.js`.

### P1.4 — FTL: estado D de aclimatização → **coberto** (sem código novo)
- O risco real (longo-curso multi-fuso) já está mitigado pela **P0.3** (banner Hi Fly →
  calculadora manual) e pelo caminho **"desconhecido" (unk)** que já dá o PSV conservador.
  O fix real (deslocar o relógio para o destino) é nativo/Experimental → ver "Adiado".

---

## ⏸️ ADIADO (com razão — pós-lançamento)

| Item | Porquê adiado | O que é preciso |
|---|---|---|
| **Repouso reduzido "máx 2/ciclo" + "sem split após reduzido" (235(c)/220(c))** | A definição de "ciclo" é **ambígua na EASA** (entre repousos de recuperação) → contador feito à pressa fica **errado**. `belowFloor` (sinal principal) já está surfaced. | Contador `computeReducedRestUsage` (análogo ao de extensão) + definição de ciclo + lógica de sequência. Testar no device. |
| **Estado D de aclimatização (clock-shift p/ destino)** | Cripto/lógica nativa de aclimatização = **Experimental**; à pressa introduz erro no sentido inseguro. | `computeAcclimatisation` ligado à pipeline (fuso/elapsed) + deslocar `reportMin` para o relógio do destino. Testar no device. |
| **P2 — validação contra a fonte** | Não são bugs; são valores a confirmar com humano + blindar com golden. | Ver secção P2 abaixo. |
| **Ícone sem canal alfa** | Só relevante para **submissão à App Store** (a Apple rejeita ícones com transparência). Para testar/dev build é indiferente. | Exportar `assets/icon.png` 1024×1024 **sem alfa** antes de submeter. |
| **AE: novo acordo SPAC (pós jan-2026)** | O AE atual expirou; um novo acordo terá novas escalas. | Quando publicado no BTE: atualizar `BASE_ANNUAL`/`NOMINAL_SECTOR`/`IPC_2025` + datas de vigência. |

### P2 — validação contra a fonte (detalhe)
- **Frações de contrato** (`5/4`=0.92, `14-14`=0.51, `21-7`=0.74, `7-7`=0.71) e o **divisor
  de doença `/30`** — confirmar contra o quadro do SPAC (são pressupostos de modelação).
- **Cabine (SNPVAC):** valores golden-locked mas **sem fonte BTE citada** como os de piloto
  → acrescentar a citação; confirmar o **SMN** (`NMW_MONTHLY = 870`) para o ano corrente.
- **Golden dos ramos hoje "cegos":** split-duty com exclusão WOCL + timing; `transitionNight`
  (sequência); aclimatização **B/D/X** direta. *(O ramo da extensão já foi blindado na P1.2.)*
- **Cumulativos (210):** decidir "últimos N dias" vs "quaisquer N consecutivos"; comparar em
  **minutos inteiros** (não `toFixed(1)` h); golden para `over=true`, soma multi-dia, virada de ano.

---

## Fontes
- **AE (Acordo de Empresa easyJet × SPAC):** BTE n.º 40, 29-10-2023 — Anexo I + cláusula de
  indexação. Arquivo: `bte.gep.mtsss.gov.pt` / DGERT.
- **IPC:** INE (`ine.pt`) — taxa de variação média dos últimos 12 meses (2024 = 2,4%).
- **FTL:** Reg. (UE) 83/2014 (ORO.FTL.2xx) + CS-FTL.1 (tabelas em `data/ftl.js`, citadas à página).
- **SNPVAC (cabine):** Anexo I, nov-2025 (válido até jan-2027).
