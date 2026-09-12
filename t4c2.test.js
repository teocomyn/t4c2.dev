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
  assert.deepEqual(out("affiche 3.14"), ["3.14"]);
  assert.deepEqual(out("affiche «bonjour»"), ["bonjour"]);
});

test("nombres négatifs et virgule française", () => {
  assert.deepEqual(out("soit x -5\naffiche x"), ["-5"]);
  assert.deepEqual(out("soit x 3,14\naffiche x"), ["3.14"]);
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

test("mission bonjour", () => {
  const { checkMission } = require("./t4c2.js");
  const r = runProgram("affiche «Bonjour T4C2»\naffiche 1");
  const c = checkMission("hello", r);
  assert.equal(c.ok, true);
});
