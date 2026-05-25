import { reatomComponent } from "@reatom/npm-react";
import { type ActionParent, actionsGoBackAction, type ActionType, createActionsLinkAction, getIsSelectedActionAtom } from "../models/actions.model";
import { Button } from "@/shared/ui/button";
import { IconCheck, IconPlus, IconX } from "@tabler/icons-react";
import { Typography } from "@/shared/ui/typography"

export const ToActionButtonX = reatomComponent<{
  parent: ActionParent, type: ActionType, title?: string
}>(({
  ctx, parent, type, title
}) => {
  const isSelected = ctx.spy(getIsSelectedActionAtom(parent, type));

  const handle = () => {
    if (isSelected) {
      actionsGoBackAction(ctx)
    } else {
      createActionsLinkAction(ctx, { parent, type })
    }
  }

  return (
    <Button
      onClick={handle}
      data-state={isSelected ? "selected" : "default"}
      className="
        h-8 min-w-8 gap-2 font-semibold
        data-[state=selected]:text-neutral-950 data-[state=selected]:bg-neutral-50 data-[state=selected]:p-0
        data-[state=default]:text-neutral-50 data-[state=default]:bg-neutral-800 data-[state=default]:px-4
      "
    >
      {isSelected ? null : title}
      {isSelected ? <IconX size={18} /> : <IconPlus size={18} />}
    </Button>
  )
}, "ToActionButtonX")

export const ButtonXSubmit = ({ 
  title, isDisabled, action 
}: { 
  title: string, isDisabled: boolean, action: () => void 
}) => {
  return (
    <Button
      disabled={isDisabled}
      onClick={action}
      className="gap-2 h-8 px-4 bg-neutral-800"
    >
      <Typography className="font-semibold">
        {title}
      </Typography>
      <IconCheck size={18} />
    </Button>
  )
}