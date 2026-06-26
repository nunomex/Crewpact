# CrewPact — Arquitetura (fluxogramas)

App React Native / Expo para tripulação easyJet. FTL/AE determinísticos (sem AI),
offline-first, € sempre com cêntimos, PDF on-device (RGPD).

Os diagramas são [Mermaid](https://mermaid.js.org/) — renderizam no preview de Markdown
do VSCode (e no GitHub).

---

## 1. Arranque & gates de acesso

Lógica de `renderScreen()` + splash nativo (`App.js`).

```mermaid
flowchart TD
    Splash[Splash nativo · preventAutoHide] --> Auth{authLoading?}
    Auth -- sim --> Spin1[Spinner]
    Auth -- não --> User{tem user?}
    User -- não --> SU{signupMode?}
    SU -- sim --> OnbS[OnboardingScreen · signup]
    SU -- não --> Login[LoginScreen]
    User -- sim --> Lock{lockEnabled && locked?}
    Lock -- sim --> LockS[LockScreen · biometria/PIN]
    Lock -- não --> Prof{perfil resolvido?<br/>loadedUserId == user.id}
    Prof -- não --> Spin2[Spinner]
    Prof -- sim --> Onb{onboarded?}
    Onb -- não --> OnbScreen[OnboardingScreen]
    Onb -- sim --> Main[MainTabs]
```

---

## 2. Navegação — 5 abas + stacks

`MainTabs` com `FloatingTabBar` (dock escuro + FAB speed-dial).

```mermaid
flowchart LR
    Main[MainTabs · FloatingTabBar]
    Main --> Inicio[Início] --> Home[HomeScreen]
    Main --> Hoje[Hoje] --> HojeMain[HojeScreen]
    Main --> Escala[Escala] --> EscalaMain[EscalaScreen]
    Main --> FTL[FTL] --> FtlHub[FtlHubScreen]
    Main --> Perfil[Perfil] --> Settings[SettingsScreen]

    Home --> Stats[StatsScreen]
    Home --> HFC[FtlCalcScreen]
    Home --> HFD[FtlDetailScreen]
    HojeMain --> HojeDet[HojeDetailScreen]
    EscalaMain --> DutyDet[DutyDetailScreen]
    EscalaMain --> EFC[FtlCalcScreen]
    EscalaMain --> EFD[FtlDetailScreen]
    FtlHub --> FFC[FtlCalcScreen]
    FtlHub --> FFD[FtlDetailScreen]
    Settings --> Validades[ValidadesScreen]

    Main -.FAB.-> Search[SearchModal · FTL]
    Main -.FAB.-> NewDuty[Escala · nova duty]
    Main -.FAB.-> Imp[Escala · rever/import]
```

Folhas/modais (montados nos ecrãs, não no navigator): `RosterImportSheet`,
`DutyFormSheet`, `CalendarPickerSheet`, `NotificationsBell` (sino), `ConfirmDialog`,
`CenterDialog`, `BottomSheet`.

---

## 3. Pipeline de dados — o coração

Calendário/PDF → **confirmar** → `duties` (offline-first) → motores determinísticos → ecrãs.

```mermaid
flowchart TD
    Cal[Calendário do telemóvel<br/>data/calendar.js]
    Pdf[PDF easyJet · on-device<br/>data/pdfRoster.js]
    Cal --> Build[buildIncoming / candidatos<br/>data/rosterImport.js]
    Pdf --> Build
    Build --> Diff[diffRoster · SÓ deteta<br/>data/rosterDiff.js]
    Diff --> RC[rosterChanges · banner/sino]
    RC --> Sheet[RosterImportSheet · CONFIRMAR]
    Build --> Sheet
    Manual[DutyFormSheet · manual] --> Save[saveDuty]
    Sheet --> Save

    Save --> Duties[(duties · estado App)]
    Duties <--> Local[(AsyncStorage<br/>cp_duties_uid)]
    Duties <--> Supa[(Supabase<br/>fetch/upsert/delete<br/>dirty/deleted · flush)]

    Duties --> FtlDay[dutyToFtlDay] --> DayLog[(dayLog · FTL por dia)]
    DayLog <--> Recon[reconcileDayLog · fill-only]

    Prof[profile · company · caps<br/>data/capabilities.js] --> FtlE
    Prof --> AeE
    Duties --> FtlE[FTL · ftl.js<br/>computeDuty · fadiga · limites]
    Duties --> AeE[AE · easyjetSpac/snpvac<br/>per-diem · pernoita · salário]
    Duties --> ST[stats.js · ano]
    Duties --> TD[today.js · Hoje]
    AeE --> PD[perdiem.js · mês]

    FtlE --> Screens[Ecrãs: Home · Hoje · Escala<br/>FTL · Stats · DutyDetail]
    AeE --> Screens
    PD --> Screens
    ST --> Screens
    TD --> Screens
    DayLog --> Screens

    Duties --> Rem[reminders.js<br/>lembretes + alterações]
    Valid[validities] --> Rem
```

---

## Princípios que o fluxo respeita

- **Deteta → confirma → grava.** `checkRosterChanges` SÓ deteta; nada entra no `duties`
  sem confirmação do utilizador (no `RosterImportSheet`).
- **Prioridade do calendário = serviços REAIS.** Se existir um **serviço** no calendário
  num dia → **sobrepõe e substitui (apaga)** o manual/PDF desse dia (selo *"Substitui o
  teu manual"*, ao confirmar). O manual/PDF só **sobrevive** quando o dia está **vazio**
  no calendário (a ausência não apaga). Um evento **OFF/folga** no calendário **não conta
  como serviço** → não substitui o manual. (`data/rosterDiff.js`: `removed` só atinge
  `source==='calendar'`.)
- **Apagar SÓ nos manuais.** Duties de calendário/PDF não se apagam na app — cancelam-se
  pela própria fonte (chegam como `removed`/"cancelada" no import). Resolve a ressurreição.
- **Folga = derivada.** Um dia sem serviço é folga na vista; nunca é guardado.
- **Offline-first.** `saveDuty` escreve local + `dirty`; o flush sincroniza best-effort com
  o Supabase (pendentes locais vencem o servidor até serem enviados).
- **Motores 100% determinísticos** (FTL · AE), sem AI; consultivos/factuais.
- **€ sempre com cêntimos**, nunca arredonda.
- **PDF on-device** (extração local, apaga a cópia) — RGPD; crew nunca extraído.
