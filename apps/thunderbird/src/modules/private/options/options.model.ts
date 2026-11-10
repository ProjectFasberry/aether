import { getDeepValue } from "#/helpers/object";
import { getServiceState, toServiceStatePath, tryUpdateState, type ServiceState } from "#/shared/constants";
import { persistServiceState } from "#/shared/services/service-state";
import { general } from "#/shared/database/general-db";
import { logger } from "@repo/shared/utils/logger";
import { invalidateOption } from "#/shared/constants/options";
import { type Static, t } from "elysia";

const optionsLogger = logger.child({ name: "options" });

export const updateOptionsSchema = t.Object({
  value: t.Boolean(),
});

export const optionSchema = t.Object({
  name: t.String(),
  value: t.Boolean(),
  title: t.String(),
});

type Option = Static<typeof optionSchema>;

export async function updateOptions(
  name: string,
  { value }: Static<typeof updateOptionsSchema>,
  actor?: string | null,
): Promise<Static<typeof updateOptionsSchema>> {
  const serviceState = getServiceState();

  if (toServiceStatePath(name)) {
    const prev = getDeepValue(serviceState, name);
    tryUpdateState(name, value);

    try {
      await persistServiceState();
    } catch (e) {
      if (typeof prev === "boolean") {
        tryUpdateState(name, prev)
      };
      throw e;
    }

    const updated = getDeepValue(getServiceState(), name) as boolean;

    optionsLogger.info("option updated", {
      name,
      value: updated,
      actor: actor ?? null,
      source: "runtime",
    });

    return { value: updated };
  }

  const upd = await general
    .updateTable("options")
    .set({ value })
    .where("name", "=", name)
    .returning("value")
    .executeTakeFirst();

  if (!upd) throw new Error("OPTION_NOT_FOUND");

  await invalidateOption()

  optionsLogger.info("option updated", {
    name,
    value: upd.value,
    actor: actor ?? null,
    source: "database",
  });

  return upd;
}

type DescriptionMap<T> = {
  [K in keyof T]: T[K] extends boolean
  ? string : T[K] extends object ? DescriptionMap<T[K]>
  : never;
};

function get(state: Record<string, unknown>, descriptions: Record<string, unknown>, path = ""): Option[] {
  return Object.entries(state).flatMap(([key, value]): Option[] => {
    const currentPath = path ? `${path}.${key}` : key;

    if (typeof value === "boolean") {
      const title = descriptions[key];

      return [
        {
          name: currentPath,
          value,
          title: typeof title === "string" ? title : "No description",
        },
      ];
    }

    return get(
      value as Record<string, unknown>,
      (descriptions[key] ?? {}) as Record<string, unknown>,
      currentPath,
    );
  });
}

const DESCRIPTION_MAP: DescriptionMap<ServiceState> = {
  logging: {
    validators: "Логирование валидаторов",
    globalError: "Логирование глобальных ошибок",
    services: "Логирование сервисов",
    requests: "Логирование входящих запросов",
    outboundRequests: "Логирование исходящих запросов",
  },
};

const getStaticOptions = (): Option[] => get(getServiceState(), DESCRIPTION_MAP)

async function getDynamicData() {
  return general
    .selectFrom("options")
    .select(["name", "value", "title"])
    .execute()
}

export async function getOptions(): Promise<Option[]> {
  const dynamicData = await getDynamicData();
  const staticData = getStaticOptions();
  const runtimeNames = new Set(staticData.map(opt => opt.name));
  const shadowed = dynamicData.filter(opt => runtimeNames.has(opt.name));

  if (shadowed.length > 0) {
    optionsLogger.warn(
      `database options shadow runtime flags: ${shadowed.map(opt => opt.name).join(", ")}`
    )
  }

  const data = [
    ...dynamicData.filter(opt => !runtimeNames.has(opt.name)),
    ...staticData
  ];

  return data;
}
