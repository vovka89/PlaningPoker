import { useEffect, useRef, useState } from "react";
import { CARD_VALUES, TEAM_LABELS } from "../constants";

export default function TeamRoom({ team, myId, state, onVote, onSetTask, onNewRound, onChangeTeam }) {
  const [taskDraft, setTaskDraft] = useState(state?.task || "");
  const editingTask = useRef(false);

  useEffect(() => {
    if (!editingTask.current) setTaskDraft(state?.task || "");
  }, [state?.task]);

  if (!state) {
    return (
      <div className="screen screen-center">
        <p className="muted">Завантаження...</p>
      </div>
    );
  }

  const me = state.users.find((u) => u.id === myId);
  const myVote = me?.vote ?? null;

  function commitTask() {
    editingTask.current = false;
    onSetTask(taskDraft);
  }

  return (
    <div className="screen">
      <header className="room-header">
        <div>
          <span className="badge">{TEAM_LABELS[team]}</span>
        </div>
        <button className="btn btn-ghost" onClick={onChangeTeam}>
          Змінити команду
        </button>
      </header>

      <div className="task-row">
        <input
          className="text-input"
          placeholder="Назва задачі, яку оцінюємо..."
          value={taskDraft}
          onFocus={() => (editingTask.current = true)}
          onChange={(e) => setTaskDraft(e.target.value)}
          onBlur={commitTask}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
        <button className="btn" onClick={onNewRound}>
          Новий раунд
        </button>
      </div>

      <section className="panel">
        <h2>Учасники ({state.users.length})</h2>
        <ul className="user-list">
          {state.users.map((u) => (
            <li key={u.id} className={u.id === myId ? "me" : ""}>
              <span className="user-name">{u.name}</span>
              <span className={"vote-chip " + (u.hasVoted ? "voted" : "waiting")}>
                {state.revealed && u.vote !== null
                  ? u.vote
                  : u.id === myId && u.vote !== null
                  ? u.vote
                  : u.hasVoted
                  ? "✓"
                  : "…"}
              </span>
            </li>
          ))}
        </ul>
        {state.revealed && (
          <div className="average">
            Середня оцінка команди: <strong>{state.average ?? "—"}</strong>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Ваша оцінка</h2>
        <div className="card-grid">
          {CARD_VALUES.map((value) => (
            <button
              key={value}
              className={"poker-card" + (myVote === value ? " selected" : "")}
              onClick={() => onVote(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <p className="muted small">
          Оцінки приховані, доки не проголосують усі, або поки BA не відкриє їх вручну. Оцінку
          можна змінити навіть після відкриття.
        </p>
      </section>
    </div>
  );
}
