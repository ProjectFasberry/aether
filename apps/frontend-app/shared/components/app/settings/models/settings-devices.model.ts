import { listenBackOnce } from "@/shared/lib/events"
import { action, atom, withAssign, withReset } from "@reatom/framework"
import type { TrackFunction } from "@yudiel/react-qr-scanner"
import { login } from "../../auth/models/login.model"
import { isError } from "@/shared/lib/helpers"
import { toast } from "sonner"

export const scanState = atom(null, "scanState").pipe(
	withAssign((_, name) => ({
		isStarted: atom(false, `${name}.isStarted`),
		cleanup: atom<{ cb: (() => void) | null }>({ cb: null }, `${name}.cleanup`).pipe(withReset()),
		confirmDialogIsOpen: atom(false, `${name}.confirmDialogIsOpen`)
	}))
)

export const scan = atom(null, "scan").pipe(
	withAssign((_, name) => ({
		start: action((ctx) => {
			scanState.isStarted(ctx, true)

			const existsCleanup = ctx.get(scanState.cleanup).cb
			existsCleanup?.()

			const cleanup = listenBackOnce(() => scan.stop(ctx));
			scanState.cleanup(ctx, { cb: cleanup });
		}, `${name}.start`),
		stop: action((ctx) => {
			scanState.isStarted(ctx, false)

			const cleanup = ctx.get(scanState.cleanup).cb;
			if (!cleanup) return;

			cleanup();
			scanState.cleanup.reset(ctx)
		}, `${name}.stop`),
		verify: action((ctx, value: string) => {
			scan.stop(ctx);

			scanState.confirmDialogIsOpen(ctx, true)

			const url = new URL(value)

			const token = url.searchParams.get("token");
			if (!token) throw new Error('Token is not defined')

			login.qr.verify.validateToken(ctx, token)
		}, `${name}.verify`),
	}))
)

type ScanParams = Parameters<TrackFunction>;

export const scanReaderModel = {
  highlightOnCanvas: (detectedCodes: ScanParams[0], canvasCtx: ScanParams[1]) => {
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
  },
  handleScan: action((ctx, detectedCodes: ScanParams[0]) => {
    for (const code of detectedCodes) {
      if (code.rawValue.startsWith("http://") || code.rawValue.startsWith("https://")) {
        scan.verify(ctx, code.rawValue)
      }
    }
  }),
  onError: action((ctx, error: Error | unknown) => {
    if (isError(error)) {
      toast.error("Произошла ошибка", {
        description: error.message
      })

      scanState.isStarted(ctx, false)
    }
  })
}
