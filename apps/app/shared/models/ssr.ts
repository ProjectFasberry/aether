import { createSsrModel } from './snapshot';

export const { snapshotAtom, withSsr } = createSsrModel({
  name: "default", subscribe: true, mutable: true
});
