import { AuthError, Verify } from "@/shared/components/app/auth/components/auth";
import { type AuthType, auth, authIsDisabledAtom, authState, authTriggerIsDisabledAtom } from "@/shared/components/app/auth/models/auth.model";
import { reatomComponent, useAtom } from "@reatom/npm-react";
import { Link } from "@/shared/components/config/link";
import { createPageModel } from "@/shared/lib/events";
import { pageState } from "@/shared/models/page-context.model";
import { showResetPasswordAtom } from "@/shared/components/app/auth/models/login.model";
import { LoginForm } from "@/shared/components/app/auth/components/login";
import { RegisterForm } from "@/shared/components/app/auth/components/register";
import { register } from "@/shared/components/app/auth/models/register.model";
import { translate } from "@/shared/locales/helpers";
import { getDevModulesInfo } from "@/shared/models/app/index.model";
import { tabsTriggerVariants } from "@/shared/ui/tabs"
import { Tabs } from '@ark-ui/react/tabs'

const ResetPassword = reatomComponent(({ ctx }) => {
  if (!ctx.spy(showResetPasswordAtom)) return null;

  return (
    <Link href="/auth/restore" className='flex items-center justify-center w-full text-sm text-neutral-400'>
      {translate["auth.navigation.auth.recoveryTitle"]()}
    </Link>
  )
}, "ResetPassword")

const AUTH_VARIANTS = [
  { label: translate["auth.navigation.auth.loginTitle"](), value: "login" },
  { label: translate["auth.navigation.auth.regTitle"](), value: "register" }
]

const Auth = reatomComponent(({ ctx }) => {
  return (
    <Tabs.Root
      inert={ctx.spy(authIsDisabledAtom)}
      value={ctx.spy(authState.type)}
      onValueChange={(details) => {
        authState.type(ctx, details.value as AuthType)
      }}
      className="flex flex-col gap-4 w-full p-3 sm:p-4 lg:p-6 max-w-lg rounded-lg bg-neutral-900 inert:opacity-70 inert:pointer-events-none"
    >
      <Tabs.List
        data-disabled={ctx.spy(authTriggerIsDisabledAtom)}
        className="flex flex-col sm:flex-row min-h-24 h-24 sm:min-h-fit sm:h-fit w-full gap-2 *:h-10 *:w-full"
      >
        {AUTH_VARIANTS.map((item) => (
          <Tabs.Trigger key={item.value} value={item.value} className={tabsTriggerVariants()}>
            {item.label}
          </Tabs.Trigger >
        ))}
      </Tabs.List>
      <div className="flex flex-col gap-6 min-w-0 w-full h-full">
        <Tabs.Content value="register">
          <RegisterForm />
        </Tabs.Content>
        <Tabs.Content value="login">
          <LoginForm />
        </Tabs.Content>
        <ResetPassword />
      </div>
    </Tabs.Root>
  )
}, "Auth")

const page = createPageModel({
  name: "auth",
  onConnAction: async (ctx, dataAtom, isConnected) => {
    authState.searchParams(ctx, (state) => ctx.get(pageState.urlParsed)?.search ?? state)

    if (!isConnected()) return;

    const devModulesInfo = getDevModulesInfo(ctx);

    if (devModulesInfo?.isImport) {
      const { startAuthWidget } = await import("@/shared/components/app/auth/models/dev-only.model")
      const unsubscribe = await startAuthWidget(ctx)

      if (!isConnected()) {
        unsubscribe()
        return;
      }

      dataAtom(ctx, { unsubscribe })
    }
  },
  onDisconnAction: (ctx) => {
    auth.resetAuthState(ctx)
    register.resetRegisterState(ctx)
  },
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
