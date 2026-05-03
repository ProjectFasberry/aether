import { appState } from "@/shared/models/app.model";
import { currentUserState } from "@/shared/models/current-user.model";
import { action, atom } from "@reatom/core";
import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@repo/ui/dialog";
import { Separator } from "@repo/ui/separator";
import { Typography } from "@repo/ui/typography";
import { IconLayoutSidebarRightInactive } from "@tabler/icons-react";

type Perms = {
  read: string[],
  create: string[],
  update: string[],
  delete: string[],
  unknown: string[],
}

const permsAtom = atom<Perms>({
  read: [],
  create: [],
  update: [],
  delete: [],
  unknown: [],
});

const transformPermissionsByNamespaceAction = action((ctx) => {
  const targets = ctx.get(currentUserState.perms);
  if (!targets) return null;

  permsAtom(ctx, {
    read: targets.filter(t => t.endsWith(".read")),
    create: targets.filter(t => t.endsWith(".create")),
    update: targets.filter(t => t.endsWith(".update")),
    delete: targets.filter(t => t.endsWith(".delete")),
    unknown: targets.filter(
      t => !/\.(read|create|update|delete)$/.test(t)
    ),
  });
}, "transformPermissionsByNamespaceAction")

export const UserInfo = reatomComponent(({ ctx }) => {
  useUpdate(transformPermissionsByNamespaceAction, []);

  const currentUser = ctx.spy(currentUserState);
  if (!currentUser) return null;

  const perms = ctx.spy(permsAtom)

  const groups = [
    { title: "Read", data: perms.read },
    { title: "Create", data: perms.create },
    { title: "Update", data: perms.update },
    { title: "Delete", data: perms.delete },
    { title: "Unknown", data: perms.unknown },
  ].filter(g => g.data && g.data.length > 0);

  const role = ctx.spy(currentUserState.role)
  if (!role) return null;

  const roleTitle = appState.dict.get(ctx, role.name)

  return (
    <Dialog>
      <DialogTrigger className="flex justify-between rounded-lg bg-neutral-700 h-10 overflow-hidden select-none px-4 gap-2 items-center">
        <Typography>
          Роль: <span className="font-semibold">{roleTitle}</span>
        </Typography>
        <IconLayoutSidebarRightInactive className="text-neutral-400" size={18} />
      </DialogTrigger>
      <DialogContent className='flex flex-col w-full rounded-lg gap-1'>
        <DialogTitle className="text-center text-2xl">
          Разрешения
        </DialogTitle>
        <div className="flex flex-col gap-2 overflow-y-auto max-h-[400px] scrollbar scrollbar-thumb-neutral-800 w-full">
          {groups.map((group, idx) => (
            <div key={group.title}>
              <Typography className="text-lg font-semibold mb-2">
                {group.title}
              </Typography>
              <div className="flex flex-col gap-1 w-full">
                {group.data.map(item => <span key={item} className="text-sm">{item}</span>)}
              </div>
              {idx < groups.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}, "Info")
