# CrewPact — Decisões e pendências

Ficheiro vivo. Cada sessão acaba a atualizá-lo (regra 3 do método). As entradas mais recentes em cima.
A história anterior a novembro de 2026 vive na memória do Claude e nos docs de `docs/`; aqui fica o
ponto de situação consolidado a partir de 2 de novembro de 2026.

---

## Sessão seguinte (dia 2) — a escala entra na configuração (ANTES da linha do tempo e da TAP, decisão do Nuno)

**Nuno (captura do Início vazio):** "falta esta parte da configuração". Ligar a escala acontecia depois das 6
perguntas, no Início, com o desenho antigo, e o rótulo "PRIVACID…" aparecia cortado.
- **Corrigido já:** a coluna do rótulo do Início tinha largura fixa de 70; passou a mínima.

**Esboço do 7.º passo:** `design/configuracao-escala.html` (https://claude.ai/artifact/PpoqP1hQTBuh24VWHwiVgk).
- O passo: título, 3 passos numerados e a linha do escudo; "Ligar ao calendário", "Importar o PDF" e "Agora não".
- A autorização do iPhone: proposta de frase nova, que fala dos limites e do salário.
- Escolher o calendário: a dica do eCrew vem ANTES; o calendário com serviços fica "sugerido".
- A escala encontrada: o número grande, a divisão por tipo e os voos sem rota; "Guardar a escala" e "Rever um a um".

Nada se grava sem confirmar. **APROVADO (Nuno):** os 4 ecrãs e o "sugerido".

**FEITO no código:**
- **`OnboardingScreen` tem a fase "escala" depois das perguntas, na mesma Porta:**
  - "Liga a tua escala" → autorização → escolher o calendário, com o sugerido contado → a escala encontrada →
    "Guardar a escala";
  - o perfil grava-se no fim das perguntas e só se entra na app no fim do passo 7 (ou com "Agora não");
  - "Guardar a escala" grava só o NOVO e PRONTO, mais férias e doença;
  - voos por corrigir, conflitos e cancelados ficam para "Rever um a um", que é a folha de sempre;
  - em "mudar de companhia" com calendário ligado, o passo salta-se.
- **Motor partilhado, sem cópias:**
  - `data/rosterRead.js`: janela, leitura e contagem;
  - `candidateKind` em `data/rosterImport.js`, golden +6;
  - a `RosterImportSheet` passou a usar os dois.
- **Correções de verdade:**
  - o esboço dizia que voos sem rota "entram e contam para os limites" — FALSO: ficam de fora até corrigir, e
    assim fica;
  - a frase do iPhone e a folha da Escala diziam "Nada sai do telemóvel", mas a escala sincroniza com a conta
    (tabela `duties`). Agora: "lê a tua escala… para calcular os limites e o salário" e "Lido no telemóvel".

**Verificado no PC:** testes (FTL golden 313) · pacote iOS · guardião; a configuração continua a zero.
**Mais 3 frases falsas corrigidas** (pergunta do Nuno):
- no Início sem escala, duas vezes, "Os teus dados ficam no teu telemóvel" → "O calendário é lido no teu telemóvel";
  a explicação passa a dizer que a escala fica na tua conta;
- na folha do PDF, "Nada sai do dispositivo" → "o ficheiro nunca sai do dispositivo".

"Guardado só no teu telemóvel" nos hotéis é VERDADE (só armazenamento local) e fica. A declaração à Apple foi para
`docs/dev-build.md`. **Regra:** nunca prometer "nada sai do telemóvel"; o que é verdade é que o calendário é LIDO no
telemóvel e os cálculos são feitos lá.
**Falta:** iPhone (guião §0f, com calendário de teste sintético).

---

## PRÓXIMA SESSÃO (Nuno: "amanhã, junto com a TAP") — ler isto primeiro

**1. Linha do tempo do contrato (effective-dating da companhia e da base) — proposta, por aprovar.**
- **Problema:** só a categoria e o contrato têm linha do tempo (`crewHistory`, `crewAt(ym)`, 7 sítios). A companhia e a
  base valem o valor de hoje para todos os meses. Mudar de companhia faz os meses antigos serem calculados com o AE
  novo, e uma transferência de base mexe nas ajudas de custo, na Auditoria e no "fora da base" dos meses antigos. As
  pernoitas já gravadas por serviço estão a salvo.
- **Proposta:**
  - cada período de `crewHistory` passa a ter também `company`, `crewType` e `base` (os antigos herdam os atuais);
  - `aeAt(ym)` e `baseAt(ym)`; ~12 ficheiros que calculam dinheiro passam de `ae` para "o AE do mês".
- **Ecrãs:**
  - "Mudar de companhia" pergunta primeiro "Mudaste ou é correção?". Mudei = período novo a partir da data de entrada
    na nova companhia; correção = substitui tudo.
  - A base ganha "a partir de que mês?", com "sempre foi esta".
- **Golden-first:**
  - maio/2025 easyJet + maio/2026 TAP → o AE certo em cada mês;
  - transferência LIS→OPO em março não mexe em fevereiro.
- **Decisões do Nuno:** (1) o modelo; (2) a pergunta mudança/correção e a base com mês.

**2. Limites de escala do AE da TAP** — `docs/ae-tap-limites.md`: 69 regras de pilotos e 61 de cabine; as 12 decisões
D1–D12 estão resumidas no chat de 2026-11-03, com as minhas recomendações. Construir por cima da linha do tempo (os
limites dependem da companhia de cada mês).

**Ordem proposta:** linha do tempo (golden) → TAP v1 (as ~23 regras com os dados que já temos). Modelo: é arquitetura
de dados — o método pede Fable 5.1 Alto para arquitetura, ou Opus 5.5 Extra se for tratado como construção; dizer ao
Nuno ao abrir a sessão.

**Por ver no iPhone (de 2026-11-03):** §0c configuração · §0d hora-limite de calços e palavras · §0e Perfil e Família.

---

## 2026-11-03 — Perfil (índice em grupos) + limites de escala do AE da TAP (levantamento)

**Perfil — escolhida a opção 1 (Nuno): índice em grupos.**
- Identidade em cima.
- Grupos de linhas, cada uma com o valor atual: O teu trabalho · Acordo e serviço · Família · Ferramentas · Conta e
  segurança · Terminar sessão.
- Cada linha abre uma página à Flighty: título, explicação e os cartões da configuração, ou uma escolha rápida.
- Os diálogos "Segurança" e "Idioma & avisos" passam a linhas à vista.

Referências em `referencias/perfil/` e no Mobbin. **Esboço:** `design/perfil-v3.html`
(https://claude.ai/artifact/BrG9V5yDBHXccp8gyiYZxL).
**APROVADO (Nuno):** o índice, as 2 páginas-modelo e "Mudar de companhia" (reabre a configuração).

**FEITO no código:**
- **`SettingsScreen` = índice:**
  - `Linha`: ícone · rótulo · valor · ›;
  - saíram os mosaicos, as linhas com interruptores e os diálogos de categoria, contrato, base, data, "Segurança" e
    "Idioma & avisos";
  - ficaram as janelas de conta, que funcionam: e-mail, palavra-passe, apagar, terminar sessão e família.
- **`PerfilPaginaScreen` (rota `PerfilPagina`, 13 páginas):**
  - categoria e contrato: cartões + mês da promoção + Guardar;
  - antiguidade: roda + Guardar (o título deixou de dizer "na easyJet" a toda a gente);
  - base com pesquisa;
  - pós-voo em escolha rápida, com a fonte à vista;
  - férias com contador;
  - frota, PPY, instrutor, vínculo, abrangido, idioma, lembretes e bloqueio em cartões que gravam.
- **`hooks/usePerfilActions`:** as gravações de sempre, partilhadas.
- **`components/OptCard`:** o cartão da configuração, agora partilhado.
- **`components/Pagina`.**
- **`MonthYearWheel`:** `monthsAhead` (uma promoção pode estar marcada até 12 meses à frente).
- **Mudar de companhia:**
  - a configuração em modo mudança, com "Cancelar" no canto;
  - as respostas juntam-se ao perfil;
  - sem boas-vindas repetidas;
  - histórico de categoria NOVO — sem isto, o histórico da companhia antiga continuava a mandar.

**Verificado no PC:** testes · pacote iOS · guardião: dívida 284→278 tipo, 590→569 espaço, 105→100 cores; páginas,
hook e componentes a zero; o Perfil desceu (espaço 49→28).
**Fase 2 FEITA (Nuno, mesmo dia): página da Família** (`screens/FamiliaScreen`, rota `Familia`):
- uma pessoa por linha, com a última partilha;
- "Adicionar pessoa" no fundo;
- aviso no dia de voo;
- as janelas (partilhar um voo, registo, remover) e o cartão de envio vieram do Perfil com a lógica intacta;
- "Partilhar um voo" passou a ser o botão principal da app;
- no Perfil fica a linha "Chegada ao vivo", com o número de pessoas.

O Perfil passou de 1068 para 499 linhas. Dívida 278→275 tipo, 569→552 espaço, 100→96 cores; Família a zero.
**Falta:** iPhone (guião §0e). **A seguir (Nuno):** datas da companhia (effective-dating); TAP amanhã.
**Limitação conhecida (para depois):** a companhia não é effective-dated — ao mudar de companhia, os meses antigos
passam a ser calculados com o AE da companhia nova.

**Limites de escala do AE da TAP — levantamento FEITO:** `docs/ae-tap-limites.md`.
- 69 regras de pilotos e 61 de cabine, cada uma com a cláusula, a citação, o valor, a comparação com a EASA e um caso
  para teste golden. Quase tudo está no RUPT.
- Conferido por mim no texto oficial: pilotos 111 folgas/ano e 90/270/850 h de voo; cabine 13 h de repouso na base e
  285/900 h.
- O AE é mais restritivo que a EASA em quase tudo, mas mais permissivo em algumas tabelas de PSV (longo curso), por
  isso o motor tem de aplicar o mais apertado dos dois.
- O texto oficial tem gralhas e contradições (D5). Os dois AE vigoram até 31/12/2026.
- 12 pontos de decisão, D1–D12, no fim do documento.

**Próximo:** o Nuno decide os D1–D12 (resumo no chat). A construção (golden-first) fica para uma sessão própria.

---

## 2026-11-03 — Análise da concorrência (cálculos e apresentação)

**Análise em `docs/concorrencia-calculos.md`**, com fontes.

**Concorrentes diretos em Portugal, os dois só para a TAP:**
- **Roster Mate:** FTL + limites do AE da TAP + ajudas de custo; marca "legal/aviso/ilegal"; 5,99 €/mês.
- **FTLmate:** FTL + TAP-SPAC 2023, sem salário.

O SPAC e o SNPVAC não têm calculadora. Nenhuma app tem o AE da easyJet, da Ryanair ou da Hi Fly.

**Estamos à frente em:**
- 4 AE com a cláusula de cada número;
- tabelas datadas e tempo parcial;
- Auditoria do mês;
- 100/900/1000 h e horários disruptivos;
- escala automática e atrasos ao vivo.

**Lacunas, por prioridade:**
1. hora-limite de calços ("aterrar até às");
2. as palavras "Legal / Não legal / Ilegal" (Simulação, chip do Início), incoerentes com "a app estima, nunca declara
   legalidade";
3. aviso na Prova de que o esquema aprovado da companhia prevalece;
4. limites de escala do AE, começando pela TAP;
5. líquido estimado;
6. comparar com o recibo (v1.1).

**Decidido (Nuno): os pontos 1, 2 e 3 primeiro — FEITOS no mesmo dia:**
1. **Hora-limite de calços** = apresentação + PSV máximo efetivo, na mesma hora de relógio da apresentação, com "+1"
   se passa da meia-noite. A discrição não entra (é para imprevistos, 205 f).
   - **Golden-first:** 5 asserções novas no `ftl-golden` (06:00 → 19:00 · 18:00 → 05:00 +1 · sem apresentação →
     sem hora), escritas e a falhar antes do motor.
   - `computeDuty` devolve `latestOnBlock*`; `dutyToFtlDay` guarda-a no dia.
   - Aparece no detalhe do serviço ("Calços até às"), no chip do Início ("Calços até · 19:00"), na resposta
     "Dentro dos limites?" e na Simulação.
2. **Sem "legal/ilegal" como veredicto:**
   - "Estou legal?" → "Dentro dos limites?";
   - chip "Legal/Ilegal" → "Calços até" / "Limites · Dentro/Excede";
   - chip "Limite" → "Margem";
   - Simulação "Legal/Não legal" → "Dentro/Excede";
   - boas-vindas "A legalidade, calculada" → "Os limites, calculados";
   - mensagens do motor "Ilegal — acima…" → "Excede…";
   - formulário (discrição) e Validades reescritos.

   Ficam os termos da lei ("mínimo legal", "registo legal", "limite legal" da radiação, "base legal").
3. **Prova:** as provas FTL universais (PSV, repouso, limites, standby) mostram "O esquema da tua companhia prevalece"
   (OM-A, cap. 7). A radiação e as provas do AE não. Testado no `prova.test` (+6 asserções).

Verificado no PC: `npm test` verde · pacote iOS gera · guardião sem dívida nova. **Falta:** iPhone (guião §0d).
**Commit `1033b8a`.** **Próximo da lista:** limites de escala do AE (TAP primeiro). Em curso: um agente extrai as
cláusulas dos 2 AE da TAP (SPAC 2023, SNPVAC 2024); cada cláusula é conferida no texto oficial antes de entrar.

**Boas-vindas na Porta (Nuno, captura do iPhone):**
- O ecrã de boas-vindas ainda tinha o desenho antigo:
  - a marca ficava por baixo do relógio;
  - título em maiúsculas de 40 e botão feito à mão;
  - números 01–04 a amarelo sobre papel (1,7:1);
  - "ao CrewPact" e "Per-diems".
- Passou para a `Porta`, com o mesmo conteúdo aprovado:
  - "Bem-vindo, <nome>";
  - 4 linhas com ícones da casa;
  - `PrimaryButton` "Começar";
  - fade pelo driver JS.
- Dívida a zero no ficheiro. A captura mostrava também o texto antigo ("A legalidade, calculada"): o iPhone tinha um
  pacote antigo, por isso é preciso fazer Reload no Expo Go antes de testar.

---

## 2026-11-03 — Configuração (onboarding) na Porta

**Escolhida a opção 3 (Nuno): "toca e avança".** Cartões de opção com círculo vazio; tocar mostra o visto amarelo e, um
instante depois, passa à pergunta seguinte. Só a antiguidade tem botão ("Entrar").
**Detalhes recomendados:**
- progresso "Configuração · 2 de 6" + barra amarela na faixa de tinta;
- "Sair" no canto da faixa;
- títulos Barlow 30 sem maiúsculas;
- base com pesquisa e nomes em português (hoje "Lisbon");
- sem bandeiras emoji;
- antiguidade numa roda de mês e ano, feita por nós (a do iOS não tem "só mês e ano").

Referências em `referencias/onboarding/` e na coleção do Mobbin.
**Esboço:** `design/onboarding-v2.html` (https://claude.ai/artifact/9UAXxoN7JcW6cciqgxEk6D).
**Achado RGPD:** perguntar "és sócio de um sindicato?" = recolher filiação sindical (art. 9.º, dado sensível). Como a
licença serve sócios e não-sócios, a edição pode vir do tipo de tripulante (piloto → SPAC · cabine → SNPVAC), sem
pergunta. **Para o advogado** ("vamos ao advogado").
**APROVADO (Nuno).** SPAC = pilotos · SNPVAC = cabine (confirmado; o código já os separa assim: `easyjetSpac`/`tapSpac`
· `easyjetSnpvac`/`tapSnpvac`). Sindicato fora da configuração: a edição sairá do tipo de tripulante.

**FEITO no código:**
- **`OnboardingScreen` sobre a `Porta`:**
  - toca e avança (280 ms para se ver o visto);
  - cartões com círculo vazio;
  - ‹ com a escolha marcada;
  - na última pergunta, tocar grava e entra;
  - mudar de companhia limpa categoria, contrato, frota e base.
- **`Porta`:**
  - `progress` mostra "Configuração · 2 de 6" + barra amarela;
  - `stepKey` volta a folha ao topo a cada pergunta.
- **`components/MonthYearWheel.js`:**
  - mês e ano, nunca no futuro;
  - o valor só nasce quando a pessoa mexe;
  - o VoiceOver ajusta-a deslizando para cima e para baixo.
- **`baseCityName` em `data/countries.js`:** 26 cidades das bases em português.
- Contratos sem o código repetido no nome; bandeiras emoji fora.
- Gravação do perfil igual (caminho auditado).

**Verificado no PC:** `npm test` verde · pacote iOS gera · dívida 300→289 tipo, 610→598 espaço; configuração, roda e
Porta a zero.
**Falta:** iPhone (guião §0c, precisa de uma conta nova).

---

## 2026-11-02 — Layout do sistema de entrada (Mobbin + Flighty)

**Commit `6f068dc`** (login por código + prova de posse + DS 2.0 + Início + papéis da cor), antes de mexer no layout.
**Problemas medidos (6 ecrãs: Login, Conta criada, Face ID, Bloqueio, Reativar, OTP):**
- 3 formas de botão e 3 estilos de título;
- o alinhamento salta entre centro e esquerda;
- voltar é um link no meio do ecrã e o botão principal fica a meio (os dois contra o §10);
- a marca repete-se em cada passo;
- ícones dentro dos campos;
- 21 tamanhos de letra e 47 espaços fora da escala;
- o código não entra sozinho;
- o bloqueio só aceita a palavra-passe (não serve contas só-código).

**Flighty:** não tem login. Padrões tirados: e-mail em letra grande, linha do escudo, botão apagado até o e-mail estar certo.
**Escolhida a A (Nuno), passos limpos:** ‹ à esquerda, título Barlow 30 à esquerda, botão largo no fundo, código entra
sozinho, "Abrir o Mail". Referências em `referencias/login/` e na coleção do Mobbin.
**Nuno pediu também ver A+B.** A B "céu à Flighty" bate na recusa de julho (céu a ecrã inteiro no Início: mata o
tinta e amarelo, contraste variável, decoração). Por isso a A+B do esboço usa a **placa de tinta** + folha de papel.
**Esboço:** `design/login-v4.html` (https://claude.ai/artifact/5QoSNGwZf8WHWrhmaaxXgx).
**DECIDIDO (Nuno, "avança"): A+B + código entra sozinho.** Regra: a placa só existe **antes da app** (ecrã com
barra de abas nunca leva placa); dentro da folha manda o esqueleto da A, que é o da app toda (§10).

**FEITO no código:**
- **`components/Porta.js`:** placa `half`/`tall`/`band` + folha + ‹ + `footer`. A placa encolhe com o teclado (sem
  animar com os movimentos reduzidos) e a barra de estado fica branca. Exporta `portaTxt` (título, texto, rótulo,
  erro, ligação).
- **Login (7 vistas):**
  - na Porta;
  - e-mail grande + linha do escudo + Continuar apagado até o e-mail estar certo;
  - os 2 códigos entram sozinhos (código errado: abana e limpa);
  - "Abrir o Mail" (iOS);
  - rótulos por cima dos campos, sem ícones;
  - o "esqueci-me" leva o e-mail já escrito.
- **Bloqueio:** placa alta, "Sair da conta" no canto. A saída aceita palavra-passe OU código (`ProofField` +
  `proveOwnership`); antes não servia contas só-código.
- **Face ID:** símbolo a amarelo na placa, "Ligar o Face ID".
- **Reativar:** selo com a data, "Manter a minha conta".
- **Conta criada:** ícone da casa.
- **Botões:** `PrimaryButton` e `GhostButton` ganharam `glyph` (ícones da casa).
- **`OTPInput`:** caixas a toda a largura, 56 de altura (vale também no Perfil).
- **Texto corrigido:** "código de 8 dígitos" → 6.

**Verificado no PC:**
- `npm test` verde;
- pacote iOS gera;
- dívida de design 320→300 tipo, 652→610 espaço, Ionicons 14→10; os 6 ecrãs da entrada a zero (o login guarda só os
  logótipos Google/Apple).

**Falta:** iPhone (guião §0b) · onboarding na mesma Porta (próximo).
**1.º teste no iPhone (Nuno, captura):** ao passar do e-mail para o código, a folha ficava branca e depois o conteúdo
aparecia 28 pt à direita, com as caixas a sair do ecrã. Causa: a `LayoutAnimation` da placa, na arquitetura nova do
iOS, repunha o valor inicial da transição nativa entre passos (28 pt e transparente). Correção: a placa anima pelo
`Animated` (JS), e a transição do login e o véu do bloqueio passaram ao driver JS. O abanar do login passou a respeitar
os movimentos reduzidos. Testes ✓ · pacote iOS ✓. **Regra:** nunca `LayoutAnimation` num ecrã com animações nativas
de transparência ou posição. **Confirmado no iPhone (Nuno): corrigido ✓.**
**Commit `cc4fce2`.** **iPhone (Nuno) ✓:** a placa encolhe e cresce com o teclado · o código entra sozinho · "Abrir o
Mail" · bloqueio com "palavra-passe ou um código". **Próximo: onboarding na Porta** (referências do Mobbin primeiro).

---

## 2026-11-02 — Passo 2 das edições (papéis da cor) + revisão do login

**Ícones: em pausa** (decisão do Nuno). Ficam no quadro `design/icone-direcoes.html` (preferência: Amanhecer; o gosto dele
pende para o plano nas cores da app). Retomar depois das conversas com os sindicatos.

**Passo 2 FEITO — a cor de marca tem PAPÉIS (`BRAND` em `data/constants.js`):** `signal` (50 usos) · `onDark` (28) ·
`marker` (11) · `action` (1, fundo do botão principal). Na base todos valem o amarelo de hoje (e `action` a tinta) →
nada visível mudou. Incluídos os 3 PDFs (careerRecord · disruption · ftlRecord) e o catálogo da Biblioteca. Valores de
referência das edições SNPVAC/SPAC comentados ao lado. Guardião: **regra dura** — `PELE.yellow`/`#FFB800` fora do
`constants.js` falha (screens · components · data · hooks); `amareloTexto` 7 → 5 (moeda do Perfil e avatar passaram a
`onDark`, legítimos). Verificado: `npm test` verde · pacote iOS gera · imports todos presentes · regra provada.

**Revisão do login (análise; nada mudado):** bem feito — autofill completo (porta-chaves, palavra-passe forte, código do
Mail), código de 6 dígitos com cooldown, política NIST, sessão no SecureStore + PKCE, re-auth, apagar conta com graça.
Falta/desatualizado: Apple e Google desenhados mas DESLIGADOS com "brevemente" (controlos mortos no 1.º ecrã) · sem
passkeys (Supabase em beta desde 28/05/2026; `react-native-passkeys` exige dev build) · sem Associated Domains
(`webcredentials:crewpact.app` — passkeys, palavras-passe ligadas ao site, links universais) · login e criar conta
separados (as melhores apps: um campo de e-mail + Continuar) · proteção de palavras-passe vazadas (dashboard, plano pago).
**Decidido (Nuno "sim avança"):** avança a parte do Expo Go. FEITO: os botões Apple/Google "brevemente" deixaram de
aparecer (`SOCIAL_ENABLED` continua a ser o interruptor para o dev build). ESBOÇO publicado `design/login-v3.html`: um
campo de e-mail + Continuar → código de 6 dígitos para entrar E criar conta (sem dizer se o e-mail existe — evita
descobrir quem usa a app) · conta nova pede nome/apelido e segue para as 6 perguntas · palavra-passe como alternativa.
**APROVADO pelo Nuno, código primeiro — FEITO no código:** `data/auth.js` ganhou `requestEmailCode` · `verifyEmailCode`
(tipo 'email', com recurso a 'signup' para contas novas com confirmação) · `saveName`; saíram `register` · `verifySignupCode`
· `resendSignup`. `LoginScreen` abre na vista 'entry' (e-mail → CONTINUAR) → 'emailCode' (6 dígitos, reenviar aos 60 s) →
conta nova → 'name' → "Conta criada" → onboarding; o login com palavra-passe ficou como alternativa ('login'), e os
links de "criar conta" passaram a "entrar com um código". Termos aceites na entrada. Mensagem nova "aguarda um minuto".
Modelo `supabase/email-magic-link.html`. Verificado no PC: testes · pacote iOS · sintaxe · imports.
**Falta (Nuno):** colar o modelo "Magic Link" no dashboard · confirmar limites de envio (Supabase + Resend) · testar no
iPhone (`docs/verificacao-device.md` §0). **Pendência nova:** os 4 modelos de e-mail ainda têm o cabeçalho azul do tema
antigo — passá-los à pele de uma vez.
**Resolvido na mesma sessão — prova de posse por código:** apagar conta, mudar e-mail e mudar palavra-passe exigiam a
palavra-passe atual → contas criadas só por código ficavam SEM conseguir apagar a conta (a Apple exige-o dentro da app).
Novo `components/ProofField.js` (palavra-passe OU "Não tens palavra-passe? Confirmar com um código") + `proveOwnership`
em `data/auth.js`, nos 3 diálogos do Perfil. Contas só com código CRIAM a palavra-passe no "Mudar palavra-passe".
Verificado no PC: testes · pacote iOS · sintaxe · imports · guardião.
**Limites da Supabase vistos (captura do Nuno, 2026-11-02):** e-mails 30/h (projeto todo) · intervalo por pessoa 60 s
(= cooldown da app) · verificações 30/5 min por IP · entradas 30/5 min por IP · refresh 150/5 min. Campos editáveis →
SMTP próprio (Resend) ligado. Público: confirmação de e-mail LIGADA, registos permitidos. **Antes do lançamento:**
e-mails/h para centenas · entradas por IP acima de 30/5 min (salas e Wi-Fi partilhados) · Resend pago (o grátis pára
aos 100/dia). **Modelo "Magic Link" colado no dashboard pelo Nuno (2026-11-02).** Falta só o teste no iPhone (guião §0).
**1.º teste no iPhone:** o código não aparecia sugerido por cima do teclado e o toque longo nas caixas não dava "Colar".
Causas: (1) o campo invisível do `OTPInput` tinha `opacity: 0` → o iOS ignora toques em vistas com alpha < 0.01 (o
toque longo nunca chegava) — agora o campo é opaco e o TEXTO é transparente, com altura explícita; (2) teclado
`numeric` (decimal) → `number-pad`; (3) o assunto sugerido do "Magic Link" não tinha "código"/"code" — o iPhone
reconhece o e-mail por aí. Modelos "Magic Link" e "Confirm signup" ganharam o código também numa frase. **Nuno:**
voltar a colar os 2 modelos + pôr o assunto "O teu código CrewPact: {{ .Token }} · Your CrewPact code".
**Confirmado no iPhone (Nuno):** conta existente + código escrito à mão → ENTRA ✓ (o `verifyEmailCode` funciona). Por
confirmar depois da correção: sugestão "Do Mail" e "Colar"; conta nova; apagar conta só-código.
**2.º teste no iPhone — 2 erros meus, corrigidos:** (1) ecrã vermelho "setDelPw doesn't exist" ao tocar em Apagar conta —
restou uma chamada antiga (a procura não apanhou o D maiúsculo); (2) "Palavra-passe é obrigatória" no Mudar
palavra-passe em modo código — era a palavra-passe NOVA em falta; os exemplos "••••••••" pareciam já preenchidos. Agora:
exemplos com texto ("nova palavra-passe" · "repete a nova" · "a tua palavra-passe atual") e mensagens que dizem o que falta.
O código foi aceite (as 6 caixas encheram). **Guardião ganhou regra dura:** nenhum nome usado sem estar definido (apanha
exatamente este tipo de ecrã vermelho, que o pacote não apanha).
**Confirmado no iPhone (Nuno):** sugestão "Do Mail" e "Colar" no código funcionam ✓. Falta: conta nova · apagar
conta só-código · mudar palavra-passe por código (depois das correções).
**LOGIN FECHADO no iPhone (Nuno, 2026-11-02):** conta nova (e-mail → código → nome → "Conta criada" → 6 perguntas →
Face ID → Início) ✓ · mudar palavra-passe por código ✓ · apagar conta só-código ✓ (sem ecrã vermelho). Ficam para a
verificação completa (§0 do guião, não bloqueiam): reenviar aos 60 s · código errado · entrar com palavra-passe ·
mudar e-mail por código. **Próximo: onboarding** (depois o tema por edição e a app toda, ecrã a ecrã).
**SMTP visto (captura, 2026-11-02):** ligado · `noreply@crewpact.app` "CrewPact" · smtp.resend.com:465 · user `resend` ✓.
DNS: DKIM do Resend ✓ · SPF em send.crewpact.app ✓ · DMARC `p=none` (apertar depois do lançamento) · MX de crewpact.app =
encaminhamento Cloudflare (dá para criar suporte@/privacidade@ sem caixas pagas). **Para as leis:** o Resend envia da
região **eu-west-1 (Irlanda, UE)** — preenche o placeholder da região do subcontratante na Política de Privacidade.

---

## 2026-11-02 — DECISÃO: uma app, licenciada ao SPAC e ao SNPVAC

**Decidido pelo Nuno:** a app fica dele e **licencia-se** (não se vende) aos dois sindicatos — uma só app, edição por
sindicato (pilotos = SPAC, cabine = SNPVAC, escolha confirmada no onboarding; "nenhum" = edição base). Razões: um só
código/manutenção (AE já modelados por sindicato, FTL universal), os sindicatos não competem (segmentos diferentes),
serve não-sócios, tripulação inteira na mesma app. App própria de um sindicato só como extra pago, a partir do mesmo
código e na conta de programador DESSE sindicato (App Store 4.2.6). Ao advogado: responsável pelos dados = Nuno
(sindicatos não veem dados individuais); contrato de licença; números com marca do sindicato.
**Nome: FICA CrewPact** (decisão do Nuno, 2026-11-02). Verificado: nenhuma app com o nome (App Store PT/EUA/RU), nenhum
produto/empresa na web; `crewpact.app` é teu; `crewpact.com` é de terceiros e está à venda (Afternic); `.pt`/`.eu` parecem
livres. A fazer: pesquisa de marca INPI + EUIPO · reservar o nome na App Store Connect · registar `.pt`/`.eu`.
**Ícone REABERTO:** o Nuno não gosta do aprovado em julho (letra C + sublinhado). Novas direções em `design/icone-direcoes.html`.

---

## 2026-11-02 — Cores do SNPVAC? (estudo, decisão em aberto)

**Contexto (Nuno):** a app é, em princípio, para vender ao SNPVAC; pensar em usar as cores deles.
**Medido:** a cor do SNPVAC é **`#005EB8` azul-cobalto** (logótipo monocromático + 195 usos no CSS do site oficial),
NÃO azul-céu. Comporta-se ao contrário do nosso amarelo: texto sobre papel 6,38 ✓ · branco sobre ela 6,38 ✓ ·
mas tinta sobre ela 2,89 ✗ (marcador) · sobre a noite 2,92 ✗ · sobre placa preta 2,89 ✗.
**Estudo:** `design/snpvac-cores.html` (ficheiro LOCAL — marca de terceiros, não publicar). Três caminhos:
hoje · azul em tudo (falha 3 papéis) · **edição parceira (recomendada):** a pele CrewPact fica; o cobalto marca o que
se toca (botão, links, aba, ＋, barras); tinta clara `#C7DCEF` como marcador (13,08); `#6FAAE3` no escuro (7,57).
**Antes de decidir:** a app serve pilotos (SPAC) · com a marca do SNPVAC os números passam a ler-se como a palavra
do sindicato (→ advogado) · uso da marca exige autorização escrita · preparar o código: papéis de cor com nome
(86 usos do amarelo em 36 ficheiros) + 105 cores soltas.
**Achado à parte:** a cor das notificações no `app.json` é `#F5402C` (vermelho fora do tema) — corrigir.

**Evolução (Nuno: "fazemos o SPAC e o SNPVAC"):** SPAC = **`#0097D4` celeste** (+ marinho `#19232D`; logótipo com cruz
vermelha). Celeste: branco sobre ele 3,29 ✗ → no que se toca usa `#0077A8` (5,00); no escuro o original serve (5,66);
marcador `#C7E8F6` (14,30). Os dois azuis entre si = 1,94 (parecem o mesmo). **Recomendação:** login NEUTRO CrewPact
(Slack/Navan/Granola/Instacart Business não pintam o login) com uma linha "Em parceria com SNPVAC · SPAC" no fundo
(à Air NZ "A Star Alliance member"); a edição vem do SINDICATO (pergunta no onboarding, sugerida pelo tipo, "nenhum" =
CrewPact), não do tipo de tripulante. Esboço local `design/edicoes-sindicatos.html`. Pendente: autorização escrita dos
dois sindicatos, advogado, prova de pertença (código/n.º de sócio).

---

## 2026-11-02 (madrugada) — Início em folga passado para o código

**O Nuno aprovou o esboço** e entregou as três escolhas ao critério das melhores apps:
- **Sem nada marcado → sem fantasma** (o Flighty vazio mostra só duas linhas e a ação; nada decorativo).
- **Rótulo lateral sai do Início** (nenhuma app de referência roda texto; a data passou para o topo). Nos outros ecrãs
  sai na migração de cada um (design-system §2); onde é selo funcional (Simulação, exemplo) vira rótulo visível.
- **"OK" → "Em dia"** (palavra de estado concreta, como o "On Time" do Flighty) — escala e validades.

**Feito no código (`screens/HomeScreen.js`, `screens/hojeItems.js`):**
- Linha do topo: data legível + tempo (todos os estados; o tempo em folga/pernoita/férias). O brilho motivado do
  sistema de luz passou a nascer do tempo no topo (`TUNE.haloMot`).
- Saíram de TODOS os estados: o rótulo lateral, a seta/ícone amarelo do canto, o emoji da lua.
- Ênfase dos kicks a tinta em todos os estados (o amarelo sobre papel falhava a 1,73).
- Folga: fantasma = dias até ao próximo serviço + kick legível + linha com data/report/rota; sem nada = sem fantasma.
- Folga: estado em colunas rótulo + valor; "A seguir" à Flighty depois do dinheiro (absorve o cartão preto);
  atalho "Abrir a Escala" quando não há nada.
- Linha do dinheiro (todos os estados que a têm): número a tinta com € cinzento; anel → barra que diz o que mede
  ("Dia 2 de 30" no mês, "62%" no PSV).
- Outros estados: a frase de estado passou a "Legal: Sim · Escala: Em dia" (pergunta + resposta).
- Verificado no PC: `npm test` verde · pacote iOS gera · imports todos presentes · contagem de dias certa nas
  mudanças de hora e na passagem de ano · guardião: dívida desceu (tipo −5, letra<11 −5, espaço −5, amarelo −1).

**Por ver no iPhone (NÃO testado):** a folga sem nada marcado (o teu caso), a folga com serviço (precisa de um serviço
importado), e os outros 14 estados — mexi no topo, no canto, nos kicks e na linha do dinheiro de todos. É a sessão
"testar os estados".

---

## 2026-11-02 (fim de noite) — Revisão do Início com Flighty e as apps "do dia"

**Pedido do Nuno:** corrigir o layout da app toda, guiada pelas melhores (Flighty no Mobbin + concorrência),
mantendo a Living Interface. Análise feita sobre uma captura do Início em folga (20:14).

**Medido:** amarelo `#FFB800` sobre papel = **1,73:1** (chumba em qualquer tamanho); tinta sobre amarelo 10,62;
cinzento 4,51. 11 estilos de texto amarelo em 8 ficheiros (8 apanhados pela métrica nova).

**Feito (aprovado: "faz o que propões"):**
- **Regra nova (design-system §2 e §6):** o amarelo nunca é texto nem ícone informativo sobre papel; dinheiro e
  números herói a tinta. Exceção legítima marcada `// sobre-tinta` (placa preta).
- **Guardião:** métrica `amareloTexto` na roquete (chão = 8). Métrica nova não conta como subida até ao próximo
  `--atualizar`.
- **Referências** do Início guardadas: Flighty (lista e faixa de estado), Gentler Streak, The Outsiders, Oura —
  coleção Mobbin + `referencias/inicio-folga/` + índice em `referencias/README.md`.
- **Esboço** `design/inicio-folga-v3.html` (publicado como página privada): Agora · Proposta com serviço ·
  Proposta sem nada marcado, 10 mudanças numeradas e o contraste medido.

**Concorrência:** RosterBuster, CrewLog, Wingman, DutySheet, CONNECT, BeCrew, Layvr — nenhuma no Mobbin; vendem
funções, não desenho. A referência visual certa é o Flighty + apps de saúde que mudam com o dia.

**À espera do Nuno (o código do Início NÃO mudou):**
1. Aprovar a direção do esboço para o Início em folga.
2. Sem nada marcado: fantasma = dia do mês, ou sem fantasma.
3. Rótulo lateral (PeleSide): fica a cinzento/tinta com a contagem, ou sai do Início.
4. Pequena mudança de texto proposta: o valor da escala "OK" passa a "Em dia".

---

## 2026-11-02 (noite) — Design System 2.0 (ramo `design-system-2`, por guardar no git)

**Porquê:** o Nuno sentia problemas de layout, espaçamento, tipografia e posição dos botões. Medido:
675 tamanhos de letra à mão (29 pela escala), 149 estilos abaixo de 11, 924 espaçamentos fora da escala,
105 cores soltas, ✕ em 4 tamanhos e 2 formas, cabeçalho de janela copiado à mão em 6 sítios. Causa: cada
mockup portado "à letra" com os seus números.

**Decisões (aprovadas pelo Nuno: "faz o que recomendas"):**
- **Regra dos mockups mudou:** o mockup manda na hierarquia e na disposição; os números vêm da escala.
- **Escala fechada** em `data/constants.js`: `TXT` (13 estilos de texto com nome), `SPACE` em grelha 2/4,
  `TYPE` com os números condensados, `ICON_BTN`, `SCALE`. Densidade da casa mantida (corpo 13).
- **Componentes canónicos:** `IconButton` (36 redondo, toque 44, rótulo obrigatório) e `SheetHeader`.
- **Regras de posição** escritas (design-system §10) e **folha contra página modal** (§11).
- **Reanimated** alinhado com a skill `animacoes`: o `Animated` core fica; o Reanimated entra para
  animações de layout e gestos, ecrã a ecrã (motion §2). A razão antiga (SDK 54) acabou.
- **Guardião** `npm run test:design` no `npm test` e no pre-push: regras duras + roquete da dívida.
- **Mobbin** como referência em cada ecrã do bloco C (escolha do Nuno, guardada em `referencias/`).

**Feito e verificado no PC:**
- 13 ficheiros migrados para `IconButton`/`SheetHeader` (todas as janelas e ecrãs com ✕ ou ‹ de navegação).
  O ‹ do `PeleHeader` passa a seguir o tema noturno. O ponto do rótulo passa a amarelo (o vermelho era
  decoração, contra §2). Formulário de serviço: o ‹ que fechava a janela passou a ✕; o ‹ dos passos só
  aparece quando há para onde voltar (antes havia dois fechos).
- 6 animações de layout passaram a respeitar os movimentos reduzidos (formulário de serviço, calculadora FTL).
- 23 mockups recusados movidos para `design/arquivo/` (índice em `design/README.md`).
- `npm test` verde (25 suites) · pacote iOS gera · verificador de imports apanhou 2 erros reais
  (`SheetHeader` em falta nos cartões de partilha) — corrigidos e a regra entrou no guardião.

**Por ver no iPhone (não testado):** os cabeçalhos das 6 janelas (calendário, importar, notificações,
partilha de voo, partilha do ano, Simulação e o Avançado), o ✕/‹ novos (36 redondo) em todos os ecrãs, o
formulário de serviço (passo 1 com ✕ à direita; passos sem ‹ quando não há para onde voltar).

**Decididas pelo Nuno ("está bem", 2026-11-02):** 1 → **A** (✕ à direita) · 2 → **opção 2** (Guardar largo no
fundo; já é o padrão da app, exceto Validades e formulário de evento, que migram no bloco C). Referências em
`referencias/README.md` e na coleção do Mobbin. Fica pendente só o ponto 3.

**Opções que foram apresentadas (Mobbin, 2026-11-02):**
1. **✕ das janelas:** A) título à esquerda, ✕ à direita — Alan, Polarsteps, Beside, pliability
   (**recomendado**, é o que a app já faz) · B) ✕ à esquerda — Tinder, ElevenLabs, Insight Timer.
2. **Guardar nos formulários:** 1) Cancelar à esquerda e Guardar à direita no topo — Fi (iOS clássico) ·
   2) ✕ em cima e Guardar largo no fundo, acima do teclado — AllTrails, Mindtrip, Hypelist
   (**recomendado**: ao alcance do polegar e igual ao `PrimaryButton`) · 3) Cancelar e Guardar lado a lado
   no fundo — Perplexity · 4) Guardar e Cancelar empilhados — Expedia, X.
3. **Exceção da grelha da Escala** (etiquetas a 8–9,5): decidir no device na migração da Escala.

**Próximo:** bloco B (contas) continua primeiro. Depois o bloco C já com a revisão e a migração por ecrã.

---

## 2026-11-02 (tarde) — Atualização para o SDK 58

**Porquê:** a Expo Go do iPhone atualizou para o SDK 58 e recusa projetos no 57 ("Project is incompatible").
Sem isto, nenhuma verificação no device era possível.

**Feito no ramo `sdk-58` (por guardar no git):** `npx expo install expo@^58.0.0 --fix`. RN 0.86→0.88.1 ·
React 19.3 · reanimated 4.7.1 · worklets 0.13.0 · gesture-handler 2→3.3 · view-shot 5→6.1.1 · screens 4.30.
- `expo-doctor` 20/20 ✅ · `npm test` verde (exit 0) ✅ · pacote iOS gera sem erros (`expo export`) ✅.
- Revisto contra as mudanças do SDK 58: nenhuma API removida está em uso (InteractionManager, Modal
  `animated`, deep imports); file-system já usa `/legacy` (continua exportado); notificações têm handler
  explícito; o stack v6 ainda encontra o `PanGestureHandler` no gesture-handler 3; o view-shot 6 continua
  em pontos no iOS → a correção dos 1080 px de setembro mantém-se.
- Os 22 pacotes atrasados do bloco A ficaram resolvidos com a atualização.

**1.º arranque no iPhone → ecrã vermelho:** "InteractionManager has been removed" no `@react-navigation/stack`
v6 (Card, em cada transição). A revisão tinha procurado só no código da app, não nas bibliotecas.
- **Correção (sem tocar em `node_modules`):** `metro.config.js` faz o `react-native` resolver para
  `shims/react-native-sem-interaction-manager.js` **só** dentro do `@react-navigation/stack`; a camada devolve
  um InteractionManager vazio, igual ao que a v7 faz (`InteractionManager?.`). Provado no pacote dev: o Card
  usa a camada, nenhum outro módulo a usa. `expo-doctor` 20/20.
- **Pendência nova:** migrar para @react-navigation v7 (stack 7.12 já protege isto) e apagar a camada.
  Não agora: a v7 muda o `navigate` entre abas e ecrãs empilhados (42 chamadas a rever) — fazer depois da
  verificação, numa sessão própria.
- Lição: numa subida de RN, procurar as APIs removidas também em `node_modules` (`grep -rl` sem o próprio RN).

**2.º arranque:** compila e carrega. Aviso do Metro: `data/auth.js` importava `expo-auth-session/build/QueryParams`,
caminho interno que o SDK 58 fechou. A função (15 linhas) passou para dentro do `auth.js`; provada igual à
original em 5 URLs de retorno OAuth. Sem outros imports internos na app.

**Smoke no iPhone (Expo Go 58): ✅ confirmado pelo Nuno.** Ramo `sdk-58` junto ao `main` (local, sem push).
A pasta `android/` gerada está desatualizada; regenera-se com `npx expo prebuild --clean` quando o
Android entrar.

---

## 2026-11-02 — Ponto de situação e plano de verificação

**Estado do código:** `main` limpo, último commit 2026-09-03 (SDK 57 oficial + auditoria de segurança
corrigida). `npm test` → 24 suites, 0 falhas (FTL 302 · AE 453 · pdfRoster 65 · stats 104 · rosterDiff 33 ·
capabilities 56 · export 24 · flightDetect 33 · zulu 12 · registo 9 · disrupção 42 · biblioteca 26 ·
vigência ok · flightStatus 51 · calendar 44 · validades 54 · meteo 17 · radiação 38 · prova 33 ·
auditoria 18 · carreira 45 · voz 50 · crewState 43).

**Decisões desta sessão:**
- Criados `CLAUDE.md` do projeto e este `docs/decisoes.md` (o projeto é anterior ao método; passa a segui-lo).
- **Dev build fica para o FIM.** Tudo o que depende de build nativo (Face ID real, PDF por ficheiro, voo ao
  vivo nativo, IAP, login social, widgets, Live Activities, Android) espera. Lista canónica: `docs/dev-build.md`.
- **Verificação do resto primeiro**, por blocos, no Expo Go. Plano mestre em `docs/05-verificacao.md`
  (bloco A feito do PC hoje; B–G no device/leis).
- **Não atualizar os 22 pacotes Expo** que o `expo-doctor` aponta antes de fechar o bloco B: o smoke do
  SDK 57 (2026-09-03) foi feito com as versões atuais.

**Medido hoje do PC:** Hi Fly `long_haul=true` ✅ (pendência 5 fechada); 4 Edge Functions no ar (401 sem
sessão) ✅; `crewpact.app/termos` e `/privacidade` respondem mas com placeholders (5 e 4) ⚠️; links EUR-Lex ok ✅.

**Pendências (fora do dev build), por ordem:**
1. **Device · contas e segurança** — `docs/verificacao-device.md` §1–§3: reset de palavra-passe (OTP +
   cooldown), apagar conta + graça 7 dias + reativação (conta DESCARTÁVEL), mudar e-mail (2 passos no
   dashboard primeiro). Servidor já verificado (Edges + cron no ar).
2. **Device · passeio fino de julho/setembro** — tudo o que foi construído sem ser visto no telemóvel:
   Simulação em poster · Prova (§ inline + ProvaSheet) · Auditoria do mês · Radiação cósmica · Relatórios
   (PDF 245, CSV, logbook de carreira) · SNC/RDP (DisrupcaoScreen) · morph da pílula na Escala · Desfazer
   (3 fluxos) · marcos na voz + primeiro alerta · sistema de luz no Início · hotéis v2.
3. **Device · "testar os estados"** — estados da Living Interface 1 a 1, afinações no bloco `TUNE`.
4. **Device · "testar o calendário"** — pipeline com eventos sintéticos (`docs/verificacao-calendario.md`).
5. **Dashboard Supabase** — Auth → Email: desligar "Secure email change" + colar `email-change-address.html`
   (antes do bloco B §3). ~~Hi Fly long_haul~~ confirmado 2026-11-02.
6. **Leis** — `legal/termos.html` e `legal/privacidade.html` prontos com 7 placeholders 【…】: entidade
   responsável, e-mails suporte@/privacidade@, data de publicação, remover "RASCUNHO". Depois advogado, depois publicar.
7. **Nome novo da app** — rebatismo planeado; o ícone final e o PNG esperam a decisão. Bundle ID não muda.
8. **Prateleira (não bloqueia):** relógio solar real no Início · reconciliação na auditoria (v1.1) ·
   Validades parada à espera de documentos reais · sino fase 3 · Radar (ideia A).

**Do método global (análise 2026-11-02), a acrescentar ao caminho:**
- Verificação ganhou 4 itens que o método pede às aplicações: quem vê o quê com duas contas, modo avião,
  permissões do telemóvel, cópias de segurança. Já no `05-verificacao.md`.
- **Revisão de fora antes das lojas:** beta com 2–3 tripulantes reais pelo TestFlight (lição do Hub: quem
  desenha não deve ser o único a aprovar). Fica para a fase do dev build.
- **Página curta de descoberta** (opcional): que problema a app resolve, para quem, como se mede. As fases
  1–3 completas não se fazem retroativamente.
- **Para o método v1.4:** a CrewPact é o 1.º projeto completo. Candidatos a entrar no caminho das
  aplicações: golden-first, portão `pre-push`, citar a fonte legal, ficheiro de errata.
- Testar num Android verdadeiro e num iPhone pequeno e grande fica no fim, com o dev build.

**Prova sem sessão (PC):** todas as tabelas com dados pessoais devolvem vazio à chave pública. Encontradas
2 tabelas órfãs na BD (`rest_periods`, `user_additional_roles`), sem código nem SQL no repo: decidir.

**Sem decisão ainda:** data de lançamento; se há CI (a Constituição §9 diz que o `pre-push` local não chega).
