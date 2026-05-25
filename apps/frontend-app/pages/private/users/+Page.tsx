import { UsersBody } from "@/shared/components/app/private/components/users-body";
import { UsersHeader } from "@/shared/components/app/private/components/users-header";
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
    <div className="flex flex-col h-full gap-2 relative w-full">
      <UsersHeader />
      <UsersBody />
    </div>
  )
}
