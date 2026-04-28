import { action, atom } from "@reatom/core";
import { withAssign } from "@reatom/framework";
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

export const authSecurity = atom(null, "authSecurity").pipe(
  withAssign((_, name) => ({
    mnToHash: action(async (ctx, mn: string) => {
      const seed = await bip39.mnemonicToSeed(mn);
      const hashBuff = await crypto.subtle.digest('SHA-256', seed);
      const hash = Array.from(new Uint8Array(hashBuff))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      return hash
    }),
    generateMnemonic: action((ctx) => {
      return bip39.generateMnemonic(wordlist)
    })
  }))
)