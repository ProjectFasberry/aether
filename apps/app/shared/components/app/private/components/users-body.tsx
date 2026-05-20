import { UsersViewer } from "../models/users.model"
import { Users, UsersItemMenu } from "./users.list"

export const UsersBody = () => {
  return (
    <div className="flex flex-col">
      <Users />
      <UsersViewer />
      <UsersItemMenu />
    </div>
  )
}
