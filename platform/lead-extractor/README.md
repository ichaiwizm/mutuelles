# Lead Extractor - Système d'extraction de leads Gmail/Calendar

Application complète d'extraction et de gestion de leads depuis Gmail et Google Calendar avec détection automatique des informations de contact, souscripteur, conjoint, enfants et besoins.

## Stack technique

- **Frontend**: Vite 7 + React 19 + TypeScript
- **UI**: Tailwind CSS v4 + shadcn/ui
- **Table**: TanStack Table v8
- **Backend**: Express 5 + Google APIs
- **Stockage**: localStorage (frontend)

## Installation

### Prérequis
- Node.js 20.19+ ou 22.12+ (requis pour Vite 7)
- Compte Google Cloud avec API Gmail et Calendar activées

### Configuration Google Cloud

1. Créer un projet sur [Google Cloud Console](https://console.cloud.google.com)
2. Activer les APIs:
   - Gmail API
   - Google Calendar API
3. Créer des identifiants OAuth 2.0:
   - Type: Application Web
   - URI de redirection autorisée: `http://localhost:3001/auth/google/callback`
4. Récupérer le Client ID et Client Secret

### Installation du projet

```bash
# Depuis la racine du monorepo
npm run install:all

# Ou individuellement:
npm install                    # racine
cd platform/lead-extractor && npm install
cd ../../server && npm install
```

### Configuration

1. Créer le fichier `server/.env`:
```env
PORT=3001
GOOGLE_CLIENT_ID=votre_client_id
GOOGLE_CLIENT_SECRET=votre_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
FRONTEND_URL=http://localhost:5174
```

2. Créer le fichier `platform/lead-extractor/.env`:
```env
VITE_API_URL=http://localhost:3001
```

## Lancement

```bash
# Depuis la racine du monorepo - Développement
npm run dev

# Ou individuellement:
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend  
cd platform/lead-extractor && npm run dev
```

L'application sera accessible sur http://localhost:5174

## Fonctionnalités

### Extraction de données
- **Gmail**: Extraction des emails des N derniers jours
- **Calendar**: Extraction des événements des N derniers jours + 7 jours futurs
- **Parsing intelligent**: Détection automatique des sections et labels
- **Score de qualité**: Évaluation de la pertinence (0-5)

### Champs extraits
- **Contact**: Civilité, Nom, Prénom, Téléphone, Email, Adresse, Code postal, Ville
- **Souscripteur**: Date de naissance, Profession, Régime social, Nombre d'enfants
- **Conjoint**: Date de naissance, Profession, Régime social
- **Enfants**: Dates de naissance (jusqu'à 3 enfants)
- **Besoins**: Date d'effet, Assuré actuellement, Niveaux (Soins/Hospitalisation/Optique/Dentaire 1-4)

### Déduplication
- Par email (priorité 1)
- Par téléphone (priorité 2)
- Par triplet Prénom+Nom+DOB (priorité 3)
- Fusion automatique des doublons
- Marquage des doublons potentiels

### Interface utilisateur
- **Dashboard**: Table avec tri, filtres, recherche, pagination
- **Détails**: Drawer avec toutes les informations extraites
- **Paramètres**: Sélection période (7/30/60/90 jours), sources actives
- **Règles**: Visualisation des labels d'extraction (lecture seule v1)

### Stockage
- **localStorage**: Leads, paramètres, timestamps de synchronisation
- **Limite**: ~5000 leads max (rotation automatique possible)
- **Persistance**: Données conservées entre sessions

## Pipeline de parsing

1. **Normalisation**: Conversion HTML→texte, suppression disclaimers
2. **Détection sections**: Contact, Souscripteur, Conjoint, Enfants, Besoins
3. **Extraction labels**: Recherche par patterns spécifiques
4. **Heuristiques**: Fallback pour données sans labels
5. **Normalisation données**: Dates ISO, téléphones, civilités
6. **Consolidation**: Fusion conflits, agrégation notes
7. **Scoring**: Évaluation qualité (nombre de champs remplis)

## Structure du projet (Monorepo)

```
mutuelles/
├── package.json          # Scripts du monorepo
├── platform/
│   └── lead-extractor/   # Frontend React
│       ├── src/
│       │   ├── components/
│       │   │   ├── ui/           # shadcn/ui
│       │   │   └── LeadDetailDrawer.tsx
│       │   ├── lib/
│       │   │   ├── storage.ts    # localStorage
│       │   │   ├── deduplication.ts
│       │   │   └── utils.ts
│       │   ├── pages/
│       │   │   ├── Login.tsx
│       │   │   ├── Dashboard.tsx
│       │   │   └── Rules.tsx
│       │   └── types/
│       │       └── lead.ts
│       └── .env          # Config frontend
├── server/               # Backend Express
│   ├── index.js          # API + OAuth
│   ├── services/
│   │   └── parsing.js    # Pipeline extraction
│   └── .env             # Config backend
└── swisslife-one-ext/   # Extension Chrome
    ├── manifest.json
    └── ...
```

## API Backend

- `GET /auth/google/start` - Démarrage OAuth
- `GET /auth/google/callback` - Callback OAuth
- `POST /api/ingest/gmail` - Extraction Gmail
- `POST /api/ingest/calendar` - Extraction Calendar
- `POST /api/ingest/all` - Extraction toutes sources

## Améliorations futures (v1.5+)

- Édition des règles d'extraction
- Export CSV/Excel
- Job automatique quotidien
- Base de données persistante
- Gestion multi-utilisateurs
- Webhooks notifications
- IA pour améliorer le parsing