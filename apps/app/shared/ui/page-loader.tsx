import { getStaticImage } from "../lib/volume-helpers"

const loaderImage = getStaticImage("gifs/loading.webp")

export const PageLoader = () => {
  return (
    <div className="flex items-center justify-center w-full min-h-[80vh]">
      <img
        src={loaderImage}
        width={96}
        height={96}
        alt="Загрузка..."
        loading="eager"
      />
    </div>
  )
}