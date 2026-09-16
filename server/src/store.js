import { VOTING_TEAMS, isVotingTeam, isValidVote } from "./constants.js";

function createRoom() {
  return {
    task: "",
    revealed: false,
    votes: new Map(), // userId -> value
  };
}

/**
 * In-memory state for the whole Planning Poker app.
 * Everything lives for the lifetime of the process only (no persistence),
 * by design: sessions reset when the server restarts.
 */
export class PokerStore {
  constructor() {
    this.users = new Map(); // socketId -> { id, name, team: null|BE|FE|QA|BA }
    this.rooms = new Map(); // team -> room
    for (const team of VOTING_TEAMS) {
      this.rooms.set(team, createRoom());
    }
  }

  login(id, name) {
    const clean = String(name || "").trim().slice(0, 40);
    if (!clean) {
      throw new Error("Ім'я не може бути порожнім");
    }
    const user = { id, name: clean, team: null };
    this.users.set(id, user);
    return user;
  }

  getUser(id) {
    return this.users.get(id) || null;
  }

  /** Returns the list of users currently in a given team. */
  usersInTeam(team) {
    return [...this.users.values()].filter((u) => u.team === team);
  }

  selectTeam(id, team) {
    const user = this.users.get(id);
    if (!user) throw new Error("Спочатку потрібно авторизуватись");
    if (!["BE", "FE", "QA", "BA"].includes(team)) {
      throw new Error("Невідома команда");
    }
    const prevTeam = user.team;
    user.team = team;

    if (prevTeam && isVotingTeam(prevTeam) && prevTeam !== team) {
      this._removeVote(prevTeam, id);
      this._maybeAutoReveal(prevTeam);
    }
    return user;
  }

  removeUser(id) {
    const user = this.users.get(id);
    if (!user) return;
    const team = user.team;
    this.users.delete(id);
    if (team && isVotingTeam(team)) {
      this._removeVote(team, id);
      this._maybeAutoReveal(team);
    }
  }

  setTask(team, text) {
    const room = this._room(team);
    room.task = String(text || "").slice(0, 200);
    return room;
  }

  vote(id, value) {
    const user = this.users.get(id);
    if (!user) throw new Error("Спочатку потрібно авторизуватись");
    if (!isVotingTeam(user.team)) {
      throw new Error("Голосувати можуть лише BE, FE, QA");
    }
    if (!isValidVote(value)) {
      throw new Error("Некоректна оцінка");
    }
    const room = this._room(user.team);
    room.votes.set(id, value);
    this._maybeAutoReveal(user.team);
    return room;
  }

  /** BA (or anyone privileged) forces the reveal of a given team's votes. */
  revealTeam(team) {
    const room = this._room(team);
    room.revealed = true;
    return room;
  }

  /** Starts a fresh voting round for a team: clears votes and hides them again. */
  newRound(team) {
    const room = this._room(team);
    room.votes = new Map();
    room.revealed = false;
    return room;
  }

  _removeVote(team, id) {
    const room = this._room(team);
    room.votes.delete(id);
  }

  _maybeAutoReveal(team) {
    const room = this._room(team);
    const active = this.usersInTeam(team);
    if (active.length > 0 && active.every((u) => room.votes.has(u.id))) {
      room.revealed = true;
    }
  }

  _room(team) {
    const room = this.rooms.get(team);
    if (!room) throw new Error("Ця команда не голосує");
    return room;
  }

  /** Serializable snapshot of a voting team's room, tailored to the requesting viewer. */
  getTeamState(team, { forUserId = null } = {}) {
    const room = this._room(team);
    const active = this.usersInTeam(team);
    const users = active.map((u) => {
      const hasVoted = room.votes.has(u.id);
      const revealToThisViewer = room.revealed || u.id === forUserId;
      return {
        id: u.id,
        name: u.name,
        hasVoted,
        vote: revealToThisViewer ? room.votes.get(u.id) ?? null : null,
      };
    });
    return {
      team,
      task: room.task,
      revealed: room.revealed,
      users,
      average: room.revealed ? computeAverage(room.votes) : null,
    };
  }

  /**
   * Summary (+ per-user detail, respecting hide/reveal rules) of every
   * active voting team, for the BA dashboard.
   */
  getActiveTeamsSummary() {
    return VOTING_TEAMS.map((team) => {
      const active = this.usersInTeam(team);
      const room = this._room(team);
      const detail = this.getTeamState(team);
      return {
        ...detail,
        userCount: active.length,
        votedCount: [...room.votes.keys()].filter((id) =>
          active.some((u) => u.id === id)
        ).length,
      };
    }).filter((t) => t.userCount > 0);
  }
}

export function computeAverage(votesMap) {
  const values = [...votesMap.values()].filter((v) => typeof v === "number");
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}
