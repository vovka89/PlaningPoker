import { useState } from "react";

export default function Login({ initialName, onSubmit, error }) {
  const [name, setName] = useState(initialName || "");

  function handleSubmit(e) {
    e.preventDefault();
    if (name.trim()) onSubmit(name.trim());
  }

  return (
    <div className="screen screen-center">
      <div className="card-panel">
        <h1>🎴 Planning Poker</h1>
        <p className="muted">Введіть своє ім'я, щоб приєднатись</p>
        <form onSubmit={handleSubmit} className="stack">
          <input
            autoFocus
            className="text-input"
            placeholder="Ваше ім'я"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
          />
          {error && <div className="error">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={!name.trim()}>
            Увійти
          </button>
        </form>
      </div>
    </div>
  );
}
