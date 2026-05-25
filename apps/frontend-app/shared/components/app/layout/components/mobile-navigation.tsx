import { Link } from "@/shared/components/config/link"
import { navigationModel } from "../models/navigation.model"

const { HEADERS_LINKS } = navigationModel();

export const MobileBottomBar = () => {
  return (
    <div
      className="
        fixed flex items-center rounded-t-xl justify-center z-[50] bottom-0 px-4
        border-t border-neutral-800 bg-neutral-900 h-16 w-full
      "
    >
      <div className="flex items-center justify-between w-full gap-1">
        {HEADERS_LINKS.map(link => (
          <Link
            key={link.title}
            aria-label={link.label}
            href={link.href}
            className="
              flex flex-col items-center gap-0.5 justify-center truncate min-w-0
              data-[state=inactive]:text-neutral-50 data-[state=active]:text-green-400
            "
          >
            <link.icon size={26} />
            <span className="font-semibold text-[12px]">{link.title}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
