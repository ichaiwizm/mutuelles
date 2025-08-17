# Suite de Test Email

Cette suite permet de récupérer et parser les emails Gmail pour tester les parsers de leads.

## Structure

```
server/test/
├── config.js          # Configuration (jours, filtres, etc.)
├── fetch-emails.js    # Script de récupération des emails
├── parse-emails.js    # Script de parsing des emails
├── mails/            # Emails bruts récupérés (JSON + HTML)
└── parsed/           # Résultats du parsing
```

## Utilisation

### Prérequis
1. Le serveur principal doit avoir été lancé au moins une fois pour l'authentification OAuth
2. Un token d'accès valide doit être disponible

### Commandes

```bash
# Récupérer les emails des 7 derniers jours (par défaut)
npm run fetch

# Parser tous les emails récupérés
npm run parse

# Récupérer ET parser en une seule commande
npm run fetch-and-parse

# Nettoyer les dossiers de sortie
npm run clean
```

### Configuration

Modifier `config.js` pour ajuster :
- `days`: Nombre de jours à récupérer (défaut: 7)
- `maxResults`: Nombre max d'emails (défaut: 100)
- `query`: Filtre Gmail additionnel (ex: "from:contact@assurprospect.fr")
- `debug`: Mode debug avec plus de logs

## Workflow typique

1. **Récupération des emails**
   ```bash
   cd server/test
   npm run fetch
   ```
   Les emails sont sauvegardés dans `mails/` avec :
   - `.json` : Payload complet Gmail
   - `.html` : HTML brut extrait

2. **Parsing des emails**
   ```bash
   npm run parse
   ```
   Les résultats sont sauvegardés dans `parsed/` :
   - `parsed_results_*.json` : Résultats détaillés avec stats
   - `leads_*.json` : Leads extraits uniquement

3. **Analyse des résultats**
   Les fichiers de sortie contiennent :
   - Statistiques de parsing
   - Parser utilisé pour chaque email
   - Leads extraits avec scoring
   - Temps de traitement

## Debug

En mode `debug: true` dans `config.js`, le script :
- Affiche plus de logs
- Teste tous les parsers sur un échantillon
- Montre les temps de traitement détaillés

## Fichiers de sortie

### fetch-summary.json
Résumé de la récupération avec liste des emails et leurs métadonnées.

### parsed_results_*.json
Résultats complets du parsing avec :
- Stats globales
- Détails par email
- Leads extraits
- Erreurs et warnings

### leads_*.json
Liste simple des leads extraits, prêts pour l'import dans l'application principale.