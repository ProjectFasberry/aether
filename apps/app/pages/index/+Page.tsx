import { Typography } from "@repo/ui/typography";
import { IconArrowRight } from "@tabler/icons-react";
import { News } from "@/shared/components/app/news/components/news";
import { Intro } from "@/shared/components/app/intro/components/intro";
import { Events } from "@/shared/components/app/events/components/events";
import { CONTACTS } from "@/shared/consts/contacts";
import { action } from "@reatom/core";
import { countryAtom } from "@/shared/models/page-context.model";
import { reatomComponent } from "@reatom/npm-react";
import { LandsListShorted } from "@/shared/components/app/lands/components/lands-list";

const getContacts = action((ctx) => {
  let data = CONTACTS;

  const country = ctx.get(countryAtom)
  if (!country) return data;

  if (['ru-RU', 'RU', 'ru'].includes(country)) {
    data = data.filter(d => d.value !== 'ds')
  }

  return data;
}, "getContacts")

const Contacts = reatomComponent(({ ctx }) => {
  const data = getContacts(ctx)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 auto-rows-auto gap-2 sm:gap-4 w-full">
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

const Lands = () => {
  return (
    <div className="flex flex-col gap-4 h-full w-full">
      <Typography className="font-semibold text-3xl">
        Территории сервера
      </Typography>
      <LandsListShorted />
    </div>
  )
}

export default function Page() {
  return (
    <div className='flex flex-col gap-8 w-full h-full'>
      <Intro />
      <News />
      <Events />
      <Lands />
      <Contacts />
    </div>
  )
}