export const VOTING_TEAMS = ["BE", "FE", "QA"];
export const OBSERVER_TEAM = "BA";
export const ALL_TEAMS = [...VOTING_TEAMS, OBSERVER_TEAM];

// Card deck: 0.5 .. 10, step 0.5
export const CARD_VALUES = Array.from({ length: 20 }, (_, i) => (i + 1) * 0.5);

export function isVotingTeam(team) {
  return VOTING_TEAMS.includes(team);
}

export function isValidVote(value) {
  return typeof value === "number" && CARD_VALUES.includes(value);
}
