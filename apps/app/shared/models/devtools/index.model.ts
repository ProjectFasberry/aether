import { action, type Atom, atom, entries, isObject, reatomAsync, take, withAssign } from '@reatom/framework';
import { FolderApi, Pane } from 'tweakpane';
import { type ConfigItem, devtoolsConfig } from './config';
import { type DevtoolsCookieChildKey, devtoolsCoords, type DevtoolsCoords, devtoolsData } from './state.model';
import { throttle } from '@/shared/lib/utils';
import { isMap, isNullish } from "@/shared/lib/helpers";

const devtoolsState = atom(null, "_devtoolsState").pipe(
  withAssign((_, name) => ({
    coords: atom({ x: 16, y: 16, w: 300, h: 400 }, `${name}.coords`),
    pane: atom<Nullable<Pane>>(null, `${name}.pane`)
  }))
)

export const devtools = atom(null, "_devtools").pipe(
  withAssign((_, name) => ({
    init: reatomAsync(async (ctx) => {
      if (import.meta.hot?.data.pane) import.meta.hot.data.pane.dispose();

      const devtoolsPane = devtoolsState.pane(ctx, new Pane()) as Pane
      if (import.meta.hot) import.meta.hot.data.pane = devtoolsPane;

      devtools.view.define(ctx, devtoolsPane.element)
      devtools.folders.define(ctx, devtoolsPane)
    }, `${name}.init`),
    folders: atom(null, `${name}.folders`).pipe(
      withAssign((_, name) => ({
        define: action((ctx, pane: Pane) => {
          const configEntries = entries(devtoolsConfig);

          configEntries.forEach(([folderName, bindings], index) => {
            const rootFolder = pane.addFolder({
              title: folderName, expanded: true, index
            })

            function addBinding(configData: typeof bindings, folder: FolderApi,path: string) {
              function bind(
                keyName: string,
                configItem: ConfigItem<unknown>,
                fullPath: DevtoolsCookieChildKey
              ) {
                const target = configItem.value

                if (isMap(target)) {
                  (target as Map<string, Atom<unknown>>).forEach((atom, key) => {
                    const value = {
                      get [key]() {
                        const state = ctx.get(atom);
                        return typeof state === 'object' ? JSON.stringify(state, null, 2) : state;
                      }
                    };

                    folder
                      .addBinding(value, key, { readonly: true, multiline: true, rows: 12 })

                    ctx.subscribe(atom, () => pane.refresh())
                  })
                } else {
                  let savedValue = devtoolsData.get(fullPath);

                  if (!isNullish(savedValue) && typeof savedValue !== typeof target) {
                    savedValue = null;
                  }

                  if (!isNullish(savedValue)) {
                    const { applyAs, applyTarget } = configItem.__meta;

                    if (applyAs === 'atom') {
                      applyTarget?.(ctx, savedValue);
                    }

                    if (applyAs === 'static') {
                      // configItem.__meta.onChange?.(savedValue)
                    }
                  }

                  const value = { [keyName]: !isNullish(savedValue) ? savedValue : target };

                  folder
                    .addBinding(value, keyName)
                    .on("change", ({ value: bindingVal }) => {
                      if (isNullish(bindingVal)) return;

                      devtoolsData.set(fullPath, bindingVal)

                      const { applyAs, applyTarget } = configItem.__meta;

                      if (applyAs === 'atom') {
                        applyTarget?.(ctx, bindingVal);
                      }

                      if (applyAs === 'static') {
                        configItem.__meta.onChange?.(bindingVal)
                      }
                    })
                }
              }

              for (const [key, val] of entries(configData)) {
                if (isNullish(val)) continue;

                const configItem = val as unknown as ConfigItem<unknown>
                const fullPath = `${path}.${key}` as DevtoolsCookieChildKey;

                if (isObject(configItem)) {
                  if ('__meta' in configItem) {
                    bind(key, configItem, fullPath);
                    continue;
                  }

                  if (!Array.isArray(configItem)) {
                    const subFolder = folder.addFolder({ title: key, expanded: false });
                    addBinding(configItem, subFolder, fullPath);
                  }
                }
              }
            }

            addBinding(bindings, rootFolder, folderName)
          })
        }, `${name}.define`)
      }))
    ),
    view: atom(null, `${name}.view`).pipe(
      withAssign((_, name) => ({
        define: action((ctx, el: HTMLElement) => {
          Object.assign(el.style, {
            position: "fixed",
            zIndex: "9999",
            top: "0px",
            left: "0px",
            overflow: "hidden",
            touchAction: "none",
            height: "600px",
            width: "600px"
          });

          const throttledSave = throttle((c: Partial<DevtoolsCoords>) => devtoolsCoords.set(c), 200);
          const clampCoords = (x: number, y: number, w: number, h: number) => {
            const maxX = Math.max(0, window.innerWidth - w);
            const maxY = Math.max(0, window.innerHeight - h);

            return {
              x: Math.max(0, Math.min(x, maxX)),
              y: Math.max(0, Math.min(y, maxY))
            };
          };

          const savedCoords = devtoolsCoords.get();

          if (savedCoords) {
            const current = ctx.get(devtoolsState.coords);
            const sanitized = clampCoords(savedCoords.x, savedCoords.y, current.w, current.h);

            devtoolsState.coords(ctx, (prev) => ({
              ...prev,
              ...savedCoords,
              ...sanitized
            }));
          }

          ctx.subscribe(devtoolsState.coords, (c) => {
            el.style.transform = `translate3d(${c.x}px, ${c.y}px, 0)`;
            el.style.width = `${c.w}px`;
            el.style.height = `${c.h}px`;
          });

          el.onpointerdown = (ev) => {
            const borderThreshold = 15;
            if (ev.offsetX > el.offsetWidth - borderThreshold || ev.offsetY > el.offsetHeight - borderThreshold) return;

            const startCoords = ctx.get(devtoolsState.coords);
            const shiftX = ev.clientX - startCoords.x;
            const shiftY = ev.clientY - startCoords.y;

            const onMove = (moveEv: PointerEvent) => {
              const x = moveEv.clientX - shiftX;
              const y = moveEv.clientY - shiftY;

              devtoolsState.coords(ctx, (prev) => ({ ...prev, x, y }));
              throttledSave({ x, y });
            };

            document.addEventListener("pointermove", onMove);
            document.addEventListener("pointerup", () => {
              document.removeEventListener("pointermove", onMove);
            }, { once: true });
          };
        }, `${name}.define`)
      }))
    ),
    wrap: action(async (ctx, cb: (pane: Pane) => (() => void)) => {
      let instance = ctx.get(devtoolsState.pane);

      if (!instance) {
        instance = await take(ctx, devtoolsState.pane)
      }

      if (!instance) {
        console.warn('Skipping wrap devtools callback')
        return;
      }

      return cb(instance)
    })
  }))
)

devtools.init.onReject.onCall((_, e) => console.error(e))
