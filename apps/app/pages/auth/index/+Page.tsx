import { AuthError, Verify } from "@/shared/components/app/auth/components/auth";
import { type AuthType, auth, authIsDisabledAtom, authState, authTriggerIsDisabledAtom } from "@/shared/components/app/auth/models/auth.model";
import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { Typography } from "@repo/ui/typography";
import { action } from "@reatom/core";
import { Link } from "@/shared/components/config/link";
import { startPageEvents } from "@/shared/lib/events";
import { pageContextAtom } from "@/shared/models/page-context.model";
import { showResetPasswordAtom } from "@/shared/components/app/auth/models/login.model";
import { LoginForm } from "@/shared/components/app/auth/components/login";
import { RegisterForm } from "@/shared/components/app/auth/components/register";
import { tv } from "tailwind-variants";
import { useEffect } from "react";
import { register } from "@/shared/components/app/auth/models/register.model";

const ResetPassword = reatomComponent(({ ctx }) => {
  const showResetPassword = ctx.spy(showResetPasswordAtom)
  if (!showResetPassword) return null;

  return (
    <Link href="/auth/restore">
      <Typography className='text-center text-sm text-neutral-400'>
        Я забыл пароль
      </Typography>
    </Link>
  )
}, "ResetPassword")

const formVariant = tv({
  base: `rounded-lg border border-neutral-800`,
  variants: {
    status: {
      active: "",
      inactive: "pointer-events-none opacity-60"
    }
  },
  defaultVariants: {
    status: "active"
  }
})

const Auth = reatomComponent(({ ctx }) => {
  const type = ctx.spy(authState.type)

  const isDisabled = ctx.spy(authIsDisabledAtom)
  const triggerIsDisabled = ctx.spy(authTriggerIsDisabledAtom)

  return (
    <Tabs
      onValueChange={value => authState.type(ctx, value as AuthType)}
      value={type}
      className={formVariant({
        status: isDisabled ? "inactive" : "active",
        className: `flex flex-col gap-4 w-full p-3 sm:p-4 lg:p-6 max-w-xl`
      })}
    >
      <TabsList
        data-disabled={triggerIsDisabled.toString()}
        className="flex flex-col sm:flex-row w-full gap-2 *:h-10 *:w-full"
      >
        <TabsTrigger value="login">
          <Typography>
            Вход
          </Typography>
        </TabsTrigger>
        <TabsTrigger value="register">
          <Typography>
            Регистрация
          </Typography>
        </TabsTrigger>
      </TabsList>
      <div className="flex flex-col gap-6 min-w-0 w-full h-full">
        <TabsContent value="register">
          <RegisterForm />
        </TabsContent>
        <TabsContent value="login">
          <LoginForm />
        </TabsContent>
        <ResetPassword />
      </div>
    </Tabs>
  )
}, "Auth")

const events = action((ctx) => {
  const pageContext = ctx.get(pageContextAtom);
  if (!pageContext) return;

  const search = pageContext.urlParsed.search
  authState.searchParams(ctx, search)
})

const SyncData = reatomComponent(({ ctx }) => {
  useEffect(() => {
    return () => {
      auth.resetAuthState(ctx)
      register.resetRegisterState(ctx)
    }
  }, [])

  return null;
})

export default function Page() {
  useUpdate((ctx) => startPageEvents(ctx, events), [])

  return (
    <div className="flex flex-col gap-4 h-[90vh] items-center justify-center w-full">
      <SyncData />
      <div className="flex flex-col gap-4 items-center justify-center flex-1 w-full">
        <Auth />
        <AuthError />
      </div>
      <div className="flex items-start justify-center h-48 w-full">
        <Verify />
      </div>
    </div>
  )
}