import { Link } from "@/shared/components/config/link";
import { usePageContext } from "vike-react/usePageContext";
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@repo/ui/dropdown-menu";
import { atom } from '@reatom/core';
import { reatomComponent } from '@reatom/npm-react';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@repo/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@repo/ui/accordion';
import { Typography } from "@repo/ui/typography";
import { Fragment } from "react/jsx-runtime";
import { tv } from "tailwind-variants";
import { APP_URL } from "@/shared/env";
import { getStaticObject } from "@/shared/lib/volume";

const MAIN_HEADER = [
  { name: "Главная", href: "/", },
  { name: "Правила", href: "/rules", },
  { name: "Поддержка", href: "/support", },
  { name: "Галерея", href: "/gallery", },
  {
    name: "Игра",
    childs: [
      { name: "Аккаунт", href: APP_URL, },
      { name: "Карта мира", href: `${APP_URL}/map`, },
      { name: "Вики", href: "/wiki", },
      { name: "Модпак", href: "/modpack", },
    ],
  },
];

const expImage = getStaticObject("minecraft", "icons/experience_big.webp")
const logoImage = getStaticObject("minecraft", "static/fasberry_logo.webp")

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

const Content = reatomComponent(({ ctx }) => {
  const pathname = usePageContext().urlParsed.pathname;

  const handleToPage = (href?: string | null) => {
    if (!href) return;
    sheetIsOpenAtom(ctx, state => !state);
  };

  return (
    <>
      <div className="flex justify-between px-2 items-center w-full">
        <Link href="/" className="bg-transparent right-6 relative top-2">
          <img src={logoImage} draggable={false} alt="Fasberry" width={224} height={64} />
        </Link>
      </div>
      <Accordion
        type="single"
        collapsible
        className="flex flex-col items-center justify-center w-full gap-4 px-4"
      >
        {MAIN_HEADER.map(({ name, href, childs }) => (
          <Fragment key={name}>
            {childs ? (
              <AccordionItem value={name} className="w-full">
                <AccordionTrigger
                  onClick={() => handleToPage(href)}
                  className={itemVariant()}
                >
                  <div className="flex items-center gap-1">
                    {href === pathname && <ExperienceCircle />}
                    <Typography className="text-white text-lg">
                      {name}
                    </Typography>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="flex gap-2 pt-1">
                  <div className="w-[2px] mt-1 bg-neutral-800" />
                  <div className="flex flex-col gap-2 w-full">
                    {childs.map(({ name, href }) => (
                      <a
                        key={name}
                        href={href!}
                        onClick={() => handleToPage(href)}
                        className={itemVariant()}
                      >
                        <div className="flex items-center gap-1">
                          {href === pathname && <ExperienceCircle />}
                          <Typography className="text-lg text-white">
                            {name}
                          </Typography>
                        </div>
                      </a>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ) : (
              <a
                href={href!}
                onClick={() => handleToPage(href)}
                className={itemVariant()}
              >
                <div className="flex items-center gap-1">
                  {href === pathname && <ExperienceCircle />}
                  <Typography className="text-white text-lg">
                    {name}
                  </Typography>
                </div>
              </a>
            )}
          </Fragment>
        ))}
      </Accordion>
    </>
  )
}, "Content")

const sheetIsOpenAtom = atom(false, "sheetIsOpenAtom")

export const HeaderSheet = reatomComponent(({ ctx }) => {
  const isOpen = ctx.spy(sheetIsOpenAtom)

  const chestStatusImage = isOpen
    ? getStaticObject("minecraft/icons", "chest_opened.webp")
    : getStaticObject("minecraft/icons", "chest_closed.webp")

  return (
    <Sheet modal open={isOpen} onOpenChange={v => sheetIsOpenAtom(ctx, v)}>
      <SheetTrigger
        aria-label={isOpen ? "Открыто" : "Закрыто"}
        className="xl:hidden absolute top-[10px] right-[8px] z-[3000]"
      >
        <img src={chestStatusImage} alt="" width={48} height={48} />
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="xl:hidden flex flex-col items-start justify-between bg-neutral-900 border-none rounded-t-xl min-h-1/3 h-fit p-4 w-full"
      >
        <SheetTitle className="hidden"></SheetTitle>
        <Content />
      </SheetContent>
    </Sheet>
  );
}, "HeaderSheet")

const HeaderItemMenu = ({ name, childs, href }: typeof MAIN_HEADER[0]) => {
  const pathname = usePageContext().urlParsed.pathname;
  const isActive = pathname === href;

  const pathDetect = (href?: string | null) => {
    if (!href) return;

    if (pathname === href) {
      toast.info("Вы уже на этой странице", {
        icon: <img alt="" loading="lazy" width={32} height={32} src={getStaticObject("minecraft/icons", "bell.webp")} />
      })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group">
        {href ? (
          <Link
            onClick={() => pathDetect(href)}
            href={href}
            className="flex items-center gap-1"
          >
            {isActive && (
              <img
                src={expImage}
                width={20}
                alt=""
                height={20}
                draggable={false}
              />
            )}
            <Typography className="text-neutral-300 text-base">
              {name}
            </Typography>
            {childs && (
              <span
                className="text-white relative duration-150
                    group-data-[state=closed]:rotate-180 group-data-[state=closed]:-top-1
                    group-data-[state=open]:rotate-0 group-data-[state=open]:top-1"
              >
                ^
              </span>
            )}
          </Link>
        ) : (
          <div
            onClick={() => pathDetect(href)}
            className="flex items-center gap-1 cursor-pointer"
          >
            <Typography className="text-neutral-300 text-base">
              {name}
            </Typography>
            {childs && (
              <span
                className="text-white relative duration-150
                    group-data-[state=closed]:rotate-180 group-data-[state=closed]:-top-1
                    group-data-[state=open]:rotate-0 group-data-[state=open]:top-1"
              >
                ^
              </span>
            )}
          </div>
        )}
      </DropdownMenuTrigger>
      {childs && (
        <DropdownMenuContent className="rounded-md z-[1000] bg-neutral-950 w-[200px]">
          <div className="flex flex-col py-2 px-4 gap-2 w-full">
            {childs.map(item => (
              <div key={item.name} className="flex items-center gap-1 cursor-pointer">
                <Link href={item.href || "/"} className="tr">
                  <Typography>
                    {item.name}
                  </Typography>
                </Link>
              </div>
            ))}
          </div>
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  )
}

const bgImage = getStaticObject("minecraft/static", "cracked_polished_blacked.webp")

export const Header = () => {
  return (
    <div
      className={`header flex items-center justify-between absolute top-0 transition w-full bg-repeat-x z-50`}
      style={{ backgroundSize: '160px', backgroundImage: `url(${bgImage})` }}
    >
      <Link href="/" className="bg-transparent cursor-pointer relative md:-right-[40px] top-3 xl:-right-[60px]">
        <img src={logoImage} draggable={false} width={224} height={64} title="Fasberry" alt="Fasberry" />
      </Link>
      <div className="hidden xl:flex gap-8 items-center justify-start pr-[132px]">
        {MAIN_HEADER.map(item => (
          // @ts-expect-error
          <HeaderItemMenu
            key={item.name}
            childs={item.childs}
            name={item.name}
            href={item.href}
          />
        ))}
      </div>
      <HeaderSheet />
    </div>
  );
}
