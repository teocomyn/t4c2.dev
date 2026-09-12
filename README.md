# T4C2

**Le langage de programmation minimaliste, créatif et pédagogique en français.**

T4C2 sert à apprendre à programmer **en français**, à partir de 10 ans. Plus textuel que Scratch, plus français que Python.

Version **1.2.0**. Licence MIT. Site : [github.com/teocomyn/t4c2.dev](https://github.com/teocomyn/t4c2.dev).

---

## Démarrage

### Playground

Ouvre `index.html` (accueil) ou `t4c2_web.html` (playground). En local : `python3 -m http.server`.

Écris du T4C2, clique **Exécuter** (`⌘+Entrée` / `Ctrl+Entrée`). La mémoire s’affiche à droite.

### Ligne de commande

```bash
node t4c2.js                      # REPL
node t4c2.js exemples/bonjour.t4c2
node t4c2.js --fmt fichier.t4c2
npm test
```

### Dans un projet

```javascript
const { runT4C2, runProgram } = require("./t4c2.js");

runT4C2(`
  affiche «Hello T4C2»
  affiche ajoute 5 3
`);
```

`require("./t4c2.js")` n’exécute plus de démo.

---

## Le langage

Les mots-clés ignorent les majuscules (`Affiche` = `affiche`).  
`3,14` et `3.14` sont le même nombre.  
`«bonjour»` et `"bonjour"` sont du texte.  
Les listes commencent à **1**.

### Afficher et retenir

```
affiche «Bonjour»
affiche 1
soit age 12
set age 12
demande prenom «Comment tu t'appelles ?»
```

`soit` et `set` font la même chose. `result` garde le dernier calcul.

### Calculer

`ajoute` `soustrait` `multiplie` `divise` `modulo` `puissance`  
`racine` `arrondis` `aleatoire` (dé `aleatoire 6` → 1 à 6)  
`minimum` `maximum` `absolu`

On peut imbriquer :

```
soit prochain ajoute age 1
affiche puissance 2 10
```

### Comparer

`egal` `different` `plus_grand` `plus_petit`  
`plus_grand_ou_egal` `plus_petit_ou_egal`  
`et` `ou` `non`  
`vrai` `faux`

```
si plus_grand_ou_egal points 10 alors
  affiche «Réussi»
sinon
  affiche «Encore»
fin
```

`sinon_si` est disponible.

### Répéter

```
repete 5
  affiche «Hey»
fin

pour i de 1 a 10
  affiche i
fin

tant_que plus_petit n 10 faire
  soit n ajoute n 1
fin
```

`pour chaque note dans notes` parcourt une liste.

`interrompre` et `continuer` sortent ou sautent un tour.  
Limite : 10 000 tours ou 1000 ms.

### Texte, listes, fonctions, tortue

```
concat «Teo» « Comyn»
longueur «T4C2»

soit notes liste 12 15 18
affiche element notes 2
pousse notes 20

fonc double x
  retourne multiplie x 2
fin
affiche double 21

avance 80
tourne 90
leve
pose
```

Les fonctions se déclarent **avant** de s’en servir.

---

## Architecture

```
Source T4C2
   → normalisation (BOM, NFC, « », “ ”)
   → Lexer (ligne / colonne)
   → Parser (AST + expressions)
   → Runtime (pas à pas possible)
   → Sortie + mémoire + tortue
```

Un seul fichier moteur : `t4c2.js`. Le playground le charge, il ne le recopie plus.

---

## Fichiers

| Fichier | Rôle |
|---|---|
| `t4c2.js` | Moteur + CLI + REPL |
| `index.html` | Accueil |
| `t4c2_web.html` | Playground |
| `docs.html` | Référence |
| `t4c2.test.js` | Tests |
| `exemples/*.t4c2` | Programmes |
| `LICENSE` | MIT |

---

## Grammaire (extrait)

```
programme   = { instruction }
instruction = affiche expr
            | (soit | set) ident expr
            | si expr alors bloc { sinon_si expr alors bloc } [ sinon bloc ] fin
            | repete expr bloc fin
            | tant_que expr faire bloc fin
            | pour ident de expr a expr bloc fin
            | fonc ident { ident } bloc fin
            | expr
expr        = nombre | texte | vrai | faux | ident | op args…
```

---

**T4C2 — Clarté, créativité, accessibilité.**  
**Par Teo Comyn.**
