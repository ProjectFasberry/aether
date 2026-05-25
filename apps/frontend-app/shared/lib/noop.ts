export const createConsola = () => ({
  log: () => { },
  info: () => { },
  warn: () => { },
  error: () => { },
  withTag: () => ({ log: () => { }, info: () => { }, warn: () => { }, error: () => { } }),
});
export default { createConsola };