# T4C2 — contexte stable

- Classification : prototype / langage local. Pas de base hébergée.
- Produit : langage de programmation en français. Pas un jouet scolaire — un vrai langage.
- Moteur unique : `t4c2.js` (Node + `window.T4C2`). Le HTML ne recopie pas l’interpréteur.
- Version : 1.9.0. Licence MIT. Auteur : Teo Comyn. Dépôt : https://github.com/teocomyn/t4c2.dev
- Décisions : mots-clés insensibles à la casse ; noms sensibles à la casse ; listes indexées à 1 ; préfixe ; `( )` seulement pour grouper ; `fiche` pour les données plates ; `modele` / `nouveau` / `sur` pour les objets ; `nuple` immuable ; `ensemble` sans doublon ; `importe` maths/temps/fichiers ou un `.t4c2` en CLI ; pas de réseau dans le playground.
- Inspiration Python : lisibilité, structures, carte/filtre/reduis, forme, enfin, modeles. Pas de copie de l’écosystème (PyTorch, pip, async).
- Interdit dans ce dépôt : secrets, tokens, URLs privées.
