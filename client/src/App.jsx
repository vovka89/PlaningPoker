import { useEffect, useState } from "react";
import { socket, request } from "./socket";
import Login from "./components/Login.jsx";
import TeamSelect from "./components/TeamSelect.jsx";
import TeamRoom from "./components/TeamRoom.jsx";
import BaDashboard from "./components/BaDashboard.jsx";
import { VOTING_TEAMS } from "./constants";

const NAME_KEY = "pp_name";

export default function App() {
  const [connected, setConnected] = useState(socket.connected);
  const [myId, setMyId] = useState(socket.id || null);
  const [name, setName] = useState(localStorage.getItem(NAME_KEY) || "");
  const [team, setTeam] = useState(null);
  const [error, setError] = useState("");
  const [teamState, setTeamState] = useState(null);
  const [baState, setBaState] = useState({ teams: [] });

  useEffect(() => {
    function onConnect() {
      setConnected(true);
      setMyId(socket.id);
    }
    function onDisconnect() {
      setConnected(false);
    }
    function onTeamState(state) {
      setTeamState(state);
    }
    function onBaState(state) {
      setBaState(state);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("team:state", onTeamState);
    socket.on("ba:state", onBaState);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("team:state", onTeamState);
      socket.off("ba:state", onBaState);
    };
  }, []);

  // Re-login automatically after a reconnect (e.g. brief network blip),
  // so the session picks up where it left off in the current team.
  useEffect(() => {
    async function reclaim() {
      if (!connected || !name) return;
      try {
        await request("login", { name });
        if (team) await request("selectTeam", { team });
      } catch (e) {
        setError(e.message);
      }
    }
    reclaim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  async function handleLogin(enteredName) {
    setError("");
    try {
      await request("login", { name: enteredName });
      localStorage.setItem(NAME_KEY, enteredName);
      setName(enteredName);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleSelectTeam(selected) {
    setError("");
    try {
      await request("selectTeam", { team: selected });
      setTeam(selected);
      setTeamState(null);
    } catch (e) {
      setError(e.message);
    }
  }

  function handleChangeTeam() {
    setTeam(null);
    setTeamState(null);
  }

  function handleVote(value) {
    request("vote", { value }).catch((e) => setError(e.message));
  }

  function handleSetTask(text) {
    request("setTask", { team, text }).catch((e) => setError(e.message));
  }

  function handleNewRound(forTeam = team) {
    request("newRound", { team: forTeam }).catch((e) => setError(e.message));
  }

  function handleReveal(forTeam) {
    request("ba:reveal", { team: forTeam }).catch((e) => setError(e.message));
  }

  if (!connected) {
    return (
      <div className="screen screen-center">
        <p className="muted">З'єднання із сервером...</p>
      </div>
    );
  }

  if (!name) {
    return <Login initialName={name} onSubmit={handleLogin} error={error} />;
  }

  if (!team) {
    return <TeamSelect name={name} onSelect={handleSelectTeam} error={error} />;
  }

  if (team === "BA") {
    return (
      <BaDashboard
        name={name}
        teams={baState.teams}
        onReveal={handleReveal}
        onNewRound={handleNewRound}
        onChangeTeam={handleChangeTeam}
      />
    );
  }

  if (VOTING_TEAMS.includes(team)) {
    return (
      <TeamRoom
        team={team}
        myId={myId}
        state={teamState}
        onVote={handleVote}
        onSetTask={handleSetTask}
        onNewRound={() => handleNewRound(team)}
        onChangeTeam={handleChangeTeam}
      />
    );
  }

  return null;
}
