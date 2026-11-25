import type { NatsConnection } from "@nats-io/nats-core";
import { safeJsonParse } from "@repo/shared/utils";
import { grim } from "#/shared/database/grim-db";
import { appLogger } from "#/shared/constants/logger";

type GrimFlag = {
  uuid: string;
  nickname: string;
  check: string;
  violations: string | number;
  setback_vl: string | number;
  server: string;
  ts: string | number;
  suppressed: string | number;
};

/** Persists Grim flags published by the Spigot bridge (`general.grim.flag`). */
export function subscribeGrimFlag(nc: NatsConnection, subject: string) {
  const decoder = new TextDecoder();

  return nc.subscribe(subject, {
    callback: (error, message) => {
      if (error) {
        appLogger.error({ message: "grim flag subscription error", error });
        return;
      }

      const parsed = safeJsonParse<GrimFlag>(decoder.decode(message.data));
      if (!parsed.ok) return;

      const flag = parsed.value;
      const ts = Number(flag.ts);

      void grim
        .insertInto("grim_flags")
        .values({
          uuid: flag.uuid,
          nickname: flag.nickname,
          check_name: flag.check,
          violations: Number(flag.violations) || 0,
          setback_vl: Number(flag.setback_vl) || 0,
          server: flag.server,
          suppressed: Number(flag.suppressed) || 0,
          created_at: new Date(Number.isFinite(ts) && ts > 0 ? ts : Date.now()),
        })
        .execute()
        .catch((insertError) => {
          appLogger.error({ message: "grim flag insert failed", error: insertError });
        });
    },
  });
}
