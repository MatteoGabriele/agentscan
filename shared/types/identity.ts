import type { Endpoints } from "@octokit/types";

export type GitHubUser = Endpoints["GET /users/{username}"]["response"]["data"];

export type GitHubEvent =
  Endpoints["GET /users/{username}/events/public"]["response"]["data"][number];

export type IdentifyFlag = {
  label: string;
  points: number;
  detail: string;
};

export type IdentityClassification = "human" | "suspicious" | "likely_bot";

export type IdentifyReplicantResult = {
  score: number;
  classification: IdentityClassification;
  flags: IdentifyFlag[];
  profile: {
    age: number;
    followers: number;
    repos: number;
  };
};

export type FlagReturn = {
  flags: IdentifyFlag[];
};
