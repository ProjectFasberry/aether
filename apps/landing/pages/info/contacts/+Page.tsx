import { SUPPORT_EMAIL, TG_NAME } from "@/shared/env";
import { MainWrapperPage } from "@repo/ui/main-wrapper";
import { Typography } from "@repo/ui/typography";

const tgLink = `https://t.me/${TG_NAME}`

export default function InfoContactsPage() {
  return (
    <MainWrapperPage variant="with_section">
      <div
        id="contacts-n-feedback"
        className="flex flex-col min-h-screen responsive mx-auto py-36 gap-y-6"
      >
        <Typography className="text-black dark:text-white text-3xl">
          Контакты
        </Typography>
        <div className="flex flex-col gap-6">
          <div
            className="flex flex-col gap-4 border-2 border-[#454545] duration-300 rounded-lg p-4"
          >
            <Typography color="white" className="text-xl">
              Социальные сети и мессенджеры
            </Typography>
            <div className="flex flex-col text-white text- md lg:text-lg gap-y-4">
              <Typography color="white">
                Канал в Telegram:&nbsp;&nbsp;
                <a href={tgLink} target="_blank" className="text-green">
                  {tgLink}
                </a>
              </Typography>
            </div>
          </div>
          <div
            className="flex flex-col gap-4 border-2 text-md lg:text-lg border-[#454545] duration-300 rounded-lg p-4"
          >
            <Typography color="white" className="text-xl">
              Электронная почта
            </Typography>
            <div className="flex flex-col gap-y-4">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                target="_blank"
              >
                <Typography color="white">
                  {SUPPORT_EMAIL}
                </Typography>
              </a>
            </div>
          </div>
        </div>
      </div>
    </MainWrapperPage>
  )
}