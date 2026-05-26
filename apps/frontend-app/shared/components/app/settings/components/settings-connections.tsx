import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { Typography } from "@/shared/ui/typography"
import { IconLoader2, IconX } from "@tabler/icons-react";
import { Button } from "@/shared/ui/button";
import { tv } from "tailwind-variants";
import { Skeleton } from "@/shared/ui/skeleton";
import { connectionsModel, type ConnectionsAvailablePayload } from "../models/settings-connections.model";
import { SettingsContentWrapper } from "./ui";
import { action, onDisconnect } from "@reatom/framework";
import { SOCIALS_ICONS } from "@/shared/consts/icons";
import { Icon } from "@/shared/ui/icon";
import { IconLoader } from "@/shared/ui/icon-loader";
import { Dialog } from "@ark-ui/react/dialog";
import { Portal } from "@ark-ui/react/portal";
import { dialogBackdropVariant, dialogContentVariant, dialogPositionerVariant } from "@/shared/ui/dialog";
import type { PlayerSocialsItem } from "../../player/models/socials.model";
import dayjs from "@/shared/lib/create-dayjs";

const {
  getConnectionStatusAtom,
  connections,
  connectionsControl,
  connectionIsProcessingAtom,
  connectionsState
} = connectionsModel()

const connectionsListItemVariant = tv({
  base: `flex items-center justify-between gap-2 border rounded-lg border-neutral-700 p-4 w-full`
})

onDisconnect(connectionsState.isOpen, (ctx) => {
  connectionsControl.onClose(ctx)
})

const ConnectionsAddDialog = reatomComponent(({ ctx }) => {
  const isLoading = ctx.spy(connectionsControl.addWrapper.statusesAtom).isPending;

  return (
    <Dialog.Root
      open={ctx.spy(connectionsState.isOpen)}
      onOpenChange={v => connectionsState.isOpen(ctx, v.open)}
    >
      <Portal>
        <Dialog.Backdrop className={dialogBackdropVariant()} />
        <Dialog.Positioner className={dialogPositionerVariant()}>
          <Dialog.Content className={dialogContentVariant({ className: "max-w-[600px]" })}>
            <div className="flex flex-col w-full">
              {isLoading ? (
                <IconLoader />
              ) : (
                <div>
                  test
                </div>
              )}
            </div>
            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}, "ConnectionsAddDialog")

const ConnectionsAvailableItem = reatomComponent<ConnectionsAvailablePayload[number]>(({ ctx, title, social }) => {
  const isProcessing = ctx.spy(connectionIsProcessingAtom(social));

  return (
    <Button
      title={title}
      onClick={() => connectionsControl.addWrapper(ctx, social)}
      className="p-0 overflow-hidden relative bg-neutral-800 aspect-square h-12 max-h-12 gap-2"
    >
      {isProcessing && (
        <div className="absolute flex items-center justify-center w-full h-full inset-0 z-1 bg-black/60">
          <IconLoader2 size={16} className="animate-spin duration-300 text-neutral-50" />
        </div>
      )}
      <Icon name={SOCIALS_ICONS[social]} className='size-6' />
    </Button>
  )
}, "ConnectionsAvailableItem")

const ConnectionsAvailableList = reatomComponent(({ ctx }) => {
  const data = ctx.spy(connections.fetchAvailable.dataAtom)

  if (ctx.spy(connections.fetchAvailable.statusesAtom).isPending) {
    return Array.from({ length: 3 }).map((_, idx) => <Skeleton key={idx} className="h-12 w-12" />)
  }

  if (!data) return null;

  return data.map((item) => <ConnectionsAvailableItem key={item.social} {...item} />)
}, "ConnectionsAvailableList")

const ConnectionsListItem = reatomComponent<PlayerSocialsItem>(({ ctx, social, created_at, value }) => {
  const isLoading = ctx.spy(getConnectionStatusAtom(social));

  return (
    <div className={connectionsListItemVariant()}>
      <div className="flex items-center gap-2">
        <Icon name={SOCIALS_ICONS[social]} className='size-8' />
        <div className="flex flex-col">
          <Typography className="font-semibold leading-4! text-base capitalize">
            {social} (id: {value})
          </Typography>
          {created_at && (
            <Typography color="gray" className="leading-4 text-sm">
              {dayjs(created_at).format("DD.MM.YYYY")}
            </Typography>
          )}
        </div>
      </div>
      <Button
        background="default"
        className="h-6 w-6 p-0 rounded-sm aspect-square"
        onClick={() => connectionsControl.removeBefore(ctx, social)}
        disabled={ctx.spy(connectionsControl.removeBefore.statusesAtom).isPending}
      >
        {isLoading
          ? <IconLoader2 className="animate-spin duration-300" size={18} /> : <IconX size={18} />
        }
      </Button>
    </div>
  )
}, "ConnectionsListItem")

const ConnectionsList = reatomComponent(({ ctx }) => {
  if (ctx.spy(connections.fetchList.statusesAtom).isPending) {
    return Array.from({ length: 3 }).map((_, idx) => <Skeleton key={idx} className="h-14 w-full" />)
  }

  const data = ctx.spy(connections.fetchList.dataAtom)

  return data.map((social) => <ConnectionsListItem key={social.social} {...social} />)
}, "ConnectionsList")

const onMainConnections = action((ctx) => {
  connections.fetchAvailable(ctx)
  connections.fetchList(ctx)
})

export const SettingsMainConnections = () => {
  useUpdate(onMainConnections, []);

  return (
    <SettingsContentWrapper title="Подключения">
      <div className="flex flex-col gap-1">
        <Typography className="text-lg leading-5 font-semibold">
          Добавьте аккаунты к своему профилю
        </Typography>
        <Typography color="gray" className="text-sm">
        </Typography>
        <>
          <ConnectionsAddDialog />
          <div className="flex items-center justify-start w-full gap-2 flex-wrap">
            <ConnectionsAvailableList />
          </div>
        </>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 auto-rows-auto gap-2">
        <ConnectionsList />
      </div>
    </SettingsContentWrapper>
  )
}
