import { action, atom, entries, isObject, reatomAsync, take, withAssign } from '@reatom/framework';
import { FolderApi, Pane } from 'tweakpane';
import { ConfigItem, devtoolsConfig } from './config';
import { withLog } from '../../lib/reatom-helpers';
import { DevtoolsCookieChildKey, devtoolsCoords, DevtoolsCoords, devtoolsData } from './state.model';
import { isNullish, throttle } from '@/shared/lib/utils';

let x = 0;
let y = 0;

function hasSameStructure<T extends object>(pattern: T, target: unknown): target is T {
  if (
    typeof pattern !== 'object' || pattern === null ||
    typeof target !== 'object' || target === null
  ) {
    return false;
  }

  const patternKeys = Object.keys(pattern) as Array<keyof T>;

  return patternKeys.every((key) => {
    if (!Object.hasOwn(target, key)) return false;

    const valueP = pattern[key];
    const valueT = (target as any)[key];

    if (typeof valueP === 'object' && valueP !== null && !Array.isArray(valueP)) {
      return hasSameStructure(valueP, valueT);
    }

    return true;
  });
}

function getValueByPath<T>(obj: any, path: string): T | null {
  if (!obj || !path) return null;

  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }

  if (current && typeof current === 'object' && '__meta' in current) {
    return (current.value as T) ?? null;
  }

  return (current as T) ?? null;
}

const devtoolsState = atom(null, "devtoolsState").pipe(
  withAssign((_, name) => ({
    pane: atom<Pane | null>(null, `${name}.pane`)
  }))
)

export const devtools = atom(null, "devtools").pipe(
  withAssign((_, name) => ({
    init: reatomAsync(async (ctx) => {
      if (import.meta.hot?.data.pane) import.meta.hot.data.pane.dispose();

      const devtoolsPane = devtoolsState.pane(ctx, new Pane())!
      if (import.meta.hot) import.meta.hot.data.pane = devtoolsPane;

      const el = devtoolsPane.element
      el.style.position = "fixed"
      el.style.zIndex = "100";

      function initPosition() {
        const savedCoords = devtoolsCoords.get();

        if (savedCoords && typeof savedCoords.x === 'number') {
          x = Math.min(savedCoords.x, window.innerWidth - el.offsetWidth);
          y = Math.min(savedCoords.y, window.innerHeight - el.offsetHeight);

          el.style.left = `${x}px`;
          el.style.top = `${y}px`;

          return;
        }

        el.style.left = '16px';
        el.style.top = '16px';
      }

      function defineView() {
        const throttledSave = throttle((c: DevtoolsCoords) => devtoolsCoords.set(c), 200);

        el.onpointerdown = (ev) => {
          let offsetX = ev.clientX - el.offsetLeft;
          let offsetY = ev.clientY - el.offsetTop;

          function onMove(ev: PointerEvent) {
            el.style.cursor = "move";

            x = ev.clientX - offsetX;
            y = ev.clientY - offsetY;

            el.style.left = `${x}px`;
            el.style.top = `${y}px`;

            throttledSave({ x, y });
          }

          document.addEventListener("pointermove", onMove);

          document.onpointerup = () => {
            el.style.cursor = "auto";
            document.removeEventListener("pointermove", onMove);

            devtoolsCoords.set({ x, y });
            document.onpointerup = null;
          };
        };
      }

      let persistValues = devtoolsData.getAll();

      if (!persistValues) {
        persistValues = devtoolsData.setAll(devtoolsConfig)
      } else {
        const hasSame = hasSameStructure(persistValues, devtoolsConfig)

        if (!hasSame) {
          persistValues = devtoolsData.setAll(devtoolsConfig)
        }
      }

      function defineFolders() {
        const configEntries = entries(devtoolsConfig)

        configEntries.forEach(([folderName, bindings], index) => {
          const rootFolder = devtoolsPane.addFolder({
            title: folderName, expanded: true, index
          })

          function addBinding(data: typeof bindings, folder: FolderApi, path: string) {
            for (const [folderName, folderVal] of entries(data)) {
              if (isNullish(folderVal)) continue;

              const configItem = folderVal as unknown as ConfigItem<unknown>
              const fullPath = `${path}.${folderName}` as DevtoolsCookieChildKey;

              if (isObject(configItem)) {
                if ('__meta' in configItem) {
                  const currentVal = getValueByPath(persistValues, fullPath)
                  const binding = folder.addBinding({ [folderName]: currentVal }, folderName)

                  binding.on("change", ({ value: bindingVal }) => {
                    if (isNullish(bindingVal)) return;

                    devtoolsData.set(fullPath, bindingVal)

                    const { applyAs, applyTarget } = configItem.__meta

                    if (applyAs === "atom") {
                      applyTarget(ctx, bindingVal);
                    }
                  })

                  continue;
                }

                if (!Array.isArray(configItem)) {
                  const subFolder = folder.addFolder({
                    title: folderName, expanded: false
                  });

                  addBinding(configItem, subFolder, fullPath);
                }
              }
            }
          }

          addBinding(bindings, rootFolder, folderName)
        })
      }

      initPosition();
      defineView();
      defineFolders()
    }, `${name}.init`).pipe(withLog()),
    wrap: action(async (ctx, cb: (pane: Pane) => (() => void)) => {
      let devtoolsPane = ctx.get(devtoolsState.pane);

      if (!devtoolsPane) {
        devtoolsPane = await take(ctx, devtoolsState.pane)
      }

      if (!devtoolsPane) {
        console.warn('Skipping wrap devtools callback')
        return;
      }

      return cb(devtoolsPane)
    }, `${name}.wrap`).pipe(withLog())
  }))
)

devtools.init.onReject.onCall((_, e) => console.error(e))