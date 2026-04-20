import { AuthError, Verify } from "@/shared/components/app/auth/components/auth";
import { type AuthType, auth, authIsDisabledAtom, authState, authTriggerIsDisabledAtom } from "@/shared/components/app/auth/models/auth.model";
import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { action } from "@reatom/core";
import { Link } from "@/shared/components/config/link";
import { startPageEvents } from "@/shared/lib/events";
import { pageContextAtom } from "@/shared/models/page-context.model";
import { showResetPasswordAtom } from "@/shared/components/app/auth/models/login.model";
import { LoginForm } from "@/shared/components/app/auth/components/login";
import { RegisterForm } from "@/shared/components/app/auth/components/register";
import { useEffect } from "react";
import { register } from "@/shared/components/app/auth/models/register.model";

const ResetPassword = reatomComponent(({ ctx }) => {
  const showResetPassword = ctx.spy(showResetPasswordAtom)
  if (!showResetPassword) return null;

  return (
    <Link
      href="/auth/restore"
      className='flex items-center justify-center w-full text-sm text-neutral-400'
    >
      Я забыл пароль
    </Link>
  )
}, "ResetPassword")

const Auth = reatomComponent(({ ctx }) => {
  const type = ctx.spy(authState.type)

  const isDisabled = ctx.spy(authIsDisabledAtom)
  const triggerIsDisabled = ctx.spy(authTriggerIsDisabledAtom)

  return (
    <Tabs
      onValueChange={value => authState.type(ctx, value as AuthType)}
      value={type}
      inert={isDisabled}
      className="flex flex-col gap-4 w-full p-3 sm:p-4 lg:p-6 max-w-lg rounded-lg bg-neutral-900 inert:opacity-70 inert:pointer-events-none"
    >
      <TabsList
        data-disabled={triggerIsDisabled}
        className="flex flex-col sm:flex-row min-h-24 h-24 sm:min-h-fit sm:h-fit w-full gap-2 *:h-10 *:w-full"
      >
        <TabsTrigger value="login">Вход</TabsTrigger>
        <TabsTrigger value="register">Регистрация</TabsTrigger>
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
  const pageCtx = ctx.get(pageContextAtom);
  if (!pageCtx) return;
  authState.searchParams(ctx, pageCtx.urlParsed.search)
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
    <div className="flex flex-col gap-4 items-center py-30 min-h-dvh w-full">
      <SyncData />
      <Auth />
      <AuthError />
      <div className="flex items-start justify-center h-48 w-full">
        <Verify />
      </div>
    </div>
  )
}