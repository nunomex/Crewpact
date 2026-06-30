# Crewpact — Constituição v0.1

> A lei interna da Crewpact. Documento **vivo**: curto de prosa, denso de regras verificáveis.
> Proposto para ratificação · 2026-06-29 · Co-redigido com o parceiro AI (ver §6).
> **Quando o código e este documento divergem, um dos dois está errado — reconciliar é obrigatório.**

---

## §0 · Estado Real vs Visão  *(atualizar a cada release)*

Retrato honesto a **2026-06-29** (sem isto, a visão dirige o esforço para o sítio errado):

- **Companhias:** easyJet (profunda) + TAP (modelada). Tudo o resto: por modelar.
- **Plataforma:** telemóvel, portrait. iPad / Watch / Widgets = **não-agora** (§7).
- **Código:** `App.js` God-component (~996 linhas, sem camada de dados); TypeScript **configurado mas não adotado**; `roster_meta` JSON **sem versão**.
- **Testes:** **866** asserções golden, verdes (FTL 234 · AE 330 · restantes 302), corridas automaticamente por um hook **pre-push** (§9).
- **Dívida a pagar a seguir:** camada de dados fora do `App.js` + `roster_meta` versionado (§7) — o gate que desbloqueia as plataformas. *(AE easyJet caducado: **resolvido** — reconhecido + portão `test:vigencia`.)*

---

## §1 · Para quem, e a UMA coisa

- A Crewpact existe **só** para **pilotos e tripulantes de cabine**. Não é para toda a aviação.
- A **UMA coisa** que temos de fazer melhor que todos: **responder, de relance e com confiança, "posso/devo reportar-me para o próximo serviço?" — e deixar o utilizador *auditar* esse número até à lei.** Exatidão **+** auditabilidade. Tudo o resto é secundário a isto.

---

## §2 · Princípios  *(ordem lexicográfica — quando colidem, o de cima ganha; a Exatidão nunca cede)*

1. **Exatidão primeiro.** Teste: *consigo citar a fonte oficial e está em vigência?* Não → `Needs Validation`, não se entrega. Inegociável — mesmo contra simplicidade ou prazo.
2. **Confiança antes de funcionalidades.** Teste: *isto aumenta a confiança do utilizador, ou só a contagem de features?*
3. **Menos carga mental** — do utilizador **e** do founder. Teste: *esta mudança remove/esconde pelo menos um elemento, ou justifico por escrito porque adiciona?*
4. **Profundidade antes de largura.** Teste: *isto aprofunda o que já fazemos bem, ou espalha-nos mais fino?*

---

## §3 · Carta de Risco e Responsabilidade

- A Crewpact é uma ferramenta **consultiva**. Prevalece **sempre** a escala e os limites oficiais da companhia/autoridade. Isto é **princípio**, não rodapé.
- Os cálculos têm **gravidade**: estar perto de um limite legal de FDP **≠** €2 de per-diem. A app trata-os de forma diferente — a gravidade alta avisa mais e cede menos à simplificação.
- **Plano de errata** *(compromisso, a escrever — §9):* quando se descobre que um cálculo esteve errado em produção, há um caminho escrito — identificar o que mudou, sinalizar aos afetados dentro do possível-RGPD, corrigir o histórico.

---

## §4 · A linha vermelha do grátis

- **Todo o cálculo FTL legal é gratuito para sempre e inegociável.** A segurança nunca se tranca atrás de pagamento.
- **Premium** = conveniências: estimativa de salário/AE, radar de validades, voo ao vivo, widgets, insights. Nunca o *"estou legal?"*.
- Esta linha fixa-se **agora**, antes de haver dinheiro em jogo — para a pressão de receita não a poder mover depois.

---

## §5 · Contrato de Exatidão  *(como a verdade entra na app)*

**Proveniência é dado de 1.ª classe.** Cada regra FTL/AE carrega: `{ fonte, artigo, válido_de, válido_até, estado, validado_por, data }`.

**Lei vs convenção:** onde é lei, cita-se o artigo; onde é convenção, **diz-se que é**, e escolhe-se a interpretação **conservadora**.

**3 níveis de confiança — a app é honesta sobre cada um:**

| Nível | Quem valida | O que a app diz |
|---|---|---|
| **A · Validado** | Fonte oficial **+ humano qualificado** (founder na easyJet; contribuidor da companhia noutras) | *"validado"* |
| **B · De fonte oficial, por rever** | A **AI** pesquisou a fonte primária oficial e transcreveu com citação; falta a revisão humana da transcrição | *"de fonte oficial · sem validador da companhia"* |
| **C · Por modelar** | — (sabe-se que há AE, ainda não modelado) | só FTL + *"acordo por modelar"* |

**Auditabilidade** (o que **realmente** constrói confiança): cada número mostrado é auditável pelo utilizador até à fonte/artigo. É isto — não os testes que ele não vê — que torna *"a app em que mais confiam"* alcançável.

---

## §6 · Contrato do Parceiro AI

O parceiro AI (Claude) governa-se por regras **duras** — porque já se provou que, sem elas, inventa (inflacionou contagens de testes no próprio documento que devia proteger):

1. **Nenhum número entra sem o comando que o produz colado ao lado.** Factos vêm de execução, não de memória.
2. **Cita a fonte ou marca `Needs Validation`.** Nunca afirma domínio não-verificado.
3. **Declara incerteza** explicitamente.
4. **Objeta** explicitamente em qualquer mudança que toque FTL / AE / dados / dinheiro / lei. Não concorda por defeito.
5. Quando pesquisa, **só fontes primárias oficiais** (BTE, Diário da República, EUR-Lex, CLA oficial). **Nunca** blogs, fóruns ou resumos como autoridade.
6. **A AI descobre; humanos + fontes primárias validam.** A pesquisa da AI produz um candidato **Nível B**, nunca um facto validado.
7. O árbitro é **os golden + o comando executado** — não a opinião do modelo.

---

## §7 · Decisões estruturais trancadas

- **Client-authoritative** *(Q1)*. O cálculo vive no dispositivo; os dados de escala **nunca saem do telemóvel**. **Sem backend de cálculo.** Watch/Widgets leem via dados partilhados (App Groups), não via servidor.
- **Profundidade nas companhias** *(Q2)*. Nenhuma companhia nova sem: **(a)** fonte AE pública oficial, **(b)** golden obrigatório, **(c)** caminho de validação (§5), **(d)** estado honesto até validada. *"Todas as de PT"* foi substituído por *"as que conseguimos validar"*.
- **Dívida antes de plataformas** *(Q3)*. **Gate: nenhuma 2.ª superfície de plataforma antes de a camada de dados sair do `App.js` e o `roster_meta` ser versionado.** Depois: **iPad + Widgets** antes de **Watch / Live Activities**.

**Dívida técnica conhecida e aceite** *(nomeá-la é a única forma de o "longo prazo" deixar de ser slogan):*

| Dívida | Gatilho de pagamento |
|---|---|
| `App.js` God-component (~996 linhas, sem camada de dados) | Antes da 2.ª superfície de plataforma |
| `roster_meta` JSON sem versão | Antes da 2.ª companhia **ou** de qualquer migração de formato |
| TypeScript configurado mas não adotado | Adoção progressiva, a começar pelos **caminhos de dinheiro (AE)** |

> **Versionamento = keystone** *(ratificado 2026-06-29)*: `ENGINE_VERSION` + *dating* das fontes FTL + *verdict-snapshot* desbloqueiam **errata fina ([§E6](ERRATA.md)) + plataformas + governação regulatória FTL** de uma só vez. **Feito:** `ENGINE_VERSION` carimba o `dayLog`; `ftl/sources.js` (Reg 83/2014 + CS-FTL.1) com o `test:vigencia`. A **CS-FTL.1 Amd 1 (Dez-2023, *night duties*)** foi pesquisada (§5, *Explanatory Note* lida na fonte) e **✅ confirmada (Nível A): não mudou limites duros — só *guidance* FRM; o motor está atual.** **Falta:** *verdict-snapshot*, recompute *force/invalidate*.

---

## §8 · Definição de Feito  *(binária — uma máquina ou uma regra dura arbitra)*

Uma mudança só está **"feita"** quando:

- [ ] `npm test` **100% verde** (866 golden);
- [ ] caminho-crítico FTL/AE novo **coberto por golden**;
- [ ] se tocou em lei/AE → **fonte citada e em vigência** (§5);
- [ ] `MEMORY.md` **tocada** no mesmo trabalho (o *porquê*, não só o *quê*);
- [ ] **não cresceu** o God-component (ou abriu-se ticket de dívida §7).

*"Performance boa / UX consistente"* deixam de ser portões subjetivos: ou viram número medido, ou saem da definição.

---

## §9 · Portões executáveis e cadência

- ✅ **`test:vigencia`** — fica **vermelho** quando uma fonte (lei/AE) passa o `válido_até` sem reconhecimento, e **avisa** se um reconhecimento não for reverificado há > 6 meses. Corre no `npm test`. *(FEITO 2026-06-29 — o AE easyJet caducado foi o caso fundador.)*
- ✅ **Hook `pre-push`** (`.githooks/pre-push`, auto-ativado pelo `prepare` do npm via `core.hooksPath` — sem dependências) corre todo o `npm test` antes de cada push; falha → push abortado. *(FEITO 2026-06-29.)* **Honestidade (corrigido):** é **default-on local**, mas **contornável** (`git push --no-verify`) e **não corre em CI/noutras máquinas** — a imposição **a sério** seria **CI** (ainda não existe; decisão adiada). O hook é **aviso antecipado**, não imposição.
- 📄 **Plano de errata** — v0.2 escrito ([docs/ERRATA.md](ERRATA.md)), endurecido por revisão adversarial. **Conclusão estrutural: a errata FINA é uma capacidade a CONSTRUIR (§E6), gated em versionamento — não um documento a ratificar.** O modo degradado honesto (avisar "PODE ter-te afetado") funciona já.
- **WIP = 1.** Uma frente de cada vez; terminar antes de abrir outra.
- **Rigor calibrado ao risco:** *fast-path* (faz e mostra) para o trivial/reversível; *ciclo completo* (compreender → criticar → fonte → golden → aprovação) só para lei / dinheiro / dados / segurança.

---

## §10 · Não-objetivos  *(o que a Crewpact recusa ser)*

- Não é rede social de tripulação. Não é chat. Não é marketplace de trocas de voo. **Não usa AI generativa dentro da app** (respostas são determinísticas e factuais).
- **Não** suporta "todas as companhias" — só as que valida.
- **Não** modela jurisdições fora da UE. *"FTL universal"* significa **uma lei para piloto+cabine, igual em todas as companhias — dentro da UE (EASA)**; **não** "global". Uma companhia não-UE (ex.: FAA/EUA) é **jurisdição nova**, modelada e validada via §5 (como qualquer companhia no Q2) — quando vier.
- **Não** vai multi-plataforma antes da fundação (§7).

*(Sem esta lista, "simplicidade" é decorativa.)*

---

## §11 · Como medimos  *(v0.1 — a afinar)*

- **Métrica-norte candidata:** % de escalas importadas e **confirmadas sem correção manual** (proxy direto de *"a app acerta"*).
- **Guard-rails:** golden 100% verde · crash-free · taxa de `Needs Validation` por resolver **a descer**.
- Sem métrica, um solo+AI otimiza para **movimento** (commits) em vez de **valor**. Fecha-se numa próxima iteração.

---

*v0.1 — ponto de partida, não tábua de pedra. O CrewOS completa-se com mais duas camadas finas a seguir: o **Registo de Decisões (ADR leve)** e os **Portões executáveis** (§9). Próxima revisão: ao resolver o AE caducado — o primeiro teste real de §5 e §9.*
