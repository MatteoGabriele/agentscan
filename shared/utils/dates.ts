export function formatDateRange({
  startDate,
  endDate,
  startYear = false,
  endYear = true,
  locale = "en-GB",
}: {
  startDate: string | undefined;
  endDate: string | undefined;
  startYear?: boolean;
  endYear?: boolean;
  locale?: string;
}): string {
  if (!startDate || !endDate) {
    return "";
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  const startLabel = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: startYear ? "numeric" : undefined,
  }).format(start);

  const endLabel = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: endYear ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(end);

  return `${startLabel} - ${endLabel}`;
}
