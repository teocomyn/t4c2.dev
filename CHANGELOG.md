# Changelog

## 1.8.0 — 2026-09-13

- Itération : `apparie`, `numerote`, `pour chaque a b dans`.
- Nombres : `somme`, `moyenne`, `compte`.
- Texte : `separe`, `joint`, `commence_par`, `finit_par`.
- Temps : `annee`, `mois`, `jour`, `heure`.

## 1.7.0 — 2026-09-13

- Objets : `modele`, `nouveau`, `moi`, `sur`, `champ` / `pose_champ`.
- Héritage : `herite`, `parent`, `est`.
- `type_de` sur un objet rend le nom du modèle. `fiche` reste pour les données plates.

## 1.6.0 — 2026-09-13

- Cœur inspiré de Python, en français préfixe : `ensemble`, `nuple`, `plage`.
- Fonctions : `carte`, `filtre`, `reduis`, `tous`, `un_parmi`.
- Données : `cles`, `valeurs`, `fusionne`, `unique`, `inverse`.
- Texte : `forme «Bonjour {prenom}»`. Erreurs : `enfin`.

## 1.5.0 — 2026-09-12

- Fonctions comme valeurs : `soit f fonc x … fin`, `applique f 21`, `type_de`.
- Listes : `insere`, `index_de`, `trie`. Commentaires `/* … */`.
- Extension VS Code dans `extension/`. PWA : `sw.js`.

## 1.4.0 — 2026-09-12

- Données : `fiche`, `champ`, `pose_champ`, `pose_element`, `copie`, `rien`.
- Texte : `contient`, `coupe`, `remplace`, `majuscule`, `minuscule`, `en_nombre`, `en_texte`, `est_vide`.
- Langage : `(…)`, `selon`, `fixe`, `essaie` / `attrape`, `et` / `ou` court-circuit, portée de bloc, virgule en sortie.
- Modules : `importe maths` (`pi`, `sinus`…), `importe temps`, `importe fichiers` (CLI, chemin relatif).
- Tortue : `couleur`, `aller_a`, `remplis`.

## 1.3.0 — 2026-09-12

- Langage : `premier` et `dernier` sur une liste.
- Playground : tortue avec grille et curseur, lien d’évitement, thème du navigateur, brouillon cassé récupéré.
- Classe : fiche prof imprimable. Types npm (`t4c2.d.ts`). `sitemap.xml`.

## 1.2.0 — 2026-09-12

- Langage : `minimum`, `maximum`, `absolu`, `pour chaque x dans liste`.
- `de` n’est plus réservé. Les fonctions peuvent être déclarées plus bas.
- Formateur : garde `//` et `#`. REPL multi-lignes. Timeout 1000 ms.
- Playground : missions corrigées, pas-à-pas sur la ligne, `demande` dans l’UI, erreur peinte.

## 1.1.0 — 2026-09-12

- Site : accueil, référence, favicon, manifest, 404.
- Playground : navigation, ouvrir / télécharger un `.t4c2`.
- Commentaires `#`, instruction `aide`, `longueur` sur les listes.
- CI GitHub Actions. Tests BOM / CRLF / dièse.

## 1.0.0 — 2026-09-12

- Un seul moteur pour le CLI et le playground.
- `affiche 1`, `affiche 0`, nombres négatifs, `3,14`, `Affiche`, `« »`, `“ ”`.
- Expressions dans `si`, `soit`, `tant_que`.
- `soit`, `vrai` / `faux`, `pour`, `sinon_si`, comparaisons `>=` `<=` `different`.
- `puissance`, `racine`, `arrondis`, `aleatoire`.
- Fonctions, listes (index 1), `demande`, tortue.
- Erreurs avec ligne et colonne, tutorat.
- `require()` ne lance plus la démo.
- Tests, REPL, `--fmt`, playground français, mémoire live, pas à pas.
