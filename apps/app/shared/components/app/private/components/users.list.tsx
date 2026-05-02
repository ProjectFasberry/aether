import { reatomComponent, useUpdate } from "@reatom/npm-react";
import {
  getIsCheckedAtom,
  rolesAction,
  selectUserAction,
  updateAction,
  usersAction,
  usersDataArrAtom,
  usersIsViewAtom,
  usersSelectedOverAtom
} from "../models/users.model";
import { Skeleton } from "@repo/ui/skeleton";
import { PrivatedUser } from "@repo/shared/types/entities/other";
import { tv } from "tailwind-variants";
import { currentUserState } from "@/shared/models/current-user.model";
import { action, Atom, atom, reatomMap, withAssign } from "@reatom/framework";
import { Checkbox } from "@repo/ui/checkbox";
import { createLink, Link } from "@/shared/components/config/link";
import { Avatar } from "../../../../ui/avatar";
import { Typography } from "@repo/ui/typography";
import { ActionButton, ToLink } from "./ui";
import { IconLayoutBottombarInactive } from "@tabler/icons-react";
import { UserActionsChangeRoleLocal } from "./users.change-role";
import { UserActionsRestrictLocal } from "./users.restrict";
import { useInView } from "react-intersection-observer";

const userItemVariant = tv({
  base: `flex flex-col rounded-lg w-full px-4 border`,
  variants: {
    variant: {
      default: "border-neutral-800",
      selected: "border-green-500/60",
    }
  },
  defaultVariants: {
    variant: "default"
  }
})

const UserActions = reatomComponent<UserActionsProps>(({ ctx, role, nickname }) => {
  const isSelectedItems = ctx.spy(usersSelectedOverAtom);

  return (
    <div className="flex pb-2 gap-1 items-center justify-end w-full">
      <UserActionsChangeRoleLocal nickname={nickname} role_id={role.role_id} role_name={role.role_name} />
      {!isSelectedItems && (
        <UserActionsRestrictLocal nickname={nickname} />
      )}
    </div>
  )
}, "UserActions")

const isExpandedAtom = reatomMap<string, boolean>().pipe(
  withAssign((target, name) => ({
    toggle: action((ctx, nickname: string) => {
      const current: boolean = target.getOrCreate(ctx, nickname, () => false)
      const state = ctx.get(target)

      if (state.size >= 1) {
        const first = state.keys().next().value;

        if (first) {
          state.delete(first);
        }
      }

      target.set(ctx, nickname, !current)
    }, `${name}.toggle`),
  })),
)

const getIsExpandedAtom = (nickname: string): Atom<boolean> => atom(
  (ctx) => ctx.spy(isExpandedAtom).get(nickname) ?? false,
  "getIsExpanded"
)

type UserActionsProps = {
  nickname: string,
  role: { role_id: number, role_name: string }
}

const User = reatomComponent<PrivatedUser>(({ ctx, id, avatar, nickname, role_name, role_id }) => {
  const currentUser = ctx.get(currentUserState)

  const isChecked = ctx.spy(getIsCheckedAtom(nickname));
  const isExpanded = ctx.spy(getIsExpandedAtom(nickname));
  const isIdentity = currentUser?.nickname === nickname;
  const isSelectedItems = ctx.spy(usersSelectedOverAtom);

  const variant = isIdentity ? "selected" : "default"

  return (
    <div key={id} className={userItemVariant({ variant })}>
      <div className="flex gap-2 items-center justify-between w-full h-12">
        <div className="flex items-center gap-3 min-w-0 justify-start">
          <Checkbox
            checked={isChecked}
            onCheckedChange={v => {
              if (typeof v === 'boolean') {
                selectUserAction(ctx, v, nickname)
              }
            }}
          />
          <Link
            href={createLink("player", nickname)}
            className="flex items-center min-w-0 gap-2"
          >
            <Avatar url={avatar} nickname={nickname} className="h-8 w-8" />
            <Typography className="font-semibold truncate">
              {nickname}
            </Typography>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center gap-1">
            <ToLink link={`/private/users/${nickname}`} />
            {!isSelectedItems && (
              <ActionButton
                variant={isExpanded ? "selected" : "default"}
                icon={IconLayoutBottombarInactive}
                onClick={() => isExpandedAtom.toggle(ctx, nickname)}
              />
            )}
          </div>
        </div>
      </div>
      {isExpanded && (
        <UserActions nickname={nickname} role={{ role_id, role_name }} />
      )}
    </div>
  )
}, "User")

const UsersSkeleton = ({ length = 32 }: { length?: number }) => {
  return (
    <div className="flex flex-col gap-1 w-full h-full">
      {Array.from({ length }).map((_, idx) => (
        <Skeleton key={idx} className="h-12 w-full" />
      ))}
    </div>
  )
}

const UsersUpdatingSkeleton = reatomComponent(({ ctx }) => {
  const isLoading = ctx.spy(updateAction.statusesAtom).isPending;
  return isLoading ? <UsersSkeleton length={3} /> : null
}, "UsersUpdatingSkeleton")

export const Users = reatomComponent(({ ctx }) => {
  useUpdate((ctx) => {
    usersAction(ctx)
    rolesAction(ctx)
  }, []);

  const data = ctx.spy(usersDataArrAtom);

  if (ctx.spy(usersAction.statusesAtom).isPending) {
    return <UsersSkeleton />
  }

  if (!data) return null;

  return (
    <div className="flex flex-col gap-1 w-full h-full">
      {data.map((user) => <User key={user.id} {...user} />)}
      <UsersUpdatingSkeleton />
    </div>
  )
}, "Users")

export const UsersViewer = () => {
  const { ref, inView } = useInView({ triggerOnce: false, threshold: 0 })
  useUpdate((ctx) => usersIsViewAtom(ctx, inView), [inView])
  return <div ref={ref} className="h-[1px]" />
}