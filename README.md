# CrewPact

App de consulta do Acordo de Empresa para Tripulantes de Cabine easyJet.  
Desenvolvida com **Expo / React Native** para correr no **Expo Go**.

---

## Instalação rápida (3 passos)

### 1 — Pré-requisitos
- [Node.js 18+](https://nodejs.org) instalado
- App **Expo Go** no telemóvel  
  - iOS: https://apps.apple.com/app/expo-go/id982107779  
  - Android: https://play.google.com/store/apps/details?id=host.exp.exponent

### 2 — Instalar dependências
```bash
cd CrewPact
npm install
```

### 3 — Correr
```bash
npx expo start
```
Aparece um QR code no terminal.  
- **iOS**: abre a câmara e aponta para o QR code  
- **Android**: abre o Expo Go → "Scan QR code"

---

## Estrutura do projeto

```
CrewPact/
├── App.js                  # Navegação raiz (Bottom Tabs + Stacks)
├── app.json                # Configuração Expo
├── babel.config.js
├── package.json
├── data/
│   ├── constants.js        # Paleta, dados do Anexo I, calculadoras, notificações
│   └── clauses.js          # 97 cláusulas do AE (PT + EN)
└── screens/
    ├── OnboardingScreen.js  # Seleção de companhia, categoria e contrato
    ├── HomeScreen.js        # Remuneração, notificações, simulação mês/ano
    ├── ListScreen.js        # 97 cláusulas com pesquisa e filtros
    ├── DetailScreen.js      # Texto da cláusula + calculadoras interativas
    ├── FavoritesScreen.js   # Cláusulas guardadas
    └── SettingsScreen.js    # Perfil, idioma, sincronização
```

---

## Funcionalidades

- **97 cláusulas** do AE easyJet 2023–2027, bilingues PT/EN  
- **Calculadoras interativas** em 15 cláusulas (setores, pernoitas, bónus, posicionamento, etc.)  
- **Simulação mês/ano**: compara setores + dias + comissões com deltas a verde/vermelho  
- **Notificações** com centro de mensagens  
- **Pesquisa e filtros** (secção, "aplicáveis a mim", "calculadoras")  
- **Offline-first**: funciona sem rede; liga-se só para verificar atualizações  

---

## Para adicionar uma nova companhia / acordo

1. Adicionar a companhia em `data/constants.js` → array `COMPANIES` (com `active: false` enquanto não tiver acordo)  
2. Criar as cláusulas em `data/clauses.js` seguindo o mesmo formato  
3. Mudar `active: true` na companhia  

---

## Notas

- Os valores monetários são os do **Anexo I de Nov 2025**  
- O salário do Assistente/Comissário 1.º ano segue o **SMN** — a calculadora aceita o valor manual  
- Testado com Expo SDK 51 / React Native 0.74
