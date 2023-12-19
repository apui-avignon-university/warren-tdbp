import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export const formatDate = (date: string | Dayjs): string => {
  return dayjs(date).endOf("day").format();
};

export const getDefaultDate = (): string => {
  return formatDate(dayjs());
};
