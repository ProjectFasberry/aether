import { PageLoader } from "@/shared/ui/page-loader";
import { atom } from "@reatom/framework";
import { reatomComponent } from "@reatom/npm-react";
import { Typography } from "@/shared/ui/typography";
import { IconCheck, IconCopy, IconEye } from "@tabler/icons-react";
import { useEffect } from "react";
import { type Payment } from "../../../models/store.model";
import { AutoWidthInput } from "@/shared/ui/autowidth-input";
import { defaultOrderEvents, isCopiedAtom, orderIsLoadingAtom } from "../models/default-order.model";
import { onDisconnect } from "@reatom/framework";
import { orderState } from "../../../models/store-order.model";
import { Dialog } from "@ark-ui/react/dialog";
import { Portal } from "@ark-ui/react/portal";
import { dialogBackdropVariant, dialogContentVariant, dialogPositionerVariant } from "@/shared/ui/dialog";
import { QrCode } from "@ark-ui/react/qr-code";
import { qrCodeFrameVariant, qrCodeOverlayVariant, qrCodePatternVariant, qrCodeRootVariant } from "@/shared/ui/qr-code";

const STATUSES: Record<Payment["status"], { title: string, color: string }> = {
  "canceled": {
    title: "Отменен", color: "text-yellow-500"
  },
  "pending": {
    title: "В ожидании оплаты", color: "text-neutral-50"
  },
  "succeeded": {
    title: "Оплачен", color: "text-green-500"
  },
  "waitingForCapture": {
    title: "В ожидании", color: "text-neutral-50"
  }
}

const showOrderLoaderAtom = atom(false, "showOrderLoader")

const isVisibleAtom = atom(false);
const animatOutAtom = atom(false);

const OrderLoader = reatomComponent(({ ctx }) => {
  const isShow = ctx.spy(showOrderLoaderAtom);

  const visible = ctx.spy(isVisibleAtom)
  const animateOut = ctx.spy(animatOutAtom)

  useEffect(() => {
    if (isShow) {
      isVisibleAtom(ctx, true);
      animatOutAtom(ctx, false);
      document.body.style.overflow = "hidden";
    } else if (visible) {
      animatOutAtom(ctx, true);

      const timer = setTimeout(() => {
        isVisibleAtom(ctx, false);
        document.body.style.overflow = "";
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      document.body.style.overflow = "";
    }
  }, [isShow]);

  if (!visible) return null;

  return (
    <div
      className={`flex z-[1000] items-center flex-col gap-4 fixed justify-center h-full w-full
        ${animateOut ? "fade-out-background" : "fade-in-background"}`}
    >
      <IconCheck
        size={46}
        className={`text-green-500 ${animateOut ? "fade-out-icon" : "fade-in-and-scale-icon"}`}
      />
    </div>
  )
}, "OrderLoader")

const OrderDetails = reatomComponent(({ ctx }) => {
  const data = ctx.spy(orderState.data)
  if (!data) return null

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex flex-col w-full">
        <Typography className='font-semibold text-white text-xl'>
          Ссылка для оплаты:
        </Typography>
        <div className="flex items-center relative cursor-pointer w-fit gap-2 bg-neutral-700 rounded-lg py-2 px-3 text-base">
          <AutoWidthInput value={data.pay_url} />
          <button onClick={() => defaultOrderEvents.copyHref(ctx, data.pay_url)} className="group">
            <IconCopy size={16} className="text-neutral-400 group-hover:text-neutral-50" />
          </button>
        </div>
        {ctx.spy(isCopiedAtom) && <p className="text-green-500 text-base mt-1">Скопировано</p>}
      </div>
    </div>
  )
}, "OrderDetails")

const OrderQR = ({ url }: { url: string }) => {
  return (
    <Dialog.Root>
      <Dialog.Trigger
        className="flex items-center justify-center order-first sm:order-last
        max-w-44 max-h-44 relative cursor-pointer p-0.5 group overflow-hidden rounded-md"
      >
        <div
          className="flex items-center w-full h-full justify-center group-hover:opacity-100 opacity-0 absolute bg-black/60 z-[2]"
        >
          <IconEye size={24} />
        </div>
        <QrCode.Root
          defaultValue={url}
          encoding={{ ecc: 'M' }}
          className={qrCodeRootVariant({ className: "[--qr-code-size:196px]" })}
        >
          <QrCode.Frame className={qrCodeFrameVariant()}>
            <QrCode.Pattern className={qrCodePatternVariant()} />
          </QrCode.Frame>
          <QrCode.Overlay className={qrCodeOverlayVariant()}>
            <img src="/favicon.ico" alt="" draggable={false} />
          </QrCode.Overlay>
        </QrCode.Root>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop className={dialogBackdropVariant()} />
        <Dialog.Positioner className={dialogPositionerVariant()}>
          <Dialog.Content className={dialogContentVariant({ className: "flex p-0 items-center justify-center" })}>
            <QrCode.Root
              defaultValue={url}
              encoding={{ ecc: 'M' }}
              className={qrCodeRootVariant({ className: "[--qr-code-size:196px]" })}
            >
              <QrCode.Frame className={qrCodeFrameVariant()}>
                <QrCode.Pattern className={qrCodePatternVariant()} />
              </QrCode.Frame>
              <QrCode.Overlay className={qrCodeOverlayVariant()}>
                <img src="/favicon.ico" alt="" draggable={false} />
              </QrCode.Overlay>
            </QrCode.Root>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

const Order = reatomComponent(({ ctx }) => {
  const data = ctx.spy(orderState.data)

  if (ctx.spy(orderIsLoadingAtom)) {
    return <PageLoader />
  }

  if (!data) return null

  const payload = data.payload;
  const status = STATUSES[data.status]

  return (
    <div className="flex sm:flex-row flex-col gap-4 items-center sm:items-start w-full">
      <div className="flex flex-col w-full h-full gap-2">
        <div className="flex items-center justify-start gap-2">
          <Typography className='font-semibold text-white text-2xl'>
            Заказ
          </Typography>
          <div className="flex items-center justify-center px-2 py-1 bg-neutral-50 rounded-md">
            <span className="font-semibold text-neutral-950">
              #{data.unique_id}
            </span>
          </div>
        </div>
        <Typography className="font-semibold text-xl">
          Статус: <span className={`font-normal text-base ${status.color}`}>
            {status.title}
          </span>
        </Typography>
        <div className="flex flex-col">
          <Typography className="font-semibold text-xl">
            Содержимое:
          </Typography>
          <span>{payload}</span>
        </div>
        <OrderDetails />
      </div>
      <OrderQR url={data.pay_url} />
    </div>
  )
}, "Order")

onDisconnect(orderState.es, (ctx) => defaultOrderEvents.disconnect(ctx))

export const DefaultOrder = () => {
  return (
    <>
      <OrderLoader />
      <Order />
    </>
  )
}
