import { 
  AuthError, 
  LoginForm, 
  RegisterForm, 
  AuthSubmit, 
  Verify, 
  formVariant 
} from "@/shared/components/app/auth/components/auth";
import {
  authIsDisabledAtom,
  authorizeAction,
  authSearchParamsAtom,
  authTriggerIsDisabledAtom,
  AuthTypeAtom,
  typeAtom
} from "@/shared/components/app/auth/models/auth.model";
import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { Typography } from "@repo/ui/typography";
import { action } from "@reatom/core";
import { Link } from "@/shared/components/config/link";
import { startPageEvents } from "@/shared/lib/events";
import { pageContextAtom } from "@/shared/models/page-context.model";

const ResetPassword = reatomComponent(({ ctx }) => {
  if (ctx.spy(typeAtom) !== 'login') return null;

  return (
    <Link href="/auth/restore">
      <Typography className='text-center text-sm text-neutral-400'>
        Я забыл пароль
      </Typography>
    </Link>
  )
}, "ResetPassword")

const Auth = reatomComponent(({ ctx }) => {
  const type = ctx.spy(typeAtom)

  const isDisabled = ctx.spy(authIsDisabledAtom)
  const triggerIsDisabled = ctx.spy(authTriggerIsDisabledAtom)

  return (
    <Tabs
      data-disabled={isDisabled.toString()}
      onValueChange={value => typeAtom(ctx, value as AuthTypeAtom)}
      value={type}
      className={formVariant({ className: `flex flex-col gap-4 w-full p-3 sm:p-4 lg:p-6 max-w-xl` })}
    >
      <TabsList
        data-disabled={triggerIsDisabled.toString()}
        className="flex flex-col sm:flex-row w-full gap-2
          data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-60 *:h-10 *:w-full"
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
        <AuthSubmit />
        <ResetPassword />
        <AuthError />
      </div>
    </Tabs >
  )
}, "Auth")

const events = action((ctx) => {
  const pageContext = ctx.get(pageContextAtom);
  if (!pageContext) return;

  const search = pageContext.urlParsed.search
  authSearchParamsAtom(ctx, search)
})

const AuthForm = reatomComponent(({ctx}) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    authorizeAction(ctx)
  }

  return (
    <form
      className="flex gap-4 items-center justify-center flex-1 w-full"
      onSubmit={handleSubmit}
      autoComplete="off"
    >
      <Auth />
    </form>
  )
}, "AuthForm")

export default function Page() {
  useUpdate((ctx) => startPageEvents(ctx, events), [])

  return (
    <div className="flex flex-col gap-4 h-[90vh] items-center justify-center w-full">
      <AuthForm />
      <div className="flex items-start justify-center h-48 w-full">
        <Verify />
      </div>
    </div>
  )
}