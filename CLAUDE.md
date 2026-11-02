# CrewPact — CLAUDE.md do projeto

## O que é
Aplicação de telemóvel para tripulantes de voo em Portugal (pilotos e cabine; easyJet, TAP, Ryanair,
Hi Fly). Lê a escala do calendário do telemóvel e, **no próprio dispositivo**, calcula limites de
fadiga (FTL — Reg. UE 83/2014 · CS-FTL.1) e a remuneração prevista pelos acordos de empresa (AE).
É **consultiva**: estima, nunca declara legalidade nem processa salários. Sem AI: tudo determinístico.

- **Cliente:** o próprio Nuno (produto próprio, sem cliente externo). Decide tudo.
- **Ramo:** aplicação de **telemóvel** (iOS primeiro; Android não montado neste PC).
- **Caminho:** Expo (React Native) SDK 57 · Supabase (contas, sync, Edge Functions) · GitHub.
- **Teste:** Expo Go no iPhone do Nuno. Dev build (EAS) **adiado para o fim** — lista em `docs/dev-build.md`.
- **Idioma:** português de Portugal, na app e nas respostas.

## Onde está cada coisa
- `screens/` 20 ecrãs · `components/` · `data/` motores puros e acesso a dados · `ftl/` motor FTL ·
  `ae/` acordos de empresa (easyJet SPAC/SNPVAC, TAP) · `supabase/` schema, SQL, Edge Functions ·
  `legal/` termos e privacidade (HTML) · `design/` mockups HTML (mandam à letra) · `scripts/` testes golden.
- **Lei interna:** `docs/CONSTITUICAO.md` (Q1–Q5 trancadas, contrato AI §6, Carta de Design §11).
- **Canon visual:** `docs/design-system.md` + `docs/motion-design-system.md` + `docs/living-interface.md`.
- **Decisões e pendências:** `docs/decisoes.md` — ler PRIMEIRO em cada sessão nova.
- **Guiões de verificação no device:** `docs/verificacao-device.md` · `docs/verificacao-calendario.md`.

## Regras do projeto (resumo; detalhe na Constituição)
1. **Golden-first.** Nenhum número FTL/AE muda sem o teste golden mudar antes. `npm test` corre 24 suites;
   o `pre-push` bloqueia se falhar.
2. **Citar a lei.** Onde é lei, o artigo; onde é convenção, dizê-lo e escolher o conservador.
3. **Dinheiro sem arredondar.** Todo o € mostra cêntimos.
4. **Calendário é a fonte.** Criar serviços à mão morreu; editar é só corrigir importados.
5. **Mockups à letra.** Ler `design/*.html` antes de tocar num ecrã. Papel permanente: designer sénior
   da Apple — "a Apple lançava isto?".
6. **Dados de teste só.** Nunca dados reais de tripulantes durante a construção. RGPD: sem ficheiros,
   fotos nem saúde; dose de radiação nunca guardada.
7. **Worklets fica em 0.10** (SDK 57); Expo Go não suporta Face ID (cai no código do telemóvel).
8. **Deploy de Edge Functions só por CLI.**

## Frases-gatilho do Nuno
- **"testar os estados"** → sessão guiada no device dos estados da Living Interface (`docs/verificacao-device.md`).
- **"testar o calendário"** → pipeline da escala com eventos sintéticos (`docs/verificacao-calendario.md`).
- **"vamos às leis"** → retomar `legal/*.html` (placeholders, e-mails, regiões, publicar).
- **"vamos ao advogado"** → pack jurídico completo.

## Modelo e esforço
Segue a tabela do método global. Verificação de uma mudança: Opus 5.5 Alto. Verificação completa: UltraCode.
Fable 5.1 só para arquitetura ou bug que o Opus em Max não resolveu.
