import { Link } from "@/shared/components/config/link";
import { getStaticImage } from "@/shared/lib/volume-helpers";
import { Button } from "@/shared/ui/button";
import { Typography } from "@/shared/ui/typography";
import { IconArrowRight } from "@tabler/icons-react";
import { type ReactNode } from "react";
import { usePageContext } from "vike-react/usePageContext";

const Back = () => {
  return (
    <Link href="/">
      <Button className="gap-2 md:w-max bg-neutral-50 text-neutral-950">
        <Typography className='text-center font-semibold'>
          В безопасное место
        </Typography>
        <IconArrowRight size={18} />
      </Button>
    </Link>
  )
}

const NotFoundPage = () => {
  return (
    <>
      <Typography className="text-xl lg:text-2xl text-center font-semibold">
        Не удалось найти нужный ресурс
      </Typography>
    </>
  )
}

const ErrorPage = () => {
  const { abortReason } = usePageContext();

  const message = typeof abortReason === 'string' ? abortReason : ""

  return (
    <>
      <Typography className="text-xl lg:text-2xl text-center font-semibold">
        Произошла ошибка
      </Typography>
      {import.meta.env.DEV && (
        <span className="text-red">{message}</span>
      )}
    </>
  )
}

const VARIANTS: Record<string, ReactNode> = {
  "404": <NotFoundPage />,
  "500": <ErrorPage />
}

export default function Page() {
  const { is404 } = usePageContext();

  return (
    <div className="flex flex-col h-[80vh] justify-center items-center gap-4">
      <div className="w-full lg:w-2/3 h-72 lg:h-96 rounded-xl overflow-hidden">
        <img
          src={getStaticImage("images/marketplace_art.webp")}
          fetchPriority="high"
          alt=""
          className="object-cover w-full h-full"
          draggable={false}
        />
      </div>
      {VARIANTS[is404 ? "404" : "500"]}
      <Back />
    </div>
  );
}