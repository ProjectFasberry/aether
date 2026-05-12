import { Typography } from "@/shared/ui/typography";
import { IconArrowRight } from "@tabler/icons-react";
import { Intro } from "@/shared/components/app/intro/components/intro";
import { EventsList } from "@/shared/components/app/events/components/events";
import { CONTACTS } from "@/shared/consts/contacts";
import { action } from "@reatom/framework";
import { reatomComponent } from "@reatom/npm-react";
import { LandsListShorted } from "@/shared/components/app/lands/components/lands-list";
import { NewsList } from "@/shared/components/app/news/components/news";
import { translate } from "@/shared/locales/helpers";
import { userState } from "@/shared/models/app/index.model";

const ruAttr = ['ru-RU', 'RU', 'ru'];

const getContacts = action((ctx) => {
  const country = ctx.get(userState.geo.country)
  if (!country || !ruAttr.includes(country)) return CONTACTS;

  return CONTACTS.filter(d => d.value !== 'ds')
})

const Contacts = reatomComponent(({ ctx }) => {
  const data = getContacts(ctx)

  return (
    <div
      id="contacts"
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 auto-rows-auto gap-2 sm:gap-4 w-full"
    >
      {data.map((item, idx) => (
        <a
          href={item.href}
          key={idx}
          target="_blank"
          rel="noreferrer"
          className={`flex items-center justify-between p-4 group rounded-xl ${item.color}`}
        >
          <div className="flex items-center gap-2 sm:gap-4">
            <img src={item.img} alt="TG" width={36} height={36} />
            <Typography className="truncate font-semibold text-lg lg:text-xl">
              {item.title}
            </Typography>
          </div>
          <IconArrowRight size={36} className="duration-150 -rotate-45 group-hover:rotate-0" />
        </a>
      ))}
    </div>
  )
}, "Contacts")

export default function Page() {
  return (
    <div className='flex flex-col gap-8 w-full h-full'>
      <Intro />
      <div id="news" className="flex flex-col gap-4 w-full h-full">
        <Typography variant="title">
          {translate["index.news"]()}
        </Typography>
        <div className="flex flex-col sm:flex-row scrollbar-h-2 overflow-x-auto gap-4 pb-2">
          <NewsList />
        </div>
      </div>
      <div id="last-events" className="flex flex-col gap-4 w-full h-full">
        <Typography variant="title">
          {translate["index.latest-events"]()}
        </Typography>
        <div className="flex flex-col sm:flex-row scrollbar-h-2 overflow-x-auto gap-4 pb-2">
          <EventsList />
        </div>
      </div>
      <div id="last-lands" className="flex flex-col gap-4 h-full w-full">
        <Typography variant="title">
          {translate["index.lands"]()}
        </Typography>
        <LandsListShorted />
      </div>
      <Contacts />
    </div>
  )
}