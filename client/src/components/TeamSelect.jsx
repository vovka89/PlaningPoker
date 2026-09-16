import { TEAM_LABELS } from "../constants";

const TEAMS = ["BE", "FE", "QA", "BA"];

export default function TeamSelect({ name, onSelect, error }) {
  return (
    <div className="screen screen-center">
      <div className="card-panel">
        <h1>Привіт, {name}!</h1>
        <p className="muted">Оберіть свою команду</p>
        {error && <div className="error">{error}</div>}
        <div className="team-grid">
          {TEAMS.map((team) => (
            <button key={team} className="btn team-btn" onClick={() => onSelect(team)}>
              <span className="team-code">{team}</span>
              <span className="team-name">{TEAM_LABELS[team]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
