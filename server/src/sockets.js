import { isVotingTeam } from "./constants.js";

function broadcastBA(io, store) {
  io.to("ba").emit("ba:state", { teams: store.getActiveTeamsSummary() });
}

function broadcastTeam(io, store, team) {
  if (!team || !isVotingTeam(team)) return;
  const active = store.usersInTeam(team);
  const state = null; // computed per-viewer below
  for (const u of active) {
    io.to(u.id).emit("team:state", store.getTeamState(team, { forUserId: u.id }));
  }
  // Any voting-team change can affect what BA moderators see on their dashboard.
  broadcastBA(io, store);
}

export function registerSocketHandlers(io, store) {
  io.on("connection", (socket) => {
    socket.on("login", ({ name } = {}, cb) => {
      try {
        const user = store.login(socket.id, name);
        cb?.({ ok: true, user });
      } catch (err) {
        cb?.({ ok: false, error: err.message });
      }
    });

    socket.on("selectTeam", ({ team } = {}, cb) => {
      try {
        const before = store.getUser(socket.id);
        const prevTeam = before?.team ?? null;

        const user = store.selectTeam(socket.id, team);

        if (prevTeam === "BA" && team !== "BA") socket.leave("ba");
        if (prevTeam && isVotingTeam(prevTeam) && prevTeam !== team) {
          broadcastTeam(io, store, prevTeam);
        }
        if (team === "BA") socket.join("ba");

        cb?.({ ok: true, user });

        if (isVotingTeam(team)) broadcastTeam(io, store, team);
        if (team === "BA") broadcastBA(io, store);
      } catch (err) {
        cb?.({ ok: false, error: err.message });
      }
    });

    socket.on("vote", ({ value } = {}, cb) => {
      try {
        const user = store.getUser(socket.id);
        store.vote(socket.id, value);
        cb?.({ ok: true });
        broadcastTeam(io, store, user.team);
      } catch (err) {
        cb?.({ ok: false, error: err.message });
      }
    });

    // Moderator-style actions: allowed for members of the team itself, or any BA.
    function assertCanModerate(team) {
      const user = store.getUser(socket.id);
      if (!user || (user.team !== team && user.team !== "BA")) {
        throw new Error("Немає доступу до цієї команди");
      }
    }

    socket.on("setTask", ({ team, text } = {}, cb) => {
      try {
        assertCanModerate(team);
        store.setTask(team, text);
        cb?.({ ok: true });
        broadcastTeam(io, store, team);
      } catch (err) {
        cb?.({ ok: false, error: err.message });
      }
    });

    socket.on("newRound", ({ team } = {}, cb) => {
      try {
        assertCanModerate(team);
        store.newRound(team);
        cb?.({ ok: true });
        broadcastTeam(io, store, team);
      } catch (err) {
        cb?.({ ok: false, error: err.message });
      }
    });

    socket.on("ba:reveal", ({ team } = {}, cb) => {
      try {
        const user = store.getUser(socket.id);
        if (!user || user.team !== "BA") {
          throw new Error("Лише BA може відкривати оцінки");
        }
        store.revealTeam(team);
        cb?.({ ok: true });
        broadcastTeam(io, store, team);
      } catch (err) {
        cb?.({ ok: false, error: err.message });
      }
    });

    socket.on("disconnect", () => {
      const user = store.getUser(socket.id);
      const team = user?.team;
      store.removeUser(socket.id);
      if (team && isVotingTeam(team)) broadcastTeam(io, store, team);
      else if (team === "BA") broadcastBA(io, store);
    });
  });
}
