import type { ComponentPropsWithRef } from "react";
import { tv } from "tailwind-variants";
import { usePageContext } from "vike-react/usePageContext";

type LinkProps = ComponentPropsWithRef<"a"> & {
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

export const Link = ({ href, locale, className, ...props }: LinkProps) => {
  const pageContext = usePageContext()
  const pathname = pageContext.urlPathname;

  const targetLocale = locale ?? pageContext.locale;
  const initWithLocale = !!locale;

  let finalHref = href.startsWith('/') ? href : `/${href}`;

  if (targetLocale !== "ru") {
    finalHref = `/${targetLocale}${finalHref === '/' ? '' : finalHref}`;
  }

  const normalizedPathname = pathname.replace(/\/$/, "") || "/";
  const normalizedHref = finalHref.replace(/\/$/, "") || "/";

  const isActive = normalizedPathname === normalizedHref;
  const isIdentity = pathname === finalHref;

  return (
    <a
      href={finalHref}
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
