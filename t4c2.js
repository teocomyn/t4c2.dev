#!/usr/bin/env node
// T4C2 — Langage de programmation en français
// Un seul moteur : navigateur + Node. Pas d'effet de bord à l'import.

const VERSION = "1.2.0";

const STMT = new Set([
  "affiche", "soit", "set", "aide", "si", "alors", "sinon", "sinon_si", "fin",
  "repete", "tant_que", "faire", "pour", "interrompre", "continuer",
  "fonc", "retourne", "demande", "pousse", "retire",
  "avance", "tourne", "leve", "pose",
]);

const BINARY = new Set([
  "ajoute", "soustrait", "multiplie", "divise", "modulo", "puissance",
  "egal", "different", "plus_grand", "plus_petit",
  "plus_grand_ou_egal", "plus_petit_ou_egal",
  "et", "ou", "concat", "element",
]);

const UNARY = new Set(["non", "racine", "arrondis", "longueur", "taille", "absolu"]);

const SPECIAL_EXPR = new Set(["aleatoire", "liste", "vrai", "faux", "minimum", "maximum"]);

const RESERVED = new Set([
  ...STMT, ...BINARY, ...UNARY, ...SPECIAL_EXPR,
  "result",
]);

const T4C2_KEYWORDS = [...RESERVED].sort();
const T4C2_CONTROL = [
  "si", "alors", "sinon", "sinon_si", "fin", "repete", "tant_que",
  "faire", "pour", "fonc", "retourne", "interrompre", "continuer",
];

const MAX_ITERATIONS = 10000;
const MAX_OUTPUT = 500;
const MAX_MS = 1000;
const MAX_DEPTH = 64;

class T4C2Error extends Error {
  constructor(message, line, col) {
    const loc = line ? `Ligne ${line}, colonne ${col} : ` : "";
    super(loc + message);
    this.name = "T4C2Error";
    this.line = line || 0;
    this.col = col || 0;
  }
}

function normalizeSource(input) {
  return String(input ?? "")
    .replace(/^\uFEFF/, "")
    .normalize("NFC")
    .replace(/\u00a0/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

function preprocess(input) {
  const src = normalizeSource(input);
  const out = [];
  let i = 0;
  let inDq = false;
  let inGuillemet = false;
  while (i < src.length) {
    const c = src[i];
    if (inDq) {
      if (c === "\\" && i + 1 < src.length) {
        out.push(c, src[i + 1]);
        i += 2;
        continue;
      }
      if (c === '"') inDq = false;
      out.push(c);
      i++;
      continue;
    }
    if (inGuillemet) {
      if (c === "»") inGuillemet = false;
      out.push(c);
      i++;
      continue;
    }
    if (c === '"') {
      inDq = true;
      out.push(c);
      i++;
      continue;
    }
    if (c === "«") {
      inGuillemet = true;
      out.push(c);
      i++;
      continue;
    }
    if ((c === "/" && src[i + 1] === "/") || c === "#") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    out.push(c);
    i++;
  }
  return out.join("");
}

function unescapeString(s) {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function lexer(input) {
  const src = preprocess(input);
  const tokens = [];
  let i = 0;
  let line = 1;
  let col = 1;

  const adv = (n = 1) => {
    for (let k = 0; k < n; k++) {
      if (src[i] === "\n") {
        line++;
        col = 1;
      } else {
        col++;
      }
      i++;
    }
  };

  const identStart = (c) =>
    /[a-zA-Z_éèêëàâùûôîïüçÉÈÊËÀÂÙÛÔÎÏÜÇ]/.test(c || "");
  const identPart = (c) =>
    /[a-zA-Z0-9_éèêëàâùûôîïüçÉÈÊËÀÂÙÛÔÎÏÜÇ]/.test(c || "");

  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\t" || c === "\r" || c === "\n") {
      adv();
      continue;
    }

    const sl = line;
    const sc = col;

    if (c === '"') {
      let raw = "";
      adv();
      while (i < src.length && src[i] !== '"') {
        if (src[i] === "\\" && i + 1 < src.length) {
          raw += src[i] + src[i + 1];
          adv(2);
        } else {
          if (src[i] === "\n") {
            throw new T4C2Error("chaîne non fermée. Essaie : affiche \"texte\"", sl, sc);
          }
          raw += src[i];
          adv();
        }
      }
      if (i >= src.length) {
        throw new T4C2Error("chaîne non fermée. Essaie : affiche \"texte\"", sl, sc);
      }
      adv();
      tokens.push({ type: "STRING", value: unescapeString(raw), line: sl, col: sc });
      continue;
    }

    if (c === "«") {
      let raw = "";
      adv();
      while (i < src.length && src[i] !== "»") {
        raw += src[i];
        adv();
      }
      if (i >= src.length) {
        throw new T4C2Error("guillemets « » non fermés. Essaie : affiche «bonjour»", sl, sc);
      }
      adv();
      tokens.push({ type: "STRING", value: raw, line: sl, col: sc });
      continue;
    }

    if (c === "-" && /[0-9]/.test(src[i + 1] || "")) {
      let raw = "-";
      adv();
      while (i < src.length && /[0-9]/.test(src[i])) {
        raw += src[i];
        adv();
      }
      if ((src[i] === "." || src[i] === ",") && /[0-9]/.test(src[i + 1] || "")) {
        raw += ".";
        adv();
        while (i < src.length && /[0-9]/.test(src[i])) {
          raw += src[i];
          adv();
        }
      }
      tokens.push({ type: "NUMBER", value: Number(raw), raw, line: sl, col: sc });
      continue;
    }

    if (/[0-9]/.test(c)) {
      let raw = "";
      while (i < src.length && /[0-9]/.test(src[i])) {
        raw += src[i];
        adv();
      }
      if ((src[i] === "." || src[i] === ",") && /[0-9]/.test(src[i + 1] || "")) {
        raw += ".";
        adv();
        while (i < src.length && /[0-9]/.test(src[i])) {
          raw += src[i];
          adv();
        }
      }
      tokens.push({ type: "NUMBER", value: Number(raw), raw, line: sl, col: sc });
      continue;
    }

    if (identStart(c)) {
      let raw = "";
      while (i < src.length && identPart(src[i])) {
        raw += src[i];
        adv();
      }
      const name = raw.normalize("NFC").toLowerCase();
      const type = RESERVED.has(name) || STMT.has(name) ? "KEYWORD" : "IDENT";
      tokens.push({ type, value: name, raw, line: sl, col: sc });
      continue;
    }

    const hint = (
      {
        "+": "Essaie : ajoute x y",
        "-": "Essaie : soustrait x y  ou  le nombre -5",
        "*": "Essaie : multiplie x y",
        "/": "Essaie : divise x y",
        "=": "Essaie : egal x y",
        "(": "T4C2 n'utilise pas de parenthèses. Écris : ajoute 1 2",
        ")": "T4C2 n'utilise pas de parenthèses.",
        ",": "Pour un nombre français, colle les chiffres : 3,14",
      }[c] || "Enlève ce caractère, ou mets le texte entre \"guillemets\"."
    );
    throw new T4C2Error(`T4C2 ne connaît pas « ${c} ». ${hint}`, sl, sc);
  }

  tokens.push({ type: "EOF", value: "", line, col });
  return tokens;
}

function loc(tok) {
  return tok ? { line: tok.line, col: tok.col } : { line: 0, col: 0 };
}

function collectArities(tokens) {
  const found = new Map();
  for (let k = 0; k < tokens.length; k++) {
    if (tokens[k].value === "fonc" && tokens[k + 1] && tokens[k + 1].type === "IDENT") {
      const name = tokens[k + 1].value;
      let n = 0;
      let j = k + 2;
      while (tokens[j] && tokens[j].type === "IDENT") {
        n++;
        j++;
      }
      found.set(name, n);
    }
  }
  return found;
}

function parser(tokens, { functions } = {}) {
  const arities = functions instanceof Map ? new Map(functions) : new Map();
  collectArities(tokens).forEach((n, name) => {
    if (!arities.has(name)) arities.set(name, n);
  });
  let i = 0;

  const peek = () => tokens[i];
  const at = (type, value) => {
    const t = peek();
    if (!t) return false;
    if (type && t.type !== type) return false;
    if (value !== undefined && t.value !== value) return false;
    return true;
  };
  const next = () => tokens[i++];

  function fail(msg, tok = peek()) {
    const { line, col } = loc(tok);
    throw new T4C2Error(msg, line, col);
  }

  function expectValue(value) {
    const t = peek();
    if (!t || t.value !== value) {
      fail(
        `j'attendais « ${value} ». Tu as écrit « ${t && t.type !== "EOF" ? t.raw || t.value : "fin du code"} ».`,
        t,
      );
    }
    return next();
  }

  function isExprStart(t) {
    if (!t || t.type === "EOF") return false;
    if (t.type === "NUMBER" || t.type === "STRING" || t.type === "IDENT" || t.value === "result") return true;
    if (t.type !== "KEYWORD") return false;
    if (STMT.has(t.value) && !SPECIAL_EXPR.has(t.value) && !BINARY.has(t.value) && !UNARY.has(t.value)) {
      return false;
    }
    return BINARY.has(t.value) || UNARY.has(t.value) || SPECIAL_EXPR.has(t.value);
  }

  function parseExpression(depth = 0) {
    if (depth > MAX_DEPTH) fail("expression trop imbriquée.");
    const t = peek();
    if (!t || t.type === "EOF") fail("il manque une valeur ici.");

    if (t.type === "NUMBER") {
      next();
      return { type: "literal", value: t.value, ...loc(t) };
    }
    if (t.type === "STRING") {
      next();
      return { type: "literal", value: t.value, ...loc(t) };
    }
    if (t.value === "vrai" || t.value === "faux") {
      next();
      return { type: "literal", value: t.value === "vrai", ...loc(t) };
    }
    if (t.value === "liste") {
      next();
      const items = [];
      while (isExprStart(peek())) items.push(parseExpression(depth + 1));
      return { type: "liste", items, ...loc(t) };
    }
    if (t.value === "aleatoire") {
      next();
      const args = [];
      if (isExprStart(peek())) {
        args.push(parseExpression(depth + 1));
        if (isExprStart(peek())) args.push(parseExpression(depth + 1));
      }
      return { type: "call", op: "aleatoire", args, ...loc(t) };
    }
    if (t.value === "minimum" || t.value === "maximum") {
      const op = next().value;
      const args = [parseExpression(depth + 1)];
      if (isExprStart(peek())) args.push(parseExpression(depth + 1));
      return { type: "call", op, args, ...loc(t) };
    }
    if (UNARY.has(t.value)) {
      const op = next().value;
      return { type: "call", op, args: [parseExpression(depth + 1)], ...loc(t) };
    }
    if (BINARY.has(t.value)) {
      const op = next().value;
      return {
        type: "call",
        op,
        args: [parseExpression(depth + 1), parseExpression(depth + 1)],
        ...loc(t),
      };
    }
    if (t.type === "IDENT" || t.value === "result") {
      const name = t.value;
      next();
      if (arities.has(name)) {
        const args = [];
        const n = arities.get(name);
        for (let k = 0; k < n; k++) args.push(parseExpression(depth + 1));
        return { type: "appel", name, args, ...loc(t) };
      }
      return { type: "var", name, ...loc(t) };
    }
    fail(`je ne peux pas lire « ${t.raw || t.value} » comme une valeur.`, t);
  }

  function parseBlock(terminators) {
    const ast = [];
    while (peek() && peek().type !== "EOF") {
      if (terminators.includes(peek().value)) return ast;
      ast.push(parseInstruction());
    }
    return ast;
  }

  function parseSi(start) {
    const branches = [];
    const cond = parseExpression();
    expectValue("alors");
    const body = parseBlock(["sinon", "sinon_si", "fin"]);
    branches.push({ cond, body });
    while (at("KEYWORD", "sinon_si")) {
      next();
      const c = parseExpression();
      expectValue("alors");
      const b = parseBlock(["sinon", "sinon_si", "fin"]);
      branches.push({ cond: c, body: b });
    }
    let sinon = [];
    if (at("KEYWORD", "sinon")) {
      next();
      sinon = parseBlock(["fin"]);
    }
    expectValue("fin");
    return { type: "si", branches, sinon, ...loc(start) };
  }

  function parseInstruction() {
    const t = peek();
    if (!t || t.type === "EOF") fail("fin de code inattendue.");

    if (t.value === "aide") {
      next();
      return { type: "aide", ...loc(t) };
    }
    if (t.value === "affiche") {
      next();
      return { type: "affiche", expr: parseExpression(), ...loc(t) };
    }
    if (t.value === "soit" || t.value === "set") {
      next();
      const nameTok = peek();
      if (nameTok && RESERVED.has(nameTok.value) && nameTok.value !== "result") {
        fail(`« ${nameTok.value} » est un mot de T4C2. Choisis un autre nom.`, nameTok);
      }
      if (!nameTok || (nameTok.type !== "IDENT" && nameTok.value !== "result")) {
        fail("après soit, j'attendais un nom de variable. Essaie : soit age 12", nameTok);
      }
      next();
      return { type: "soit", name: nameTok.value, expr: parseExpression(), ...loc(t) };
    }
    if (t.value === "si") {
      next();
      return parseSi(t);
    }
    if (t.value === "repete") {
      next();
      const count = parseExpression();
      const body = parseBlock(["fin"]);
      expectValue("fin");
      return { type: "repete", count, body, ...loc(t) };
    }
    if (t.value === "tant_que") {
      next();
      const cond = parseExpression();
      expectValue("faire");
      const body = parseBlock(["fin"]);
      expectValue("fin");
      return { type: "tant_que", cond, body, ...loc(t) };
    }
    if (t.value === "pour") {
      next();
      if (peek() && peek().value === "chaque") {
        next();
        const nameTok = peek();
        if (!nameTok || nameTok.type !== "IDENT") {
          fail("après pour chaque, j'attendais un nom. Essaie : pour chaque note dans notes", nameTok);
        }
        next();
        expectValue("dans");
        const list = parseExpression();
        const body = parseBlock(["fin"]);
        expectValue("fin");
        return { type: "pour_chaque", name: nameTok.value, list, body, ...loc(t) };
      }
      const nameTok = peek();
      if (!nameTok || nameTok.type !== "IDENT") {
        fail("après pour, j'attendais un nom. Essaie : pour i de 1 a 10", nameTok);
      }
      next();
      expectValue("de");
      const from = parseExpression();
      expectValue("a");
      const to = parseExpression();
      const body = parseBlock(["fin"]);
      expectValue("fin");
      return { type: "pour", name: nameTok.value, from, to, body, ...loc(t) };
    }
    if (t.value === "fonc") {
      next();
      const nameTok = peek();
      if (!nameTok || nameTok.type !== "IDENT") {
        fail("après fonc, j'attendais un nom. Essaie : fonc double x", nameTok);
      }
      next();
      const params = [];
      while (peek() && peek().type === "IDENT") params.push(next().value);
      arities.set(nameTok.value, params.length);
      const body = parseBlock(["fin"]);
      expectValue("fin");
      return { type: "fonc", name: nameTok.value, params, body, ...loc(t) };
    }
    if (t.value === "retourne") {
      next();
      const expr = isExprStart(peek()) ? parseExpression() : { type: "var", name: "result", ...loc(t) };
      return { type: "retourne", expr, ...loc(t) };
    }
    if (t.value === "demande") {
      next();
      const nameTok = peek();
      if (!nameTok || nameTok.type !== "IDENT") {
        fail("après demande, j'attendais un nom. Essaie : demande nom \"Qui es-tu ?\"", nameTok);
      }
      next();
      const prompt = isExprStart(peek()) ? parseExpression() : { type: "literal", value: nameTok.value, ...loc(t) };
      return { type: "demande", name: nameTok.value, prompt, ...loc(t) };
    }
    if (t.value === "pousse") {
      next();
      return { type: "pousse", list: parseExpression(), expr: parseExpression(), ...loc(t) };
    }
    if (t.value === "retire") {
      next();
      return { type: "retire", list: parseExpression(), ...loc(t) };
    }
    if (t.value === "avance" || t.value === "tourne") {
      const op = next().value;
      return { type: op, expr: parseExpression(), ...loc(t) };
    }
    if (t.value === "leve" || t.value === "pose") {
      next();
      return { type: t.value, ...loc(t) };
    }
    if (t.value === "interrompre" || t.value === "continuer") {
      next();
      return { type: t.value, ...loc(t) };
    }
    if (t.value === "fin" || t.value === "alors" || t.value === "sinon" || t.value === "sinon_si" || t.value === "faire") {
      fail(`« ${t.value} » tout seul. Il manque le début du bloc (si, repete, tant_que…).`, t);
    }
    return { type: "expr_stmt", expr: parseExpression(), ...loc(t) };
  }

  const ast = parseBlock([]);
  if (peek() && peek().type !== "EOF") {
    fail(`il reste du code que je ne comprends pas : « ${peek().raw || peek().value} ».`);
  }
  return ast;
}

function isTruthy(val) {
  if (val === true) return true;
  if (val === false || val === 0 || val === "" || val === undefined || val === null) return false;
  if (Array.isArray(val)) return val.length > 0;
  return true;
}

function formatValue(val) {
  if (val === true) return "vrai";
  if (val === false) return "faux";
  if (typeof val === "number") {
    if (!Number.isFinite(val)) return "inconnu";
    if (Number.isInteger(val)) return String(val);
    const rounded = Math.round(val * 1e8) / 1e8;
    return String(rounded);
  }
  if (Array.isArray(val)) return `[${val.map(formatValue).join(" ")}]`;
  return String(val);
}

function defaultAsk(question) {
  if (typeof window !== "undefined" && typeof window.prompt === "function") {
    const v = window.prompt(question);
    return v === null ? "" : v;
  }
  if (typeof process !== "undefined" && process.stdout && typeof require === "function") {
    try {
      const fs = require("fs");
      process.stdout.write(`${question} `);
      const buf = Buffer.alloc(4096);
      const n = fs.readSync(0, buf, 0, 4096, null);
      return buf.toString("utf8", 0, n).replace(/\r?\n$/, "");
    } catch {
      return "";
    }
  }
  return "";
}

function createRuntime(ast, options = {}) {
  const outputFn = typeof options.outputFn === "function" ? options.outputFn : null;
  const yieldAsk = !!options.yieldAsk;
  const ask = typeof options.ask === "function" ? options.ask : (yieldAsk ? null : defaultAsk);
  const random = typeof options.random === "function" ? options.random : Math.random;
  let pendingAnswer;
  const maxMs = options.maxMs ?? MAX_MS;
  const maxIter = options.maxIterations ?? MAX_ITERATIONS;
  const maxOut = options.maxOutput ?? MAX_OUTPUT;

  const global = Object.assign({ result: 0 }, options.vars || {});
  const scopes = [global];
  const functions = new Map();
  const lines = [];
  const warnings = [];
  const turtle = {
    x: 0,
    y: 0,
    angle: -90,
    pen: true,
    path: [],
  };

  let iterations = 0;
  const t0 = Date.now();
  let stopped = null;

  for (const node of ast) {
    if (node.type === "fonc") {
      functions.set(node.name, node);
    }
  }

  const body = ast.filter((n) => n.type !== "fonc");
  const frames = [{ kind: "block", nodes: body, i: 0 }];

  function getVar(name, node) {
    if (name === "result") return global.result;
    for (let s = scopes.length - 1; s >= 0; s--) {
      if (Object.prototype.hasOwnProperty.call(scopes[s], name)) return scopes[s][name];
    }
    throw new T4C2Error(
      `la variable « ${name} » n'existe pas encore. Essaie : soit ${name} 0`,
      node && node.line,
      node && node.col,
    );
  }

  function setVar(name, value) {
    if (name === "result") {
      global.result = value;
      return;
    }
    scopes[scopes.length - 1][name] = value;
  }

  function emit(msg, isError) {
    if (lines.length >= maxOut) {
      if (lines.length === maxOut) {
        const extra = `… sortie trop longue (plus de ${maxOut} lignes). J'arrête d'afficher.`;
        lines.push({ text: extra, error: true });
        if (outputFn) outputFn(extra, true);
      }
      return;
    }
    const text = typeof msg === "string" ? msg : formatValue(msg);
    lines.push({ text, error: !!isError });
    if (outputFn) outputFn(text, !!isError);
  }

  function checkLimits() {
    iterations++;
    if (iterations > maxIter) {
      stopped = "boucle";
      throw new T4C2Error(`boucle trop longue (limite ${maxIter}). Ajoute une condition qui devient fausse.`);
    }
    if (iterations % 32 === 0 && Date.now() - t0 > maxMs) {
      stopped = "temps";
      throw new T4C2Error(`le programme a pris plus de ${maxMs} ms. Je l'ai arrêté pour ne pas figer l'écran.`);
    }
  }

  function valuesEqual(a, b) {
    if (a === b) return true;
    const n0 = typeof a === "number";
    const n1 = typeof b === "number";
    if (n0 !== n1) {
      const numSide = n0 ? a : b;
      const other = n0 ? b : a;
      if (typeof other === "string" && /^-?\d+([.,]\d+)?$/.test(other.trim())) {
        return numSide === Number(other.replace(",", "."));
      }
    }
    return false;
  }

  function num(v, op, node) {
    if (typeof v !== "number" || !Number.isFinite(v)) {
      throw new T4C2Error(
        `« ${op} » attend un nombre. Tu as donné ${formatValue(v)}.`,
        node && node.line,
        node && node.col,
      );
    }
    return v;
  }

  function evalExpr(expr) {
    if (!expr) throw new T4C2Error("valeur manquante.");
    switch (expr.type) {
      case "literal":
        return expr.value;
      case "var":
        return getVar(expr.name, expr);
      case "liste":
        return expr.items.map(evalExpr);
      case "appel": {
        const fn = functions.get(expr.name);
        if (!fn) {
          throw new T4C2Error(
            `la fonction « ${expr.name} » n'existe pas. Déclare-la : fonc ${expr.name} … fin`,
            expr.line,
            expr.col,
          );
        }
        const args = expr.args.map(evalExpr);
        const local = {};
        fn.params.forEach((p, idx) => {
          local[p] = args[idx];
        });
        scopes.push(local);
        const owner = { _return: undefined };
        const fnFrames = [{ kind: "fn", nodes: fn.body, i: 0 }];
        try {
          while (fnFrames.length) {
            const r = stepFrames(fnFrames, owner);
            if (r.done || r.returned) break;
          }
        } finally {
          scopes.pop();
        }
        const ret = owner._return !== undefined ? owner._return : global.result;
        global.result = ret;
        return ret;
      }
      case "call": {
        const op = expr.op;
        const args = expr.args.map(evalExpr);
        if (op === "aleatoire") {
          if (args.length === 0) return random();
          if (args.length === 1) {
            const n = Math.floor(num(args[0], op, expr));
            if (n < 1) return 0;
            return 1 + Math.floor(random() * n);
          }
          const a = Math.ceil(num(args[0], op, expr));
          const b = Math.floor(num(args[1], op, expr));
          if (b < a) return a;
          return a + Math.floor(random() * (b - a + 1));
        }
        if (op === "non") return isTruthy(args[0]) ? false : true;
        if (op === "racine") {
          const x = num(args[0], op, expr);
          if (x < 0) throw new T4C2Error("racine attend un nombre positif.", expr.line, expr.col);
          return Math.sqrt(x);
        }
        if (op === "arrondis") return Math.round(num(args[0], op, expr));
        if (op === "absolu") return Math.abs(num(args[0], op, expr));
        if (op === "minimum" || op === "maximum") {
          const pick = op === "minimum" ? Math.min : Math.max;
          if (args.length === 1) {
            if (!Array.isArray(args[0]) || !args[0].length) {
              throw new T4C2Error(`${op} attend deux nombres, ou une liste.`, expr.line, expr.col);
            }
            args[0].forEach((v) => num(v, op, expr));
            return pick(...args[0]);
          }
          return pick(num(args[0], op, expr), num(args[1], op, expr));
        }
        if (op === "longueur") {
          if (Array.isArray(args[0])) return args[0].length;
          return String(args[0]).length;
        }
        if (op === "taille") {
          if (!Array.isArray(args[0])) {
            throw new T4C2Error("taille attend une liste.", expr.line, expr.col);
          }
          return args[0].length;
        }
        if (op === "concat") return String(args[0]) + String(args[1]);
        if (op === "element") {
          if (!Array.isArray(args[0])) {
            throw new T4C2Error("element attend une liste.", expr.line, expr.col);
          }
          const idx = Math.floor(num(args[1], op, expr));
          if (idx < 1 || idx > args[0].length) {
            throw new T4C2Error(`l'élément ${idx} n'existe pas (la liste va de 1 à ${args[0].length}).`, expr.line, expr.col);
          }
          return args[0][idx - 1];
        }
        if (op === "et") return isTruthy(args[0]) && isTruthy(args[1]);
        if (op === "ou") return isTruthy(args[0]) || isTruthy(args[1]);
        if (op === "egal") return valuesEqual(args[0], args[1]);
        if (op === "different") return !valuesEqual(args[0], args[1]);
        if (op === "plus_grand") return args[0] > args[1];
        if (op === "plus_petit") return args[0] < args[1];
        if (op === "plus_grand_ou_egal") return args[0] >= args[1];
        if (op === "plus_petit_ou_egal") return args[0] <= args[1];
        const x = num(args[0], op, expr);
        const y = num(args[1], op, expr);
        if ((op === "divise" || op === "modulo") && y === 0) {
          throw new T4C2Error("division par zéro. Le deuxième nombre ne peut pas être 0.", expr.line, expr.col);
        }
        if (op === "ajoute") return x + y;
        if (op === "soustrait") return x - y;
        if (op === "multiplie") return x * y;
        if (op === "divise") return x / y;
        if (op === "modulo") return x % y;
        if (op === "puissance") return x ** y;
        throw new T4C2Error(`opération inconnue : ${op}`, expr.line, expr.col);
      }
      default:
        throw new T4C2Error(`expression inconnue : ${expr.type}`);
    }
  }

  function unwindLoop(frameList, kind) {
    while (frameList.length) {
      const f = frameList[frameList.length - 1];
      if (f.kind === "repete" || f.kind === "tant_que" || f.kind === "pour" || f.kind === "pour_chaque") {
        if (kind === "interrompre") frameList.pop();
        else f.i = f.nodes.length;
        return true;
      }
      if (f.kind === "fn") break;
      frameList.pop();
    }
    return false;
  }

  function enterLoop(frameList, frame) {
    frameList.push(frame);
  }

  function stepFrames(frameList, owner) {
    checkLimits();
    while (frameList.length) {
      const f = frameList[frameList.length - 1];
      if (f.i >= f.nodes.length) {
        if (f.kind === "repete") {
          f.left -= 1;
          if (f.left > 0) {
            f.i = 0;
            continue;
          }
        } else if (f.kind === "tant_que") {
          if (isTruthy(evalExpr(f.cond))) {
            f.i = 0;
            continue;
          }
        } else if (f.kind === "pour") {
          f.cur += f.step;
          const more = f.step > 0 ? f.cur <= f.to : f.cur >= f.to;
          if (more) {
            setVar(f.name, f.cur);
            f.i = 0;
            continue;
          }
        } else if (f.kind === "pour_chaque") {
          f.idx += 1;
          if (f.idx < f.items.length) {
            setVar(f.name, f.items[f.idx]);
            f.i = 0;
            continue;
          }
        }
        frameList.pop();
        continue;
      }

      const node = f.nodes[f.i];
      const signal = exec(node, frameList, owner);
      if (signal && signal.ask) return signal;
      f.i += 1;
      return signal || { done: false, node };
    }
    return { done: true };
  }

  function exec(node, frameList, owner) {
    switch (node.type) {
      case "aide": {
        [
          "T4C2 — affiche, soit, si, pour, pour chaque, repete, tant_que",
          "Calcul : ajoute soustrait multiplie divise modulo puissance racine arrondis aleatoire minimum maximum absolu",
          "Texte : «bonjour» ou \"bonjour\"  ·  Nombre : 3,14 ou -5",
          "Plus loin : fonc, liste, demande, avance / tourne",
        ].forEach((line) => emit(line, false));
        return { done: false, node };
      }
      case "affiche": {
        const v = evalExpr(node.expr);
        emit(formatValue(v), false);
        global.result = v;
        return { done: false, node };
      }
      case "soit": {
        const v = evalExpr(node.expr);
        setVar(node.name, v);
        global.result = v;
        return { done: false, node };
      }
      case "expr_stmt": {
        global.result = evalExpr(node.expr);
        return { done: false, node };
      }
      case "si": {
        let taken = false;
        for (const br of node.branches) {
          if (isTruthy(evalExpr(br.cond))) {
            frameList.push({ kind: "block", nodes: br.body, i: 0 });
            taken = true;
            break;
          }
        }
        if (!taken && node.sinon.length) {
          frameList.push({ kind: "block", nodes: node.sinon, i: 0 });
        }
        return { done: false, node };
      }
      case "repete": {
        const n = evalExpr(node.count);
        if (typeof n !== "number" || n < 0) {
          throw new T4C2Error("repete attend un nombre positif.", node.line, node.col);
        }
        const times = Math.floor(n);
        if (times > 0) {
          enterLoop(frameList, { kind: "repete", nodes: node.body, i: 0, left: times });
        }
        return { done: false, node };
      }
      case "tant_que": {
        if (isTruthy(evalExpr(node.cond))) {
          enterLoop(frameList, { kind: "tant_que", nodes: node.body, i: 0, cond: node.cond });
        }
        return { done: false, node };
      }
      case "pour": {
        const from = evalExpr(node.from);
        const to = evalExpr(node.to);
        if (typeof from !== "number" || typeof to !== "number") {
          throw new T4C2Error("pour attend deux nombres. Essaie : pour i de 1 a 10", node.line, node.col);
        }
        const step = from <= to ? 1 : -1;
        setVar(node.name, from);
        enterLoop(frameList, {
          kind: "pour",
          nodes: node.body,
          i: 0,
          name: node.name,
          cur: from,
          to,
          step,
        });
        return { done: false, node };
      }
      case "pour_chaque": {
        const list = evalExpr(node.list);
        if (!Array.isArray(list)) {
          throw new T4C2Error("pour chaque attend une liste. Essaie : pour chaque note dans notes", node.line, node.col);
        }
        if (list.length) {
          setVar(node.name, list[0]);
          enterLoop(frameList, {
            kind: "pour_chaque",
            nodes: node.body,
            i: 0,
            name: node.name,
            items: list,
            idx: 0,
          });
        }
        return { done: false, node };
      }
      case "demande": {
        const q = formatValue(evalExpr(node.prompt));
        if (pendingAnswer === undefined && !ask) {
          return { done: false, ask: { name: node.name, question: q }, node };
        }
        const raw = pendingAnswer !== undefined ? pendingAnswer : ask(q);
        pendingAnswer = undefined;
        let v = raw;
        if (raw !== "" && !Number.isNaN(Number(String(raw).replace(",", "."))) && String(raw).trim() !== "") {
          const n = Number(String(raw).replace(",", "."));
          if (String(raw).trim().match(/^-?\d+([.,]\d+)?$/)) v = n;
        }
        setVar(node.name, v);
        global.result = v;
        return { done: false, node };
      }
      case "pousse": {
        const list = evalExpr(node.list);
        if (!Array.isArray(list)) {
          throw new T4C2Error("pousse attend une liste.", node.line, node.col);
        }
        list.push(evalExpr(node.expr));
        global.result = list.length;
        return { done: false, node };
      }
      case "retire": {
        const list = evalExpr(node.list);
        if (!Array.isArray(list)) {
          throw new T4C2Error("retire attend une liste.", node.line, node.col);
        }
        global.result = list.pop();
        return { done: false, node };
      }
      case "avance": {
        const n = num(evalExpr(node.expr), "avance", node);
        const rad = (turtle.angle * Math.PI) / 180;
        const nx = turtle.x + Math.cos(rad) * n;
        const ny = turtle.y + Math.sin(rad) * n;
        if (turtle.pen) {
          turtle.path.push({ x1: turtle.x, y1: turtle.y, x2: nx, y2: ny });
        }
        turtle.x = nx;
        turtle.y = ny;
        return { done: false, node };
      }
      case "tourne": {
        turtle.angle += num(evalExpr(node.expr), "tourne", node);
        return { done: false, node };
      }
      case "leve":
        turtle.pen = false;
        return { done: false, node };
      case "pose":
        turtle.pen = true;
        return { done: false, node };
      case "interrompre":
        if (!unwindLoop(frameList, "interrompre")) {
          throw new T4C2Error("interrompre doit être dans une boucle.", node.line, node.col);
        }
        return { done: false, node };
      case "continuer":
        if (!unwindLoop(frameList, "continuer")) {
          throw new T4C2Error("continuer doit être dans une boucle.", node.line, node.col);
        }
        return { done: false, node };
      case "retourne": {
        const v = evalExpr(node.expr);
        global.result = v;
        if (owner) owner._return = v;
        while (frameList.length) frameList.pop();
        return { done: true, returned: true, node };
      }
      case "fonc":
        return { done: false, node };
      default:
        throw new T4C2Error(`instruction inconnue : ${node.type}`, node.line, node.col);
    }
  }

  function snapshotVars() {
    const out = {};
    Object.keys(global).sort().forEach((k) => {
      out[k] = global[k];
    });
    return out;
  }

  function step() {
    try {
      const r = stepFrames(frames, null);
      return {
        done: !!r.done,
        node: r.node,
        ask: r.ask || null,
        variables: snapshotVars(),
        output: lines.slice(),
        turtle,
        warnings,
        error: null,
      };
    } catch (err) {
      return {
        done: true,
        ask: null,
        variables: snapshotVars(),
        output: lines.slice(),
        turtle,
        warnings,
        error: err,
      };
    }
  }

  function runAll() {
    let last = { done: false, ask: null, variables: snapshotVars(), output: lines, turtle, warnings, error: null };
    while (!last.done) {
      last = step();
      if (last.error || last.ask) break;
    }
    return last;
  }

  function answer(value) {
    pendingAnswer = value;
  }

  return {
    step,
    runAll,
    answer,
    variables: global,
    lines,
    warnings,
    turtle,
    formatValue,
  };
}

function runT4C2(code, outputFn, options) {
  const opts = typeof outputFn === "function"
    ? Object.assign({ outputFn }, options || {})
    : Object.assign({}, outputFn || {}, options || {});
  const tokens = lexer(code);
  const functions = new Map();
  const ast = parser(tokens, { functions });
  const rt = createRuntime(ast, opts);
  const result = rt.runAll();
  if (result.error) throw result.error;
  return result.variables;
}

function runProgram(code, options = {}) {
  const captured = [];
  const opts = Object.assign({}, options, {
    outputFn: (msg, isError) => {
      captured.push({ text: String(msg), error: !!isError });
      if (typeof options.outputFn === "function") options.outputFn(msg, isError);
    },
  });
  try {
    const tokens = lexer(code);
    const ast = parser(tokens);
    const rt = createRuntime(ast, opts);
    const result = rt.runAll();
    return {
      ok: !result.error,
      paused: !!result.ask,
      ask: result.ask || null,
      runtime: result.ask ? rt : null,
      variables: result.variables,
      output: result.output.map((l) => l.text),
      lines: result.output,
      turtle: result.turtle,
      warnings: result.warnings.concat(lintT4C2(code, ast)),
      error: result.error,
      ast,
    };
  } catch (error) {
    return {
      ok: false,
      variables: { result: 0 },
      output: captured.map((l) => l.text),
      lines: captured,
      turtle: { path: [] },
      warnings: [],
      error,
      ast: null,
    };
  }
}

function indentLines(text, n) {
  const pad = "  ".repeat(n);
  return text
    .split("\n")
    .map((l) => (l ? pad + l : l))
    .join("\n");
}

function printExpr(expr) {
  if (!expr) return "";
  if (expr.type === "literal") {
    if (expr.value === true) return "vrai";
    if (expr.value === false) return "faux";
    if (typeof expr.value === "string") return `"${expr.value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    return String(expr.value);
  }
  if (expr.type === "var") return expr.name;
  if (expr.type === "liste") return `liste${expr.items.length ? " " + expr.items.map(printExpr).join(" ") : ""}`;
  if (expr.type === "appel") return `${expr.name}${expr.args.length ? " " + expr.args.map(printExpr).join(" ") : ""}`;
  if (expr.type === "call") return `${expr.op}${expr.args.length ? " " + expr.args.map(printExpr).join(" ") : ""}`;
  return "";
}

function printAst(ast, level = 0) {
  const lines = [];
  const w = (s) => lines.push(indentLines(s, level));
  for (const node of ast) {
    switch (node.type) {
      case "aide":
        w("aide");
        break;
      case "affiche":
        w(`affiche ${printExpr(node.expr)}`);
        break;
      case "soit":
        w(`soit ${node.name} ${printExpr(node.expr)}`);
        break;
      case "expr_stmt":
        w(printExpr(node.expr));
        break;
      case "si": {
        node.branches.forEach((br, idx) => {
          w(`${idx === 0 ? "si" : "sinon_si"} ${printExpr(br.cond)} alors`);
          lines.push(printAst(br.body, 0).split("\n").map((l) => (l ? "  " + l : l)).join("\n"));
        });
        if (node.sinon.length) {
          w("sinon");
          lines.push(printAst(node.sinon, 0).split("\n").map((l) => (l ? "  " + l : l)).join("\n"));
        }
        w("fin");
        break;
      }
      case "repete":
        w(`repete ${printExpr(node.count)}`);
        lines.push(printAst(node.body, 0).split("\n").map((l) => (l ? "  " + l : l)).join("\n"));
        w("fin");
        break;
      case "tant_que":
        w(`tant_que ${printExpr(node.cond)} faire`);
        lines.push(printAst(node.body, 0).split("\n").map((l) => (l ? "  " + l : l)).join("\n"));
        w("fin");
        break;
      case "pour":
        w(`pour ${node.name} de ${printExpr(node.from)} a ${printExpr(node.to)}`);
        lines.push(printAst(node.body, 0).split("\n").map((l) => (l ? "  " + l : l)).join("\n"));
        w("fin");
        break;
      case "pour_chaque":
        w(`pour chaque ${node.name} dans ${printExpr(node.list)}`);
        lines.push(printAst(node.body, 0).split("\n").map((l) => (l ? "  " + l : l)).join("\n"));
        w("fin");
        break;
      case "fonc":
        w(`fonc ${node.name}${node.params.length ? " " + node.params.join(" ") : ""}`);
        lines.push(printAst(node.body, 0).split("\n").map((l) => (l ? "  " + l : l)).join("\n"));
        w("fin");
        break;
      case "retourne":
        w(`retourne ${printExpr(node.expr)}`);
        break;
      case "demande":
        w(`demande ${node.name} ${printExpr(node.prompt)}`);
        break;
      case "pousse":
        w(`pousse ${printExpr(node.list)} ${printExpr(node.expr)}`);
        break;
      case "retire":
        w(`retire ${printExpr(node.list)}`);
        break;
      case "avance":
      case "tourne":
        w(`${node.type} ${printExpr(node.expr)}`);
        break;
      case "leve":
      case "pose":
      case "interrompre":
      case "continuer":
        w(node.type);
        break;
      default:
        break;
    }
  }
  return lines.filter((l, idx, arr) => !(l === "" && arr[idx - 1] === "")).join("\n");
}

function formatT4C2(code) {
  const src = normalizeSource(code).replace(/\r\n/g, "\n");
  const rows = src.split("\n");
  let depth = 0;
  const out = [];
  for (const raw of rows) {
    const trimmed = raw.trim();
    if (!trimmed) {
      out.push("");
      continue;
    }
    const bare = trimmed.replace(/\/\/.*$/, "").replace(/#.*$/, "").trim().toLowerCase();
    const closer = /^(fin|sinon|sinon_si)\b/.test(bare);
    if (closer) depth = Math.max(0, depth - 1);
    out.push("  ".repeat(depth) + trimmed);
    if (/^(sinon|sinon_si)\b/.test(bare)) depth += 1;
    else if (/^(si|repete|tant_que|pour|fonc)\b/.test(bare)) depth += 1;
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]+$/gm, "").replace(/\s+$/, "") + "\n";
}

function walk(ast, fn) {
  if (!ast) return;
  const list = Array.isArray(ast) ? ast : [ast];
  for (const node of list) {
    if (!node || typeof node !== "object") continue;
    fn(node);
    for (const key of Object.keys(node)) {
      const v = node[key];
      if (v && typeof v === "object") walk(v, fn);
    }
  }
}

function lintT4C2(code, astReady) {
  const warnings = [];
  let ast = astReady;
  if (!ast) {
    try {
      ast = parser(lexer(code));
    } catch {
      return warnings;
    }
  }
  const assigned = new Set();
  const read = new Set();
  walk(ast, (node) => {
    if (node.type === "soit" || node.type === "demande" || node.type === "pour" || node.type === "pour_chaque") {
      assigned.add(node.name);
    }
    if (node.type === "var") read.add(node.name);
    if (node.type === "tant_que" && node.cond && node.cond.type === "var") {
      let mutated = false;
      walk(node.body, (inner) => {
        if ((inner.type === "soit" || inner.type === "demande") && inner.name === node.cond.name) mutated = true;
      });
      if (!mutated) {
        warnings.push({
          text: `la boucle tant_que « ${node.cond.name} » ne change jamais cette variable. Elle peut tourner trop longtemps.`,
          line: node.line,
        });
      }
    }
  });
  assigned.forEach((name) => {
    if (name !== "result" && !read.has(name)) {
      warnings.push({ text: `tu poses « ${name} » mais tu ne l'utilises jamais.`, line: 0 });
    }
  });
  return warnings;
}

const EXAMPLES = {
  hello: `// Mission 1 — Dire bonjour
affiche «Bonjour T4C2»
affiche 1
`,
  variables: `// Mission 2 — Garder une valeur
soit prenom «Teo»
soit age 12
affiche prenom
affiche age
soit prochain ajoute age 1
affiche «L'an prochain :»
affiche prochain
`,
  conditions: `// Mission 3 — Décider
soit points 14
si plus_grand_ou_egal points 10 alors
  affiche «C'est réussi»
sinon
  affiche «Encore un effort»
fin
`,
  boucles: `// Mission 4 — Compter
affiche «Compte à rebours»
pour i de 5 a 1
  affiche i
fin
affiche «Décollage»
`,
  fizzbuzz: `// FizzBuzz lisible
pour i de 1 a 15
  si egal modulo i 15 0 alors
    affiche «FizzBuzz»
  sinon_si egal modulo i 3 0 alors
    affiche «Fizz»
  sinon_si egal modulo i 5 0 alors
    affiche «Buzz»
  sinon
    affiche i
  fin
fin
`,
  fibonacci: `// Fibonacci
soit a 0
soit b 1
affiche a
affiche b
repete 10
  soit suivant ajoute a b
  affiche suivant
  soit a b
  soit b suivant
fin
`,
  fonctions: `// Fonction
fonc double x
  retourne multiplie x 2
fin
affiche double 21
`,
  listes: `// Liste
soit notes liste 12 15 18
affiche taille notes
affiche element notes 2
pousse notes 20
affiche notes
`,
  chaque: `// Pour chaque
soit notes liste 12 15 18
pour chaque note dans notes
  affiche note
fin
affiche maximum notes
`,
  tortue: `// Carré
repete 4
  avance 80
  tourne 90
fin
`,
};

const MISSIONS = {
  hello: { title: "Dire bonjour", goal: "Affiche Bonjour T4C2 puis 1.", expect: ["Bonjour T4C2", "1"], next: "variables" },
  variables: { title: "Garder une valeur", goal: "Garde un prénom et un âge, puis affiche-les.", expect: ["Teo", "12", "L'an prochain :", "13"], next: "conditions" },
  conditions: { title: "Décider", goal: "Si les points sont au moins 10, affiche C'est réussi.", expect: ["C'est réussi"], next: "boucles" },
  boucles: { title: "Compter", goal: "Compte de 5 à 1, puis Décollage.", expect: ["Compte à rebours", "5", "4", "3", "2", "1", "Décollage"], next: "fizzbuzz" },
  fizzbuzz: { title: "FizzBuzz", goal: "FizzBuzz de 1 à 15. La dernière ligne est FizzBuzz.", expect: null, last: "FizzBuzz", next: "fonctions" },
  fibonacci: { title: "Fibonacci", goal: "Affiche au moins 0 puis 1.", expect: null, first: ["0", "1"], next: "fonctions" },
  fonctions: { title: "Fonction", goal: "Une fonction double qui affiche 42.", expect: ["42"], next: "listes" },
  listes: { title: "Liste", goal: "Une liste de notes. Affiche au moins la taille.", expect: null, contains: ["3"], next: "chaque" },
  chaque: { title: "Pour chaque", goal: "Parcours une liste avec pour chaque.", expect: ["12", "15", "18", "18"], next: "tortue" },
  tortue: { title: "Tortue", goal: "Dessine un carré : 4 fois avance et tourne.", expect: null, turtle: 4, next: null },
};

function highlightHtml(code, escapeHtml) {
  const esc = escapeHtml || ((s) =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
  const src = String(code);
  const re = /(\/\/[^\n]*|#[^\n]*)|([«“][^»”]*[»”]|"(?:[^"\\]|\\.)*")|\b(si|alors|sinon_si|sinon|fin|repete|tant_que|faire|pour|chaque|dans|de|fonc|retourne|interrompre|continuer)\b|\b(affiche|aide|soit|set|demande|ajoute|soustrait|multiplie|divise|modulo|puissance|racine|arrondis|aleatoire|minimum|maximum|absolu|egal|different|plus_grand_ou_egal|plus_petit_ou_egal|plus_grand|plus_petit|et|ou|non|concat|longueur|liste|pousse|retire|taille|element|avance|tourne|leve|pose|vrai|faux)\b|\b(-?\d+(?:[.,]\d+)?)\b/gi;
  let result = "";
  let last = 0;
  let m;
  while ((m = re.exec(src)) !== null) {
    result += esc(src.slice(last, m.index));
    if (m[1]) result += `<span class="hl-comment">${esc(m[1])}</span>`;
    else if (m[2]) result += `<span class="hl-string">${esc(m[2])}</span>`;
    else if (m[3]) result += `<span class="hl-control">${esc(m[3])}</span>`;
    else if (m[4]) result += `<span class="hl-keyword">${esc(m[4])}</span>`;
    else if (m[5]) result += `<span class="hl-number">${esc(m[5])}</span>`;
    last = re.lastIndex;
  }
  result += esc(src.slice(last));
  if (src.endsWith("\n")) result += " ";
  return result;
}

function printHelp() {
  return `T4C2 ${VERSION} — langage de programmation en français

Usage :
  t4c2                     REPL
  t4c2 programme.t4c2      exécute un fichier
  t4c2 --fmt fichier.t4c2  formate
  t4c2 --version

Dans le REPL, tape du T4C2 puis Entrée. .aide pour cette aide. .quitter pour sortir.
`;
}

function runCli(argv) {
  const args = argv.slice();
  if (args.includes("--version") || args.includes("-v")) {
    console.log(VERSION);
    return 0;
  }
  if (args.includes("--help") || args.includes("-h")) {
    console.log(printHelp());
    return 0;
  }
  const fmt = args.includes("--fmt");
  const files = args.filter((a) => !a.startsWith("-"));

  if (fmt) {
    const fs = require("fs");
    if (!files[0]) {
      console.error("Usage : t4c2 --fmt fichier.t4c2");
      return 1;
    }
    const src = fs.readFileSync(files[0], "utf8");
    process.stdout.write(formatT4C2(src));
    return 0;
  }

  if (files[0]) {
    const fs = require("fs");
    const src = fs.readFileSync(files[0], "utf8");
    const result = runProgram(src);
    result.output.forEach((line) => console.log(line));
    if (result.error) {
      console.error(result.error.message);
      return 1;
    }
    return 0;
  }

  const fs = require("fs");
  if (process.stdin.isTTY) {
    const readline = require("readline");
    let persist = { result: 0 };
    console.log(`T4C2 ${VERSION} — tape du français. .aide  .quitter`);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "t4c2> " });
    let buf = "";
    function unfinished(src) {
      const tokens = lexer(src);
      let open = 0;
      for (const t of tokens) {
        if (t.value === "si" || t.value === "repete" || t.value === "tant_que" || t.value === "pour" || t.value === "fonc") open++;
        if (t.value === "fin") open--;
      }
      return open > 0;
    }
    rl.prompt();
    rl.on("line", (line) => {
      const trimmed = line.trim();
      if (!buf && (trimmed === ".quitter" || trimmed === ".exit")) {
        rl.close();
        return;
      }
      if (!buf && (trimmed === ".aide" || trimmed === ".help")) {
        console.log(printHelp());
        rl.prompt();
        return;
      }
      if (!trimmed && !buf) {
        rl.prompt();
        return;
      }
      buf += (buf ? "\n" : "") + line;
      if (unfinished(buf)) {
        rl.setPrompt("… ");
        rl.prompt();
        return;
      }
      const result = runProgram(buf, { vars: persist, maxMs: 2000 });
      result.output.forEach((l) => console.log(l));
      if (result.error) console.error(result.error.message);
      persist = Object.assign({ result: 0 }, result.variables);
      buf = "";
      rl.setPrompt("t4c2> ");
      rl.prompt();
    });
    return 0;
  }

  const src = fs.readFileSync(0, "utf8");
  const result = runProgram(src);
  result.output.forEach((line) => console.log(line));
  if (result.error) {
    console.error(result.error.message);
    return 1;
  }
  return 0;
}

function checkMission(name, result) {
  const spec = MISSIONS[name];
  if (!spec || !result || result.error) {
    return { ok: false, message: result && result.error ? result.error.message : "Exécute d'abord le programme." };
  }
  const out = result.output || [];
  if (spec.expect) {
    const ok = spec.expect.every((line, i) => out[i] === line) && out.length === spec.expect.length;
    return ok
      ? { ok: true, message: "C'est bon.", next: spec.next }
      : { ok: false, message: spec.goal + " La sortie n'est pas encore celle de la mission." };
  }
  if (spec.last && out[out.length - 1] !== spec.last) {
    return { ok: false, message: spec.goal };
  }
  if (spec.first && spec.first.some((line, i) => out[i] !== line)) {
    return { ok: false, message: spec.goal };
  }
  if (spec.contains && spec.contains.some((line) => !out.includes(line))) {
    return { ok: false, message: spec.goal };
  }
  if (spec.turtle && !(result.turtle && result.turtle.path && result.turtle.path.length >= spec.turtle)) {
    return { ok: false, message: spec.goal };
  }
  return { ok: true, message: "C'est bon.", next: spec.next };
}

const api = {
  VERSION,
  T4C2_KEYWORDS,
  T4C2_CONTROL,
  T4C2Error,
  preprocess,
  lexer,
  parser,
  interpret(ast, outputFn, options) {
    const rt = createRuntime(ast, Object.assign({ outputFn }, options || {}));
    const result = rt.runAll();
    if (result.error) throw result.error;
    return result.variables;
  },
  createRuntime,
  runT4C2,
  runProgram,
  formatT4C2,
  lintT4C2,
  highlightHtml,
  EXAMPLES,
  MISSIONS,
  formatValue,
  checkMission,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}
if (typeof window !== "undefined") {
  window.T4C2 = api;
}

if (typeof require !== "undefined" && typeof module !== "undefined" && require.main === module) {
  const code = runCli(process.argv.slice(2));
  if (typeof code === "number" && code !== 0) process.exit(code);
}
