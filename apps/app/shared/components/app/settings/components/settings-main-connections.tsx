import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { Typography } from "@repo/ui/typography";
import { IconCircleDotted, IconPlus, IconX } from "@tabler/icons-react";
import { Button } from "@repo/ui/button";
import { tv } from "tailwind-variants";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@repo/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/dialog";
import { useEffect, useState } from "react";
import { Skeleton } from "@repo/ui/skeleton";
import {
  getSocialStatusAtom,
  profileSocials,
  socialForAdd,
  socialForAddState,
} from "../models/settings-profile.socials.model";
import { type PlayerSocialsPayload, SOCIAL_ICONS } from "../../player/models/socials.model";
import { SettingsContentWrapper } from "./ui";

const profileSocialsListItemVariant = tv({
  base: `flex items-center justify-between gap-2 border rounded-lg border-neutral-700 p-4 w-full`
})

const ProfileSocialAdd = reatomComponent(({ ctx }) => {
  const [open, setOpen] = useState(false);

  const isProcessing = ctx.spy(socialForAddState.isProcessing);
  const data = ctx.spy(profileSocials.fetchAvailable.dataAtom)

  useEffect(() => {
    return () => {
      socialForAddState.isProcessing.reset(ctx)
    }
  }, [])

  useEffect(() => {
    if (isProcessing) {
      setOpen(true)
    }
  }, [isProcessing])

  if (!data) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="py-4">
          <DialogTitle className="text-center text-xl">
            Привязка
          </DialogTitle>
          <div className="flex">
            <Button
              disabled={ctx.spy(profileSocials.add.statusesAtom).isPending}
              onClick={() => profileSocials.add(ctx)}
            >
              Начать
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild className={profileSocialsListItemVariant()}>
          <Button background="white">
            <IconPlus size={20} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <div className="flex flex-col p-2 gap-4 w-full h-full">
            <Typography className="text-neutral-400 text-sm">
              Доступные социальные сети:
            </Typography>
            <div className="flex flex-col gap-1 w-full">
              {data.map(({ title, social }) => (
                <DropdownMenuItem
                  key={social}
                  onClick={() => socialForAdd.selectSocial(ctx, social)}
                  className="flex items-center gap-2 w-full h-full"
                >
                  {title}
                </DropdownMenuItem>
              ))}
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}, "ProfileSocialAdd")

const ProfileSocialsListItem = reatomComponent<PlayerSocialsPayload>(({ ctx, type, value }) => {
  const isLoading = ctx.spy(getSocialStatusAtom(type));

  return (
    <div className={profileSocialsListItemVariant()}>
      <div className="flex items-center gap-2">
        {SOCIAL_ICONS[type]()}
        <Typography className="font-semibold">
          {value.username}
        </Typography>
      </div>
      <Button
        className="h-6 w-6 p-0 aspect-square"
        onClick={() => profileSocials.removeWrapper(ctx, type)}
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

const ProfileSocialsList = reatomComponent(({ ctx }) => {
  useUpdate(profileSocials.fetch, []);

  if (ctx.spy(profileSocials.fetch.statusesAtom).isPending || ctx.spy(profileSocials.fetchAvailable.statusesAtom).isPending) {
    return <ProfileSocialsListSkeleton />
  }

  const data = ctx.spy(profileSocials.fetch.dataAtom)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 auto-rows-auto gap-2">
      {data?.map((social) => <ProfileSocialsListItem key={social.type} {...social} />)}
      <ProfileSocialAdd />
    </div>
  )
}, "ProfileSocialsList")

export const SettingsMainConnections = () => {
  useUpdate(profileSocials.fetchAvailable, []);

  return (
    <SettingsContentWrapper title="Подключения">
      <ProfileSocialsList />
    </SettingsContentWrapper>
  )
}