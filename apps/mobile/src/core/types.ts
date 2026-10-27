/** Platform-agnostic ports so core logic runs (and is tested) without React Native. */
export interface KV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
}
export type JsonRes = { status: number; json: unknown };
/** HTTP port. `auth: true` attaches the Zone-A bearer; vote/relay calls MUST use auth: false. */
export type Http = (path: string, init?: { method?: string; body?: unknown; auth?: boolean }) => Promise<JsonRes>;
export type Token = { epoch: string; tier: string; preparedMsg: string; signature: string };
