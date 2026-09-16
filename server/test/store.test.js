import { describe, it, expect, beforeEach } from "vitest";
import { PokerStore, computeAverage } from "../src/store.js";

describe("PokerStore", () => {
  let store;

  beforeEach(() => {
    store = new PokerStore();
  });

  it("logs a user in and rejects an empty name", () => {
    const user = store.login("s1", "  Іван  ");
    expect(user.name).toBe("Іван");
    expect(user.team).toBeNull();
    expect(() => store.login("s2", "   ")).toThrow();
  });

  it("adds a user to a voting team's active list", () => {
    store.login("s1", "Іван");
    store.selectTeam("s1", "FE");
    expect(store.usersInTeam("FE").map((u) => u.id)).toEqual(["s1"]);
  });

  it("hides votes until everyone in the team has voted", () => {
    store.login("s1", "Іван");
    store.login("s2", "Петро");
    store.selectTeam("s1", "FE");
    store.selectTeam("s2", "FE");

    store.vote("s1", 3);
    let state = store.getTeamState("FE");
    expect(state.revealed).toBe(false);
    expect(state.users.find((u) => u.id === "s1").hasVoted).toBe(true);
    expect(state.users.find((u) => u.id === "s1").vote).toBeNull();

    store.vote("s2", 5);
    state = store.getTeamState("FE");
    expect(state.revealed).toBe(true);
    expect(state.users.find((u) => u.id === "s1").vote).toBe(3);
    expect(state.average).toBe(4);
  });

  it("lets a viewer see their own hidden vote before reveal", () => {
    store.login("s1", "Іван");
    store.login("s2", "Петро");
    store.selectTeam("s1", "FE");
    store.selectTeam("s2", "FE");
    store.vote("s1", 2);

    const asSelf = store.getTeamState("FE", { forUserId: "s1" });
    expect(asSelf.users.find((u) => u.id === "s1").vote).toBe(2);

    const asOther = store.getTeamState("FE", { forUserId: "s2" });
    expect(asOther.users.find((u) => u.id === "s1").vote).toBeNull();
  });

  it("rejects invalid votes (outside 0.5..10 step 0.5)", () => {
    store.login("s1", "Іван");
    store.selectTeam("s1", "QA");
    expect(() => store.vote("s1", 0)).toThrow();
    expect(() => store.vote("s1", 10.25)).toThrow();
    expect(() => store.vote("s1", 11)).toThrow();
    expect(() => store.vote("s1", 0.5)).not.toThrow();
    expect(() => store.vote("s1", 10)).not.toThrow();
  });

  it("only allows BE, FE, QA to vote, not BA", () => {
    store.login("s1", "Аналітик");
    store.selectTeam("s1", "BA");
    expect(() => store.vote("s1", 3)).toThrow();
  });

  it("allows changing a vote even after reveal", () => {
    store.login("s1", "Іван");
    store.selectTeam("s1", "QA");
    store.vote("s1", 1);
    expect(store.getTeamState("QA").revealed).toBe(true); // solo team, auto-revealed

    store.vote("s1", 8);
    const state = store.getTeamState("QA");
    expect(state.revealed).toBe(true);
    expect(state.users[0].vote).toBe(8);
    expect(state.average).toBe(8);
  });

  it("BA can force-reveal a team before everyone has voted", () => {
    store.login("s1", "Іван");
    store.login("s2", "Петро");
    store.selectTeam("s1", "BE");
    store.selectTeam("s2", "BE");
    store.vote("s1", 2);

    let state = store.getTeamState("BE");
    expect(state.revealed).toBe(false);

    store.revealTeam("BE");
    state = store.getTeamState("BE");
    expect(state.revealed).toBe(true);
    expect(state.users.find((u) => u.id === "s2").vote).toBeNull(); // never voted
    expect(state.average).toBe(2); // only counts actual votes
  });

  it("newRound clears votes and hides again", () => {
    store.login("s1", "Іван");
    store.selectTeam("s1", "QA");
    store.vote("s1", 4);
    expect(store.getTeamState("QA").revealed).toBe(true);

    store.newRound("QA");
    const state = store.getTeamState("QA");
    expect(state.revealed).toBe(false);
    expect(state.users[0].hasVoted).toBe(false);
    expect(state.average).toBeNull();
  });

  it("removing a user from a team can trigger auto-reveal for those remaining", () => {
    store.login("s1", "Іван");
    store.login("s2", "Петро");
    store.selectTeam("s1", "BE");
    store.selectTeam("s2", "BE");
    store.vote("s1", 3);
    expect(store.getTeamState("BE").revealed).toBe(false);

    store.removeUser("s2"); // only s1 (voted) remains
    expect(store.getTeamState("BE").revealed).toBe(true);
  });

  it("switching teams removes the previous vote from the old room", () => {
    store.login("s1", "Іван");
    store.login("s2", "Петро");
    store.selectTeam("s1", "BE");
    store.selectTeam("s2", "BE");
    store.vote("s1", 3);
    store.vote("s2", 4);
    expect(store.getTeamState("BE").revealed).toBe(true);

    // s1 leaves BE for FE mid-way through a fresh, unrevealed round
    store.newRound("BE");
    store.vote("s2", 4); // s2 votes again, s1 hasn't -> not revealed
    expect(store.getTeamState("BE").revealed).toBe(false);

    store.selectTeam("s1", "FE");
    // Now only s2 remains active in BE and has voted -> auto reveal
    expect(store.getTeamState("BE").revealed).toBe(true);
    expect(store.usersInTeam("FE").map((u) => u.id)).toEqual(["s1"]);
  });

  it("summarizes only teams that currently have at least one active user", () => {
    store.login("s1", "Іван");
    store.login("s2", "Аналітик");
    store.selectTeam("s1", "FE");
    store.selectTeam("s2", "BA");

    const summary = store.getActiveTeamsSummary();
    expect(summary.map((t) => t.team)).toEqual(["FE"]);
    expect(summary[0].userCount).toBe(1);
  });

  it("computeAverage ignores non-numeric/null entries and rounds to 1 decimal", () => {
    const votes = new Map([
      ["a", 1],
      ["b", 2],
      ["c", 2],
    ]);
    expect(computeAverage(votes)).toBeCloseTo(1.7);
    expect(computeAverage(new Map())).toBeNull();
  });
});
