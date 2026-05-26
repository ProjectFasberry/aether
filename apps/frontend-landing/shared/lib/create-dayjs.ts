import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import localeData from "dayjs/plugin/localeData";
import duration from "dayjs/plugin/duration";
import localizedFormat from "dayjs/plugin/localizedFormat";
import "dayjs/locale/ru";

dayjs.extend(relativeTime);
dayjs.extend(localeData);
dayjs.extend(duration);
dayjs.extend(localizedFormat);
dayjs.locale("ru");

export function getDayjs(): typeof dayjs {
  return dayjs
}
