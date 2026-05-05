import { action, atom } from "@reatom/core";
import { withAssign } from "@reatom/framework";
import { withLocalStorage } from "@reatom/persist-web-storage";
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

export const teststr = atom<string | null>(null).pipe(withLocalStorage({ key: "test-str-auth-sp" }))

export const authSecurity = atom(null, "authSecurity").pipe(
  withAssign(() => ({
    mnToHash: async (mn: string) => {
      const seed = await bip39.mnemonicToSeed(mn);
      // @ts-expect-error
      const buff = await crypto.subtle.digest('SHA-256', seed);

      const hash = Array.from(new Uint8Array(buff))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      return hash
    },
    generateMnemonic: action((ctx): string => {
      if (import.meta.env.DEV) {
        const exists = ctx.get(teststr);
        return exists ? exists : teststr(ctx, bip39.generateMnemonic(wordlist))!
      }
      return bip39.generateMnemonic(wordlist)
    })
  }))
)