/** "Friday, 25 Sep" — spec §61. Built from parts: ICU renders September as "Sept". */
export function formatDayHeading(date: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    ...(timeZone ? { timeZone } : {}),
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${part("weekday")}, ${part("day")} ${part("month").slice(0, 3)}`;
}
