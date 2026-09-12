export class T4C2Error extends Error {
  line: number;
  col: number;
}

export type T4C2Line = { text: string; error?: boolean };
export type T4C2Turtle = {
  x: number;
  y: number;
  angle: number;
  pen: boolean;
  path: { x1: number; y1: number; x2: number; y2: number }[];
};

export type T4C2Ask = { name: string; question: string };

export type T4C2Result = {
  ok: boolean;
  paused?: boolean;
  ask?: T4C2Ask | null;
  runtime?: T4C2Runtime | null;
  variables: Record<string, unknown>;
  output: string[];
  lines: T4C2Line[];
  turtle: T4C2Turtle;
  warnings: { text: string; line?: number }[];
  error: T4C2Error | null;
  ast: unknown;
};

export type T4C2Runtime = {
  step(): T4C2Result & { done: boolean; node?: { line?: number; col?: number } };
  runAll(): T4C2Result & { done: boolean; ask?: T4C2Ask | null };
  answer(value: unknown): void;
  variables: Record<string, unknown>;
  lines: T4C2Line[];
  warnings: { text: string; line?: number }[];
  turtle: T4C2Turtle;
};

export type T4C2Options = {
  outputFn?: (msg: string, isError?: boolean) => void;
  ask?: (question: string) => string;
  yieldAsk?: boolean;
  random?: () => number;
  maxMs?: number;
  maxIterations?: number;
  maxOutput?: number;
  vars?: Record<string, unknown>;
};

export function runProgram(code: string, options?: T4C2Options): T4C2Result;
export function runT4C2(
  code: string,
  outputFn?: ((msg: string, isError?: boolean) => void) | T4C2Options,
  options?: T4C2Options,
): Record<string, unknown>;
export function formatT4C2(code: string): string;
export function lintT4C2(code: string, astReady?: unknown): { text: string; line?: number }[];
export function highlightHtml(code: string, escapeHtml?: (s: string) => string): string;
export function formatValue(val: unknown): string;
export function checkMission(
  name: string,
  result: Pick<T4C2Result, "output" | "error" | "turtle">,
): { ok: boolean; message: string; next?: string | null };
export function lexer(input: string): unknown[];
export function parser(tokens: unknown[], options?: { functions?: Map<string, number> }): unknown[];
export function createRuntime(ast: unknown, options?: T4C2Options): T4C2Runtime;

export const VERSION: string;
export const T4C2_KEYWORDS: string[];
export const T4C2_CONTROL: string[];
export const EXAMPLES: Record<string, string>;
export const MISSIONS: Record<string, { title: string; goal: string; next?: string | null }>;

export as namespace T4C2;
