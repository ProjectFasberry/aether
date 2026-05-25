import { MAIN_DOMAIN } from "@/shared/env";
import { MainWrapperPage } from "@repo/ui/main-wrapper";
import { Typography } from "@repo/ui/typography";

export default function InfoTermsPage() {
  return (
    <MainWrapperPage variant="with_section">
      <div className="flex flex-col min-h-screen responsive mx-auto py-36 gap-y-6">
        <Typography className="text-black dark:text-white text-3xl">
          Пользовательское соглашение
        </Typography>
        <div className="flex flex-col gap-y-8">
          <div className="flex flex-col text-white text-md lg:text-lg gap-y-4 border-2 border-[#454545] hover:duration-300 duration-300 rounded-[8px] p-4">
            <Typography color="white">
              Настоящее Пользовательское Соглашение (далее соглашение) регулирует отношения между владельцем {MAIN_DOMAIN}
              (далее Fasberry) с одной стороны и пользователем сайта с другой.
            </Typography>
            <Typography color="white">
              Сайт Fasberry не является средством массовой информации.
            </Typography>
            <Typography color="white">
              Используя сайт, Вы соглашаетесь с условиями данного соглашения. Если Вы не согласны с условиями данного соглашения, не используйте сайт Fasberry!
            </Typography>
          </div>
          <div className="flex flex-col text-white text-md lg:text-lg gap-y-4 border-2 border-[#454545] hover:duration-300 duration-300 rounded-[8px] p-4">
            <Typography color="white" className="text-xl">
              Предмет соглашения
            </Typography>
            <div className="flex flex-col text-white text-md lg:text-lg gap-y-4 ">
              <Typography color="white">
                Администрация предоставляет пользователю право на размещение на сайте следующей информации:
                <p>&gt; текстовой информации</p>
              </Typography>
            </div>
          </div>
          <div className="flex flex-col text-white text-md lg:text-lg gap-y-4 border-2 border-[#454545] hover:duration-300 duration-300 rounded-[8px] p-4">
            <Typography color="white" className="text-xl">
              Права и обязанности сторон
            </Typography>
            <div className="flex flex-col text-white text-md lg:text-lg gap-y-4">
              <Typography color="white">
                Пользователь имеет право:
                <p>&gt; осуществлять поиск информации на сайте</p>
                <p>&gt; получать информацию на сайте</p>
                <p>&gt; создавать информацию для сайта</p>
                <p>&gt; распространять информацию на сайте</p>
                <p>&gt; копировать информацию на другие сайты с разрешения администрации сайта</p>
                <p>&gt; требовать от администрации скрытия любой информации о пользователе</p>
                <p>&gt; требовать от администрации скрытия любой информации переданной пользователем сайту</p>
                <p>&gt; использовать информацию сайта в личных некоммерческих целях</p>
              </Typography>
            </div>
            <div className="flex flex-col text-white text-md lg:text-lg gap-y-4">
              <Typography color="white">
                Администрация имеет право:
                <p>&gt; по своему усмотрению и необходимости создавать, изменять, отменять правила</p>
                <p>&gt; ограничивать доступ к любой информации на сайте</p>
                <p>&gt; создавать, изменять, удалять информацию</p>
              </Typography>
            </div>
          </div>
          <div className="flex flex-col text-white text-md lg:text-lg gap-y-4 border-2 border-[#454545] hover:duration-300 duration-300 rounded-[8px] p-4">
            <Typography color="white" className="text-xl">
              Пользователь обязуется:
            </Typography>
            <div className="flex flex-col text-white text-md lg:text-lg gap-y-4">
              <Typography color="white">
                <p>
                  &gt; обеспечить достоверность предоставляемой информации
                </p>
                <p>
                  &gt; обеспечивать сохранность личных данных от доступа третьих лиц
                </p>
                <p>
                  &gt; не распространять информацию, которая направлена на пропаганду войны, разжигание национальной,
                  расовой или религиозной ненависти и вражды, а также иной информации, за распространение которой
                  предусмотрена уголовная или административная ответственность
                </p>
                <p>
                  &gt; не нарушать работоспособность сайта
                </p>
                <p>
                  &gt; не совершать действия, направленные на введение других пользователей в заблуждение
                </p>
                <p>
                  &gt; не использовать скрипты (программы) для автоматизированного сбора информации и/или взаимодействия с сайтом и его сервисами
                </p>
              </Typography>
            </div>
          </div>
          <div className="flex flex-col text-white text-md lg:text-lg gap-y-4 border-2 border-[#454545] hover:duration-300 duration-300 rounded-[8px] p-4">
            <Typography color="white" className="text-xl">
              Администрация обязуется:
            </Typography>
            <div className="flex flex-col text-white text-md lg:text-lg gap-y-4">
              <Typography color="white">
                <p>
                  &gt; поддерживать работоспособность сайта за исключением случаев,
                  когда это невозможно по независящим от администрации причинам.
                </p>
              </Typography>
            </div>
          </div>
          <div className="flex flex-col text-white text-md lg:text-lg gap-y-4 border-2 border-[#454545] hover:duration-300 duration-300 rounded-[8px] p-4">
            <Typography color="white" className="text-xl">
              Ответственность сторон
            </Typography>
            <div className="flex flex-col text-white text-md lg:text-lg gap-y-4">
              <Typography color="white">
                <p>
                  &gt; пользователь лично несет полную ответственность за распространяемую им информацию
                </p>
                <p>
                  &gt; администрация не несет никакой ответственности за достоверность информации, скопированной из других источников
                </p>
                <p>
                  &gt; администрация не несёт ответственность за несовпадение ожидаемых пользователем и реально полученных услуг
                </p>
                <p>
                  &gt; администрация не несет никакой ответственности за услуги, предоставляемые третьими лицами
                </p>
                <p>
                  &gt; в случае возникновения форс-мажорной ситуации (боевые действия, чрезвычайное положение, стихийное бедствие и т. д.)
                  администрация не гарантирует сохранность информации, размещённой пользователем, а также бесперебойную работу информационного ресурса
                </p>
              </Typography>
            </div>
          </div>
          <div className="flex flex-col text-white text-md lg:text-lg gap-y-4 border-2 border-[#454545] hover:duration-300 duration-300 rounded-[8px] p-4">
            <Typography color="white" className="text-xl">
              Условия действия Соглашения
            </Typography>
            <div className="flex flex-col text-white text-md lg:text-lg gap-y-4">
              <Typography color="white">
                Данное Соглашение вступает в силу при любом использовании данного сайта.
              </Typography>
              <Typography color="white">
                Соглашение перестает действовать при появлении его новой версии.
              </Typography>
              <Typography color="white">
                Администрация оставляет за собой право в одностороннем порядке изменять данное соглашение по своему усмотрению.
              </Typography>
              <Typography color="white">
                При изменении соглашения, в некоторых случаях, администрация может оповестить пользователей удобным для нее способом.
              </Typography>
            </div>
          </div>
        </div>
      </div>
    </MainWrapperPage>
  )
}