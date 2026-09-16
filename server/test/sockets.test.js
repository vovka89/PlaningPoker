import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { io as ioClient } from "socket.io-client";
import { PokerStore } from "../src/store.js";
import { registerSocketHandlers } from "../src/sockets.js";

function emitAsync(socket, event, payload) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

function once(socket, event) {
  return new Promise((resolve) => socket.once(event, resolve));
}

describe("realtime socket flow", () => {
  let httpServer;
  let port;
  let clients = [];

  beforeEach(async () => {
    const store = new PokerStore();
    httpServer = createServer();
    const io = new Server(httpServer);
    registerSocketHandlers(io, store);
    await new Promise((resolve) => httpServer.listen(0, resolve));
    port = httpServer.address().port;
    clients = [];
  });

  afterEach(async () => {
    for (const c of clients) c.close();
    await new Promise((resolve) => httpServer.close(resolve));
  });

  function connect() {
    const c = ioClient(`http://localhost:${port}`, { transports: ["websocket"] });
    clients.push(c);
    return new Promise((resolve) => c.on("connect", () => resolve(c)));
  }

  it("two FE devs vote, stay hidden from each other, then reveal together", async () => {
    const alice = await connect();
    const bob = await connect();

    await emitAsync(alice, "login", { name: "Alice" });
    await emitAsync(bob, "login", { name: "Bob" });
    await emitAsync(alice, "selectTeam", { team: "FE" });
    await emitAsync(bob, "selectTeam", { team: "FE" });

    const bobSeesAliceVote = once(bob, "team:state");
    await emitAsync(alice, "vote", { value: 3 });
    const bobState = await bobSeesAliceVote;
    expect(bobState.revealed).toBe(false);
    expect(bobState.users.find((u) => u.name === "Alice").vote).toBeNull();
    expect(bobState.users.find((u) => u.name === "Alice").hasVoted).toBe(true);

    const aliceRevealed = once(alice, "team:state");
    const bobRevealed = once(bob, "team:state");
    await emitAsync(bob, "vote", { value: 5 });
    const [aliceState, bobState2] = await Promise.all([aliceRevealed, bobRevealed]);
    expect(aliceState.revealed).toBe(true);
    expect(bobState2.revealed).toBe(true);
    expect(aliceState.average).toBe(4);
    expect(bobState2.users.find((u) => u.name === "Alice").vote).toBe(3);
  });

  it("a BA sees the active team in the dashboard and can force a reveal", async () => {
    const dev = await connect();
    const ba = await connect();

    await emitAsync(dev, "login", { name: "Dev" });
    await emitAsync(ba, "login", { name: "Olena" });
    await emitAsync(dev, "selectTeam", { team: "QA" });

    const baSeesTeam = once(ba, "ba:state");
    await emitAsync(ba, "selectTeam", { team: "BA" });
    const baState = await baSeesTeam;
    expect(baState.teams.map((t) => t.team)).toContain("QA");

    const devRevealed = once(dev, "team:state");
    const res = await emitAsync(ba, "ba:reveal", { team: "QA" });
    expect(res.ok).toBe(true);
    const devState = await devRevealed;
    expect(devState.revealed).toBe(true);
  });

  it("rejects a non-BA trying to force-reveal another team", async () => {
    const dev = await connect();
    await emitAsync(dev, "login", { name: "Dev" });
    await emitAsync(dev, "selectTeam", { team: "FE" });
    const res = await emitAsync(dev, "ba:reveal", { team: "FE" });
    expect(res.ok).toBe(false);
  });

  it("a disconnect frees the seat and can auto-reveal remaining voters", async () => {
    const alice = await connect();
    const bob = await connect();
    await emitAsync(alice, "login", { name: "Alice" });
    await emitAsync(bob, "login", { name: "Bob" });
    await emitAsync(alice, "selectTeam", { team: "BE" });
    await emitAsync(bob, "selectTeam", { team: "BE" });
    await emitAsync(alice, "vote", { value: 3 });

    const aliceSeesReveal = once(alice, "team:state");
    bob.close();
    const state = await aliceSeesReveal;
    expect(state.revealed).toBe(true);
    expect(state.users.map((u) => u.name)).toEqual(["Alice"]);
  });
});
