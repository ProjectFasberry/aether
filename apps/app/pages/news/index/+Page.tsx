import { NewsContent } from "@/shared/components/app/news/components/news-list";
import { Typography } from "@/shared/ui/typography"

export default function Page() {
  return (
    <div className="flex flex-col w-full h-full gap-6">
      <Typography className="text-3xl font-semibold">
        Новости
      </Typography>
      <NewsContent />
    </div>
  )
}