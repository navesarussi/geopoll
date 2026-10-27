/** Same derivation as server `nullifier()` (lib/crypto.ts), via WebCrypto on the device. */
export async function deviceNullifier(pollId: string, preparedMsg: Uint8Array): Promise<string> {
  const head = new TextEncoder().encode(`geopoll-nullifier|${pollId}|`);
  const buf = new Uint8Array(head.length + preparedMsg.length);
  buf.set(head); buf.set(preparedMsg, head.length);
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", buf));
  return Array.from(d, (x) => x.toString(16).padStart(2, "0")).join("");
}
