import { IconLoader2, type Icon, type IconProps } from "@tabler/icons-react";

export const IconLoader = (props?: IconProps) => {
  return <IconLoader2 {...props} className="animate-spin text-neutral-500 duration-200" />
}
