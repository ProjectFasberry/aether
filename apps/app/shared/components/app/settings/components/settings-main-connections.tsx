import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { Typography } from "@/shared/ui/typography"
import { IconCircleDotted, IconLoader2, IconX } from "@tabler/icons-react";
import { Button } from "@/shared/ui/button";
import { tv } from "tailwind-variants";
import { Skeleton } from "@/shared/ui/skeleton";
import { getSocialStatusAtom, socials, socialsIsProcessingAtom, socialsState } from "../models/settings-profile.socials.model";
import { type PlayerSocialsPayload } from "../../player/models/socials.model";
import { SettingsContentWrapper } from "./ui";
import { onDisconnect } from "@reatom/framework";
import { SOCIALS_ICONS } from "@/shared/consts/icons";
import { Icon } from "@/shared/ui/icon";
import { IconLoader } from "@/shared/ui/icon-loader";
import { Dialog } from "@ark-ui/react/dialog";
import { Portal } from "@ark-ui/react/portal";
import { dialogBackdropVariant, dialogContentVariant, dialogPositionerVariant } from "@/shared/ui/dialog";

const profileSocialsListItemVariant = tv({
  base: `flex items-center justify-between gap-2 border rounded-lg border-neutral-700 p-4 w-full`
})

onDisconnect(socialsState.isOpen, (ctx) => {
  socials.onClose(ctx)
})

const SocialsAddDialog = reatomComponent(({ ctx }) => {
  const isLoading = ctx.spy(socials.control.addWrapper.statusesAtom).isPending;

  return (
    <Dialog.Root open={ctx.spy(socialsState.isOpen)} onOpenChange={v => socialsState.isOpen(ctx, v.open)}>
      <Portal>
        <Dialog.Backdrop className={dialogBackdropVariant()} />
        <Dialog.Positioner className={dialogPositionerVariant()}>
          <Dialog.Content className={dialogContentVariant()}>
            <div className="max-w-[600px]">
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
}, "SocialsAddDialog")

const SocialsList = reatomComponent(({ ctx }) => {
  const data = ctx.spy(socials.fetchAvailable.dataAtom)
  if (!data) return null;

  return (
    <div className="flex items-center justify-start w-full gap-2 flex-wrap">
      {data.map(({ title, social }) => (
        <Button
          key={social}
          title={title}
          onClick={() => socials.control.addWrapper(ctx, social)}
          className="flex justify-center p-0 overflow-hidden relative bg-neutral-800 aspect-square h-12 max-h-12 rounded-lg items-center gap-2"
        >
          {ctx.spy(socialsIsProcessingAtom(social)) && (
            <div className="absolute flex items-center justify-center w-full h-full inset-0 z-1 bg-black/60">
              <IconLoader2 size={16} className="animate-spin duration-300 text-neutral-50" />
            </div>
          )}
          <Icon name={SOCIALS_ICONS[social]} className='size-6' />
        </Button>
      ))}
    </div>
  )
}, "SocialsList")

const ProfileSocialAdd = () => (
  <>
    <SocialsAddDialog />
    <SocialsList />
  </>
)

const ProfileSocialsListItem = reatomComponent<PlayerSocialsPayload>(({ ctx, type, value }) => {
  const isLoading = ctx.spy(getSocialStatusAtom(type));

  return (
    <div className={profileSocialsListItemVariant()}>
      <div className="flex items-center gap-2">
        <Icon name={SOCIALS_ICONS[type]} className='size-5' />
        <Typography className="font-semibold">
          {value.username}
        </Typography>
      </div>
      <Button
        className="h-6 w-6 p-0 aspect-square"
        onClick={() => socials.control.removeWrapper(ctx, type)}
      >
        {isLoading
          ? <IconCircleDotted className="animate-spin" size={18} />
          : <IconX size={18} />
        }
      </Button>
    </div>
  )
}, "ProfileSocialsListItem")

const ProfileSocialsListSkeleton = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 auto-rows-auto gap-2">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  )
}

const ProfileSocials = reatomComponent(({ ctx }) => {
  if (ctx.spy(socials.fetchList.statusesAtom).isPending || ctx.spy(socials.fetchAvailable.statusesAtom).isPending) {
    return <ProfileSocialsListSkeleton />
  }

  const data = ctx.spy(socials.fetchList.dataAtom)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 auto-rows-auto gap-2">
      <ProfileSocialAdd />
      {data?.map((social) => <ProfileSocialsListItem key={social.type} {...social} />)}
    </div>
  )
}, "ProfileSocials")

export const SettingsMainConnections = () => {
  useUpdate((ctx) => {
    socials.fetchAvailable(ctx)
    socials.fetchList(ctx)
  }, []);

  return (
    <SettingsContentWrapper title="Подключения">
      <ProfileSocials />
    </SettingsContentWrapper>
  )
}