# Crewpact — Plano de Errata v0.2

> Companheiro da [Constituição](CONSTITUICAO.md) (§3 Risco · §9 Portões). **O que fazer quando se descobre que um cálculo esteve ERRADO em produção.**
> *(v0.2 — endurecido por revisão adversarial de 3 lentes. A v0.1 prometia capacidades que a arquitetura não tem; esta versão é honesta sobre o que falta.)*

O cenário mais provável e mais perigoso não é um bug futuro — é uma regra **já modelada** estar errada, e utilizadores terem tomado decisões legais com ela.

---

## §E0 · Princípio

Um número errado pode ter levado alguém a **reportar-se (ou não) para um voo**. A errata é (1) **avisar quem pode ter sido afetado** para reavaliar, (2) **corrigir o histórico** sem o reescrever em silêncio, (3) **provar** que corrigimos. Mas a errata **reforça, não substitui**, a escala e os limites oficiais da companhia (§3): a verdade operacional e relacional (a tripulação inteira do voo, a escala) vive na companhia, não no telemóvel.

---

## §E1 · A realidade dos dados (corrige a v0.1) e a escolha que fazemos

**Há PII no servidor.** As `duties` estão no Supabase por `user_id` ligado a uma conta com email — em teoria, conseguir-se-ia identificar afetados por query. A v0.1 dizia "não temos lista de afetados"; **era falso**.

**A escolha deliberada:** mesmo podendo, **não** processamos centralmente os dados de toda a gente para caçar afetados. A errata é **LOCAL**: a app re-avalia **no dispositivo** os serviços guardados desse utilizador. É a opção **menos invasiva**, escolhida — não uma incapacidade.

**Regras RGPD (a pré-declarar na política de privacidade):**
- Base legal para a re-avaliação retroativa de um P0 = **consentimento** do utilizador (ver §E3.4): re-avaliar o passado para descobrir *"voaste ilegal"* gera um **juízo de (i)legalidade laboral** sobre a pessoa que ela não pediu — e pode **ativar o dever dela de auto-reportar** ao operador. Logo: a re-avaliação retroativa de P0 é **opt-in**, nunca silenciosa.
- A marca de errata por-serviço (§E3.5) é **estritamente LOCAL** — **nunca sincroniza** para o `roster_meta` no servidor (senão criávamos no servidor um registo de "utilizador X teve cálculo de legalidade errado") e **não dispara** o pontinho azul do diff 3-vias.
- Fronteira errata-vs-violação (RGPD art. 33/34, se algum dia houver dados de saúde/incidente) tem **dono** declarado (§E3.0).

---

## §E2 · Gravidade (escala com §3)

| Nível | O quê | Resposta |
|---|---|---|
| **P0a · Segurança/Legal (falso-legal)** | disse **legal** e era **ILEGAL** (deixou voar fora da lei) | Urgente · entrega rápida (§E6) · aviso forte · log |
| **P0b · Legal (falso-ilegal)** | disse **ILEGAL** e era **legal** → pode ter custado uma **recusa de voo** (disciplina, salário) | Urgente · aviso que **reconhece o custo** · log |
| **P1 · Legal menor** | descanso/limite errado sem cruzar o limite legal | Próximo release · aviso normal · log |
| **P2 · Dinheiro (AE)** | per-diem/salário errado — **é direito retributivo** (não "brando") | Correção · antes→depois **ao cêntimo** (money-no-rounding), respeita a linha do tempo de categoria (`crewAt`) · log |
| **P3 · Cosmético** | arredondamento, etiqueta | Correção · log |

**Fator transversal — IDADE do erro:** quanto mais tempo a regra esteve viva, mais decisões afetou (o caso fundador da Constituição foi um AE caducado **há meses**). Um P0 vivo há 6 meses sobe de esforço e de alcance retroativo.

---

## §E3 · O caminho (playbook)

**§E3.0 · Donos e relógio.** O **founder (humano Nível A, §5) DECLARA a gravidade e FECHA a errata.** A **AI prepara mas NUNCA classifica nem fecha um P0 sozinha** (decorre da §6 — a AI já inventou factos; e um bug pode ter **nascido** de código da AI, pelo que o golden "correto" tem de ser derivado **independentemente da fonte legal primária** por verificação humana, não da interpretação da AI). SLA por gravidade (a fixar): P0 — congelar+golden em ≤ horas, build/OTA submetido em ≤ horas, e o que se mostra **no entretanto**.

1. **Deteta** — golden a posteriori, relato de utilizador, re-leitura regulatória, ou o 2.º validador (§5).
2. **Classifica** (P0a/P0b/P1/P2/P3) e **congela com um golden** que fixa o valor **correto** — derivado da **fonte oficial primária** (EUR-Lex/EASA/BTE), não da AI.
3. **Distingue a origem** *(eixo crítico)*:
   - **Bug nosso** → corrige o passado (o cálculo sempre esteve errado).
   - **Mudança de lei/AE** → **NÃO reescreve o passado** (o serviço era legal à luz da lei vigente então); aplica-se por **vigência de datas** (como o `test:vigencia` já faz para os AE). Reescrever retroativamente *criaria* ilegalidades que não existiram.
4. **Corrige** o motor/dados (passa a §8) e **avisa**:
   - **Modo fino** (só quando os pré-requisitos §E6 existirem): re-avalia on-device e marca *"foste afetado"* com antes→depois.
   - **Modo degradado** (hoje): só pode dizer *"PODE ter-te afetado entre [datas] — confirma com a fonte oficial/o operador"*, **nunca** *"foste afetado"*.
   - **Janela crítica:** para serviços **futuros** afetados, **notificação local agendada** priorizada pela proximidade do próximo report (não esperar que o utilizador reabra a app).
   - P0 retroativo = **opt-in** (§E1).
5. **Corrige o histórico** *(requer §E6)* — modo **force/invalidate** do `reconcileDayLog` disparado por *bump* de `ENGINE_VERSION`: apaga e re-deriva os dias afetados (o atual é **fill-only** e não recalcula nada), **preservando** o número antigo em `errata:{before, fixedAt}` (LOCAL, §E1). **Não sobrepõe** edições manuais do utilizador, **não ressuscita** dias apagados/cancelados, deixa *conflicts* em aberto.
6. **Regista** no **Log de Errata** (§E4).
7. **Previne** — o golden fica para sempre + um **golden do próprio mecanismo de errata** (§E6).

---

## §E4 · Log de Errata (transparência = confiança)

Registo **visível ao utilizador** (in-app · *"Histórico de correções"*) e no repo (`docs/ERRATA-LOG.md`): `{ data, regra/fonte oficial, o que mudou, gravidade, validado_por }`.
**Limite:** `validado_por` no log **público** não pode **expor** uma pessoa identificável (o founder/contribuidor e o seu vínculo a uma companhia) — usar papel/credencial, não nome.
É o equivalente FTL ao changelog do Flighty: **provar que somos honestos quando erramos constrói mais confiança do que fingir que nunca erramos** (§1, §5).

---

## §E6 · Pré-requisitos BLOQUEANTES *(sem isto, só há modo degradado §E3.4)*

A revisão provou que a errata fina depende de capacidades que **não existem**. Estas sobem de "dívida §7" a **bloqueadores da errata fina**:

1. **Versão de motor/regra** — `ENGINE_VERSION` global + `ruleId`/`valid_de`/`valid_até` por **regra FTL** (espelhar o `AE_VALID_UNTIL` dos AE), **carimbada** em cada entrada do `dayLog` e no `roster_meta`. Sem isto a deteção é por intervalo-de-datas+tipo, que **erra nos dois sentidos** (alarma em massa quem não foi afetado **e** falha o caso-limite real — `augmented`/`delayed`/`split-duty` vivem em `duty.special`, invisíveis ao *matching*).
2. **Verdict-snapshot** — persistir `{valor, engineVer, ruleId, ts}` no momento de cada veredicto crítico (*estou legal?* / PSV / limite). Sem ele, o antes→depois é impossível.
3. **Recompute a sério** — o modo force/invalidate do `reconcileDayLog` (§E3.5).
4. **Canal de entrega rápido** — **EAS Update (OTA)** para erratas só-JS (a maioria das FTL/AE); a loja fica para mudanças nativas. Hoje: **zero OTA** → P0 espera dias.
5. **Golden do mecanismo + drill** — teste que prova, dado motor v1(bug)→v2(fix) sobre *fixtures*, que o `dayLog` é recalculado, os afetados certos são marcados, os não-afetados ficam intactos e o antes→depois é auditável; mais um **ensaio periódico** ponta-a-ponta.

---

## §E7 · Modo degradado honesto *(o que conseguimos HOJE)*

Enquanto a §E6 não existe, a errata é **broadcast + degradada**, nunca individual-precisa:
- **Nunca** dizer *"foste afetado"* — só *"PODE ter-te afetado, confirma com a fonte/operador"*.
- **Canais não-PII** (obrigatórios para P0): texto *"What's New"* na loja em linguagem de tripulação · entrada pública no `docs/ERRATA-LOG.md` · aviso no site/redes.
- **Banner in-app** *"a tua versão tem uma correção de segurança pendente — atualiza"* (deteta versão mínima segura).

---

## §E8 · Registo ORO.FTL.245 já exportado/assinado

Se um valor errado já saiu no PDF legal que o tripulante **assina e entrega** ao operador/autoridade (`data/ftlRecord.js`: *"Declaro que os registos refletem com exatidão…"*), está num **artefacto legal fora da app** — o pior caso de responsabilidade.
- Carimbar cada PDF com `engineVer` + hash + período coberto.
- Registar **localmente** que períodos foram exportados.
- No aviso de errata, instruir explicitamente: *"reemite o registo que entregaste ao operador."*

---

## §E9 · Rollback e errata-da-errata

O caminho não é só de avanço:
- **Rollback** se a correção **regrediu** outro caso-limite (provável, dada a interdependência 205/210/220/225/235).
- **Retirar** um aviso de errata emitido **por engano** — um alarme falso em massa é, ele próprio, um **P0**.
- Correções sucessivas no mesmo serviço sem destruir a confiança (não mostrar 3 "corrigido a X" no mesmo dia sem explicação).

---

## §E10 · Limites (o que a errata NÃO alcança)

- **Relacional:** um voo que a app deu como legal afetou a tripulação inteira, a companhia, standby de colegas. A errata só toca o **registo pessoal in-app** — reforça, não substitui, a escala/limites oficiais (§3).
- **Conflito de interesse da AI:** a AI é parte do mecanismo **e** fonte possível de erros → o golden de um P0 vem da fonte legal primária + verificação humana, nunca só da AI (§E3.0).
- **Quem não atualiza** fica fora do modo fino → daí os canais broadcast (§E7) e o banner de "atualiza".

---

*v0.2 — endurecido. Conclusão estrutural: **a errata fina é uma capacidade a CONSTRUIR (§E6), não um documento a ratificar.** O versionamento (§7) é o seu pré-requisito — e por isso sobe no roadmap.*
