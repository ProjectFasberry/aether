import { reatomComponent } from "@reatom/npm-react";
import { login, authLoginQRIsErrorAtom, loginState } from "../../auth/models/login.model";
import { IconArrowLeft, IconCheck, IconQrcode, IconX } from "@tabler/icons-react";
import { ReactNode } from "react";
import { Button } from "@repo/ui/button";
import { spawn } from "@reatom/framework";
import { IconLoader } from "@/shared/ui/icon-loader";
import { scan, scanState } from "../models/settings-security.model";
import { IDetectedBarcode, Scanner, TrackFunction } from "@yudiel/react-qr-scanner";
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/dialog";

const VerifyExpiredOrNotfound = () => {
  return (
    <p className="text-base text-center text-neutral-400 font-semibold">Токен устарел или не существует</p>
  )
}

const VerifyConfirmed = () => {
  return (
    <div className="flex flex-col gap-4 w-full items-center justify-center">
      <IconCheck size={32} className="text-green-600" />
      <div className="flex flex-col text-sm items-center justify-center w-full">
        <p className="text-neutral-50 font-semibold">Запрос принят</p>
        <span className="text-neutral-400">Теперь вы можете закрыть это окно</span>
      </div>
    </div>
  )
}

const VerifyDeclined = () => {
  return (
    <div className="flex flex-col gap-4 w-full items-center justify-center">
      <IconX size={32} className="text-red-600" />
      <div className="flex flex-col text-sm items-center justify-center w-full">
        <p className="text-neutral-50 font-semibold">Запрос отклонён</p>
        <span className="text-neutral-400">Теперь вы можете закрыть это окно</span>
      </div>
    </div>
  )
}

const VerifyIdle = reatomComponent(({ ctx }) => {
  const data = ctx.spy(login.qr.verify.validateToken.dataAtom)?.result
  if (!data) return null;

  const isPending = ctx.spy(login.qr.verify.decline.statusesAtom).isPending
    || ctx.spy(login.qr.verify.confirm.statusesAtom).isPending

  const { browser, geo } = data

  return (
    <>
      <div className="flex text-base text-neutral-400 w-full text-center leading-5">
        <p>
          Новый запрос на вход с устройства&nbsp;
          <span className="font-semibold">{browser}</span> из <span className="font-semibold">{geo.city} {geo.country}</span>.
          Подтвердите, что это вы.
        </p>
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
  "idle": <VerifyIdle />,
  "confirmed": <VerifyConfirmed />,
  "declined": <VerifyDeclined />
}

const VerifyContent = reatomComponent(({ ctx }) =>
  VERIFY_COMPONENTS[ctx.spy(loginState.qr.verify.status)],
  "VerifyContent"
)

const VerifyError = () => {
  return (
    <div className="flex flex-col gap-4 w-full items-center justify-center">
      <IconX className="text-red-500" size={22} />
      <VerifyExpiredOrNotfound />
    </div>
  )
}

const VerifyLogin = reatomComponent(({ ctx }) => {
  if (ctx.spy(login.qr.verify.validateToken.statusesAtom).isPending) return <IconLoader />

  const data = ctx.spy(login.qr.verify.validateToken.dataAtom)
  if (!data) return <VerifyExpiredOrNotfound />

  const isError = ctx.spy(authLoginQRIsErrorAtom)

  return (
    <div className="flex flex-col items-center justify-center gap-4 w-full">
      {isError ? <VerifyError /> : <VerifyContent />}
    </div>
  )
}, "Verify")

const ScanReader = reatomComponent(({ ctx }) => {
  const isStarted = ctx.spy(scanState.isStarted)
  if (!isStarted) return null;

  const handleScan = (detectedCodes: IDetectedBarcode[]) => {
    for (const code of detectedCodes) {
      if (code.rawValue.startsWith("http://") || code.rawValue.startsWith("https://")) {
        scan.verify(ctx, code.rawValue)
      }
    }
  };

  const highlightCodeOnCanvas: TrackFunction = (detectedCodes, canvasCtx) => {
    for (const detectedCode of detectedCodes) {
      const { x, y, width, height } = detectedCode.boundingBox;
      const cornerLength = Math.min(width, height) * 0.2;

      canvasCtx.strokeStyle = '#00FF00';
      canvasCtx.lineWidth = 6;
      canvasCtx.lineJoin = 'round';

      canvasCtx.shadowBlur = 15;
      canvasCtx.shadowColor = '#00FF00';

      canvasCtx.beginPath();
      canvasCtx.moveTo(x, y + cornerLength);
      canvasCtx.lineTo(x, y);
      canvasCtx.lineTo(x + cornerLength, y);
      canvasCtx.stroke();

      canvasCtx.beginPath();
      canvasCtx.moveTo(x + width - cornerLength, y);
      canvasCtx.lineTo(x + width, y);
      canvasCtx.lineTo(x + width, y + cornerLength);
      canvasCtx.stroke();

      canvasCtx.beginPath();
      canvasCtx.moveTo(x + width, y + height - cornerLength);
      canvasCtx.lineTo(x + width, y + height);
      canvasCtx.lineTo(x + width - cornerLength, y + height);
      canvasCtx.stroke();

      canvasCtx.beginPath();
      canvasCtx.moveTo(x + cornerLength, y + height);
      canvasCtx.lineTo(x, y + height);
      canvasCtx.lineTo(x, y + height - cornerLength);
      canvasCtx.stroke();

      canvasCtx.shadowBlur = 0;
      canvasCtx.fillStyle = 'rgba(0, 255, 0, 0.05)';
      canvasCtx.fillRect(x, y, width, height);
    }
  };

  return (
    <div className="fixed top-0 bottom-0 right-0 left-0 z-1000 w-full h-dvh bg-neutral-900">
      <div className="absolute right-0 left-0 z-100 w-full flex items-center px-4 justify-between top-4">
        <div className="flex items-center justify-start">
          <IconArrowLeft size={26} onClick={() => scan.stop(ctx)} />
        </div>
        <div className="flex items-center justify-center">
          <p className="text-neutral-50 font-medium text-base">
            Сканирование QR кода
          </p>
        </div>
        <div />
      </div>
      <Scanner
        onScan={handleScan}
        onError={(error) => console.error(error)}
        constraints={{
          facingMode: 'environment',
          aspectRatio: 1,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        }}
        components={{
          tracker: highlightCodeOnCanvas,
          torch: true,
          onOff: true,
        }}
      />
    </div>
  )
}, "ScanReader")

const AccountSessionsConnectNewConfirmDialog = reatomComponent(({ ctx }) => {
  const open = ctx.spy(scanState.confirmDialogIsOpen)

  return (
    <Dialog open={open} onOpenChange={v => scanState.confirmDialogIsOpen(ctx, v)}>
      <DialogContent>
        <DialogTitle>Подтверждение нового входа</DialogTitle>
        <div className="flex items-center justify-center w-full h-full">
          <VerifyLogin />
        </div>
      </DialogContent>
    </Dialog>
  )
}, "AccountSessionsConnectNewConfirmDialog")

export const AccountSessionsConnectNew = reatomComponent(({ ctx }) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      <p className="text-base font-medium leading-5">
        Привяжи устройство к аккаунту, отсканировав QR-код
      </p>
      <Button
        background="white"
        className="gap-2 font-semibold"
        onClick={() => scan.start(ctx)}
      >
        <IconQrcode size={16} />
        Привязать устройство
      </Button>
      <ScanReader />
      <AccountSessionsConnectNewConfirmDialog />
    </div>
  )
}, "AccountSessionsConnectNew")