# Architecture JSON pour l'automatisation SwissLife

## Vue d'ensemble

Cette architecture JSON propose une solution complète et robuste pour automatiser le remplissage du formulaire SwissLife. Elle est basée sur l'analyse approfondie du fichier `bigtest.js` et respecte les 9 sections identifiées avec leurs dépendances et conditions.

## Structure des 9 sections

### 1. 📝 NOM DU PROJET
- **Ordre**: 1 (Premier à remplir)
- **Criticité**: Normale
- **Dépendances**: Aucune
- **Champs**: Nom du projet (texte libre)

### 2. 🏥 CONFORT HOSPITALISATION (INDEMNITÉS JOURNALIÈRES)
- **Ordre**: 2
- **Criticité**: Normale
- **Dépendances**: Aucune
- **Champs**: Radio Oui/Non (#projet-confort-hospitalisation-oui/non)
- **Mécanismes d'attente**: Stabilisation DOM (400ms min, 6000ms max)

### 3. 👥 TYPE DE SIMULATION
- **Ordre**: 3
- **Criticité**: CRITIQUE (détermine les sections suivantes)
- **Dépendances**: Aucune
- **Champs**: Radio Individuel/Couple
- **Impact**: Conditionne l'activation des sections Conjoint et Enfants
- **Attente**: Stabilisation obligatoire après sélection (350ms min)

### 4. 👤 ASSURÉ PRINCIPAL
- **Ordre**: 4
- **Criticité**: Haute
- **Dépendances**: Aucune
- **Champs**:
  - Date de naissance (format DD/MM/YYYY)
  - Département (code postal)
  - Régime social (dépendance pour statut)
  - Statut (dépend du régime social)
  - Profession (conditionnel selon statut TNS)

### 5. 👶 ENFANTS
- **Ordre**: 5
- **Criticité**: Normale
- **Dépendances**: Type de simulation (optionnel)
- **Conditions**: Activé si nombre d'enfants > 0
- **Actions préalables**: Expansion des sections repliées
- **Champs dynamiques**: 
  - Nombre d'enfants (trigger l'affichage)
  - Date de naissance par enfant
  - Ayant droit (CLIENT/CONJOINT) par enfant

### 6. 💑 CONJOINT
- **Ordre**: 6
- **Criticité**: Haute (si couple)
- **Dépendances**: Type de simulation = "couple"
- **Navigation**: Onglet conjoint requis
- **Champs**: Mêmes que l'assuré principal

### 7. 💰 LOI MADELIN
- **Ordre**: 7
- **Criticité**: Normale
- **Dépendances**: Statut = "TNS"
- **Condition**: Affiché uniquement pour les TNS
- **Champs**: Radio applicable/non applicable

### 8. ❌ RÉSILIATION DE CONTRAT
- **Ordre**: 8
- **Criticité**: Normale
- **Dépendances**: Aucune
- **Champs**: Possède un contrat à résilier (Oui/Non)

### 9. 🔄 REPRISE DE CONCURRENCE
- **Ordre**: 9 (Dernier)
- **Criticité**: Normale
- **Dépendances**: Aucune
- **Champs**: Reprise d'un contrat concurrent (Oui/Non)

## Architecture technique

### Structure des sélecteurs

```json
{
  "selector": {
    "primary": "#id-principal",
    "fallbacks": [
      "[name='champ.nom']",
      "input[id*='pattern'][id*='keyword']"
    ],
    "context": ".parent-container"
  }
}
```

**Avantages** :
- **Robustesse** : Multiples stratégies de ciblage
- **Maintenance** : Sélecteurs hiérarchisés
- **Performance** : Sélecteur principal optimisé

### Types d'actions

```json
{
  "action": {
    "type": "input|click|select|navigate|wait|expand",
    "method": "setValue|humanType|clickSequence",
    "waitAfter": 100,
    "waitStable": {
      "enabled": true,
      "minQuiet": 300,
      "maxWait": 5000
    }
  }
}
```

#### Méthodes de saisie :
- **setValue** : Assignation directe (rapide)
- **humanType** : Saisie caractère par caractère (masques de saisie)
- **clickSequence** : Simulation d'interaction utilisateur

### Système de conditions

```json
{
  "conditional": {
    "enabledIf": [
      {
        "field": "simulationType.type",
        "operator": "equals",
        "value": "couple"
      }
    ]
  }
}
```

**Opérateurs supportés** :
- `equals`, `notEquals`
- `contains`
- `exists`, `visible`

### Gestion des dépendances

```json
{
  "dependencies": ["regimeSocial", "statut"],
  "postActions": [
    {
      "type": "wait",
      "waitStable": { "enabled": true, "minQuiet": 400 }
    }
  ]
}
```

## Workflows conditionnels

### 1. Workflow Individuel
```
project → hospitalisation → simulationType → principalInsured → loiMadelin → cancellation → competition
```

### 2. Workflow Couple
```
project → hospitalisation → simulationType → principalInsured → spouse → loiMadelin → cancellation → competition
```

### 3. Workflow Couple avec enfants
```
project → hospitalisation → simulationType → principalInsured → children → spouse → loiMadelin → cancellation → competition
```

## Mécanismes d'attente et de stabilisation

### 1. Attente standard
```json
{
  "waitAfter": 100
}
```

### 2. Attente de stabilisation DOM
```json
{
  "waitStable": {
    "enabled": true,
    "minQuiet": 300,
    "maxWait": 5000
  }
}
```

**Principe** : Observer les mutations DOM et attendre une période de calme avant de continuer.

### 3. Attente d'overlay
```json
{
  "globalSettings": {
    "overlaySelector": ".blockUI.blockOverlay, .blockUI.blockMsg"
  }
}
```

## Gestion d'erreurs et fallbacks

### Stratégies de récupération

```json
{
  "errorHandling": {
    "retryAttempts": 3,
    "retryDelay": 1000,
    "fallbackStrategies": {
      "elementNotFound": "skip",
      "elementNotVisible": "scroll_and_retry",
      "validationFailed": "retry_with_fallback"
    }
  }
}
```

### Types d'erreurs gérées :
1. **Élément non trouvé** : Utilisation des sélecteurs fallback
2. **Élément non visible** : Scroll et retry automatique
3. **Validation échouée** : Retry avec méthode alternative
4. **Timeout réseau** : Attente et nouvel essai

## Validation des données

### Formats supportés
```json
{
  "validation": {
    "required": true,
    "format": "date|email|phone|number|text|select",
    "pattern": "^\\d{2}/\\d{2}/\\d{4}$",
    "customValidator": "checkRadioSelected"
  }
}
```

### Validateurs personnalisés
- `checkRadioSelected` : Vérification de la sélection radio
- `checkSimulationType` : Validation du type de simulation
- `checkSelectOption` : Vérification des options de select

## Exemple d'implémentation moteur

```typescript
interface FormRunner {
  async executeWorkflow(config: FormConfig, data: FormData): Promise<ExecutionResult>;
  async executeSection(section: Section, data: SectionData): Promise<SectionResult>;
  async executeField(field: Field, value: any): Promise<FieldResult>;
  
  // Utilitaires
  async waitForStability(options: StabilityOptions): Promise<boolean>;
  async findElement(selector: SelectorConfig): Promise<HTMLElement | null>;
  async validateField(field: Field, value: any): Promise<ValidationResult>;
}
```

## Configuration dynamique

### Paramètres d'environnement
```json
{
  "globalSettings": {
    "frameSelector": "iframe[src*='oav-pool2']",
    "debugMode": false,
    "maxRetries": 3
  }
}
```

### Mode debug
En mode debug, le système :
- Affiche les sélecteurs testés
- Log les événements DOM
- Surligne les éléments trouvés
- Enregistre les timings d'exécution

## Extensibilité

### Ajout de nouvelles sections
```json
{
  "sections": {
    "nouvelleSection": {
      "enabled": true,
      "order": 10,
      "conditional": {
        "enabledIf": [...]
      },
      "fields": {...}
    }
  }
}
```

### Ajout de nouveaux types d'action
```typescript
interface ActionHandler {
  canHandle(actionType: string): boolean;
  async execute(element: HTMLElement, action: Action, value: any): Promise<ActionResult>;
}
```

## Bonnes pratiques

### 1. Ordre d'exécution optimal
- Respecter les dépendances déclarées
- Traiter les sections critiques en premier
- Attendre la stabilisation après les actions importantes

### 2. Sélecteurs robustes
- Utiliser les IDs quand disponibles
- Prévoir des fallbacks multiples
- Éviter les sélecteurs trop spécifiques

### 3. Gestion des erreurs
- Implémenter des retries intelligents
- Logger les erreurs pour le debugging
- Fournir des messages d'erreur clairs

### 4. Performance
- Minimiser les attentes inutiles
- Utiliser la sélection par batch quand possible
- Implémenter des timeouts appropriés

## Maintenance et évolution

### Détection des changements
Le système devrait surveiller :
- Les modifications de structure HTML
- Les nouveaux IDs/classes
- Les changements de comportement JavaScript

### Mise à jour des configurations
- Versioning des configurations
- Tests de régression automatisés  
- Validation des modifications

Cette architecture offre une base solide, extensible et maintenable pour l'automatisation du formulaire SwissLife, avec une gestion robuste des cas d'erreur et une adaptation aux différents workflows utilisateur.