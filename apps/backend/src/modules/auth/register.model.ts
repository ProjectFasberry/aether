import bip39 from "bip39"

export function getMnemonic() {
  const mnemonic = bip39.generateMnemonic()
  return mnemonic
}