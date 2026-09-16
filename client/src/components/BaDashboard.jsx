import { TEAM_LABELS } from "../constants";

export default function BaDashboard({ name, teams, onReveal, onNewRound, onChangeTeam }) {
  return (
    <div className="screen">
      <header className="room-header">
        <div>
          <span className="badge">BA · {name}</span>
        </div>
        <button className="btn btn-ghost" onClick={onChangeTeam}>
          Змінити команду
        </button>
      </header>

      <h2>Активні команди</h2>
      {teams.length === 0 && <p className="muted">Зараз немає активних команд, що голосують.</p>}

      <div className="ba-grid">
        {teams.map((t) => (
          <div key={t.team} className="panel ba-card">
            <div className="ba-card-header">
              <span className="team-code">{t.team}</span>
              <span className="muted">{TEAM_LABELS[t.team]}</span>
            </div>
            {t.task && <p className="task-label">📋 {t.task}</p>}
            <p className="muted small">
              Проголосувало {t.votedCount} з {t.userCount}
            </p>

            <ul className="user-list">
              {t.users.map((u) => (
                <li key={u.id}>
                  <span className="user-name">{u.name}</span>
                  <span className={"vote-chip " + (u.hasVoted ? "voted" : "waiting")}>
                    {t.revealed ? u.vote ?? "—" : u.hasVoted ? "✓" : "…"}
                  </span>
                </li>
              ))}
            </ul>

            {t.revealed ? (
              <div className="average">
                Середня оцінка: <strong>{t.average ?? "—"}</strong>
              </div>
            ) : (
              <button className="btn btn-primary" onClick={() => onReveal(t.team)}>
                Показати оцінки
              </button>
            )}
            <button className="btn btn-ghost small-btn" onClick={() => onNewRound(t.team)}>
              Новий раунд
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
