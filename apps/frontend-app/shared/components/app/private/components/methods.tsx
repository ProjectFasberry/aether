import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { Skeleton } from "@/shared/ui/skeleton";
import { Typography } from "@/shared/ui/typography";
import { tv } from "tailwind-variants";
import { methodsModel, type PrivatedMethodsPayload } from "../models/methods.model";
import { Switch } from "@/shared/ui/switch";

const { methods, methodsControl, getMethodIsLoading } = methodsModel()

const methodVariant = tv({
  base: `flex items-center justify-between gap-1 border border-neutral-800 rounded-lg px-2 h-10 w-full`,
  slots: {
    first_parent: "flex items-center min-w-0 gap-1 sm:gap-2",
    image: "h-6 w-6 rounded-lg",
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
  const isLoading = ctx.spy(getMethodIsLoading(id));

  return (
    <div id={id.toString()} className={methodVariant().base()}>
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
          onCheckedChange={({ checked }) => methodsControl.update(ctx, id, "isAvailable", !isAvailable)}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}, "Method")

export const Methods = reatomComponent(({ ctx }) => {
  useUpdate(methods.fetch, []);

  const data = ctx.spy(methods.fetch.dataAtom);

  if (ctx.spy(methods.fetch.statusesAtom).isPending) {
    return Array.from({ length: 3 }).map((_, idx) => <MethodSkeleton key={idx} />)
  }

  if (!data) return null;

  return data.map((method) => <Method key={method.id} {...method} />)
}, "Methods")
