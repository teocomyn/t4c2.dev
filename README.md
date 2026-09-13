# T4C2

**Le langage de programmation en français.**

T4C2 est un vrai langage : tu écris **en français**, ça tourne tout de suite. Plus lisible que Python. Plus textuel que Scratch.

Version **1.8.0**. Licence MIT. Site : [t4c2-dev.vercel.app](https://t4c2-dev.vercel.app/).

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
affiche premier notes
pose_element notes 2 20
affiche contient notes 20

soit joueur fiche nom «Léa» score 12
affiche champ joueur nom
pose_champ joueur score 21

affiche majuscule «t4c2»
affiche coupe «bonjour» 1 3
affiche ajoute (multiplie 2 3) 4

selon jour
  cas «lundi»
    affiche «début»
  sinon
    affiche «autre»
fin

essaie
  affiche divise 1 0
attrape e
  affiche e
fin

importe maths
affiche sinus pi

soit double fonc x
  retourne multiplie x 2
fin
affiche applique double 21
affiche type_de double
affiche carte double plage 1 4
soit prenom «Teo»
affiche forme «Bonjour {prenom}»
affiche trie liste 3 1 2

modele Produit
  fonc init nom prix
    pose_champ moi nom nom
    pose_champ moi prix prix
  fin
  fonc etiquette
    retourne forme «{nom} : {prix}»
  fin
fin
soit mac nouveau Produit «Mac» 4000
affiche sur mac etiquette
affiche est mac Produit

soit noms liste «Ada» «Teo»
soit notes liste 18 16
pour chaque nom note dans apparie noms notes
  affiche forme «{nom} {note}»
fin
affiche somme notes
affiche joint «, » noms

fonc double x
  retourne multiplie x 2
fin
affiche double 21

avance 80
tourne 90
leve
pose
```

Les fonctions peuvent être déclarées **plus bas** que l’appel.  
Les parenthèses ne servent qu’à **grouper**. `set` est l’ancien nom de `soit`.  
`3,14` s’affiche `3,14`. Les noms gardent leur casse ; seuls les mots-clés l’ignorent.

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
| `t4c2.d.ts` | Types TypeScript |
| `index.html` | Accueil |
| `t4c2_web.html` | Playground (`?embed=1` pour iframe) |
| `docs.html` | Référence |
| `fiche.html` | Séance prof 45 min |
| `extension/` | Extension VS Code (ouvrir le dossier dans Extensions : « Install from Location ») |
| `sw.js` | Service worker PWA |
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
            | pour chaque ident dans expr bloc fin
            | selon expr { cas expr bloc } [ sinon bloc ] fin
            | essaie bloc attrape ident bloc fin
            | fonc ident { ident } bloc fin
            | modele ident [ herite ident ] { fonc … fin } fin
            | importe ident
            | expr
expr        = nombre | texte | vrai | faux | rien | ident | ( expr ) | op args…
```

---

**T4C2 — Clarté, créativité, accessibilité.**  
**Par Teo Comyn.**
