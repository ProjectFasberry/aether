import dayjs from "@/shared/lib/create-dayjs"
import { reatomComponent } from "@reatom/npm-react";
import { Typography } from "@/shared/ui/typography"
import { NotFound } from "@/shared/ui/not-found";
import { tv } from "tailwind-variants";
import { eventsState } from "../models/events.model";
import { isEmptyArray } from "@/shared/lib/helpers";
import { translate } from "@/shared/locales/helpers";

type EventCardProps = ExtractApiData<"getServerEventsList">["data"][number]

const eventCardVariant = tv({
  base: `
    flex flex-col md:flex-[0_0_calc((100%/3)-0.666rem)] flex-shrink-0 w-full
    h-49 p-3 sm:p-4 bg-neutral-900 rounded-xl overflow-hidden justify-between
  `,
  slots: {
    firstGroup: "flex items-center justify-start bg-neutral-50 rounded-md p-2 w-full truncate",
    secondGroup: "flex flex-col justify-between h-full mt-2"
  }
})

const EventCard = ({ content, id, title }: EventCardProps) => {
  const created_at = dayjs(content.created_at.toString()).fromNow();
  
  return (
    <div
      id={id}
      className={eventCardVariant().base()}
    >
      <div className={eventCardVariant().firstGroup()}>
        <Typography className="text-neutral-950 text-base font-bold truncate">
          {title}
        </Typography>
      </div>
      <div className={eventCardVariant().secondGroup()}>
        {content.description && (
          <Typography className="text-base line-clamp-3">
            {content.description}
          </Typography>
        )}
        <div className="flex flex-col justify-center items-end w-full">
          <Typography color="gray" className="text-sm">
            {created_at}
          </Typography>
        </div>
      </div>
    </div>
  )
}

export const EventsList = reatomComponent(({ ctx }) => {
  const data = ctx.spy(eventsState.data);
  
  if (!data || isEmptyArray(data)) {
    return <NotFound title={translate["shared.empty"]()} />
  }

  return data.map(event => <EventCard key={event.id} {...event}/>)
}, "EventsList")