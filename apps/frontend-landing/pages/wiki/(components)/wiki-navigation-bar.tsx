import { Link } from "@/shared/components/config/link";
import { Accordion } from "@ark-ui/solid/accordion";
import { Skeleton } from "@/shared/ui/skeleton";
import { Typography } from "@/shared/ui/typography";
import { getIsActiveAtom, wikiCategories, wikiState } from "./wiki.model";
import { ClientOnly } from "vike-solid/ClientOnly";
import { useAtom } from "@reatom/npm-solid-js";
import { createSignal, For, Show } from "solid-js";
import { Icon } from "@/shared/ui/icon";
import { Drawer, DrawerContent, DrawerTrigger } from "@/shared/ui/drawer";

const BarTrigger = (p: { value: string, title: string, onClick?: () => void }) => {
  const [isActiveAtom] = useAtom(getIsActiveAtom(p.value));

  return (
    <Link
      href={`/wiki/${p.value}`}
      onClick={p.onClick}
      data-state={isActiveAtom() ? "true" : "false"}
      class="tr"
    >
      <Typography class="text-base text-left">&nbsp;&nbsp;{p.title}</Typography>
    </Link>
  )
}

const List = (p: { handle?: () => void }) => {
  const [dataAtom] = useAtom(wikiState.categories)
  const [statusesAtom] = useAtom(wikiCategories.fetch.statusesAtom);

  return (
    <Show
      when={!statusesAtom().isPending}
      fallback={<NavigationBarSkeleton />}
    >
      <Show when={dataAtom()} fallback={null}>
        <div class="flex flex-col p-4 w-full gap-12 h-full">
          <div class="flex flex-col gap-6">
            <For each={dataAtom()}>
              {([key, { title, isChilded, nodes }]) => (
                isChilded ? (
                  <Accordion.Root multiple={false} collapsible defaultValue={[key]}>
                    <Accordion.Item value={key}>
                      <Accordion.ItemTrigger class="p-2 group">
                        <Typography class="text-xl">
                          {title}
                        </Typography>
                      </Accordion.ItemTrigger>
                      <Accordion.ItemContent class="flex gap-1 w-full h-full">
                        <div class="w-1 mt-1 bg-neutral-800" />
                        <div class="flex flex-col gap-0.5 h-full w-full">
                          <For each={nodes}>
                            {(item) => (
                              <BarTrigger onClick={p.handle} {...item} />
                            )}
                          </For>
                        </div>
                      </Accordion.ItemContent>
                    </Accordion.Item>
                  </Accordion.Root>
                ) : (
                  <Link
                    href={`/wiki/${key}`}
                    onClick={p.handle}
                    class="tr"
                  >
                    <Typography class="text-xl">
                      {title}
                    </Typography>
                  </Link>
                )
              )}
            </For>
          </div>
          <div class="flex flex-col gap-y-2">
            <Typography class="text-xl">
              Прочее
            </Typography>
            <Link href="/modpack" class="group cursor-pointer">
              <Typography class="text-base">
                Сборки модов
              </Typography>
            </Link>
          </div>
        </div>
      </Show>
    </Show>
  )
}

const WikiNavigationMobile = () => {
  const [open, setOpen] = createSignal(false)

  return (
    <>
      <button
        class="focus:scale-[1.05] cursor-pointer"
        onClick={() => window.history.back()}
      >
        <Icon name="sprite:arrow-right" />
      </button>
      <Drawer open={open()} onOpenChange={v => setOpen(v)}>
        <DrawerTrigger class="cursor-pointer focus:scale-[1.05]">
          <Icon name="sprite:category" />
        </DrawerTrigger>
        <DrawerContent
          class="xl:hidden bg-neutral-900 rounded-t-xl py-3 px-0 border-none max-h-[60vh] overflow-y-auto
          scrollbar-w-2 scrollbar-thumb-rounded-xl scrollbar-track-neutral-900 scrollbar-thumb-neutral-700 scrollbar
        "
        >
          <Drawer.Label class="text-xl text-center">Навигация</Drawer.Label>
          <div class="flex flex-col w-full items-start">
            <ClientOnly>
              <List handle={() => setOpen(false)} />
            </ClientOnly>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}

const NavigationBarSkeleton = () => {
  return (
    <div class="flex flex-col gap-8 p-4 w-full">
      <Skeleton class="h-8 w-4/5" />
      <div class="flex flex-col gap-2 w-full h-full">
        <Skeleton class="h-8 w-2/3" />
        <div class="flex flex-col items-start gap-1 w-full h-full px-2">
          <Skeleton class="h-7 w-4/5" />
          <Skeleton class="h-7 w-28" />
          <Skeleton class="h-7 w-16" />
          <Skeleton class="h-7 w-20" />
          <Skeleton class="h-7 w-2/3" />
          <Skeleton class="h-7 w-24" />
          <Skeleton class="h-7 w-20" />
          <Skeleton class="h-7 w-32" />
          <Skeleton class="h-7 w-28" />
          <Skeleton class="h-7 w-28" />
          <Skeleton class="h-7 w-16" />
          <Skeleton class="h-7 w-2/4" />
          <Skeleton class="h-7 w-28" />
        </div>
      </div>
      <Skeleton class="h-8 w-1/2" />
      <Skeleton class="h-8 w-3/4" />
      <Skeleton class="h-8 w-36" />
    </div>
  )
}

export const WikiNavigation = () => {
  return (
    <>
      <div class="card hidden xl:flex flex-col p-0 min-h-[80vh] w-full xl:w-[25%] items-start sticky top-2">
        <ClientOnly fallback={<NavigationBarSkeleton />}>
          <List />
        </ClientOnly>
      </div>
      <div class="xl:hidden flex items-center justify-between
        fixed bottom-4 left-1/2 right-0 px-4 -translate-x-1/2 h-12 w-36 aspect-square z-30 rounded-lg bg-neutral-700/60 backdrop-blur-md"
      >
        <WikiNavigationMobile />
      </div>
    </>
  )
}
