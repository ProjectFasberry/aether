import { Link } from "@/shared/components/config/link";
import { Typography } from "@repo/ui/typography";
import { PropsWithChildren } from "react"
import { tv } from "tailwind-variants";
import {
  SidebarProvider,
  SidebarTrigger,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarGroupLabel,
  useSidebar
} from "@repo/ui/sidebar"
import { Logotype } from "@/shared/components/app/layout/components/logotype";
import { UserInfo } from "@/shared/components/app/private/components/user-info";
import { Chat } from "@/shared/components/app/private/components/chat";

const linkVariant = tv({
  base: `flex justify-start items-center group h-10 rounded-xl px-4
    data-[state=inactive]:bg-neutral-800 data-[state=inactive]:text-neutral-50 data-[state=active]:bg-neutral-50 data-[state=active]:text-neutral-950`,
  slots: {
    text: "font-semibold text-nowrap"
  }
})

const links = [
  { title: "Конфигурация", value: "/private/config" },
  { title: "Магазин", value: "/private/store" },
  { title: "Игрок", value: "/private/users" },
  { title: "История", value: "/private/history" },
  { title: "Test", value: "/private/test" },
  { title: "Панель", value: "/private/panel" }
]

const Navigation = () => {
  const { setOpen, isMobile } = useSidebar();

  return links.map((link) => (
    <Link
      key={link.title}
      href={link.value}
      onClick={() => isMobile && setOpen(false)}
      className={linkVariant().base()}
    >
      <Typography className={linkVariant().text()}>
        {link.title}
      </Typography>
    </Link>
  ))
}

const AppSidebar = () => {
  return (
    <Sidebar>
      <SidebarHeader className="h-14">
        <Logotype />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Инфо</SidebarGroupLabel>
          <UserInfo />
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Навигация</SidebarGroupLabel>
          <SidebarMenu>
            <Navigation />
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  )
}

export default function Layout({ children }: PropsWithChildren) {
  return (
    <>
      <Chat />
      <SidebarProvider >
        <AppSidebar />
        <div className="flex flex-col gap-2 min-h-dvh w-full p-2 sm:p-6">
          <SidebarTrigger />
          <div className="flex flex-col overflow-hidden w-full">
            {children}
          </div>
        </div>
      </SidebarProvider >
    </>
  )
}