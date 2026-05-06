export function getCompleteDayRange(days: string[]): string[] {
  if (!days.length) {
    return [];
  }

  const firstDay = days[0]!;
  const lastDay = days[days.length - 1]!;
  const firstDayTime = new Date(firstDay).getTime();
  const lastDayTime = new Date(lastDay).getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const completeDays: string[] = [];

  for (let time = firstDayTime; time <= lastDayTime; time += oneDay) {
    completeDays.push(new Date(time).toISOString().slice(0, 10));
  }

  return completeDays;
}

export function getCompleteHourRange(hours: string[]): string[] {
  if (!hours.length) {
    return [];
  }

  const firstHourTime = new Date(hours[0]!).getTime();
  const lastHourTime = new Date(hours[hours.length - 1]!).getTime();
  const oneHour = 60 * 60 * 1000;
  const completeHours: string[] = [];

  for (let time = firstHourTime; time <= lastHourTime; time += oneHour) {
    completeHours.push(new Date(time).toISOString());
  }

  return completeHours;
}
