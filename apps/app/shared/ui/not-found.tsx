import { Typography } from "@repo/ui/typography"

export const NotFound = ({ title }: { title: string }) => {
  return (
    <div className="flex items-center min-h-24 text-center justify-center w-full h-full">
      <Typography color="gray" className="text-lg">{title}</Typography>
    </div>
  )
}