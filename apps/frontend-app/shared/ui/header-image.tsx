import { type ComponentPropsWithRef } from "react"
import { cn } from "../lib/cn"

const ALIGN = {
  "top": "object-top",
  "center": "object-center"
}

export const PageHeaderImage = ({ 
  img, className, imgAlign = "top", ...props 
}: { 
  img: string, imgAlign?: "top" | "center" } & ComponentPropsWithRef<"div">
) => {
  return (
    <div
      className={cn("flex select-none flex-col items-center justify-end relative overflow-hidden h-[180px] rounded-xl w-full", className)}
      {...props}
    >
      <img
        src={img}
        draggable={false}
        alt=""
        width={800}
        height={800}
        className={`absolute w-full h-[300px] rounded-lg object-cover ${ALIGN[imgAlign]}`}
      />
      <div className="absolute bottom-0 bg-gradient-to-t h-[60px] from-black/60 via-black/20 to-transparent w-full" />
    </div>
  )
}