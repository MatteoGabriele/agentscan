export type GitHubEventType = "PullRequestEvent" | "CreateEvent" | "ForkEvent";

export const eventTypes = [
  "PullRequestEvent",
  "CreateEvent",
  "ForkEvent",
] as const;

export const eventConfig = {
  ForkEvent: {
    name: "forks",
    color: undefined, // TODO: select you preferred color
  },
  CreateEvent: {
    name: "Creations",
    color: undefined, // TODO: select you preferred color
  },
  PullRequestEvent: {
    name: "Pull requests",
    color: undefined, // TODO: select you preferred color
  },
};

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
