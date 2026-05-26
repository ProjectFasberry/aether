import { splitProps, JSX } from "solid-js";
import { tv } from "tailwind-variants";
import { usePageContext } from "vike-solid/usePageContext";

type LinkProps = JSX.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  locale?: string;
  className?: string
};

export const Link = (props: LinkProps) => {
  const pageContext = usePageContext();
  const [local, rest] = splitProps(props, ["href", "locale", "class", "className"]);

  const initWithLocale = !!local.locale;
  const currentLocale = () => local.locale ?? pageContext.locale;

  const computedHref = () => {
    let path = local.href;
    const loc = currentLocale();
    if (loc && loc !== "ru") {
      path = '/' + loc + path;
    }
    return path;
  };

  const pathname = () => pageContext.urlPathname;

  const isActive = () => {
    const hrefVal = computedHref();
    return hrefVal ? (hrefVal === "/" ? pathname() === hrefVal : pathname().startsWith(hrefVal)) : false;
  };

  const isIdentity = () => computedHref() === pathname();
  const linkStyle = (): JSX.CSSProperties => isIdentity() && !initWithLocale ? { "pointer-events": 'none' } : {};

  return (
    <a
      href={computedHref()}
      data-state={isActive() ? "active" : "inactive"}
      style={linkStyle()}
      onClick={(e) => {
        if (isIdentity() && !initWithLocale) {
          e.preventDefault();
        }
      }}
      class={tv({ base: `data-[state=active]:is-active` })({
        className: local.class || local.className
      })}
      {...rest}
    />
  );
}
