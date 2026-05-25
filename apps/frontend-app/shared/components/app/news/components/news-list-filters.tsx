import { Button } from "@/shared/ui/button"
import { news, newsState } from "../models/news-list.model"
import { reatomComponent } from "@reatom/npm-react"
import { Input } from "@/shared/ui/input"
import { IconArrowDown, IconArrowUp, IconSearch } from "@tabler/icons-react"

const NewsFilterSearch = reatomComponent(({ ctx }) => {
  return (
    <div className="flex items-center w-full h-10 relative">
      <IconSearch size={20} className="text-neutral-400 absolute z-1 left-4" />
      <Input
        className="w-full h-10 pl-12"
        placeholder="Название"
        onChange={e => newsState.searchQuery.onChangeEvent(ctx, e)}
        value={ctx.spy(newsState.searchQuery)}
        maxLength={1024}
      />
    </div>
  )
}, "TasksFilterSearch")

const NewsFilterAsc = reatomComponent(({ ctx }) => {  
  return (
    <Button
      background="compound"
      className="aspect-square rounded-xl text-neutral-400 h-10 w-10 p-0"
      onClick={() => newsState.asc(ctx, (state) => !state)}
      disabled={ctx.spy(news.fetch.statusesAtom).isPending}
    >
      {ctx.spy(newsState.asc) ? <IconArrowUp size={20} /> : <IconArrowDown size={20} />}
    </Button>
  )
}, "TasksFilterAsc")

export const NewsFilters = () => {
  return (
    <div className="flex justify-between items-center gap-2 w-full">
      <NewsFilterSearch />
      <NewsFilterAsc />
    </div>
  )
}