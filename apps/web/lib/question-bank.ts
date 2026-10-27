import bank from "./question-bank.generated.json";
import { config } from "./config";

/**
 * #79: question bank (raw, auto-extracted from IDI PDFs; docs/content/question-bank.md). STAFF-ONLY drafting aid.
 * OFF unless features.questionBankImport (lawyer D4: copyright on wording) or GEOPOLL_QUESTION_BANK=1 (staging/tests).
 * Importing only PREFILLS the create form: the admin must add Hebrew text and save; new polls start closed.
 */
export type BankQ = { id: string; q: string; options: string[]; source: string };
const BANK = bank as BankQ[];
export const bankEnabled = () => config().features.questionBankImport || process.env.GEOPOLL_QUESTION_BANK === "1";
export const bankSize = () => BANK.length;
export function searchBank(q: string, limit = 20): BankQ[] {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return BANK.filter((x) => terms.every((t) => x.q.toLowerCase().includes(t) || x.id.toLowerCase().includes(t))).slice(0, limit);
}
export const bankById = (id: string) => BANK.find((x) => x.id === id);
const slug = (s: string, i: number) => (s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 20) || `o${i + 1}`);
/** Prefill for the admin form: en from the source, he left empty on purpose (must be written/reviewed by a human). */
export function bankPrefill(x: BankQ) {
  const used = new Set<string>();
  const options = x.options.map((o, i) => { let id = slug(o, i); while (used.has(id)) id = `${id}-${i}`; used.add(id); return `${id} |  | ${o}`; }).join("\n");
  return { id: "", question_en: x.q.slice(0, 200), source_en: `Adapted from ${x.source}`.slice(0, 300), options };
}
