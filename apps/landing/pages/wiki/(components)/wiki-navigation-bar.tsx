import { Link } from "@/shared/components/config/link";
import { reatomComponent } from "@reatom/npm-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@repo/ui/accordion";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@repo/ui/sheet";
import { Skeleton } from "@repo/ui/skeleton";
import { Typography } from "@repo/ui/typography";
import { IconArrowLeft, IconCategory } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { wikiCategoriesAction, wikiCategoriesAtom, wikiParamAtom } from "./wiki.model";
import { atom } from "@reatom/core";
import { clientOnly } from "vike-react/clientOnly";

const getIsActiveAtom = (value: string) => atom(
  (ctx) => value === ctx.spy(wikiParamAtom) ? "active" : "inactive",
  "getIsActive"
)

const BarTrigger = reatomComponent<{
  value: string, title: string, onClick?: () => void
}>(({
  ctx, title, value, onClick
}) => {
  return (
    <Link
      href={`/wiki/${value}`}
      onClick={onClick}
      data-state={ctx.spy(getIsActiveAtom(value))}
      className="tr"
    >
      <Typography className="text-base text-left">
        &nbsp;&nbsp;{title}
      </Typography>
    </Link>
  )
}, "BarTrigger")

const List = reatomComponent<{ handle?: () => void }>(({ ctx, handle }) => {
  const data = ctx.spy(wikiCategoriesAtom);

  if (ctx.spy(wikiCategoriesAction.statusesAtom).isPending) {
    return <NavigationBarSkeleton />
  }

  if (!data) return null;

  return (
    <div className="flex flex-col p-4 w-full gap-12 h-full">
      <div className="flex flex-col gap-6">
        {data.map(([key, { title, isChilded, nodes }]) => (
          isChilded ? (
            <Accordion key={key} type="single" collapsible defaultValue={key}>
              <AccordionItem value={key}>
                <AccordionTrigger className="p-2 group">
                  <Typography className="text-xl">
                    {title}
                  </Typography>
                </AccordionTrigger>
                <AccordionContent className="flex gap-1 w-full h-full">
                  <div className="w-1 mt-1 bg-neutral-800" />
                  <div className="flex flex-col gap-0.5 h-full w-full">
                    {nodes.map((item) => <BarTrigger key={item.value} onClick={handle} {...item} />)}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : (
            <Link
              key={key}
              href={`/wiki/${key}`}
              onClick={handle}
              className="tr"
            >
              <Typography className="text-xl">
                {title}
              </Typography>
            </Link>
          )
        ))}
      </div>
      <div className="flex flex-col gap-y-2">
        <Typography className="text-xl">
          Прочее
        </Typography>
        <Link href="/modpack" className="group cursor-pointer">
          <Typography className="text-base">
            Сборки модов
          </Typography>
        </Link>
      </div>
    </div>
  )
}, "List")

const ListWrapper = clientOnly(async () => List)

const WikiNavigationMobile = () => {
  const [open, setOpen] = useState(false)

  const handle = useCallback(() => void setOpen(false), [])

  return (
    <>
      <button
        className="focus:scale-[1.05] cursor-pointer"
        onClick={() => window.history.back()}
      >
        <IconArrowLeft size={34} />
      </button>
      <Sheet open={open} onOpenChange={v => setOpen(v)}>
        <SheetTrigger className="cursor-pointer focus:scale-[1.05]">
          <IconCategory size={34} />
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="xl:hidden bg-neutral-900 rounded-t-xl py-3 px-0 border-none max-h-[60vh] overflow-y-auto
          scrollbar-w-2 scrollbar-thumb-rounded-xl scrollbar-track-neutral-900 scrollbar-thumb-neutral-700 scrollbar
        "
        >
          <SheetTitle className="text-xl text-center">Навигация</SheetTitle>
          <div className="flex flex-col w-full items-start">
            <ListWrapper handle={handle} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

const NavigationBarSkeleton = () => {
  return (
    <div className="flex flex-col gap-8 p-4 w-full">
      <Skeleton className="h-8 w-4/5" />
      <div className="flex flex-col gap-2 w-full h-full">
        <Skeleton className="h-8 w-2/3" />
        <div className="flex flex-col items-start gap-1 w-full h-full px-2">
          <Skeleton className="h-7 w-4/5" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-7 w-2/4" />
          <Skeleton className="h-7 w-28" />
        </div>
      </div>
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-8 w-36" />
    </div>
  )
}

export const WikiNavigation = () => {
  return (
    <>
      <div className="card hidden xl:flex flex-col p-0 min-h-[80vh] w-full xl:w-[25%] items-start sticky top-2">
        <ListWrapper fallback={<NavigationBarSkeleton />} />
      </div>
      <div className="xl:hidden flex items-center justify-between
        fixed bottom-4 left-1/2 right-0 px-4 -translate-x-1/2 h-12 w-36 aspect-square z-30 rounded-lg bg-neutral-700/60 backdrop-blur-md"
      >
        <WikiNavigationMobile />
      </div>
    </>
  )
}