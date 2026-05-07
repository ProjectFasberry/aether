import { action, atom } from "@reatom/framework";
import { withAssign } from "@reatom/framework";
import { withLocalStorage } from "@reatom/persist-web-storage";
import { mnemonicToSeed, generateMnemonic } from '@scure/bip39';

export const teststr = atom<Nullable<string>>(null).pipe(withLocalStorage({ key: "test-str-auth-sp" }))

export const authSecurity = atom(null, "authSecurity").pipe(
  withAssign(() => ({
    mnToHash: async (mn: string) => {
      const seed = await mnemonicToSeed(mn);
      // @ts-ignore
      const buff = await crypto.subtle.digest('SHA-256', seed);

      const hash = Array.from(new Uint8Array(buff))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      return hash
    },
    generateMnemonic: action(async (ctx): Promise<string> => {
      const { wordlist } = await import("@scure/bip39/wordlists/english.js")

      if (import.meta.env.DEV) {
        const exists = ctx.get(teststr);
        return exists ? exists : teststr(ctx, generateMnemonic(wordlist))!
      }

      return generateMnemonic(wordlist)
    })
  }))
)