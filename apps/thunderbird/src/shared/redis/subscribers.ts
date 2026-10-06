import { loginQR } from "#/modules/auth/login.model";
import { natsService } from "../nats/client";

export const SUBSCRIBERS: { key: string, cb: (msg: string) => void }[] = [
  {
    key: "auth:qr:",
    cb: (msg: string) => {
      const nsClient = natsService.getInstance();
      const [, , qrToken] = msg.split(':');
      if (!qrToken) return;

      const subject = loginQR.createQRSubject("expired", qrToken)
      nsClient.publish(subject, JSON.stringify({ data: qrToken }));
    },
  }
]
