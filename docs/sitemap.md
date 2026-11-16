# CrewPact — o mapa da app

Feito a 2026-11-16 a partir do código (`App.js`, `screens/`, `components/`), no ramo `calculos-repouso-2` (commit `0859035`). Mostra os
ecrãs, as folhas e janelas que cada um abre, e as ligações entre eles. Atualizar quando um ecrã, uma aba ou uma ligação mudar.

Legenda: **ecrã** = página da pilha (tem ‹ para voltar) · *folha* = sobe por cima (fecha com "Fechar" ou a arrastar) · → = leva a.

## 1. Antes da app (as portas)

A ordem é a do `App.js`. Cada porta só aparece se a condição se verificar.

```
Entrar (LoginScreen)            sem sessão — e-mail → código → nome; palavra-passe como alternativa; criar conta é uma vista daqui
  └ Conta criada (AccountCreated)
Bloqueio (LockScreen)           com o bloqueio ligado e mais de 5 min fora da app
Reativar a conta (Reactivate)   com o apagamento da conta pedido (7 dias para voltar atrás)
Entrada (OnboardingScreen)      perfil por fazer — as 6 perguntas e ligar o calendário
  ├ o mês e o ano (MonthYearWheel)
  └ ler a escala (RosterImportSheet)
Oferta do Face ID (BiometricOffer)   uma vez, depois da entrada
→ a app
```

## 2. A barra de abas — cinco lugares

`Início · Escala · [Simular] · Números · Perfil` (`components/TabBar.js`). O Simular não é uma aba: abre a Simulação por cima de tudo. No
código, a aba Números chama-se `Estatísticas`.

## 3. Cada aba

```
INÍCIO (HomeScreen)
  folhas: Porquê (QuestionDetailSheet) · Prova (ProvaSheet) · Auditoria do mês (AuditSheet) · Hotel da pernoita (HotelSheet)
          · Partilhar o voo (FlightShareCard) · Boas-vindas (WelcomeSheet, 1× na vida) · Notificações (NotificationsBell)
  → Escala › Detalhe do serviço        tocar num dia (muda de aba — ver o achado 3)
  a dica da 1.ª visita (Tip) aponta para o Simular
  → Escala › rever alterações · ligar o calendário · ler o PDF
  → Números                            o mês, os extras
  → Perfil · Perfil › Validades

ESCALA (EscalaScreen) — o mês em círculos; tocar num dia mostra os serviços por baixo
  folhas: o serviço (o Detalhe inteiro, DutyDetailBody) · Importar escala (calendário | PDF) · ler a escala (RosterImportSheet)
          · escolher o calendário (CalendarPickerSheet) · Hotel (HotelSheet) · as guias da 1.ª vez (GuideBubble)
  └ Detalhe do serviço (DutyDetailScreen) — só vindo do Início ou dos Números
      folhas: Prova (ProvaSheet) · Hotel (HotelSheet)
      → outro serviço do mesmo dia (empilha outro Detalhe) · → a Escala com o dia a piscar

[SIMULAR] — a Simulação (SimulationSheet), por cima de tudo
  a linha do tempo: um cartão por dia, o repouso entre os dias, ＋ Juntar outro dia, o resultado, Limpar
  folhas: o dia (SimDaySheet) → Pormenores (DutyFormSheet) · Calculadoras da lei (LawCalcsSheet)

NÚMEROS (StatsScreen)
  folhas: Prova (ProvaSheet) · Auditoria do mês (AuditSheet) · um limite do acordo (AeLimitSheet) · o ano para partilhar (YearShareCard)
  → Escala · Escala › Detalhe do serviço

PERFIL (SettingsScreen)
  folhas: A tua conta → mudar o e-mail · apagar a conta · terminar sessão · Nome e nº (RecordIdentitySheet) · Notificações
  mini-cartões no próprio ecrã: Face ID · lembretes · idioma
  ├ Página do perfil (PerfilPaginaScreen) — base · contrato · frota · largada · abrangido pelo AE (e as do Trabalho)
  ├ Trabalho (TrabalhoScreen) → Página do perfil (categoria, início, vínculo, férias, pós-voo, instrutor, PPY…)
  ├ Família (FamiliaScreen) — janela de confirmação · partilhar o voo
  ├ Validades (ValidadesScreen)
  ├ Hotéis (HoteisScreen) → Estação (HotelStationScreen) → Hotel (HotelDetailScreen) — a folha do hotel em cada um
  ├ Relatórios (RelatoriosScreen) → Disrupção (DisrupcaoScreen) · Estabilidade (EstabilidadeScreen) — Nome e nº em cada um
  └ Biblioteca (InfoScreen) — a procura, as fontes oficiais
```

## 4. Por cima de tudo e de fora

- **A Simulação** (acima) e o **aviso no topo** (Toast, com "Desfazer" onde há apagar).
- **Sem rede** (OfflineBanner).
- **Gestão dos extras do mês** (ExtrasManager): montada, mas **sem entrada** desde 2026-11-14 (achado 4).
- **Notificações locais** (`data/reminders.js`): o lembrete para acordar · "Escala alterada · Toca para rever" · "Sincroniza a escala".
  Tocar numa delas leva ao sítio dela (achado 1, feito): a revisão na Escala · a Escala · as Validades · o Início.
- **Ligações de fora** (`crewpact://`): o esquema existe no `app.json`, mas nenhuma ligação abre um ecrã (não há ligações a usar por
  agora — a entrada é por código, não por link).

## 5. A verificação (2026-11-16)

**Está certo:**
- Todos os ecrãs registados têm por onde se chegar a eles, e todos os `navigate(...)` vão para ecrãs que existem.
- Os parâmetros que se mandam são todos lidos: na Escala `review`, `connect`, `pdf` e `flashDuty`; no Detalhe `date`, `edit` e `idx`.
- Os toques dos cartões têm todos quem os trate: os 13 destinos do Início, os 3 da Escala e o da Simulação.
- As páginas do perfil que o Perfil e o Trabalho pedem existem todas.
- As portas vêm pela ordem certa.
- Os cinco lugares da barra batem com as quatro abas mais o Simular.
- Nenhum ficheiro de `screens/` ficou fora, tirando as portas, que não são da pilha.

**Achados:**

1. ✅ **FEITO a 2026-11-16** (`notifRoute` em `data/notifications.js`, golden `test:notifications`; `onReminderTap` em
   `data/reminders.js`; a navegação no `App.js` espera pelas portas). Ver no dev build (as notificações não existem no Expo Go).
   **Tocar numa notificação não abre nada** (importante). "Escala alterada · Toca para rever" promete a revisão, mas a app não trata o
   toque numa notificação: abre onde estava. Corrigir: tratar o toque (`expo-notifications`). As alterações da escala abrem a revisão
   na Escala, e o lembrete para acordar abre o Início.
2. ✅ **FEITO a 2026-11-16:** a dica diz "Simula aqui. Um serviço ou uma troca — as contas antes de dizeres que sim." e a folha de
   boas-vindas tinha o mesmo erro ("Cria com o +") — passou a "Simula antes de aceitar" (com o ícone do Simular da barra; o dos
   limites passou ao relógio).
   **A dica da 1.ª visita ao Início está errada** (importante). Diz "Cria aqui. Serviços, simulações e eventos — tudo nasce no ＋", mas o
   ＋ já não existe (o meio da barra é o Simular, desde a N2), criar serviços à mão acabou ("só o calendário") e os eventos também.
   Corrigir: apontar para o Simular com um texto novo, ou tirar a dica.
3. **Um dia abre de duas maneiras, e o "voltar" perde o sítio.** Na Escala, tocar num serviço abre a folha dele. No Início e nos
   Números, abre o ecrã do Detalhe **dentro da aba Escala** — a app muda de aba, e o ‹ volta ao mês da Escala, não ao Início. O mesmo
   com as Validades vindas do Início, que levam ao Perfil. Corrigir: abrir a mesma folha do dia por cima de onde se está (escolha de
   desenho — 3 esboços).
4. **A gestão dos extras não tem entrada** (já se sabia: espera o seu lugar nos Números, decisão de 2026-11-14). O € dos extras já
   está nos Números; a lista para ver e apagar é que não se abre.
5. **Código sem uso** (arrumação):
   - os componentes `Banner`, `DayBar` e `Segmented`;
   - os ramos `idioma`, `lembretes` e `bloqueio` da Página do perfil (passaram a mini-cartões no Perfil);
   - o parâmetro `hub` da Escala, que ninguém manda;
   - `screens/hojeItems.js`, que é um módulo de dados e está na pasta dos ecrãs.

**O que não foi verificado:** nada disto foi visto no iPhone; a ida e volta com o gesto de voltar do iOS e com o botão de trás do
Android; o que acontece a uma notificação com a app fechada.
