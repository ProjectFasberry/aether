import { UsersManagement } from "./users-management"
import { UsersFilters, UsersFiltersViewer } from "./users.filters"

export const UsersHeader = () => {
  return (
    <>
      <UsersFiltersViewer />
      <UsersFilters />
      <UsersManagement />
    </>
  )
}
