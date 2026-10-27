import { webcrypto } from "node:crypto";
const k = await webcrypto.subtle.generateKey({ name: "RSA-PSS", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-384" }, true, ["sign", "verify"]);
process.stdout.write(JSON.stringify(await webcrypto.subtle.exportKey("jwk", k.privateKey)));
