import { action, atom, batch, Ctx } from "@reatom/core";
import * as z from "zod/v4";
import { withLocalStorage } from "@reatom/persist-web-storage";
import { reatomAsync, sleep, withAssign, withInit, withReset, withStatusesAtom } from "@reatom/framework";
import { logError } from "@/shared/lib/log";
import { toast } from "sonner";
import { client, withJsonBody } from "@/shared/lib/client-wrapper";
import { CartItem } from "@repo/shared/types/entities/store";
import { currentUserState } from "@/shared/models/current-user.model";
import { nicknameSchema } from "@repo/shared/schemas/auth";
import { DIALOG_DELAY } from "@/shared/consts/index";
import { makeChangeValidator } from "@/shared/lib/utils";

export function getRecipient(ctx: Ctx): string {
  const custom = ctx.get(storeGlobalRecipientAtom)

  if (!custom) {
    const current = ctx.get(currentUserState)?.nickname;
    if (!current) throw new Error("Global recipient is not defined")
    return current;
  }

  return custom;
}

export const storeGlobalRecipientAtom = atom<string | null>(null, "storeGlobalRecipient").pipe(
  withLocalStorage({ key: "store-recipient" })
);

async function getExistNickname(nickname: string) {
  return client<string | null>(`validate/nickname/${nickname}`).exec()
}

const ERRORS: Record<string, string> = {
  "not-found": "Такой игрок не зарегистрирован"
}

export const changeRecipientState = atom(null, "changeRecipientState").pipe(
  withAssign((_, name) => ({
    local: atom(null, `${name}.local`).pipe(
      withAssign(() => ({
        recipientId: atom<number | null>(null).pipe(withReset()),
        title: atom<string | null>(null).pipe(withReset()),
        newRecipient: atom<string | null>(null).pipe(withReset()),
        oldRecipient: atom<string | null>(null).pipe(withReset()),
        dialogIsOpen: atom(false).pipe(withReset()),
        error: atom<string | null>(null).pipe(withReset()),
      }))
    ),
    global: atom(null, `${name}.global`).pipe(
      withAssign(() => ({
        oldRecipient: atom<string | null>((ctx) => ctx.spy(storeGlobalRecipientAtom)).pipe(
          withInit((ctx) => ctx.get(storeGlobalRecipientAtom))
        ),
        newRecipient: atom<string | null>(null).pipe(withReset()),
        error: atom<string | null>(null).pipe(withReset())
      }))
    )
  }))
)
export const changeRecipient = atom(null, "changeRecipient").pipe(
  withAssign((_, name) => ({
    submitLocal: reatomAsync(async (ctx, id: number, cb: (ctx: Ctx) => Promise<void>) => {
      const newRecipient = ctx.get(changeRecipientState.local.newRecipient)
      const { success, error, data: validatedRecipient } = nicknameSchema.safeParse(newRecipient)

      if (!success) {
        changeRecipientState.local.error(ctx, z.treeifyError(error).errors[0])
        return;
      }

      const existNickname = await getExistNickname(validatedRecipient)
      if (!existNickname) throw new Error("not-found")

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

        changeRecipientState.local.dialogIsOpen.reset(ctx)
        await sleep(DIALOG_DELAY)

        batch(ctx, () => {
          changeRecipientState.local.recipientId.reset(ctx)
          changeRecipientState.local.title.reset(ctx)
          changeRecipientState.local.newRecipient.reset(ctx)
          changeRecipientState.local.oldRecipient.reset(ctx)
          changeRecipientState.local.error.reset(ctx)
        })

        toast.success("Изменения сохранены");
      },
      onReject: (ctx, e) => {
        logError(e)

        if (e instanceof Error) {
          const message = ERRORS[e.message] ?? "Произошла ошибка"
          changeRecipientState.local.error(ctx, message)
        }
      }
    }).pipe(
      withStatusesAtom()
    ),
    submitGlobal: reatomAsync(async (ctx) => {
      const newRecipient = ctx.get(changeRecipientState.global.newRecipient)

      if (!newRecipient || newRecipient === "") {
        const current = ctx.get(currentUserState)?.nickname
        if (!current) throw new Error('Current nickname is not defined')
        return current;
      }

      const { success, error, data: validatedRecipient } = nicknameSchema.safeParse(newRecipient)

      if (!success) {
        changeRecipientState.global.error(ctx, z.treeifyError(error).errors[0])
        return;
      }

      const existNickname = await getExistNickname(validatedRecipient)
      if (!existNickname) throw new Error("not-found")

      return existNickname
    }, {
      name: `${name}.submitGlobal`,
      onFulfill: (ctx, nickname) => {
        if (!nickname) return;

        storeGlobalRecipientAtom(ctx, nickname)
        toast.success("Изменения применены")
      },
      onReject: (ctx, e) => {
        logError(e)

        if (e instanceof Error) {
          const message = ERRORS[e.message] ?? "Произошла ошибка"
          changeRecipientState.global.error(ctx, message)
        }
      }
    }).pipe(
      withStatusesAtom()
    ),
    openDialog: action(async (ctx, item: CartItem) => {
      if (!item) throw new Error('Item not found');

      const { recipient, title } = item;

      batch(ctx, () => {
        changeRecipientState.local.title(ctx, title)
        changeRecipientState.local.recipientId(ctx, item.id);
        changeRecipientState.local.oldRecipient(ctx, recipient);
        changeRecipientState.local.newRecipient(ctx, recipient);
      })
      changeRecipientState.local.dialogIsOpen(ctx, true)
    })
  }))
)

export const changeRecipientIsValidAtom = atom<boolean>(
  makeChangeValidator(changeRecipientState.local.oldRecipient, changeRecipientState.local.newRecipient),
)
const changeGlobalRecipientValueIsValidAtom = atom<boolean>(
  makeChangeValidator(changeRecipientState.global.oldRecipient, changeRecipientState.global.newRecipient),
)
export const changeGlobalRecipientIsValidAtom = atom<boolean>((ctx) => {
  const input = ctx.spy(changeRecipientState.global.oldRecipient)
  if (typeof input !== null && input === "") return true
  return !ctx.spy(changeGlobalRecipientValueIsValidAtom)
})