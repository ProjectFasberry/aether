import { action, atom, onConnect, type Atom, type Ctx, type CtxSpy } from "@reatom/framework";
import * as z from "zod";
import { withLocalStorage } from "@reatom/persist-web-storage";
import { reatomAsync, sleep, withAssign, withReset, withStatusesAtom } from "@reatom/framework";
import { logError } from "@/shared/lib/log";
import { toast } from "sonner";
import { client, withJsonBody } from "@/shared/lib/client-wrapper";
import { currentUserState } from "@/shared/models/current-user/index.model";
import { nicknameSchema } from "@/shared/schemas/auth";
import { DIALOG_DELAY } from "@/shared/consts/index";
import { getExistNickname } from "@/shared/models/shared.model";

type CartItem = ExtractApiData<"getStoreCartList">["data"]["data"][number]

export const getRecipient = action((ctx): string => {
  const custom = ctx.get(storeGlobalRecipientAtom)

  if (!custom) {
    const current = ctx.get(currentUserState)?.nickname;
    if (!current) throw new Error("Global recipient is not defined")
    return current;
  }

  return custom;
})

const initToDefault = action((ctx) => storeGlobalRecipientAtom(ctx, (state) => {
  const currentUser = ctx.get(currentUserState)
  if (!currentUser) return state;
  return currentUser.nickname
}))

export const storeGlobalRecipientAtom = atom<string | null>(null, "storeGlobalRecipient").pipe(
  withLocalStorage({ key: "store-recipient" })
);

onConnect(storeGlobalRecipientAtom, (ctx) => {
  const current = ctx.get(storeGlobalRecipientAtom);
  if (current) return;
  initToDefault(ctx);
});

const ERRORS: Record<string, string> = {
  "NOT_FOUND": "Такой игрок не зарегистрирован"
}

export const changeLocalRecipientState = atom(null, "changeLocalRecipientState").pipe(
  withAssign((_, name) => ({
    recipientId: atom<number | null>(null, `${name}.recipientId`).pipe(withReset()),
    title: atom<string | null>(null, `${name}.title`).pipe(withReset()),
    newRecipient: atom<string | null>(null, `${name}.newRecipient`).pipe(withReset()),
    oldRecipient: atom<string | null>(null, `${name}.oldRecipient`).pipe(withReset()),
    isOpen: atom(false, `${name}.isOpen`).pipe(withReset()),
    error: atom<string | null>(null, `${name}.error`).pipe(withReset()),
  }))
)
export const changeLocalRecipient = atom(null, "changeLocalRecipient").pipe(
  withAssign((_, name) => ({
    submit: reatomAsync(async (ctx, id: number, cb: (ctx: Ctx) => Promise<void>) => {
      const newRecipient = ctx.get(changeLocalRecipientState.newRecipient)
      const { success, error, data: validatedRecipient } = nicknameSchema.safeParse(newRecipient)

      if (!success) {
        changeLocalRecipientState.error(ctx, z.treeifyError(error).errors[0])
        return;
      }

      const existNickname = await getExistNickname(validatedRecipient)
      if (!existNickname) throw new Error("NOT_FOUND")

      const json = { key: "recipient", value: validatedRecipient };

      const result = await client
        .post<string>(`store/cart/edit/${id}`)
        .pipe(withJsonBody(json))
        .exec()

      return { id, result, cb }
    }, {
      name: `${name}.submitLocal`,
      onFulfill: async (ctx, res) => {
        if (!res) return;

        res.cb(ctx)

        changeLocalRecipientState.isOpen.reset(ctx)
        toast.success("Изменения сохранены");

        await sleep(DIALOG_DELAY)

        changeLocalRecipientState.recipientId.reset(ctx)
        changeLocalRecipientState.title.reset(ctx)
        changeLocalRecipientState.newRecipient.reset(ctx)
        changeLocalRecipientState.oldRecipient.reset(ctx)
        changeLocalRecipientState.error.reset(ctx)
      },
      onReject: (ctx, e) => {
        logError(e)

        if (e instanceof Error) {
          const message = ERRORS[e.message] ?? "Произошла ошибка"
          changeLocalRecipientState.error(ctx, message)
        }
      }
    }).pipe(
      withStatusesAtom()
    ),
    openDialog: action(async (ctx, item: CartItem) => {
      const { recipient, title } = item;

      changeLocalRecipientState.isOpen(ctx, true)

      changeLocalRecipientState.title(ctx, title)
      changeLocalRecipientState.recipientId(ctx, item.id);
      changeLocalRecipientState.oldRecipient(ctx, recipient);
      changeLocalRecipientState.newRecipient(ctx, recipient);
    })
  }))
)

export const changeGlobalRecipientState = atom(null, "changeGlobalRecipientState").pipe(
  withAssign((_, name) => ({
    oldRecipient: atom<string | null>((ctx) => ctx.spy(storeGlobalRecipientAtom), `${name}.oldRecipient`),
    newRecipient: atom<string | null>(null, `${name}.newRecipient`).pipe(withReset()),
    error: atom<string | null>(null, `${name}.error`).pipe(withReset())
  }))
)
export const changeGlobalRecipient = atom(null, "changeGlobalRecipient").pipe(
  withAssign((_, name) => ({
    submit: reatomAsync(async (ctx) => {
      const newRecipient = ctx.get(changeGlobalRecipientState.newRecipient)

      if (!newRecipient || newRecipient === "") {
        const current = ctx.get(currentUserState)?.nickname
        if (!current) throw new Error('Current nickname is not defined')
        return current;
      }

      const { success, error, data: validatedRecipient } = nicknameSchema.safeParse(newRecipient)

      if (!success) {
        changeGlobalRecipientState.error(ctx, z.treeifyError(error).errors[0])
        return;
      }

      const existNickname = await getExistNickname(validatedRecipient)
      if (!existNickname) throw new Error("NOT_FOUND")

      return newRecipient
    }, {
      name: `${name}.submitGlobal`,
      onFulfill: (ctx, nickname) => {
        if (!nickname) return;

        storeGlobalRecipientAtom(ctx, nickname)
        changeGlobalRecipientState.error.reset(ctx)
      },
      onReject: (ctx, e) => {
        logError(e)

        if (e instanceof Error) {
          const message = ERRORS[e.message] ?? "Произошла ошибка"
          changeGlobalRecipientState.error(ctx, message)
        }
      }
    }).pipe(
      withStatusesAtom()
    ),
    resetToDefault: action((ctx) => {
      changeGlobalRecipientState.newRecipient.reset(ctx);
      changeGlobalRecipientState.error.reset(ctx);
      initToDefault(ctx)
    })
  }))
)

const schema = z.object({ oldRecipient: z.string(), newRecipient: z.string() }).refine((data) => data.oldRecipient !== data.newRecipient);

const getNicknameValidator = (ctx: CtxSpy, oldAtom: Atom<string | null>, newAtom: Atom<string | null>) => {
  const newRecipient = ctx.spy(newAtom);
  if (!newRecipient) return false;
  return schema.safeParse({ oldRecipient: ctx.spy(oldAtom), newRecipient }).success
}

export const changeRecipientIsValidAtom = atom<boolean>((ctx) =>
  getNicknameValidator(ctx, changeLocalRecipientState.oldRecipient, changeLocalRecipientState.newRecipient)
)
export const changeGlobalRecipientIsValidAtom = atom<boolean>((ctx) =>
  getNicknameValidator(ctx, changeGlobalRecipientState.oldRecipient, changeGlobalRecipientState.newRecipient)
)
