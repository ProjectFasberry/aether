import { Button } from "@/shared/ui/button"
import { Typography } from "@/shared/ui/typography"
import { Dialog } from "@ark-ui/react/dialog"
import { Portal } from "@ark-ui/react/portal"
import { reatomComponent } from "@reatom/npm-react"
import { IconArrowLeft, IconCheck, IconQrcode, IconX } from "@tabler/icons-react"
import { scan, scanReaderModel, scanState } from "../models/settings-devices.model"
import { dialogBackdropVariant, dialogContentVariant, dialogPositionerVariant, dialogTitleVariant } from "@/shared/ui/dialog"
import { Scanner } from "@yudiel/react-qr-scanner"
import { authLoginQRIsErrorAtom, login, loginState } from "../../auth/models/login.model"
import type { ReactNode } from "react"
import { spawn } from "@reatom/framework"
import { createPortal } from "react-dom"
import { IconLoader } from "@/shared/ui/icon-loader"

const ConnectNewVerifyExpiredOrNotfound = () => {
  return (
    <Typography className="text-center text-neutral-400 font-semibold">
      Токен устарел или не существует
    </Typography>
  )
}

const ConnectNewVerifyConfirmed = () => {
  return (
    <div className="flex flex-col gap-4 w-full items-center justify-center">
      <IconCheck size={32} className="text-green-600" />
      <div className="flex flex-col text-sm items-center justify-center w-full">
        <Typography className="font-semibold">Запрос принят</Typography>
        <span className="text-neutral-400">Теперь вы можете закрыть это окно</span>
      </div>
    </div>
  )
}

const ConnectNewVerifyDeclined = () => {
  return (
    <div className="flex flex-col gap-4 w-full items-center justify-center">
      <IconX size={32} className="text-red-600" />
      <div className="flex flex-col text-sm items-center justify-center w-full">
        <Typography className="font-semibold">Запрос отклонён</Typography>
        <Typography color="gray">Теперь вы можете закрыть это окно</Typography>
      </div>
    </div>
  )
}

const ConnectNewVerifyIdle = reatomComponent(({ ctx }) => {
  const data = ctx.spy(login.qr.verify.validateToken.dataAtom)?.result
  if (!data || typeof data === 'boolean') return null;

  const isPending = ctx.spy(login.qr.verify.decline.statusesAtom).isPending
    || ctx.spy(login.qr.verify.confirm.statusesAtom).isPending

  const { browser, geo } = data

  return (
    <>
      <div className="flex text-base text-neutral-400 w-full text-center leading-5">
        <Typography>
          Новый запрос на вход с устройства&nbsp;
          <span className="font-semibold">{browser}</span>&nbsp;из&nbsp;<span className="font-semibold">{geo.city} {geo.country}</span>.
          Подтвердите, что это вы.
        </Typography>
      </div>
      <div className="flex flex-col sm:flex-row mt-4 items-center gap-2 w-full justify-center">
        <Button
          background="white"
          className="w-full"
          onClick={() => spawn(ctx, (spawnCtx) => login.qr.verify.confirm(spawnCtx))}
          disabled={isPending}
        >
          Это я
        </Button>
        <Button
          variant="danger"
          className="w-full"
          onClick={() => spawn(ctx, (spawnCtx) => login.qr.verify.decline(spawnCtx))}
          disabled={isPending}
        >
          Это не я
        </Button>
      </div>
    </>
  )
}, "VerifyIdle")

const VERIFY_COMPONENTS: Record<"idle" | "confirmed" | "declined", ReactNode> = {
  "idle": <ConnectNewVerifyIdle />,
  "confirmed": <ConnectNewVerifyConfirmed />,
  "declined": <ConnectNewVerifyDeclined />
}

const ConnectNewVerifyContent = reatomComponent(({ ctx }) =>
  VERIFY_COMPONENTS[ctx.spy(loginState.qr.verify.status)], "ConnectNewVerifyContent"
)

const ConnectNewVerifyError = () => {
  return (
    <div className="flex flex-col gap-4 w-full items-center justify-center">
      <IconX className="text-red" size={22} />
      <ConnectNewVerifyExpiredOrNotfound />
    </div>
  )
}

const ConnectNewVerifyLogin = reatomComponent(({ ctx }) => {
  if (ctx.spy(login.qr.verify.validateToken.statusesAtom).isPending) return <IconLoader />

  const data = ctx.spy(login.qr.verify.validateToken.dataAtom)
  if (!data) return <ConnectNewVerifyExpiredOrNotfound />

  const isError = ctx.spy(authLoginQRIsErrorAtom)

  return (
    <div className="flex flex-col items-center justify-center gap-4 w-full">
      {isError ? <ConnectNewVerifyError /> : <ConnectNewVerifyContent />}
    </div>
  )
}, "Verify")

const ScanReader = reatomComponent(({ ctx }) => {
  const isStarted = ctx.spy(scanState.isStarted)
  if (!isStarted) return null;

  return createPortal(
    <div className="fixed top-0 bottom-0 right-0 left-0 z-1000 w-full h-dvh bg-neutral-900">
      <div className="absolute right-0 left-0 z-100 w-full flex items-center px-4 justify-between top-4">
        <div className="flex items-center justify-start">
          <IconArrowLeft size={26} onClick={() => scan.stop(ctx)} />
        </div>
        <div className="flex items-center justify-center">
          <Typography>
            Сканирование QR кода
          </Typography>
        </div>
        <div />
      </div>
      <Scanner
        onScan={(payload) => scanReaderModel.handleScan(ctx, payload)}
        onError={(error) => scanReaderModel.onError(ctx, error)}
        constraints={{
          facingMode: 'environment',
          aspectRatio: 1,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        }}
        components={{
          tracker: (codes, canvasCtx) => scanReaderModel.highlightOnCanvas(codes, canvasCtx),
          torch: true,
          onOff: true,
        }}
      />
    </div>,
    document.body
  )
}, "ScanReader")

const ConnectNewConfirmDialog = reatomComponent(({ ctx }) => {
  return (
    <Dialog.Root
      open={ctx.spy(scanState.confirmDialogIsOpen)}
      onOpenChange={v => scanState.confirmDialogIsOpen(ctx, v.open)}
    >
      <Portal>
        <Dialog.Backdrop className={dialogBackdropVariant()} />
        <Dialog.Positioner className={dialogPositionerVariant()}>
          <Dialog.Content className={dialogContentVariant()}>
            <Dialog.Title className={dialogTitleVariant()}>Подтверждение нового входа</Dialog.Title>
            <div className="flex items-center justify-center w-full h-full">
              <ConnectNewVerifyLogin />
            </div>
            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}, "ConnectNewConfirmDialog")

export const ConnectNewSession = reatomComponent(({ ctx }) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      <Typography className="leading-5">
        Привяжи устройство к аккаунту, отсканировав QR-код
      </Typography>
      <Button
        background="white"
        className="gap-2 font-semibold"
        onClick={() => scan.start(ctx)}
      >
        <IconQrcode size={16} />
        Привязать устройство
      </Button>
      <ScanReader />
      <ConnectNewConfirmDialog />
    </div>
  )
}, "ConnectNewSession")
