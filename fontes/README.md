# Fontes oficiais

Os números e as regras dos acordos de empresa (AE) saem daqui, e de mais lado nenhum. Cada regra do motor
(`ae/tapLimits.js`) guarda a citação literal; o teste `scripts/ae-tap-limits.test.js` confirma que cada citação
existe, palavra por palavra, no texto oficial abaixo, na página indicada.

| Ficheiro | Documento | Páginas | SHA-256 do PDF |
|---|---|---|---|
| `ae-tap/tap-spac-2023.pdf` | Boletim do Trabalho e Emprego n.º 29, 8 de agosto de 2023 — AE TAP × SPAC (pilotos), revisão global | BTE 262–338 | `f8476cbd6b3f48a5f44d9d7b7fb06d7eb9d1fdb50c1e4ce9f9fcb4b90fc96511` |
| `ae-tap/tap-snpvac-2024.pdf` | Boletim do Trabalho e Emprego n.º 7, 22 de fevereiro de 2024 — AE TAP × SNPVAC (cabine), revisão global | BTE 271–352 | `941299648718bb2fb6d27c9fb679d72b9dc85935f066ddf71d6e9bb2edba05e6` |

- **Os PDF** ficam só neste PC (`.gitignore`). São os ficheiros oficiais publicados no Diário da República
  (confirmado a 3 de novembro de 2026: o SHA-256 da descarga é igual ao da tabela):
  - pilotos: https://files.diariodarepublica.pt/bases_especiais/regtrab/2023/08/08/220186744.pdf
  - cabine: https://files.diariodarepublica.pt/bases_especiais/regtrab/2024/02/22/853385951.pdf

  São os mesmos endereços da Biblioteca da app (`data/library.js`). Para conferir uma cópia nova, comparar o SHA-256.
- **Os `.txt`** são o texto extraído dos PDF com `pdftotext -layout -enc UTF-8` (texto nativo, sem OCR), com uma
  marca `=====[PDF p.N | BTE p.M]=====` no início de cada página. São versionados para o teste correr em qualquer PC.
- **Tabelas.** O texto extraído desalinha algumas tabelas. As do motor foram conferidas na **imagem** da página:
  PSV de médio curso dos pilotos (Cl. 35.ª, BTE 304–305) e da cabine (Cl. 23.ª, BTE 341).
