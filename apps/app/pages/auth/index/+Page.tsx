import { AuthError, Verify } from "@/shared/components/app/auth/components/auth";
import { type AuthType, auth, authIsDisabledAtom, authState, authTriggerIsDisabledAtom } from "@/shared/components/app/auth/models/auth.model";
import { reatomComponent, useAtom } from "@reatom/npm-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { action } from "@reatom/framework";
import { Link } from "@/shared/components/config/link";
import { createPageModel } from "@/shared/lib/events";
import { pageCtxAtom } from "@/shared/models/page-context.model";
import { showResetPasswordAtom } from "@/shared/components/app/auth/models/login.model";
import { LoginForm } from "@/shared/components/app/auth/components/login";
import { RegisterForm } from "@/shared/components/app/auth/components/register";
import { register } from "@/shared/components/app/auth/models/register.model";
import { translate } from "@/shared/locales/helpers";

const ResetPassword = reatomComponent(({ ctx }) => {
  if (!ctx.spy(showResetPasswordAtom)) return null;

  return (
    <Link href="/auth/restore" className='flex items-center justify-center w-full text-sm text-neutral-400'>
      {translate["auth.navigation.auth.recoveryTitle"]()}
    </Link>
  )
}, "ResetPassword")

const Auth = reatomComponent(({ ctx }) => {
  return (
    <Tabs
      onValueChange={value => authState.type(ctx, value as AuthType)}
      value={ctx.spy(authState.type)}
      inert={ctx.spy(authIsDisabledAtom)}
      className="flex flex-col gap-4 w-full p-3 sm:p-4 lg:p-6 max-w-lg rounded-lg bg-neutral-900 inert:opacity-70 inert:pointer-events-none"
    >
      <TabsList
        data-disabled={ctx.spy(authTriggerIsDisabledAtom)}
        className="flex flex-col sm:flex-row min-h-24 h-24 sm:min-h-fit sm:h-fit w-full gap-2 *:h-10 *:w-full"
      >
        <TabsTrigger value="login">{translate["auth.navigation.auth.loginTitle"]()}</TabsTrigger>
        <TabsTrigger value="register">{translate["auth.navigation.auth.regTitle"]()}</TabsTrigger>
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

const page = createPageModel({
  name: "auth",
  onConnAction: async (ctx, dataAtom, isConnected) => {
    authState.searchParams(ctx, (state) => ctx.get(pageCtxAtom)?.urlParsed.search ?? state)
    
    if (!isConnected()) return;

    if (import.meta.env.DEV) {
      const { startAuthWidget } = await import("@/shared/components/app/auth/models/dev-only.model")
      const unsubscribe = await startAuthWidget(ctx)

      if (!isConnected()) {
        unsubscribe()
        return;
      }

      dataAtom(ctx, { unsubscribe })
    }
  },
  onDisconnAction: (ctx, dataAtom) => {
    auth.resetAuthState(ctx)
    register.resetRegisterState(ctx)
    console.log("onDisconnAction", ctx.get(dataAtom))
  },
  onAfterDisconn: (ctx, dataAtom) => {
    console.log("onAfterDisconn", ctx.get(dataAtom))
  }
})

export default function Page() {
  const [_] = useAtom(page.dataAtom);

  return (
    <div className="flex flex-col gap-4 items-center py-30 min-h-dvh w-full">
      <Auth />
      <AuthError />
      <div className="flex items-start justify-center h-48 w-full">
        <Verify />
      </div>
    </div>
  )
}