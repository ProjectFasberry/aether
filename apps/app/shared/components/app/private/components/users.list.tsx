import { reatomComponent, useUpdate } from "@reatom/npm-react";
import {
  getIsCheckedAtom, getIsSelectedUser, type PrivatedUser, users,
  usersControl, usersControlRoles, usersControlState, usersDataArrAtom
} from "../models/users.model";
import { Skeleton } from "@/shared/ui/skeleton";
import { tv } from "tailwind-variants";
import { currentUserState } from "@/shared/models/current-user/index.model";
import { Link } from "@/shared/components/config/link";
import { Avatar } from "../../../../ui/avatar";
import { Typography } from "@/shared/ui/typography"
import { UserActionsChangeRoleLocal } from "./users.change-role";
import { UserActionsWrapper } from "./users.restrict";
import { useInView } from "react-intersection-observer";
import { Checkbox } from "@/shared/ui/checkbox";
import { Menu } from '@ark-ui/react/menu'

const userItemVariant = tv({
  base: `flex flex-col rounded-lg w-full px-4 border`,
  variants: {
    variant: {
      default: "border-neutral-800",
      selected: "border-green-500/60",
    },
    state: {
      default: "",
      active: "bg-neutral-700"
    }
  },
  defaultVariants: {
    variant: "default"
  }
})

const UsersItem = reatomComponent<PrivatedUser>(({ ctx, player, role, avatar, nickname, uuid, premium_uuid }) => {
  const isExpanded = ctx.spy(getIsSelectedUser(nickname));
  const isIdentity = ctx.get(currentUserState)?.nickname === nickname;

  const variant = isIdentity ? "selected" : "default"
  const state = isExpanded ? "active" : "default"

  return (
    <div className={userItemVariant({ variant, state })}>
      <Menu.Root
        onOpenChange={({ open: v }) => {
          if (v) {
            usersControlState.selectedUser(ctx, nickname)
          } else {
            usersControlState.selectedUser.reset(ctx)
          }
        }}
      >
        <Menu.Trigger>
          <div className="flex items-center gap-3 h-12 min-w-0 justify-start">
            <Checkbox
              checked={ctx.spy(getIsCheckedAtom(nickname))}
              onCheckedChange={v => usersControl.selectSingle(ctx, v, nickname)}
            />
            <Link href={`/private/users/${nickname}`} className="flex items-center min-w-0 gap-2">
              <Avatar url={avatar} nickname={nickname} className="h-6 w-6" />
              <Typography className="font-semibold text-sm truncate">
                {nickname}
              </Typography>
            </Link>
            {role && (
              <UserActionsChangeRoleLocal nickname={nickname} role_id={role.id} role_name={role.name} />
            )}
          </div>
        </Menu.Trigger>
        <Menu.Positioner>
          <Menu.Content>
            <Menu.Arrow>
              <Menu.ArrowTip />
            </Menu.Arrow>
            <div className="flex pb-2 gap-1 items-center justify-end w-full">
              <UserActionsWrapper nickname={nickname} type="single" />
            </div>
          </Menu.Content>
        </Menu.Positioner>
      </Menu.Root>
    </div>
  )
}, "UsersItem")

const UsersSkeleton = ({ length = 32 }: { length?: number }) => {
  return (
    <div className="flex flex-col gap-1 w-full h-full">
      {Array.from({ length }).map((_, idx) => <Skeleton key={idx} className="h-12 w-full" />)}
    </div>
  )
}

const UsersUpdatingSkeleton = reatomComponent(({ ctx }) =>
  ctx.spy(users.update.statusesAtom).isPending && <UsersSkeleton length={3} />
)

export const Users = reatomComponent(({ ctx }) => {
  useUpdate((ctx) => {
    users.fetch(ctx)
    usersControlRoles.fetch(ctx)
  }, []);

  if (ctx.spy(users.fetch.statusesAtom).isPending) return <UsersSkeleton />

  const data = ctx.spy(usersDataArrAtom);
  if (!data) return null;

  return (
    <div className="flex flex-col gap-1 w-full h-full">
      {data.map((user) => <UsersItem key={user.uuid} {...user} />)}
      <UsersUpdatingSkeleton />
    </div>
  )
}, "Users")

export const UsersViewer = () => {
  const { ref, inView } = useInView({ triggerOnce: false, threshold: 0 })
  useUpdate((ctx) => usersControlState.inView(ctx, inView), [inView])
  return <div ref={ref} className="h-px" />
}