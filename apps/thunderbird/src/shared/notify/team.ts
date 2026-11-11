import { logger } from "@repo/shared/utils/logger";
import { getEnv } from "#/shared/env";

const notifyLogger = logger.child({ name: "team-apply" });

type TeamApplicationNotice = {
  id: number;
  nickname: string;
  roles: string[];
  contact: { type: "telegram" | "email"; value: string };
  about: string;
};

/**
 * Sends the application to the staff chat through glaux `/internal/alerts`.
 * Optional on purpose: without ALERT_* the application still lands in the DB
 * and only the notification is skipped.
 */
export async function notifyTeamApplication(application: TeamApplicationNotice): Promise<void> {
  const url = getEnv().ALERT_URL;
  const key = getEnv().ALERT_KEY;

  if (!url || !key) {
    notifyLogger.warn("ALERT_URL/ALERT_KEY are not set; the application stays unnotified");
    return;
  }

  const message = [
    `Заявка #${application.id} в команду`,
    `Игрок: ${application.nickname}`,
    `Роли: ${application.roles.join(", ")}`,
    `${application.contact.type === "telegram" ? "Telegram" : "Email"}: ${application.contact.value}`,
    "",
    application.about.slice(0, 500),
  ].filter((line) => line !== "").join("\n");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        from: "thunderbird",
        title: "Заявка в команду",
        severity: "info",
        message,
      }),
      signal: AbortSignal.timeout(2_000),
    });

    if (!response.ok) {
      notifyLogger.warn(`team application notification failed: ${response.status}`);
    }
  } catch (error) {
    notifyLogger.warn({ message: "team application notification failed", error });
  }
}
