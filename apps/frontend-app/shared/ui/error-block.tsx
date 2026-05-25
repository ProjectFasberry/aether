import { Typography } from "@/shared/ui/typography"

export const ErrorBlock = ({ title }: { title: string }) => {
  return (
    <div className="flex bg-red/80 max-w-2xl rounded-lg px-4 py-2 items-center justify-start">
      <Typography className='text-base leading-5 font-semibold'>
        {title}
      </Typography>
    </div>
  )
}