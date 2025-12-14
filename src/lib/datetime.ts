const pad = (value: number) => value.toString().padStart(2, "0");

export function toDateTimeLocal(value?: Date | string | null) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseDateInput(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const [datePart, timePart] = trimmed.split("T");
  const [yearStr, monthStr, dayStr] = (datePart ?? "").split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day)) {
    const [hourStr = "0", minuteStr = "0"] = (timePart ?? "").split(":");
    const hour = Number(hourStr);
    const minute = Number(minuteStr);
    const candidate = new Date(
      year,
      month - 1,
      day,
      Number.isNaN(hour) ? 0 : hour,
      Number.isNaN(minute) ? 0 : minute,
      0,
      0,
    );
    if (!Number.isNaN(candidate.getTime())) return candidate;
  }

  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function toTimeLocal(value?: Date | string | null) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDateTime(
  value?: Date | string | null,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", options).format(date);
}

export function formatRelativeTime(value?: Date | string | null) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (abs < minute) return diff >= 0 ? "in <1m" : "<1m ago";
  if (abs < hour) {
    const value = Math.round(abs / minute);
    return diff >= 0 ? `in ${value}m` : `${value}m ago`;
  }
  if (abs < day) {
    const value = Math.round(abs / hour);
    return diff >= 0 ? `in ${value}h` : `${value}h ago`;
  }
  const valueDays = Math.round(abs / day);
  return diff >= 0 ? `in ${valueDays}d` : `${valueDays}d ago`;
}

const ordinalSuffix = (value: number) => {
  const v = value % 100;
  if (v >= 11 && v <= 13) return "th";
  switch (value % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

export function formatDayOfMonth(day: number) {
  if (!Number.isFinite(day)) return "";
  return `${day}${ordinalSuffix(day)}`;
}

const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

export function nextMonthlyOccurrence(dayOfMonth: number, time?: string | null, from: Date = new Date()) {
  if (!Number.isFinite(dayOfMonth) || dayOfMonth < 1) return null;
  const [hour = 0, minute = 0] = (time ?? "00:00").split(":").map((part) => Number(part));

  const build = (base: Date) => {
    const year = base.getFullYear();
    const month = base.getMonth();
    const day = Math.min(dayOfMonth, daysInMonth(year, month));
    return new Date(year, month, day, Number.isNaN(hour) ? 0 : hour, Number.isNaN(minute) ? 0 : minute, 0, 0);
  };

  const candidate = build(from);
  if (candidate > from) return candidate;

  const nextMonth = new Date(from);
  nextMonth.setMonth(from.getMonth() + 1);
  nextMonth.setDate(1);
  return build(nextMonth);
}
