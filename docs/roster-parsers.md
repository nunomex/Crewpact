# Import de escala — parsers por companhia & guarda de "companhia errada"

> Planta de design (não implementado). Companheiro de [CONSTITUICAO.md](CONSTITUICAO.md) (Q2 profundidade>largura).
> Data: 2026-07-01.

## 1. Como funciona HOJE

- **A companhia vem do PERFIL, não é detetada por-evento.** `codesFor(company)` usa a companhia que o utilizador escolheu no onboarding. Não há deteção da companhia pelo nº de voo (o que *parece* isso é só um acidente: só existem códigos easyJet, cujo regex de voo só casa com voos easyJet). Confirmado: `App.js` passa `co` (perfil) a `getDutiesInRange/getNonFlightInRange`; `RosterImportSheet` passa `company?.slug` a `parseEasyjetRoster`.
- **Calendário = campos UNIVERSAIS** (`title · location · notes · start · end` — todo o evento os tem). Só o **texto lá dentro** varia por companhia → tratado pelos regex de `rosterCodes.js`. Portável.
- **PDF = formato ESPECÍFICO da companhia.** `data/pdfRoster.js:parseEasyjetRoster` assume as colunas da easyJet (Date·Duties·Details·Report·**Actual times**…). Outra companhia = outra estrutura → precisa de parser próprio.

## 2. Planta: parsers de PDF POR companhia (dispatch)

Contrato invariante: **todo o parser devolve `{ activities, nonflights, diag }`** no formato que o `buildImportCandidates` já espera. O resto da app não sabe (nem quer saber) qual companhia foi.

```js
// data/pdfRoster.js  → passa a DESPACHANTE
import { parseEasyjet } from './pdfEasyjet';
// import { parseTap } from './pdfTap';
const PARSERS = { easyjet: parseEasyjet /* , tap: parseTap */ };

export function parseRosterPdf(text, companySlug) {
  const fn = PARSERS[String(companySlug || '').toLowerCase()];
  if (!fn) return { supported: false, activities: [], nonflights: [], diag: [] };
  return { supported: true, ...fn(text) };
}
```

- `data/pdfEasyjet.js` = o corpo atual, dono só do **formato easyJet** (usa `codesFor('easyjet')`).
- `data/pdfShared.js` = o que NÃO varia por companhia: `classifyDay` (já genérico), `groupByDate(text, dateRe)` (o regex de data é PARÂMETRO), `matchAll`, `pushFlight/pushNonFlight`, `pad/norm/mkISO/firstBareTime`.
- **Cada companhia traz o seu golden** (como o `pdf-roster.test.js` VARIANT_A/B) com uma **amostra REAL** do PDF dela. (Não se assume o formato — precisa-se do PDF real.)
- Call-site (`RosterImportSheet`): `parseEasyjetRoster(...)` → `parseRosterPdf(...)`; se `!supported` → "usa o calendário para esta companhia".

**Nota de arquiteto:** NÃO abstrair já um "parser universal". Com 1-2 companhias, parsers independentes + helpers comuns é o mais honesto (formatos divergem demais). A abstração funda só depois de 2-3 parsers reais.

## 3. Guarda de "companhia errada" — o que HÁ e o que FALTA

**Realidade HOJE (verificada):** **NÃO há deteção de companhia errada.** Nem no PDF, nem no calendário, nem no manual. A app aplica os códigos do PERFIL e o que não casa vira `other`.

- **PDF:** cola-se um PDF de outra companhia → o parser corre com os códigos do perfil → os nºs de voo/códigos dela não casam → **poucos/zero candidatos** (ou mal classificados). **Não bloqueia.** O único `Alert` ("Não consegui ler este PDF") é para PDF **ilegível** (extração falhou), NÃO para "companhia errada". No ecrã de confirmar, aparece "Sem atividades…" ou candidatos-lixo — nada impede confirmar o que apareceu.
- **Calendário:** idem — códigos do perfil sobre o calendário escolhido; eventos de outra companhia → `other`, fora dos candidatos. Não bloqueia (e não deve bloquear o calendário inteiro — pode ter eventos pessoais + de trabalho misturados).
- **Manual:** **não tem conceito de companhia** — é input livre do utilizador (escreve rota/horas). Nada a detetar/rejeitar. (O "Detetar voo" valida só o FORMATO do nº, não a companhia.)

**Proposta de guarda (a decidir):** um **aviso SUAVE por rácio de reconhecimento** (não um bloqueio duro, para não rejeitar uma escala válida com códigos invulgares):
- **PDF:** depois de parsear, se ~0 voos casaram o `flightNo` da companhia do perfil E a maioria dos dias deu `other` → avisar *"Isto não parece a escala da <companhia>. Confirma o PDF / o teu perfil."* + oferecer o 🔧 diagnóstico. Combina com o `supported:false` (companhia sem parser → nem tenta).
- **Calendário:** se o diagnóstico no intervalo mostrar reconhecidos ≈ 0 de N → o mesmo aviso suave (não bloqueio).
- **Manual:** nada a fazer (não há companhia). Opcional: no "Detetar", se a `airline` devolvida pela API ≠ companhia do perfil → nota suave.

Princípio (§1 Accuracy / §2 no-noise): **avisar e deixar o utilizador decidir**, nunca importar lixo em silêncio nem bloquear com falso-negativo.

**STATUS (2026-07-01):**
- **PDF — FEITO:** `rosterLooksForeign(diag)` (pura, em `data/pdfRoster.js`; ≥70% `other` de ≥3 dias → true) + aviso SUAVE (Alert, não bloqueia) no `RosterImportSheet` após parsear + golden (pdf-roster.test.js, 890 verdes).
- **Calendário — NÃO auto-avisa (decisão):** um calendário do telemóvel pode ter eventos pessoais / períodos de descanso → um aviso automático por rácio daria **falsos-positivos** (ruído). Fica no **🔧 diagnóstico** existente (o user corre-o para ver o que é reconhecido) + o estado vazio "Sem atividades".
- **Manual — FEITO (2026-07-01):** no "Detetar voo", quando NÃO deteta, o Alert avisa (SUAVE, não bloqueia) se o nº ≠ códigos da companhia do perfil. `flightNoForeign(fno, company)` em `data/rosterCodes.js` — **só companhias modeladas** (fallback → false, senão um user TAP levava falso-alarme nos próprios voos) — integrado no `onDetect` do `DutyFormSheet`, **só `kind:'flight'`** (posicionamento/deadhead noutra companhia é legítimo → não avisa). Golden em pdf-roster.test.js. 894 verdes.

## 4. Como suportar uma companhia nova (resumo)

1. **Calendário:** bloco `<companhia>` em `rosterCodes.js` (descoberto com o 🔧). Resolve voos **e** não-voos (a companhia já é conhecida pelo perfil).
2. **PDF:** `data/pdf<Companhia>.js` + linha no `PARSERS` + golden com amostra real.
3. **AE (salário):** só com fonte oficial → ciclo §5 (fonte + golden + validador). Pesado, de propósito.
4. **FTL:** zero mudanças se UE/EASA (universal); fora da UE = jurisdição nova (§10).
