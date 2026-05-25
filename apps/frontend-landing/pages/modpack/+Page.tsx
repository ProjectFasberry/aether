import { ModpackList } from "@/pages/modpack/(components)/modpack-list";
import { MainWrapperPage } from "@repo/ui/main-wrapper";

export default function Page() {
  return (
    <MainWrapperPage variant="with_section">
      <div className="min-h-[80vh] w-[90%] mx-auto py-36">
        <div className="flex flex-col justify-center items-center mb-6">
          <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl xl:text-6xl">
            Сборки модов
          </h1>
        </div>
        <div className="flex items-center min-h-[80vh] justify-center w-full">
          <ModpackList />
        </div>
      </div>
    </MainWrapperPage>
  );
}