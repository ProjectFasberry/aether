import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { Skeleton } from "@repo/ui/skeleton";
import { Switch } from "@repo/ui/switch";
import { Typography } from "@repo/ui/typography";
import { tv } from "tailwind-variants";
import { editMethodAction, methodsAction, PrivatedMethodsPayload } from "../models/methods.model";

const methodVariant = tv({
  base: `flex items-center justify-between gap-1 border border-neutral-800 rounded-lg p-2 h-14 w-full`,
  slots: {
    first_parent: "flex items-center min-w-0 gap-1 sm:gap-2",
    image: "h-8 w-8 rounded-lg",
    second_parent: "flex items-center gap-2 h-full",
    title: "truncate font-semibold"
  }
})

const MethodSkeleton = () => {
  return (
    <div
      className={methodVariant().base()}
    >
      <div className={methodVariant().first_parent()}>
        <Skeleton
          className={methodVariant().image()}
        />
        <Skeleton className={methodVariant().title()} />
      </div>
      <div className={methodVariant().second_parent()}>
        <Skeleton
          className="h-6 w-24"
        />
      </div>
    </div>
  )
}

const Method = reatomComponent<PrivatedMethodsPayload[number]>(({
  ctx, id, value, imageUrl, title, isAvailable
}) => {
  return (
    <div
      id={id.toString()}
      className={methodVariant().base()}
    >
      <div className={methodVariant().first_parent()}>
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          className={methodVariant().image()}
        />
        <Typography className={methodVariant().title()}>
          {title}
        </Typography>
      </div>
      <div className={methodVariant().second_parent()}>
        <Switch
          checked={isAvailable}
          onCheckedChange={v => editMethodAction(ctx, value, "isAvailable", !isAvailable)}
          disabled={ctx.spy(editMethodAction.statusesAtom).isPending}
        />
      </div>
    </div>
  )
}, "Method")

const MethodsSkeleton = () => {
  return (
    <>
      <MethodSkeleton />
      <MethodSkeleton />
      <MethodSkeleton />
    </>
  )
}

export const Methods = reatomComponent(({ ctx }) => {
  useUpdate(methodsAction, []);

  const data = ctx.spy(methodsAction.dataAtom);

  if (ctx.spy(methodsAction.statusesAtom).isPending) {
    return <MethodsSkeleton />
  }

  if (!data) return null;

  return data.map((method) => <Method key={method.id} {...method} />)
}, "Methods")