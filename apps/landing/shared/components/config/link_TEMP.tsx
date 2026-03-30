import { AnchorHTMLAttributes } from "react";
import { tv } from "tailwind-variants";
import { usePageContext } from "vike-react/usePageContext";

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string,
  locale?: string
}

const LINKS = (target: string | number) => ({
  "land": `/land/${target}`,
  "player": `/player/${target}`,
  "news": `/news/${target}`,
  "store": `/store/i/${target}`
})

export const createLink = (type: keyof ReturnType<typeof LINKS>, target: string | number) => LINKS(target)[type]

export function Link({ href, locale, className, ...props }: LinkProps) {
  const pageContext = usePageContext()
  const pathname = pageContext.urlPathname;

  const initWithLocale = !!locale

  locale = locale ?? pageContext.locale;

  if (locale !== "ru") {
    href = '/' + locale + href
  }

  const isActive = href ? href === "/" ? pathname === href : pathname.startsWith(href) : false;
  const isIdentity = href === pathname

  return (
    <a
      href={href}
      data-state={isActive ? "active" : "inactive"}
      style={isIdentity && !initWithLocale ? { pointerEvents: 'none' } : {}}
      onClick={(e) => {
        if (isIdentity && !initWithLocale) {
          e.preventDefault();
        }
      }}
      className={tv({ base: `data-[state=active]:is-active` })({ className })}
      {...props}
    />
  );
}