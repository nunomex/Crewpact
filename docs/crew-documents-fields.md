# Documentos de tripulação — formatos oficiais & campos (inventário)

> Pesquisa nas fontes OFICIAIS (EASA Easy Access Rules / EUR-Lex Reg. (UE) 1178/2011, IATA DGR, ICAO Doc 9303) para desenhar o **formulário manual** de "Validades & Documentos" (a introdução é MANUAL; ver [[validades-documentos]]).
> Data: 2026-07-01. Regra de leitura: **validade** = data que expira e retira privilégios (o que a app alarma) · **importante** = condiciona COMO se opera · **identidade/ruído** = identifica mas não caduca.

## 1. Certificado médico (Part-MED) — piloto (Classe 1) · cabine (medical report)
- **VALIDADE:** data de expiração. **Classe 1** = 12 meses (**6 meses ≥60 anos**). **Cabine** (MED.C.005) = intervalo máx. **60 meses** (não tem "classe"; chama-se *cabin crew medical report*).
- **IMPORTANTE — limitações (códigos de 3 letras):** condicionam legalmente o serviço; ignorá-las = voo ilegal mesmo com médico "válido".
  - `VDL` óculos p/ longe **+ par sobresselente** · `VML` multifocais + sobresselente · `VNL` óculos p/ perto disponíveis
  - `OML` (Classe 1) só multipiloto / com copiloto qualificado · `OCL` só como copiloto · `OSL` só com safety pilot (Cl.2)
  - `HAL` só com aparelho auditivo · `TML` **encurta a validade** (afeta a data) · `SIC`/`RXO` exames extra
  - Cabine tem códigos próprios: `MCL` (só tripulação múltipla), `OOL`, `CVL`, + `TML/CCL/HAL/SSL/OAL/SIC`.
- Identidade/ruído: nome, data nasc. (decide 12/6m), nº do certificado, nacionalidade, local.
- **Remete** para a licença/atestado — são caducidades **distintas** do mesmo tripulante.

## 2. Licença de piloto (Part-FCL) — **a licença NÃO expira**
Ponto-chave: a licença é "para sempre"; o que caduca são **VÁRIAS validades dentro dela** (secção XII/XIII):
- **Type rating** (A320/B737…) — **12 meses**, cada linha com a sua data (revalida por LPC/OPC no sim).
- **IR** (instrument rating) — **12 meses** (validade própria, mesmo quando revalida junto do type).
- **Proficiência linguística** (Inglês ICAO, secção XIII) — **nível 4 = 4 anos · nível 5 = 6 anos · nível 6 = sem prazo** (FCL.055).
- Class ratings (SEP 24m / MEP 12m) e certificados de instrutor/examinador — só para quem os tem.
- **Remete** para o certificado médico (documento à parte).
- → Um piloto tem **múltiplas datas em simultâneo**. Identidade/ruído: nº da licença (PRT.FCL.xxxxx), Estado, nome, selo.

## 3. Atestado de tripulante de cabine (CCA, Part-CC / EU Form 142) — **NÃO expira**
- O documento tem **duração ILIMITADA** (CC.CCA.105/110). A "Date of issue" **NÃO é validade** — tratá-la como tal seria erro. Só cai por suspensão/revogação ou **60 meses sem operar**.
- O que caduca em cabine são as **validades OPERACIONAIS** (registo de formação do operador, não o CCA):
  - **Recorrente anual + check** (ORO.CC.140) — **12 meses** (elementos trienais 36m).
  - **Qualificação de tipo / conversão** (ORO.CC.125) + differences (ORO.CC.130).
  - **Recência** (ORO.CC.145) — **>6 meses** sem operar → refresher + check por tipo.
  - + aptidão médica de cabine (ponto 1).

## 4. Recorrentes / checks — validade + como são registados
| Item | Validade | Notas | Quem |
|---|---|---|---|
| **OPC** | **6 meses (rolling)** | 2/ano ≥3m separados; o relógio mais curto | piloto |
| **LPC / type rating** | **12 meses** | LPC nos últimos 3m → conta da expiração (rolling) | piloto |
| **Line check** | 12 meses | anual (≠ OPC semestral) | piloto |
| **SEP** (equip. emergência) | **12 meses** | práticos pesados em ciclo de 3 anos | **universal** |
| **CRM** | ciclo **3 anos** | cobertura, não uma data única | universal |
| **DG** (IATA DGR / func. 7.9) | **24 meses** | rolling nos últimos 3m | universal |
| **ASEC** (segurança) | varia (máx 5 anos) | 2015/1998 Cap.11; **confirmar no OM** — muitas vezes anual | universal |
| **First Aid** | 12 meses | **sem certificado próprio** → segue o recorrente anual | ~cabine |

**Regra de registo (eCrew):** guarda-se a **DATA FEITA**; a validade é **derivada** (meses de calendário, até ao **fim do mês**). Itens *rolling* (OPC/LPC/DG feitos nos últimos 3 meses) encadeiam a partir da **expiração anterior**, não da data feita → não penaliza quem faz cedo.

## 5. Passaporte (ICAO Doc 9303, TD3)
- **VALIDADE:** data de expiração (tipicamente **10 anos** adulto / 5 menor; muitos países exigem **3–6 meses residuais** para entrada).
- **MRZ** (2 linhas de 44 caracteres, **posições fixas** + dígitos de controlo 7-3-1) → **parseável de forma fiável por OCR**: nº, validade (YYMMDD), nacionalidade, data nasc., nome. Se um dia houver foto→OCR, o passaporte é o mais fácil e fiável.
- Importante: nº do passaporte, nacionalidade (≠ Estado emissor).

## Síntese para o modelo de dados
- Item de validade = **`tipo` + `data(s) que expiram` + `"importante"` (opcional)**.
- **Uma data:** passaporte, médico. **Várias datas:** licença (type ratings + IR + LP) e cabine (recorrente + tipo + recência) → o modelo tem de suportar **sub-itens com datas próprias**, não uma só.
- O **"importante" por tipo:** médico → limitações; licença → ratings + nível LP; passaporte → nº + nacionalidade.
- **Crew-aware:** médico (Classe 1 vs report), OPC/LPC/type/line = **só piloto**; SEP/CRM/DG/ASEC/First Aid = **universais**.
- **Cautelas:** ASEC varia por operador/Estado; First Aid não é cert. autónomo; janelas *rolling* exatas confirmar no OM do operador (pode ser mais conservador que a lei).

## Fontes (oficiais)
- EASA Easy Access Rules for Aircrew (Reg. (UE) 1178/2011) — Part-MED (Anexo IV), Part-FCL (Anexo I, FCL.055), Part-ARA (Anexo VI, formato da licença), Part-CC (Anexo V), Part-ORO (ORO.CC.140/145, ORO.FC.230).
- EUR-Lex — Reg. (UE) 1178/2011 · Reg. (UE) 2015/1998 (Cap. 11, segurança).
- IATA — Dangerous Goods Training Guidance (CBTA) / DGR for Cabin Crew (func. 7.9).
- ICAO — Doc 9303 Part 4 (Machine Readable Passports, TD3).
- ENAC — tabela de códigos de limitação médica EASA (significado verbatim).
