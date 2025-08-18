# Architecture SwissLife - Configuration JSON Optimisée

## 🎯 Vue d'ensemble

Cette architecture est basée sur l'analyse complète du fichier `bigtest.js` (1938 lignes) qui contient tous les scripts de remplissage, diagnostic et vérification pour SwissLife.

## 🏗️ Structure du JSON de configuration

### **Métadonnées** 
```json
{
  "meta": {
    "service": "swisslife",
    "version": "2.0.0",
    "description": "Configuration optimisée basée sur bigtest.js"
  }
}
```

### **Paramètres globaux**
```json
{
  "settings": {
    "defaultDelay": 100,           // Délai standard entre actions
    "stabilizationDelay": 350,     // Attente stabilisation DOM critique
    "maxWaitTime": 8000,          // Timeout maximum pour overlays
    "retryAttempts": 3,           // Nombre de tentatives
    "debugMode": false            // Mode debug activé/désactivé
  }
}
```

## 📋 Workflow des 9 sections

### **Ordre d'exécution optimisé :**

1. **📝 project** - Nom du projet (indépendant)
2. **🏥 hospitalisation** - Confort (indépendant) 
3. **👥 simulationType** - **CRITIQUE** (détermine la suite)
4. **👤 principalInsured** - Assuré principal (toujours)
5. **👶 children** - Enfants (conditionnel)
6. **💑 spouse** - Conjoint (si couple)
7. **💰 loiMadelin** - Loi Madelin (si TNS)
8. **❌ cancellation** - Résiliation (toujours)
9. **🔄 competition** - Concurrence (toujours)

### **Points critiques :**

- **simulationType** : Choix Individuel/Couple qui conditionne l'affichage des sections suivantes
- **Attente obligatoire** : `waitStable` après simulationType (350ms min, 5000ms max)
- **Activation onglet** : Navigation vers onglet conjoint si mode couple

## 🔧 Types d'actions supportés

### **1. setValue** - Champs texte simples
```json
{
  "action": {
    "method": "setValue",
    "events": ["focus", "input", "change", "blur"]
  }
}
```

### **2. humanType** - Saisie avec masque
```json
{
  "action": {
    "method": "humanType", 
    "charDelay": 8,  // 8ms entre chaque caractère
    "events": ["focus", "input", "change", "blur"]
  }
}
```

### **3. clickSequence** - Radios/Checkboxes
```json
{
  "action": {
    "method": "clickSequence",
    "events": ["pointerdown", "mousedown", "mouseup", "click"]
  }
}
```

### **4. pickSelect** - Listes déroulantes
```json
{
  "action": {
    "method": "pickSelect",
    "matching": "exactValue|prefix|text",
    "waitForOptions": true,
    "waitDelay": 500
  }
}
```

## 🎯 Système de sélecteurs robuste

### **Hiérarchie de sélecteurs :**
```json
{
  "selectors": {
    "primary": "#id-exact",           // Sélecteur principal
    "fallbacks": [                    // Sélecteurs de secours
      "[name='attribut.nom']",
      "input[id*='pattern'][id*='keyword']"
    ],
    "contextSearch": {                // Recherche intelligente
      "labelRegex": "/nom.*projet/i",
      "sectionKeywords": ["projet", "nom"]
    }
  }
}
```

### **Avantages :**
- **Robustesse** : Multiple fallbacks
- **Évolutivité** : Résiste aux changements d'IDs
- **Intelligence** : Recherche par contexte et libellé

## ⚙️ Gestion des conditions

### **Conditions simples :**
```json
{
  "conditions": {
    "simulationType": "couple"
  }
}
```

### **Conditions composées :**
```json
{
  "conditions": {
    "regimeSocial": "TNS",
    "statut": "TNS"
  }
}
```

### **Logique d'évaluation :**
- **AND** implicite entre conditions multiples
- Évaluation dynamique au moment de l'exécution
- Support des valeurs computed (ex: `hasChildren` calculé depuis `enfantsDOB.length`)

## 🔄 Mécanismes d'attente

### **1. waitStable** - Stabilisation DOM
```json
{
  "waitAfter": {
    "type": "stable",
    "minQuiet": 350,    // Temps minimum sans changement
    "maxWait": 5000     // Timeout maximum
  }
}
```

### **2. tabActivation** - Navigation onglets
```json
{
  "waitBefore": {
    "type": "tabActivation",
    "target": "conjoint"
  }
}
```

### **3. waitForOptions** - Chargement listes
```json
{
  "action": {
    "waitForOptions": true,  // Attendre chargement options
    "waitDelay": 500        // Délai supplémentaire
  }
}
```

## 🎨 Gestion des champs conditionnels

### **Section Conjoint** (si couple)
- **Prérequis** : `simulationType === "couple"`
- **Navigation** : Activation onglet conjoint
- **Champs** : Identiques à l'assuré principal
- **Timing** : Attente stabilisation après navigation

### **Section Enfants** (si applicable)
- **Déclenchement** : `enfantsDOB.length > 0`
- **Expansion** : Sélection nombre → création slots
- **Mode** : "loose" pour champs masqués
- **Arrays** : Gestion indexée `{index}`

### **Loi Madelin** (si TNS)
- **Conditions** : `regimeSocial === "TNS" && statut === "TNS"`
- **Type** : Checkbox optionnelle
- **Visibilité** : Dépend des choix précédents

## 📊 Système de validation

### **Validation format :**
```json
{
  "validation": {
    "format": "DD/MM/YYYY",
    "regex": "^\\d{2}/\\d{2}/\\d{4}$",
    "required": true,
    "minLength": 1,
    "maxLength": 50
  }
}
```

### **Transformation données :**
```json
{
  "transform": {
    "type": "prefix|arrayLength|dateFormat",
    "length": 2,
    "format": "DD/MM/YYYY"
  }
}
```

## 🛡️ Gestion d'erreurs

### **Retry automatique :**
- Tentatives multiples avec délais progressifs
- Fallback sur sélecteurs alternatifs
- Logging détaillé des échecs

### **Modes de récupération :**
- **Sélecteur manquant** → Essayer fallbacks
- **Élément masqué** → Mode "loose"
- **Timeout** → Retry avec délai plus long
- **Échec validation** → Diagnostic + retry

## 🎮 Exemples d'usage

### **Scenario individuel simple :**
```json
{
  "simulationType": "individuelle",
  "principalDOB": "15/03/1980",
  "enfantsDOB": [],
  "loiMadelin": true
}
```

### **Scenario famille complète :**
```json
{
  "simulationType": "couple",
  "principalDOB": "15/03/1980",
  "conjointDOB": "22/07/1982", 
  "enfantsDOB": ["10/02/2015", "21/09/2018"],
  "loiMadelin": true
}
```

## 🚀 Avantages de cette architecture

1. **🎯 Précision** - Basée sur analyse réelle du formulaire
2. **🛡️ Robustesse** - Multiples fallbacks et gestion d'erreurs
3. **⚙️ Flexibilité** - Configuration JSON externe
4. **📈 Évolutivité** - Ajout facile de nouveaux champs
5. **🔧 Maintenabilité** - Structure claire et documentée
6. **🎮 Testabilité** - Scénarios prédéfinis
7. **⚡ Performance** - Optimisations d'attente intelligentes

Cette architecture est prête pour être utilisée par un moteur de remplissage automatique industriel.