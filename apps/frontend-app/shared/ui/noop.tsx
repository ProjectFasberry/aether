import { Typography } from "@repo/ui/typography"

export const Noop = ({ title }: { title: string }) => {
  return <Typography className="text-sm leading-4" color='gray'>{title}</Typography>
}
