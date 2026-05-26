import { Link } from "@/shared/components/config/link";
import { toast } from 'solid-sonner';
import { Menu } from '@ark-ui/solid/menu'
import { Typography } from "@/shared/ui/typography";
import { useAtom } from "@reatom/npm-solid-js";
import { For, lazy, Show } from "solid-js";
import { pageState } from "@/shared/models/global.model";
import { Drawer, DrawerContent, DrawerTrigger } from "@/shared/ui/drawer";
import { getStaticObject } from "@/shared/lib/helpers";
import { ClientOnly } from "vike-solid/ClientOnly";
import { expImage, logoImage, MAIN_HEADER, sheetIsOpenAtom } from "./header.model";

const HeaderDrawerContent = lazy(() => import("./header-drawer").then(m => ({ default: m.HeaderDrawerContent })))

export const HeaderDrawer = () => {
  const [isOpenAtom, setIsOpenAtom] = useAtom(sheetIsOpenAtom)

  const chestStatusImage = isOpenAtom()
    ? getStaticObject("minecraft/icons", "chest_opened.webp")
    : getStaticObject("minecraft/icons", "chest_closed.webp")

  return (
    <Drawer
      modal
      open={isOpenAtom()}
      onOpenChange={v => setIsOpenAtom(v)}
    >
      <DrawerTrigger
        aria-label={isOpenAtom() ? "Открыто" : "Закрыто"}
        class="xl:hidden absolute top-[10px] right-[8px] z-[3000]"
      >
        <img src={chestStatusImage} alt="" width={48} height={48} />
      </DrawerTrigger>
      <DrawerContent
        class="xl:hidden flex flex-col items-start justify-between bg-neutral-900 border-none rounded-t-xl min-h-1/3 h-fit p-4 w-full"
      >
        <Drawer.Label class="hidden"></Drawer.Label>
        <ClientOnly>
          <HeaderDrawerContent />
        </ClientOnly>
      </DrawerContent>
    </Drawer>
  );
}

const HeaderItemMenu = (props: typeof MAIN_HEADER[0]) => {
  const [urlParsedAtom] = useAtom(pageState.urlParsed);

  const pathname = () => urlParsedAtom()?.pathname
  const isActive = () => pathname() === props.href;

  const pathDetect = (href?: string | null) => {
    if (!href) return;

    if (pathname() === href) {
      toast.info("Вы уже на этой странице", {
        icon: <img alt="" loading="lazy" width={32} height={32} src={getStaticObject("minecraft/icons", "bell.webp")} />
      })
    }
  }

  return (
    <Menu.Root>
      <Menu.Trigger class="group">
        <Show
          when={props.href}
          fallback={
            <div
              onClick={() => pathDetect(props.href)}
              class="flex items-center gap-1 cursor-pointer"
            >
              <Typography class="text-neutral-300">{props.name}</Typography>
              <Show when={props.childs}>
                <span
                  class="
                    relative duration-150 ease-in
                    group-data-[state=closed]:rotate-180 group-data-[state=closed]:-top-1
                    group-data-[state=open]:rotate-0 group-data-[state=open]:top-1"
                >
                  ^
                </span>
              </Show>
            </div>
          }
        >
          {(href) => (
            <Link
              onClick={() => pathDetect(href())}
              href={href()}
              class="flex items-center gap-1"
            >
              <Show when={isActive()}>
                <img
                  src={expImage}
                  width={20}
                  alt=""
                  height={20}
                  draggable={false}
                />
              </Show>
              <Typography class="text-neutral-300">{props.name}</Typography>
              <Show when={props.childs}>
                <span
                  class="
                    relative duration-150 ease-in
                    group-data-[state=closed]:rotate-180 group-data-[state=closed]:-top-1
                    group-data-[state=open]:rotate-0 group-data-[state=open]:top-1"
                >
                  ^
                </span>
              </Show>
            </Link>
          )}
        </Show>
      </Menu.Trigger>
      <Menu.Positioner>
        <Menu.Content class="rounded-md z-[1000] bg-neutral-950 w-[200px]">
          <div class="flex flex-col py-2 px-4 gap-2 w-full">
            <Show when={props.childs}>
              {(childs) => (
                <For each={childs()}>
                  {(child) => (
                    <div class="flex items-center gap-1 cursor-pointer">
                      <Link href={child.href ?? "/"} class="tr">
                        {child.name}
                      </Link>
                    </div>
                  )}
                </For>
              )}
            </Show>
          </div>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  )
}

const bgImage = getStaticObject("minecraft/static", "cracked_polished_blacked.webp")

export const Header = () => {
  return (
    <div
      class={`header flex items-center justify-between absolute top-0 transition w-full bg-repeat-x z-50`}
      style={{ "background-size": '160px', "background-image": `url(${bgImage})` }}
    >
      <Link href="/" class="bg-transparent cursor-pointer relative md:-right-[40px] top-3 xl:-right-[60px]">
        <img src={logoImage} draggable={false} width={224} height={64} title="Fasberry" alt="Fasberry" />
      </Link>
      <div class="hidden xl:flex gap-8 items-center justify-start pr-[132px]">
        <For each={MAIN_HEADER}>
          {(item) => <HeaderItemMenu {...item} />}
        </For>
      </div>
      <HeaderDrawer />
    </div>
  );
}
