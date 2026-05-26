import { getStaticObject } from '@/shared/lib/helpers';
import { MainWrapperPage } from '@/shared/ui/main-wrapper';
import { Typography } from '@/shared/ui/typography';

const image = getStaticObject("arts", "credits-bzzvanet.jpg")

export default function Page() {
  return (
    <MainWrapperPage variant="with_section">
      <div class="flex flex-col min-h-screen responsive mx-auto py-36 gap-y-6">
        <Typography class="text-white text-3xl">
          Отдельные благодарности
        </Typography>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 auto-rows-auto gap-4 w-full h-full">
          <a
            href="https://linktr.ee/bzzvanet"
            target="_blank"
            class="flex items-end justify-center relative group rounded-lg h-full overflow-hidden"
          >
            <div class="absolute inset-0 backdrop-blur-none group-hover:backdrop-blur-md duration-150" />
            <div class="flex flex-col z-1 justify-center items-center duration-150 absolute group-hover:-translate-y-4 translate-y-64 gap-2">
              <Typography color="white" class="text-2xl font-semibold">Изображения</Typography>
              <Typography class="text-lg text-fuchsia-300">bzzVanet</Typography>
            </div>
            <img src={image} loading="lazy" alt="" />
          </a>
        </div>
      </div>
    </MainWrapperPage>
  );
}
