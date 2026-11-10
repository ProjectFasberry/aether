import boxen, { type Options } from "boxen";
import { format, createLogger, transports } from "winston"

type LoggerMeta = {
  name?: string | string[];
};

type ScopedLogger = typeof logger & {
  _name?: string[];
  child(meta?: LoggerMeta): ScopedLogger;
};

/** JSON is opt-in; local/staging/prod logs stay human-readable by default. */
const structured = Bun.env["LOG_FORMAT"] === "json" || Bun.env["LOG_JSON"] === "true";
const level = Bun.env["LOG_LEVEL"] ?? "debug";

const devFormat = format.combine(
  format.timestamp({ format: 'HH:mm:ss' }),
  format.colorize({ level: true }),
  format.printf((info) => {
    const { timestamp: tmstmp, name, message: msg, asBox, borderColor, level, title } = info;

    const originalLevel = info[Symbol.for("level")];

    if (asBox) {
      return boxen(String(msg), {
        title: title as string | undefined,
        padding: 1,
        borderStyle: 'round',
        borderColor: borderColor as Options["borderColor"] ?? 'white',
      });
    }

    const scope = Array.isArray(name)
      ? name.join(".")
      : name;

    const prefix = `${tmstmp} ${level}${scope ? `.${scope}` : ""}`;

    if (msg instanceof Error) {
      return `${prefix}: ${msg.stack ?? msg.message}`;
    }

    if (msg !== null && typeof msg === "object") {
      const json = JSON.stringify(
        msg,
        null,
        originalLevel === "debug" ? 0 : 2,
      );

      return `${prefix}: ${json}`;
    }

    return `${prefix}: ${msg}`;
  }),
);

/** One JSON object per line, with the stack attached to errors. */
const structuredFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.json(),
);

export const logger = createLogger({
  level,
  format: structured ? structuredFormat : devFormat,
  transports: [
    new transports.Console(),
  ],
});

const originalChild = logger.child;

/*
  Use only through 'name' parameter as it is the only reliable way to get the child logger
*/
logger.child = function (this: ScopedLogger, meta: LoggerMeta = {}) {
  const parentName = this._name ?? [];

  const ownName = meta.name
    ? Array.isArray(meta.name)
      ? meta.name
      : [meta.name]
    : [];

  const name = [...parentName, ...ownName];

  const child = originalChild.call(this, {
    ...meta,
    name,
  }) as ScopedLogger;

  child._name = name;

  return child;
} as ScopedLogger["child"];

export type Logger = typeof logger;
