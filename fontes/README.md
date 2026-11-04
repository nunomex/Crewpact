# Fontes oficiais

Os números e as regras dos acordos de empresa (AE) saem daqui, e de mais lado nenhum. Cada regra do motor
(`ae/tapLimits.js`) guarda a citação literal; o teste `scripts/ae-tap-limits.test.js` confirma que cada citação
existe, palavra por palavra, no texto oficial abaixo, na página indicada.

| Ficheiro | Documento | Páginas | SHA-256 do PDF |
|---|---|---|---|
| `ae-tap/tap-spac-2023.pdf` | Boletim do Trabalho e Emprego n.º 29, 8 de agosto de 2023 — AE TAP × SPAC (pilotos), revisão global | BTE 262–338 | `f8476cbd6b3f48a5f44d9d7b7fb06d7eb9d1fdb50c1e4ce9f9fcb4b90fc96511` |
| `ae-tap/tap-snpvac-2024.pdf` | Boletim do Trabalho e Emprego n.º 7, 22 de fevereiro de 2024 — AE TAP × SNPVAC (cabine), revisão global | BTE 271–352 | `941299648718bb2fb6d27c9fb679d72b9dc85935f066ddf71d6e9bb2edba05e6` |
| `ae-easyjet/easyjet-snpvac-2024.pdf` | Boletim do Trabalho e Emprego n.º 8, 29 de fevereiro de 2024 — AE easyJet × SNPVAC (cabine), revisão global (até 31/01/2027) | PDF 34 p. (a Cl. 67.ª RDP está no BTE 304–305) | `ad08ac22dab5662fbe9b9c91be2a4079473a9f763ab8bc3aaa9352ec8f2c8a6f` |
| `icao/nat-doc-007-v2026-1.pdf` | ICAO, NAT Doc 007 — North Atlantic Operations and Airspace Manual, V.2026-1 (aplicável desde 19 mar 2026), preparado pelo ICAO European and North Atlantic Office | PDF p. 1 e 5 (o `.txt` só tem estas) | `56cf34068cded8888986cef0cbc3d4178769bfb2f811062ef8a9c0f364c2b88f` |

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
