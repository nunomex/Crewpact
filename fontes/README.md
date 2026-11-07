# Fontes oficiais

Os números e as regras dos acordos de empresa (AE) saem daqui, e de mais lado nenhum. Cada regra do motor
(`ae/tapLimits.js`) guarda a citação literal; o teste `scripts/ae-tap-limits.test.js` confirma que cada citação
existe, palavra por palavra, no texto oficial abaixo, na página indicada.

| Ficheiro | Documento | Páginas | SHA-256 do PDF |
|---|---|---|---|
| `ae-tap/tap-spac-2023.pdf` | Boletim do Trabalho e Emprego n.º 29, 8 de agosto de 2023 — AE TAP × SPAC (pilotos), revisão global | BTE 262–338 | `f8476cbd6b3f48a5f44d9d7b7fb06d7eb9d1fdb50c1e4ce9f9fcb4b90fc96511` |
| `ae-tap/tap-snpvac-2024.pdf` | Boletim do Trabalho e Emprego n.º 7, 22 de fevereiro de 2024 — AE TAP × SNPVAC (cabine), revisão global | BTE 271–352 | `941299648718bb2fb6d27c9fb679d72b9dc85935f066ddf71d6e9bb2edba05e6` |
| `ae-easyjet/easyjet-snpvac-2024.pdf` | Boletim do Trabalho e Emprego n.º 8, 29 de fevereiro de 2024 — AE easyJet × SNPVAC (cabine), revisão global (até 31/01/2027) | PDF 34 p. (a Cl. 67.ª RDP está no BTE 304–305) | `ad08ac22dab5662fbe9b9c91be2a4079473a9f763ab8bc3aaa9352ec8f2c8a6f` |
| `ae-easyjet/easyjet-spac-2023.pdf` | Boletim do Trabalho e Emprego n.º 40, 29 de outubro de 2023 — AE easyJet × SPAC (pilotos), revisão global | PDF 28 p. (Art. 63.º SNC; Anexo I n.º 12) | `646c4ab87ecb997322f1f8f340300fe41e2688ca09f828d5a845ecda7bea4e22` |
| `icao/nat-doc-007-v2026-1.pdf` | ICAO, NAT Doc 007 — North Atlantic Operations and Airspace Manual, V.2026-1 (aplicável desde 19 mar 2026), preparado pelo ICAO European and North Atlantic Office | PDF p. 1 e 5 (o `.txt` só tem estas) | `56cf34068cded8888986cef0cbc3d4178769bfb2f811062ef8a9c0f364c2b88f` |
| `ftl/reg-ue-83-2014-pt.pdf` | Regulamento (UE) n.º 83/2014 da Comissão, de 29 de janeiro de 2014 (JO L 28 de 31.1.2014) — altera o Reg. 965/2012; o Anexo III traz a subparte FTL (ORO.FTL.100–250). Versão portuguesa | 13 p. | `28738d053c40fd93c37fdd1c1a3dad341a84823a4bd586d3d084dac5918af893` |
| `ftl/reg-ue-83-2014-en.pdf` | O mesmo regulamento, versão inglesa (os termos FDP, WOCL, standby…) | 13 p. | `1663c8e0078bb30a8b3ab1540c7f092d24f7f5206cf6a165ac00b9d9c80a47c7` |
| `ftl/cs-ftl1-2014-002-R.pdf` | EASA, CS-FTL.1 Initial Issue (anexo à ED Decision 2014/002/R, 31 de janeiro de 2014) — especificações de certificação e GM | 15 p. | `e28244e5d3075bcbd4dde45ff327f683fa4beed1a8d51e27b4caa83367388202` |
| `ftl/cs-ftl1-amd1-2023-023-R.pdf` | EASA, CS-FTL.1 Issue 1 Amendment 1 (Anexo I à ED Decision 2023/023/R, 15 de dezembro de 2023) — serviços noturnos e de fim tardio. **O texto riscado (apagado) no PDF aparece como texto normal no `.txt`:** conferir na imagem da página | 7 p. | `3abea04ec07834254bcc58fe5bf63e0c1d324798d5c8d330b3385a999bc6c4c9` |

- **Os PDF** ficam só neste PC (`.gitignore`). São os ficheiros oficiais publicados no Diário da República
  (confirmado a 3 de novembro de 2026: o SHA-256 da descarga é igual ao da tabela):
  - pilotos: https://files.diariodarepublica.pt/bases_especiais/regtrab/2023/08/08/220186744.pdf
  - cabine: https://files.diariodarepublica.pt/bases_especiais/regtrab/2024/02/22/853385951.pdf

  São os mesmos endereços da Biblioteca da app (`data/library.js`). Para conferir uma cópia nova, comparar o SHA-256.
- **Os `.txt`** são o texto extraído dos PDF com `pdftotext -layout -enc UTF-8` (texto nativo, sem OCR), com uma
  marca `=====[PDF p.N | BTE p.M]=====` no início de cada página. São versionados para o teste correr em qualquer PC.
- **Tabelas.** O texto extraído desalinha algumas tabelas. As do motor foram conferidas na **imagem** da página:
  PSV de médio curso dos pilotos (Cl. 35.ª, BTE 304–305) e da cabine (Cl. 23.ª, BTE 341).
- **ICAO, NAT Doc 007** (para o "Atlântico Norte" da Cl. 39.ª, n.º 1, dos pilotos — o AE não o delimita; decisão do
  Nuno, 2026-11-03: usar a região do Atlântico Norte da ICAO). O endereço da edição de 2024 no site da ICAO
  (www.icao.int/EURNAT/) já não responde; a cópia da V.2026-1 veio de ops.group
  (https://ops.group/blog/wp-content/uploads/2026/01/NAT-Doc-007-EN-Edition-V.2026-1-Amd-0.pdf). Ao conferir com a
  ICAO, comparar o SHA-256. O `.txt` tem só a capa e a p. 5 (as áreas oceânicas do NAT HLA), em `pdftotext -layout`.

- **FTL** (descarregados a 4 de novembro de 2026): o regulamento veio do serviço de publicações da UE (Cellar),
  http://publications.europa.eu/resource/celex/32014R0083 com o cabeçalho `Accept: application/pdf;type=pdfa1a` e
  `Accept-Language: por` (ou `eng`) — a EUR-Lex recusa descargas automáticas. O CS-FTL.1 veio da EASA:
  https://www.easa.europa.eu/sites/default/files/dfu/2014-002-R-CS-FTL.1%20-%20Initial%20Issue.pdf e a alteração de 2023 de
  https://www.easa.europa.eu/en/downloads/139089/en. Os `.txt` têm a marca `=====[PDF p.N]=====` em cada página.

## Validades (`eu/`) — auditoria dos cálculos, bloco 3 (6 de novembro de 2026)

Os prazos das validades (`data/validities.js`) saem daqui. Cada prazo guarda a citação literal; o teste
`scripts/validities.test.js` confere-a no texto, na secção indicada, em português e em inglês.

| Ficheiro | Documento | Secções guardadas |
|---|---|---|
| `eu/reg-965-2012-pt.txt` · `-en.txt` | Reg. (UE) n.º 965/2012 (operações aéreas), Anexo III Parte-ORO — consolidado de 25-05-2026 (CELEX 02012R0965-20260525) | ORO.GEN.110, ORO.FC.145, ORO.FC.230, ORO.FC.231 (início), ORO.FC.A.245, ORO.CC.140 |
| `eu/reg-1178-2011-pt.txt` · `-en.txt` | Reg. (UE) n.º 1178/2011 (tripulações) — Parte-FCL, Parte-MED, Parte-CC, Parte-ARA — consolidado de 30-04-2026 (CELEX 02011R1178-20260430) | FCL.040, FCL.055, FCL.625, FCL.740, FCL.740.A (início), FCL.940, FCL.1025 a), MED.A.045, MED.C.005, CC.CCA.105, ARA.FCL.215 |
| `eu/reg-2015-1998-pt.txt` · `-en.txt` | Reg. de Execução (UE) 2015/1998 (segurança da aviação), capítulo 11 — consolidado de 01-10-2026 (CELEX 02015R1998-20261001) | 11.2.3.11 (início), 11.4.3 |
| `eu/reg-1182-71-pt.txt` · `-en.txt` | Reg. (CEE, Euratom) n.º 1182/71 (prazos, datas e termos) — JO L 124 de 8.6.1971 (CELEX 31971R1182) | Artigo 3.º |

- **Como se descarregaram:** do serviço de publicações da UE (Cellar), `http://publications.europa.eu/resource/celex/<CELEX>`
  com `Accept: application/xhtml+xml` (o 1182/71 em português só existe em `text/html`) e `Accept-Language: por` ou `eng`.
  A versão consolidada mais recente de cada regulamento saiu da consulta SPARQL do Cellar (`cdm:resource_legal_id_celex`).
- **São extratos literais:** o HTML passou a texto (um bloco por linha) e guardaram-se só as secções da tabela, sem mudar
  uma palavra; tiraram-se só as marcas de alteração da EUR-Lex. Cada secção começa por `=====[secção]=====`.
- **Aviso da EUR-Lex:** as versões consolidadas "não têm efeito jurídico"; fazem fé os textos do Jornal Oficial. Por isso
  cada citação foi conferida no **próprio ato publicado no JO** (6 de novembro de 2026): a versão consolidada marca cada bloco
  com o ato que o introduziu (▼B = o regulamento original, ▼Mn = a n-ésima alteração); descarregou-se esse ato do Cellar e
  confirmou-se a frase, palavra por palavra, em português e em inglês. **As 37 citações, nas duas línguas, estão nos atos:**

  | Secções citadas | Ato do Jornal Oficial (marca) | CELEX |
  |---|---|---|
  | ORO.FC.145 g), ORO.FC.230, ORO.FC.A.245 e) | Reg. de Execução (UE) 2021/2237, de 15 dez 2021 (M21), JO L 450 | 32021R2237 |
  | ORO.FC.231 | Reg. de Execução (UE) 2020/2036, de 9 dez 2020 (M18), JO L 416 | 32020R2036 |
  | ORO.GEN.110 j) | Reg. (UE) 2017/363, de 1 mar 2017 (M10), JO L 55 | 32017R0363 |
  | ORO.CC.140 | Reg. (UE) n.º 965/2012, original (B), JO L 296 de 25.10.2012 | 32012R0965 |
  | FCL.040, FCL.055 c), FCL.625, FCL.940 | Reg. de Execução (UE) 2019/1747, de 15 out 2019 (M11), JO L 268 | 32019R1747 |
  | FCL.055 a) | Reg. de Execução (UE) 2025/134, de 28 jan 2025 (M22) | 32025R0134 |
  | FCL.740 a) 1) | Reg. de Execução (UE) 2020/2193, de 16 dez 2020 (M14), JO L 434 | 32020R2193 |
  | ARA.FCL.215 c), CC.CCA.105 | Reg. (UE) n.º 290/2012, de 30 mar 2012 (M1), JO L 100 | 32012R0290 |
  | MED.A.045 | Reg. de Execução (UE) 2019/27, de 19 dez 2018 (M9), JO L 8 | 32019R0027 |
  | MED.C.005 | Reg. (UE) n.º 1178/2011, original (B) | 32011R1178 |
  | 11.4.3 (segurança) | Reg. de Execução (UE) 2015/1998, original (B) | 32015R1998 |
  | Art. 3.º (prazos) | Reg. (CEE, Euratom) n.º 1182/71, original | 31971R1182 |

  Nota: no ato 2021/2237, a linha "Controlos relativos ao equipamento de emergência e de segurança – 24 meses." acaba com o
  «» de fecho da alteração; o texto é o mesmo. Uma alteração posterior a um destes atos que mude estas frases apareceria na
  versão consolidada com outra marca: ao atualizar os extratos, repetir a conferência.
- **O que não está aqui:** as Instruções Técnicas da ICAO (prazo da formação em mercadorias perigosas, para onde remete a
  ORO.GEN.110 j)) não são públicas — a app pede a data do certificado.

## Lei portuguesa (`pt/`) — auditoria dos cálculos, bloco 5 (6 de novembro de 2026)

O que os acordos de empresa mandam buscar à lei geral. O teste `scripts/dinheiro.test.js` (`npm run test:dinheiro`) confere
cada frase no texto e calcula com ela.

| Ficheiro | Documento | Para quê |
|---|---|---|
| `pt/codigo-trabalho-2009.txt` | Código do Trabalho (Lei n.º 7/2009, DR 1.ª série n.º 30, 12-02-2009), arts. 249.º, 255.º, 263.º, 271.º e 296.º — redação original | a falta por doença "determina a perda de retribuição" (art. 255.º, n.º 2, a)): nos dias de baixa a base sai; a doença de mais de um mês suspende o contrato (296.º) e o Natal fica proporcional (263.º, n.º 2, c)) |
| `pt/rmmg.txt` | DL 107/2023 (2024: € 820), DL 112/2024 (2025: € 870,00), DL 139/2025 (2026: € 920,00) | a base do tripulante de cabine do 1.º ano da easyJet ("Salário mínimo nacional (SMN)", Anexo I.1) |
| `pt/ipc-2024-11.txt` | DREM, "Preços em foco — novembro de 2024" (11-12-2024), com o valor nacional do INE: 2,3 % | a indexação dos pilotos easyJet desde 1-fev-2025 (Anexo I.1/I.2) |

- São **extratos literais** (pdftotext) dos PDF oficiais; cada ficheiro diz de onde veio e o SHA-256 do PDF. Os PDF não
  se guardam no repositório.
- **O que falta:** o Código do Trabalho na versão consolidada da DRE (o art. 255.º, n.º 2, a) não mudou desde 2009, mas
  confirmar antes de publicar — pacote do advogado) e o destaque do próprio INE sobre o IPC (a página do INE não deixa
  descarregar sem navegador).

## FAQ da EASA (`easa/faq-47617.txt`) — 8 de novembro de 2026

Extrato curto (citação) da FAQ 47617, "consecutive" nas noites (CS FTL.1.205(a)(1)), com o endereço e a data. O teste
`scripts/simulation.test.js` confere que a frase citada na Simulação está na cópia. As FAQ não são vinculativas (pack E0).

## Radiação cósmica (`eu/euratom-2013-59-pt.txt`, `pt/dl-108-2018-republicado.txt`) — auditoria, bloco 7 (6 de novembro de 2026)

O teste `scripts/citacoes-tap-ftl.test.js` (corre no `npm run test:citacoes`) confere cada frase que a Prova e a Biblioteca
citam.

| Ficheiro | Documento | Para quê |
|---|---|---|
| `eu/euratom-2013-59-pt.txt` | Diretiva 2013/59/Euratom (JO L 13 de 17-01-2014), páginas L 13/13 a L 13/21 | art. 9.º, n.º 2 (limite de 20 mSv por ano), art. 35.º, n.º 3 (tripulações: 1 mSv e 6 mSv), art. 40.º |
| `pt/dl-108-2018-republicado.txt` | DL 108/2018, republicado pelo DL 81/2022 (DR 1.ª série n.º 234, 06-12-2022), arts. 67.º, 84.º, 92.º e 93.º | o nível de referência para tripulações: 10 mSv/ano (art. 92.º); a entidade empregadora mantém as doses abaixo dele (art. 93.º) |

- Extratos literais (pdftotext) com o SHA-256 do PDF no cabeçalho. A 2.ª alteração do DL (DL 139-D/2023) não toca nestes
  artigos (lista de artigos alterados conferida no próprio diploma).
