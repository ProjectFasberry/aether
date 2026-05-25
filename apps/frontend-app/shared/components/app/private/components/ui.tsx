import { Link } from "@/shared/components/config/link"
import { Button } from "@/shared/ui/button"
import { type Icon, IconArrowRight, IconPencil, IconPlus, type IconProps, IconX } from "@tabler/icons-react"
import { type ButtonHTMLAttributes, type ReactNode } from "react"
import { tv, type VariantProps } from "tailwind-variants"
import { Typography } from "@/shared/ui/typography"
import { cn } from "@/shared/lib/cn"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>

const baseVariant = tv({
  base: `h-6 w-6 aspect-square p-0 rounded-sm bg-neutral-800`
})

export const DeleteButton = (props: ButtonProps) => {
  return (
    <Button
      {...props}
      className={cn(baseVariant(), props.className)}
    >
      <IconX size={18} />
    </Button>
  )
}

export const EditButton = (props: ButtonProps) => {
  return (
    <Button
      {...props}
      className={cn(baseVariant(), props.className)}
    >
      <IconPencil size={18} />
    </Button>
  )
}

export const ToLink = ({ link }: { link: string }) => {
  return (
    <Link
      href={link}
      target="_blank"
      className="flex items-center justify-center rounded-sm h-6 w-6 aspect-square p-0 bg-neutral-800"
    >
      <IconArrowRight size={18} className="-rotate-45" />
    </Link>
  )
}

export const AddButton = (props: ButtonProps) => {
  return (
    <Button
      {...props}
      className={baseVariant({ className: props.className })}
    >
      <IconPlus size={18} />
    </Button >
  )
}

const actionButtonVariant = tv({
  base: `p-0 h-6 min-w-6 rounded-sm`,
  variants: {
    variant: {
      default: "bg-neutral-800 text-neutral-50",
      selected: "bg-neutral-50 text-neutral-950"
    }
  }
})

type ActionButtonProps = ButtonProps & VariantProps<typeof actionButtonVariant> & {
  icon: React.ForwardRefExoticComponent<IconProps & React.RefAttributes<Icon>>
}

export const ActionButton = ({ variant, children, icon: Icon, ...props }: ActionButtonProps) => {
  return (
    <Button
      {...props}
      className={actionButtonVariant({ variant })}
    >
      {children && (
        <div className="px-2">
          {children}
        </div>
      )}
      <Icon size={18} />
    </Button>
  )
}

export const itemVariant = tv({
  base: `flex items-center justify-start h-8 border text-neutral-50 rounded-lg px-4 cursor-pointer`,
  variants: {
    variant: {
      default: "border-neutral-800",
      selected: "border-green-800"
    }
  },
  defaultVariants: {
    variant: "default"
  }
})

export const ActionsHeader = (
  { title, children }: { title: string, children?: ReactNode }
) => {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2 h-8">
        <Typography className="text-xl font-semibold">
          {title}
        </Typography>
      </div>
      {children}
    </div>
  )
}