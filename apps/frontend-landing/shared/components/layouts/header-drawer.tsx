import { useAtom, useCtx } from "@reatom/npm-solid-js";
import { Link } from "../config/link";
import { pageState } from "@/shared/models/global.model";
import { tv } from "tailwind-variants";
import { For, Show } from "solid-js";
import { Accordion } from "@ark-ui/solid/accordion";
import { Typography } from "@/shared/ui/typography";
import { expImage, logoImage, MAIN_HEADER, sheetIsOpenAtom } from "./header.model";

const ExperienceCircle = () => {
  return (
    <img
      src={expImage}
      loading="lazy"
      width={16}
      height={16}
      alt=""
      draggable={false}
    />
  )
}

const itemVariant = tv({
  base: `flex border-2 border-neutral-600 hover:bg-neutral-600 group bg-neutral-800 rounded-md gap-6 py-2 px-2 w-full`
})

export const HeaderDrawerContent = () => {
  const ctx = useCtx();
  const [urlParsedAtom] = useAtom(pageState.urlParsed)
  const pathname = () => urlParsedAtom()?.pathname;

  const handleToPage = (href?: string | null) => {
    if (!href) return;
    sheetIsOpenAtom(ctx, state => !state);
  };

  return (
    <>
      <div class="flex justify-between px-2 items-center w-full">
        <Link href="/" class="bg-transparent right-6 relative top-2">
          <img src={logoImage} draggable={false} alt="Fasberry" width={224} height={64} />
        </Link>
      </div>
      <div class="flex flex-col items-center justify-center w-full gap-4 px-4">
        <For each={MAIN_HEADER}>
          {(item) => (
            <Show
              when={item.childs}
              fallback={
                <Show when={item.href}>
                  {(href) => (
                    <a
                      href={href()}
                      onClick={() => handleToPage(href())}
                      class={itemVariant()}
                    >
                      <div class="flex items-center gap-1">
                        <Show when={href() === pathname()}>
                          <ExperienceCircle />
                        </Show>
                        <Typography class="text-lg">{item.name}</Typography>
                      </div>
                    </a>
                  )}
                </Show>
              }
            >
              {(data) => (
                <Accordion.Root
                  multiple={false}
                  collapsible
                  defaultValue={[item.name]}
                >
                  <Accordion.Item value={item.name}>
                    <Accordion.ItemTrigger
                      onClick={() => handleToPage(item.href)}
                      class={itemVariant({ className: "flex items-center gap-1" })}
                    >
                      <Show when={item.href === pathname()}>
                        <ExperienceCircle />
                      </Show>
                      <Typography class="text-lg">{item.name}</Typography>
                    </Accordion.ItemTrigger>
                    <Accordion.ItemContent class="flex gap-2 pt-1">
                      <div class="w-[2px] mt-1 bg-neutral-800" />
                      <div class="flex flex-col gap-2 w-full">
                        <For each={data()}>
                          {(item) => (
                            <Show when={item.href}>
                              {(href) => (
                                <a
                                  href={href()}
                                  onClick={() => handleToPage(href())}
                                  class={itemVariant()}
                                >
                                  <div class="flex items-center gap-1">
                                    <Show when={href() === pathname()}>
                                      <ExperienceCircle />
                                    </Show>
                                    <Typography class="text-lg">{item.name}</Typography>
                                  </div>
                                </a>
                              )}
                            </Show>
                          )}
                        </For>
                      </div>
                    </Accordion.ItemContent>
                  </Accordion.Item>
                </Accordion.Root>
              )}
            </Show>
          )}
        </For>
      </div>
    </>
  )
}
