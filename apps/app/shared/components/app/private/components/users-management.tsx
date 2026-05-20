import { Button } from "@/shared/ui/button"
import { dialogBackdropVariant, DialogClose, dialogContentVariant, dialogPositionerVariant, dialogTitleVariant } from "@/shared/ui/dialog"
import { ErrorBlock } from "@/shared/ui/error-block"
import { Input } from "@/shared/ui/input"
import {
  selectClearTriggerVariant, selectContentBaseStyle, selectContentVariant, selectControlVariant,
  selectIndicatorsVariant, selectIndicatorVariant, selectItemGroupVariant, selectItemIndicatorVariant, selectItemVariant,
  selectTriggerVariant
} from "@/shared/ui/select"
import { Dialog, DialogTitle } from "@ark-ui/react/dialog"
import { Portal } from "@ark-ui/react/portal"
import { createListCollection, Select } from "@ark-ui/react/select"
import { type SetAtom } from "@reatom/framework"
import { reatomComponent } from "@reatom/npm-react"
import { IconCheck, IconSelector, IconX } from "@tabler/icons-react"
import { usersManagementModel, type CreateUserVariant } from "../models/users.model"

const {
  CREATE_USER_FIELDS, CREATE_USER_OPTIONS, CREATE_USER_ROLE_OPTIONS,
  createUser, createUserState,
  deleteUser, deleteUserState, DELETE_USER_FIELDS,
  onValueChange
} = usersManagementModel();

const CreateUserFormField = reatomComponent<{ field: typeof CREATE_USER_FIELDS[number] }>(({ ctx, field }) => {
  if (field.type === 'input') {
    return (
      <Input
        value={ctx.spy(field.value)}
        onChange={e => field.value(ctx, e.target.value)}
        placeholder={field.placeholder}
        required
      />
    )
  }

  const collection = createListCollection({
    items: field.options
  })

  // assertion because the expected value is string[], but number[] might be returned
  const value = Array.from(ctx.spy(field.value as SetAtom<CreateUserVariant>));

  const currentValue = value.map((d: number | CreateUserVariant) => {
    const B: Record<string, string> = {
      "number": CREATE_USER_ROLE_OPTIONS.find(item => item.value === Number(d))?.label ?? "unknown",
      "string": CREATE_USER_OPTIONS.find(item => item.value === String(d))?.label ?? "unknown"
    }
    return B[typeof d]
  }).join(", ")

  return (
    <Select.Root
      collection={collection}
      value={value}
      onValueChange={({ value }) => onValueChange(ctx, value, field)}
      className="w-full"
      multiple={field.multiple}
    >
      <Select.Control className={selectControlVariant()}>
        <Select.Trigger className={selectTriggerVariant()}>
          <Select.ValueText className="text-neutral-50">
            {currentValue}
          </Select.ValueText>
        </Select.Trigger>
        <div className={selectIndicatorsVariant()}>
          <Select.ClearTrigger className={selectClearTriggerVariant()}>
            <IconX size={20} />
          </Select.ClearTrigger>
          <Select.Indicator className={selectIndicatorVariant()}>
            <IconSelector size={20} />
          </Select.Indicator>
        </div>
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content className={selectContentVariant()} style={selectContentBaseStyle}>
            <Select.ItemGroup className={selectItemGroupVariant()}>
              {field.options.map((option, idx) => (
                <Select.Item key={idx} item={option} className={selectItemVariant()}>
                  <Select.ItemText>
                    {option.label}
                  </Select.ItemText>
                  <Select.ItemIndicator className={selectItemIndicatorVariant()}>
                    <IconCheck size={16} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.ItemGroup>
          </Select.Content>
        </Select.Positioner>
      </Portal>
      <Select.HiddenSelect />
    </Select.Root>
  )
}, "CreateUserFormField")

const CreateUserForm = reatomComponent(({ ctx }) => {
  const error = ctx.spy(createUser.submit.errorAtom);

  return (
    <form
      onSubmit={(e) => createUser.handle(ctx, e)}
      className="flex flex-col gap-4 w-full"
    >
      <div className="flex flex-col gap-2 w-full">
        {CREATE_USER_FIELDS.map((field, idx) => <CreateUserFormField key={idx} field={field} />)}
      </div>
      {error && <ErrorBlock title={error.message} />}
      <Button
        type="submit"
        background="white"
        className="font-semibold"
        withSpinner
        isLoading={ctx.spy(createUser.submit.statusesAtom).isPending}
        disabled={ctx.spy(createUser.submit.statusesAtom).isPending}
      >
        Создать
      </Button>
    </form>
  )
}, "CreateUserForm")

const CreateUser = reatomComponent(({ ctx }) => {
  return (
    <Dialog.Root
      open={ctx.spy(createUserState.isOpen)}
      onOpenChange={({ open }) => createUserState.isOpen(ctx, open)}
    >
      <Dialog.Trigger asChild>
        <Button background="default" className="text-sm font-semibold">
          Создать юзера
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop className={dialogBackdropVariant()} />
        <Dialog.Positioner className={dialogPositionerVariant()}>
          <Dialog.Content className={dialogContentVariant({ className: "w-1/4" })}>
            <DialogTitle className={dialogTitleVariant()}>Создание юзера</DialogTitle>
            <CreateUserForm />
            <DialogClose />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}, "CreateUser")

const DeleteUserFormField = reatomComponent<{ field: typeof DELETE_USER_FIELDS[number] }>(({ ctx, field }) => {
  return (
    <Input
      value={ctx.spy(field.value)}
      placeholder={field.placeholder}
      required={field?.required ?? false}
      onChange={e => field.value(ctx, e.target.value)}
    />
  )
}, "DeleteUserFormField");

const DeleteUserForm = reatomComponent(({ ctx }) => {
  const error = ctx.spy(deleteUser.submit.errorAtom);

  return (
    <form
      onSubmit={e => deleteUser.handle(ctx, e)}
      className="flex flex-col gap-4 w-full"
    >
      <div className="flex flex-col gap-2 w-full">
        {DELETE_USER_FIELDS.map((field, idx) => <DeleteUserFormField key={idx} field={field} />)}
      </div>
      {error && <ErrorBlock title={error.message} />}
      <Button
        type="submit"
        background="white"
        className="font-semibold"
        withSpinner
        isLoading={ctx.spy(deleteUser.submit.statusesAtom).isPending}
        disabled={ctx.spy(deleteUser.submit.statusesAtom).isPending}
      >
        Удалить
      </Button>
    </form>
  )
}, "DeleteUserForm")

const DeleteUser = reatomComponent(({ ctx }) => {
  return (
    <Dialog.Root
      open={ctx.spy(deleteUserState.isOpen)}
      onOpenChange={({ open }) => deleteUserState.isOpen(ctx, open)}
    >
      <Dialog.Trigger asChild>
        <Button background="default" className="text-sm font-semibold">
          Удалить юзера
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop className={dialogBackdropVariant()} />
        <Dialog.Positioner className={dialogPositionerVariant()}>
          <Dialog.Content className={dialogContentVariant({ className: "w-1/4" })}>
            <DialogTitle className={dialogTitleVariant()}>Удаление юзера</DialogTitle>
            <DeleteUserForm />
            <DialogClose />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}, "DeleteUser")

export const UsersManagement = () => {
  return (
    <div className="flex items-center w-full gap-2">
      <CreateUser />
      <DeleteUser />
    </div>
  )
}
