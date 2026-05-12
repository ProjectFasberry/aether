import { reatomComponent, useUpdate } from "@reatom/npm-react";
import {
  dict,
  dictionariesEdit,
  dictState,
  type DictionariesItem,
  dictionariesListAction
} from "../models/dictionaries.model";
import { Typography } from "@/shared/ui/typography"
import { ActionButton, DeleteButton, EditButton } from "./ui";
import { Input } from "@/shared/ui/input";
import { IconArrowBackUp, IconCheck } from "@tabler/icons-react";
import { type ReactNode } from "react";
import { actionsTypeAtom, type ActionType, getSelectedParentAtom } from "../models/actions.model";
import { ButtonXSubmit, ToActionButtonX } from "./global";

type DictionariesListItemProps = Omit<DictionariesItem, "key"> & {
  itemKey: string
}

const DictionariesListItem = reatomComponent<DictionariesListItemProps>(({ ctx, id, itemKey, value }) => {
  const isEdit = ctx.spy(dictionariesEdit.getIsEdit(id));

  const editIsLoading = ctx.spy(dict.edit.statusesAtom).isPending

  return (
    <div className="flex justify-between items-center gap-1 p-2 border border-neutral-800 rounded-lg">
      <div className="flex items-center gap-2">
        {isEdit ? (
          <Input
            value={ctx.spy(dictState.editKey) ?? itemKey}
            onChange={e => dictState.editKey(ctx, e.target.value)}
            className="h-6"
          />
        ) : (
          <Typography className="text-neutral-400 text-sm">
            [{itemKey}]
          </Typography>
        )}
        {isEdit ? (
          <Input
            value={ctx.spy(dictState.editValue) ?? value}
            onChange={e => dictState.editValue(ctx, e.target.value)}
            className="h-6"
          />
        ) : (
          <Typography>
            {value}
          </Typography>
        )}
      </div>
      <div className="flex items-center gap-1">
        {isEdit ? (
          <>
            <ActionButton
              icon={IconArrowBackUp}
              disabled={editIsLoading}
              onClick={() => dictionariesEdit.resetFull(ctx)}
            />
            <ActionButton
              variant="selected"
              onClick={() => dict.edit(ctx, id)}
              icon={IconCheck}
              disabled={!ctx.spy(dictionariesEdit.isValid) || editIsLoading}
            />
          </>
        ) : (
          <>
            <EditButton
              disabled={editIsLoading}
              onClick={() => dictionariesEdit.start(ctx, id)}
            />
            <DeleteButton
              disabled={ctx.spy(dict.delete.statusesAtom).isPending}
              onClick={() => dict.deleteBefore(ctx, { id, title: itemKey })}
            />
          </>
        )}
      </div>
    </div >
  )
}, "DictionariesListItem")

const DictionariesList = reatomComponent(({ ctx }) => {
  useUpdate(dictionariesListAction, [])

  const data = ctx.spy(dictionariesListAction.dataAtom)

  if (ctx.spy(dictionariesListAction.statusesAtom).isPending) {
    return null;
  }

  if (!data) return null;

  return (
    <div className="flex flex-col gap-1 w-full h-full">
      {data.map((o) => <DictionariesListItem key={o.id} itemKey={o.key} value={o.value} created_at={o.created_at} id={o.id} />)}
    </div>
  )
}, "DictionariesList")

const CreateDictionariesKeyInput = reatomComponent(({ ctx }) => {
  return (
    <Input
      placeholder="Ключ"
      value={ctx.spy(dictState.createKey)}
      onChange={(e) => dictState.createKey(ctx, e.target.value)}
    />
  )
}, "CreateDictionariesKeyInput")
const CreateDictionariesValueInput = reatomComponent(({ ctx }) => {
  return (
    <Input
      placeholder="Значение"
      value={ctx.spy(dictState.createValue)}
      onChange={(e) => dictState.createValue(ctx, e.target.value)}
    />
  )
}, "CreateDictionariesValueInput")
const CreateDictionariesSubmit = reatomComponent(({ ctx }) => {
  return (
    <ButtonXSubmit
      title="Создать"
      isDisabled={ctx.spy(dict.create.statusesAtom).isPending}
      action={() => dict.create(ctx)}
    />
  )
}, "DictionariesCreate")
const CreateDictionariesForm = () => {
  return (
    <div className="flex flex-col gap-2 w-full">
      <CreateDictionariesKeyInput />
      <CreateDictionariesValueInput />
    </div>
  )
}

const VARIANTS: Record<ActionType, ReactNode> = {
  "view": <DictionariesList />,
  "create": <CreateDictionariesForm />,
  "edit": null
}

export const DictionariesWrapper = reatomComponent(({ ctx }) => {
  if (!ctx.spy(getSelectedParentAtom("dictionaries"))) return VARIANTS["view"]
  return VARIANTS[ctx.spy(actionsTypeAtom)]
}, "DictionariesWrapper")

export const ViewDictionaries = () => <ToActionButtonX title="Создать" type="create" parent="dictionaries" />

export const CreateDictionaries = () => {
  return (
    <div className="flex items-center gap-1">
      <ToActionButtonX parent="dictionaries" type="create" />
      <CreateDictionariesSubmit />
    </div>
  )
}