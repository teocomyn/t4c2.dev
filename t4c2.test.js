const { test } = require("node:test");
const assert = require("node:assert/strict");
const { lexer, runT4C2, runProgram, formatT4C2 } = require("./t4c2.js");

function out(code, opts) {
  const r = runProgram(code, opts);
  if (r.error) throw r.error;
  return r.output;
}

test("require n'exécute pas de démo", () => {
  assert.equal(typeof runT4C2, "function");
});

test("affiche les littéraux", () => {
  assert.deepEqual(out("affiche 1"), ["1"]);
  assert.deepEqual(out("affiche 0"), ["0"]);
  assert.deepEqual(out("affiche 3.14"), ["3,14"]);
  assert.deepEqual(out("affiche «bonjour»"), ["bonjour"]);
});

test("nombres négatifs et virgule française", () => {
  assert.deepEqual(out("soit x -5\naffiche x"), ["-5"]);
  assert.deepEqual(out("soit x 3,14\naffiche x"), ["3,14"]);
  assert.deepEqual(lexer("set x -5").filter((t) => t.type !== "EOF").map((t) => t.value), [
    "set",
    "x",
    -5,
  ]);
});

test("mots-clés insensibles à la casse", () => {
  assert.deepEqual(out('Affiche "x"'), ["x"]);
});

test("guillemets Word", () => {
  assert.deepEqual(out("affiche “hello”"), ["hello"]);
});

test("le lexer refuse + au lieu de l'avaler", () => {
  const r = runProgram("affiche 1 + 2");
  assert.equal(r.ok, false);
  assert.match(r.error.message, /ajoute/);
});

test("identifiant inconnu n'est pas une chaîne", () => {
  const r = runProgram("soit x hello\naffiche x");
  assert.equal(r.ok, false);
  assert.match(r.error.message, /hello/);
});

test("si accepte une expression", () => {
  assert.deepEqual(
    out("si plus_grand 5 3 alors\n  affiche «ok»\nfin"),
    ["ok"],
  );
});

test("erreurs avec ligne et colonne", () => {
  const r = runProgram("affiche");
  assert.equal(r.ok, false);
  assert.ok(r.error.line >= 1);
  assert.match(r.error.message, /Ligne/);
});

test("mots-clés réservés", () => {
  const r = runProgram("soit si 1");
  assert.equal(r.ok, false);
  assert.match(r.error.message, /mot de T4C2/);
});

test("échappement \\n", () => {
  assert.deepEqual(out('affiche "a\\nb"'), ["a\nb"]);
});

test("soit + result", () => {
  const vars = runT4C2("ajoute 2 3\nmultiplie result 4", () => {});
  assert.equal(vars.result, 20);
});

test("pour et fizzbuzz", () => {
  const lines = out(`pour i de 1 a 15
  si egal modulo i 15 0 alors
    affiche «FizzBuzz»
  sinon_si egal modulo i 3 0 alors
    affiche «Fizz»
  sinon_si egal modulo i 5 0 alors
    affiche «Buzz»
  sinon
    affiche i
  fin
fin`);
  assert.equal(lines[0], "1");
  assert.equal(lines[2], "Fizz");
  assert.equal(lines[4], "Buzz");
  assert.equal(lines[14], "FizzBuzz");
});

test("fonctions", () => {
  assert.deepEqual(
    out(`fonc double x
  retourne multiplie x 2
fin
affiche double 21`),
    ["42"],
  );
});

test("listes 1-indexées", () => {
  assert.deepEqual(
    out("soit n liste 10 20 30\naffiche element n 2\naffiche taille n"),
    ["20", "3"],
  );
});

test("vrai faux", () => {
  assert.deepEqual(out("affiche vrai\naffiche faux"), ["vrai", "faux"]);
});

test("puissance racine arrondis", () => {
  assert.deepEqual(out("affiche puissance 2 10"), ["1024"]);
  assert.deepEqual(out("affiche arrondis racine 9"), ["3"]);
});

test("aleatoire injecté", () => {
  assert.deepEqual(out("affiche aleatoire 6", { random: () => 0 }), ["1"]);
  assert.deepEqual(out("affiche aleatoire 6", { random: () => 0.999 }), ["6"]);
});

test("demande", () => {
  assert.deepEqual(out('demande nom «Qui ?»\naffiche nom', { ask: () => "Teo" }), ["Teo"]);
});

test("tortue dessine un carré", () => {
  const r = runProgram(`repete 4
  avance 10
  tourne 90
fin`);
  assert.equal(r.turtle.path.length, 4);
});

test("interrompre", () => {
  assert.deepEqual(
    out(`pour i de 1 a 5
  si egal i 3 alors
    interrompre
  fin
  affiche i
fin`),
    ["1", "2"],
  );
});

test("formatage", () => {
  const src = formatT4C2("si plus_grand 1 0 alors\naffiche 1\nfin");
  assert.match(src, /  affiche 1/);
});

test("programme vide", () => {
  assert.deepEqual(out(""), []);
});

test("commentaire dans une chaîne", () => {
  assert.deepEqual(out('affiche "a // b"'), ["a // b"]);
});

test("division par zéro", () => {
  const r = runProgram("divise 1 0");
  assert.equal(r.ok, false);
  assert.match(r.error.message, /zéro/);
});

test("commentaire dièse", () => {
  assert.deepEqual(out("# ignore\naffiche 2"), ["2"]);
});

test("BOM et CRLF", () => {
  assert.deepEqual(out("\uFEFFaffiche 1\r\naffiche 2"), ["1", "2"]);
});

test("aide", () => {
  const lines = out("aide");
  assert.ok(lines[0].includes("T4C2"));
});

test("longueur sur liste", () => {
  assert.deepEqual(out("affiche longueur liste 1 2 3"), ["3"]);
});

test("minimum maximum absolu", () => {
  assert.deepEqual(out("affiche minimum 3 8"), ["3"]);
  assert.deepEqual(out("affiche maximum liste 1 9 4"), ["9"]);
  assert.deepEqual(out("affiche absolu -4"), ["4"]);
});

test("pour chaque", () => {
  assert.deepEqual(
    out("soit notes liste 12 15\npour chaque n dans notes\n  affiche n\nfin"),
    ["12", "15"],
  );
});

test("soit de n'est plus interdit", () => {
  assert.deepEqual(out("soit de 1\naffiche de"), ["1"]);
});

test("fonction déclarée plus bas", () => {
  assert.deepEqual(
    out("affiche double 21\nfonc double x\n  retourne multiplie x 2\nfin"),
    ["42"],
  );
});

test("formateur garde les commentaires", () => {
  const src = formatT4C2("// garde\nsi plus_grand 1 0 alors\naffiche 1\nfin");
  assert.match(src, /\/\/ garde/);
  assert.match(src, /  affiche 1/);
});

test("demande peut se mettre en pause", () => {
  const r = runProgram('demande nom «Qui ?»\naffiche nom', { yieldAsk: true });
  assert.equal(r.paused, true);
  assert.equal(r.ask.question, "Qui ?");
  r.runtime.answer("Teo");
  const next = r.runtime.runAll();
  assert.equal(next.ask, null);
  assert.deepEqual(next.output.map((l) => l.text), ["Teo"]);
});

test("tortue garde position et angle", () => {
  const r = runProgram("avance 50");
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.turtle.y + 50) < 1e-9);
  assert.equal(r.turtle.angle, -90);
});

test("premier et dernier", () => {
  assert.deepEqual(
    out("soit notes liste 12 15 18\naffiche premier notes\naffiche dernier notes"),
    ["12", "18"],
  );
  const empty = runProgram("affiche premier liste");
  assert.ok(empty.error);
  assert.match(empty.error.message, /liste qui n'est pas vide/);
});

test("fiche champ pose_champ", () => {
  assert.deepEqual(
    out("soit j fiche nom «Léa» score 12\naffiche champ j nom\npose_champ j score 20\naffiche champ j score"),
    ["Léa", "20"],
  );
});

test("pose_element et copie", () => {
  assert.deepEqual(
    out("soit n liste 1 2 3\nsoit c copie n\npose_element n 2 9\naffiche element n 2\naffiche element c 2"),
    ["9", "2"],
  );
});

test("texte contient coupe remplace", () => {
  assert.deepEqual(
    out("affiche majuscule «t4c2»\naffiche contient «bonjour» «bon»\naffiche coupe «bonjour» 1 3\naffiche remplace «bonjour» «bon» «hey»"),
    ["T4C2", "vrai", "bon", "heyjour"],
  );
});

test("rien et conversions", () => {
  assert.deepEqual(out("affiche rien\naffiche en_nombre «3,14»\naffiche est_vide liste"), ["rien", "3,14", "vrai"]);
});

test("parenthèses de groupement", () => {
  assert.deepEqual(out("affiche ajoute (multiplie 2 3) 4"), ["10"]);
});

test("et court-circuit", () => {
  assert.deepEqual(
    out(`fonc boom x
  affiche «boom»
  retourne vrai
fin
si et faux boom 1 alors
  affiche «non»
fin
affiche «ok»`),
    ["ok"],
  );
});

test("selon", () => {
  assert.deepEqual(
    out(`selon «lundi»
  cas «lundi»
    affiche «début»
  sinon
    affiche «autre»
fin`),
    ["début"],
  );
});

test("fixe et i ne fuit plus", () => {
  const r = runProgram("fixe n 3\npour i de 1 a n\n  affiche i\nfin\naffiche i");
  assert.ok(r.error);
  assert.match(r.error.message, /i/);
  const frozen = runProgram("fixe n 3\nsoit n 4");
  assert.ok(frozen.error);
  assert.match(frozen.error.message, /fixe/);
});

test("essaie attrape", () => {
  assert.deepEqual(
    out("essaie\n  affiche divise 1 0\nattrape e\n  affiche «piégé»\nfin"),
    ["piégé"],
  );
});

test("importe maths", () => {
  const r = runProgram("importe maths\naffiche arrondis multiplie pi 100");
  assert.equal(r.ok, true);
  assert.equal(r.output[0], "314");
  assert.deepEqual(out("importe maths\naffiche plancher 3,7"), ["3"]);
});

test("fichiers relatifs", () => {
  const fs = require("fs");
  const name = "_t4c2_tmp_test.txt";
  try {
    assert.deepEqual(
      out(`importe fichiers\necris_fichier «${name}» «salut»\naffiche lis_fichier «${name}»`),
      ["salut"],
    );
  } finally {
    try { fs.unlinkSync(name); } catch { /* ignore */ }
  }
});

test("lint voit forme comme usage", () => {
  const { lintT4C2 } = require("./t4c2.js");
  const w = lintT4C2(`soit prenom «Teo»
affiche forme «Bonjour {prenom}»`);
  assert.equal(
    w.some((x) => /prenom/.test(x.text)),
    false,
  );
});

test("lint voit applique comme usage", () => {
  const { lintT4C2 } = require("./t4c2.js");
  const w = lintT4C2(`soit double fonc x
  retourne multiplie x 2
fin
affiche applique double 21`);
  assert.equal(
    w.some((x) => /double/.test(x.text)),
    false,
  );
});

test("applique et fonc valeur", () => {
  assert.deepEqual(
    out(`soit double fonc x
  retourne multiplie x 2
fin
affiche applique double 21
affiche type_de double`),
    ["42", "fonc"],
  );
  assert.deepEqual(
    out(`fonc triple x
  retourne multiplie x 3
fin
soit f triple
affiche applique f 7`),
    ["21"],
  );
});

test("index_de insere trie", () => {
  assert.deepEqual(
    out("soit n liste 3 1 2\ninsere n 1 9\naffiche index_de n 1\naffiche trie n"),
    ["3", "[1 2 3 9]"],
  );
});

test("commentaire bloc", () => {
  assert.deepEqual(out("/* ignore */\naffiche 2"), ["2"]);
});

test("plage ensemble nuple", () => {
  assert.deepEqual(
    out("affiche plage 1 4\naffiche type_de nuple 1 2\naffiche contient (ensemble 1 2 2 3) 2"),
    ["[1 2 3 4]", "nuple", "vrai"],
  );
});

test("carte filtre reduis", () => {
  assert.deepEqual(
    out(`fonc double x
  retourne multiplie x 2
fin
fonc pair x
  retourne egal modulo x 2 0
fin
affiche carte double plage 1 4
affiche filtre pair plage 1 6
affiche reduis ajoute plage 1 4`),
    ["[2 4 6 8]", "[2 4 6]", "10"],
  );
});

test("forme cles enfin", () => {
  assert.deepEqual(
    out(`soit prenom «Teo»
affiche forme «Bonjour {prenom}»
soit j fiche nom «Léa» score 1
affiche cles j
essaie
  affiche divise 1 0
attrape e
  affiche «boom»
enfin
  affiche «terminé»
fin`),
    ["Bonjour Teo", "[nom score]", "boom", "terminé"],
  );
});

test("modele nouveau sur", () => {
  assert.deepEqual(
    out(`modele Produit
  fonc init nom prix
    pose_champ moi nom nom
    pose_champ moi prix prix
  fin
  fonc etiquette
    retourne forme «{nom} : {prix}»
  fin
fin
soit mac nouveau Produit «Mac» 4000
affiche champ mac nom
affiche sur mac etiquette
affiche type_de mac
affiche est mac Produit`),
    ["Mac", "Mac : 4000", "Produit", "vrai"],
  );
});

test("modele herite parent", () => {
  assert.deepEqual(
    out(`modele Animal
  fonc init nom
    pose_champ moi nom nom
  fin
  fonc parle
    retourne forme «{nom}»
  fin
fin
modele Chien herite Animal
  fonc init nom
    parent init nom
    pose_champ moi race «berger»
  fin
  fonc parle
    retourne forme «{nom} aboie»
  fin
fin
soit rex nouveau Chien «Rex»
affiche sur rex parle
affiche est rex Animal
affiche champ rex race`),
    ["Rex aboie", "vrai", "berger"],
  );
});

test("apparie numerote somme", () => {
  assert.deepEqual(
    out(`soit noms liste «Ada» «Teo»
soit notes liste 18 16
pour chaque nom note dans apparie noms notes
  affiche forme «{nom} {note}»
fin
affiche somme notes
affiche moyenne notes
affiche compte notes 18
affiche joint «, » noms
affiche separe «Ada,Teo» «,»
affiche commence_par «bonjour» «bon»
affiche finit_par «bonjour» «jour»
affiche numerote notes`),
    ["Ada 18", "Teo 16", "34", "17", "1", "Ada, Teo", "[Ada Teo]", "vrai", "vrai", "[(1 18) (2 16)]"],
  );
});

test("temps annee", () => {
  assert.deepEqual(out("importe temps\naffiche annee 0"), ["1970"]);
});

test("mission apparie", () => {
  const { checkMission, EXAMPLES } = require("./t4c2.js");
  const r = runProgram(EXAMPLES.apparie);
  const c = checkMission("apparie", r);
  assert.equal(c.ok, true);
});

test("mission bonjour", () => {
  const { checkMission } = require("./t4c2.js");
  const r = runProgram("affiche «Bonjour T4C2»\naffiche 1");
  const c = checkMission("hello", r);
  assert.equal(c.ok, true);
});

test("mission modele", () => {
  const { checkMission, EXAMPLES } = require("./t4c2.js");
  const r = runProgram(EXAMPLES.modele);
  const c = checkMission("modele", r);
  assert.equal(c.ok, true);
});
