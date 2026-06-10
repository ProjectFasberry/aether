import { general } from "../database/general-db"

export const OPTIONS_MAP = {
  "registrationEnabled": "registrationEnabled",
  "botCheckEnabled": "botCheckEnabled",
  "eventsLogging": "eventsLogging"
}

export async function getOption(option: keyof typeof OPTIONS_MAP): Promise<boolean> {
  const query = await general
    .selectFrom("options")
    .select("value")
    .where("name", "=", option)
    .executeTakeFirst();

  if (!query) {
    console.warn(`Option "${option}" not found. Fallback: false`)
    return false;
  }

  return query.value;
}
