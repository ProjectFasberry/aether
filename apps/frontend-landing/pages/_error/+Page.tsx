import { Link } from "@/shared/components/config/link";
import { getStaticObject } from "@/shared/lib/volume";
import { Button } from "@repo/ui/button";
import { Typography } from "@repo/ui/typography";
import { usePageContext } from "vike-react/usePageContext";

const dirtImage = getStaticObject("minecraft/static", "dirt.webp")

const NotFound = () => {
  return (
    <>
      <Typography className="text-white text-base md:text-xl text-center font-normal">
        Не удалось найти нужный ресурс.
      </Typography>
      <Link href="/">
        <Button
          className="md:w-max mt-6 raised-slot-button text-center text-neutral-800 text-base md:text-xl py-1 px-4 md:px-6"
        >
          Вернуться в безопасное место
        </Button>
      </Link>
    </>
  )
}

const Error = () => {
  return (
    <Link href="/">
      <Button
        className="bg-neutral-600 md:w-max mt-6 raised-slot-button text-center text-base md:text-xl py-1 px-4 md:px-6"
      >
        Вернуться в безопасное место
      </Button>
    </Link>
  )
}

export default function Page() {
  const { is404 } = usePageContext();

  return (
    <div
      className="flex min-h-screen justify-center items-center px-8"
      style={{
        backgroundImage: `url('${dirtImage}')`
      }}
    >
      <div className="flex flex-col items-center gap-y-2">
        <Typography className="text-neutral-400 text-base md:text-xl font-normal">
          Отключено
        </Typography>
        {is404 ? <NotFound /> : <Error />}
      </div>
    </div>
  );
}
