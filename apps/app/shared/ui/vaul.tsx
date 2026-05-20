import type { AtomMut } from "@reatom/framework"
import { reatomComponent } from "@reatom/npm-react"
import { createContext, type PropsWithChildren, useContext } from "react"
import { tv } from "tailwind-variants"
import { Drawer } from "vaul"

const vaulVariants = tv({
  base: `bg-neutral-900 fixed p-2 h-fit max-h-3/4 z-50 flex flex-col gap-4 border-neutral-700/60`,
  variants: {
    side: {
      bottom: "rounded-t-xl inset-x-0 bottom-0 h-auto border-t",
      left: "rounded-r-xl inset-y-0 left-0 h-full w-3/4 border-r",
      right: "rounded-l-xl inset-y-0 right-0 h-full w-3/4 border-l"
    }
  }
})

const VaulSlider = () => {
  return <div aria-hidden className="mx-auto bg-neutral-600 my-2 cursor-grab active:cursor-grabbing h-1 w-9 rounded-sm" />
}

const vaulCtx = createContext<VaulProps | null>(null)

const useVaul = () => {
  const ctx = useContext(vaulCtx)
  if (!ctx) throw new Error('Vaul ctx is not provided')
  return ctx
}

type VaulContentProps = PropsWithChildren & {
  side?: "left" | "right" | "bottom",
  className?: string,
}

const VaulTrigger = ({ children, asChild, className }: PropsWithChildren & { asChild?: boolean, className?: string }) => {
  return (
    <Drawer.Trigger asChild={asChild} className={className}>{children}</Drawer.Trigger>
  )
}

type VaulHeaderProps = {
  title: string,
  description?: string,
}

const VaulHeader = ({
  title, description
}: VaulHeaderProps) => {
  return (
    <>
      <Drawer.Title className="text-2xl w-full text-left font-semibold text-neutral-50 leading-6">
        {title}
      </Drawer.Title>
      <Drawer.Description className="hidden">
        {description}
      </Drawer.Description>
    </>
  )
}

type VaulProps = {
  open: boolean,
  onOpenChange: (val: boolean) => void
} & PropsWithChildren

const Vaul = reatomComponent<PropsWithChildren & { openAtom: AtomMut<boolean> }>(({ ctx, children, openAtom }) => {
  const open = ctx.spy(openAtom);
  const onOpenChange = (value: boolean) => openAtom(ctx, value)

  return (
    <vaulCtx.Provider
      value={{
        open,
        onOpenChange
      }}
    >
      <Drawer.Root open={open} onOpenChange={onOpenChange}>
        {children}
      </Drawer.Root>
    </vaulCtx.Provider>
  )
}, "Vaul")

const VaulContent = ({
  side = "bottom", className, children
}: VaulContentProps) => {
  return (
    <Drawer.Portal>
      <Drawer.Overlay className="fixed inset-0 z-50 backdrop-blur bg-black/30" />
      <Drawer.Content className={vaulVariants({ side, className })}>
        <VaulSlider />
        {children}
      </Drawer.Content>
    </Drawer.Portal>
  )
}

export {
  Vaul,
  VaulTrigger,
  VaulContent,
  VaulHeader,
  useVaul,
  vaulVariants
}
