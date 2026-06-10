import boxen, { type Options } from "boxen";
import { format, createLogger, transports } from "winston"

export const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'HH:mm:ss' }),
    format.colorize(),
    format.printf((info) => {
      const { timestamp, level, message, asBox, borderColor, title } = info;

      if (asBox) {
        return boxen(String(message), {
          title: title as string | undefined,
          padding: 1,
          borderStyle: 'round',
          borderColor: borderColor as Options["borderColor"] ?? 'white',
        });
      }

      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new transports.Console(),
  ],
});

export type Logger = typeof logger;
