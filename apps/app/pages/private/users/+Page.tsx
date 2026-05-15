import { UsersFilters, UsersFiltersViewer } from "@/shared/components/app/private/components/users.filters";
import { Users, UsersItemMenu, UsersViewer } from "@/shared/components/app/private/components/users.list";
import { users, usersRoles } from "@/shared/components/app/private/models/users.model";
import { createPageModel } from "@/shared/lib/events";
import { useAtom } from "@reatom/npm-react";

const page = createPageModel({
  name: "users",
  onConnAction: (ctx) => {
    users.fetch(ctx)
    usersRoles.fetch(ctx)
  },
  onDisconnAction: (ctx) => {
    users.fetch.abort(ctx)
    usersRoles.fetch.abort(ctx)
  }
})

export default function Page() {
  const [_] = useAtom(page.dataAtom);

  return (
    <div className="flex flex-col h-full relative w-full">
      <UsersFiltersViewer />
      <UsersFilters />
      <div className="flex flex-col p-4 rounded-xl bg-neutral-900">
        <Users />
        <UsersViewer />
        <UsersItemMenu />
      </div>
    </div>
  )
}