# Mutuelles - Monorepo

Monorepo contenant trois projets :

## 📁 Structure

```
mutuelles/
├── platform/
│   └── lead-extractor/     # Frontend React - Extraction de leads Gmail/Calendar
├── server/                 # Backend Express - API + OAuth Google
└── swisslife-one-ext/     # Extension Chrome - Remplissage automatique
```

## 🚀 Démarrage rapide

```bash
# Installation complète
npm run install:all

# Lancement développement (server + frontend)
npm run dev
```

## 📋 Projets

### 🎯 Lead Extractor (`platform/lead-extractor`)
- **Frontend** : Vite 7 + React 19 + TypeScript
- **UI** : Tailwind CSS v4 + shadcn/ui  
- **Fonction** : Interface d'extraction et gestion des leads
- **Port** : http://localhost:5174

### 🔧 Server (`server/`)  
- **Backend** : Express 5 + Google APIs
- **Fonction** : API REST + authentification OAuth Google
- **Port** : http://localhost:3001

### 🔌 Swiss Life Extension (`swisslife-one-ext/`)
- **Type** : Extension Chrome
- **Fonction** : Remplissage automatique des formulaires Swiss Life
- **Installation** : Mode développeur Chrome

## ⚙️ Configuration

1. **Server** : Créer `server/.env`
```env
GOOGLE_CLIENT_ID=votre_client_id
GOOGLE_CLIENT_SECRET=votre_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
FRONTEND_URL=http://localhost:5174
PORT=3001
```

2. **Frontend** : Créer `platform/lead-extractor/.env`  
```env
VITE_API_URL=http://localhost:3001
```

## 📋 Scripts disponibles

```bash
# Développement
npm run dev                # Server + Frontend
npm run dev:server         # Server uniquement  
npm run dev:frontend       # Frontend uniquement

# Installation
npm run install:all        # Tous les projets
npm run install:server     # Server uniquement
npm run install:frontend   # Frontend uniquement  
npm run install:ext        # Extension uniquement

# Production
npm run build             # Build tous les projets
npm start                 # Démarrage production server
```

## 🔗 Liens utiles

- **Lead Extractor** : [Documentation détaillée](platform/lead-extractor/README.md)
- **Frontend** : http://localhost:5174
- **API Backend** : http://localhost:3001

---

**Stack principale** : Node.js 20+ | React 19 | TypeScript | Express 5 | Google APIs