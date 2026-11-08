import { useEffect, useState } from "react";

const SERVER = "http://localhost:5000";
const API = `${SERVER}/api/applications`;
const STAGES = ["applied", "assessment", "interview", "offer", "rejected"];

type Application = {
  _id: string;
  company: string;
  role: string;
  stage: string;
};

type User = {
  email: string;
  name: string;
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  useEffect(() => {
    fetch(`${SERVER}/auth/me`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch(API, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setApplications(data));
  }, [user]);

  async function handleLogout() {
    await fetch(`${SERVER}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
    setApplications([]);
  }

  async function handleSync() {
  setSyncing(true);
  setSyncMsg("");
    try {
      const res = await fetch(`${SERVER}/api/sync`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setSyncMsg(data.error || "Sync failed");
        return;
      }
      setSyncMsg(`${data.created} new, ${data.updated} updated`);
      const list = await fetch(API, { credentials: "include" });
      if (list.ok) setApplications(await list.json());
    } catch {
      setSyncMsg("Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(API, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company, role }),
    });
    if (!res.ok) return;
    const saved = await res.json();
    setApplications([saved, ...applications]);
    setCompany("");
    setRole("");
  }

  async function moveCard(id: string, stage: string) {
    const res = await fetch(`${API}/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setApplications((prev) => prev.map((a) => (a._id === id ? updated : a)));
  }

  async function deleteCard(id: string) {
    const res = await fetch(`${API}/${id}`, {
  method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) return;
    setApplications((prev) => prev.filter((a) => a._id !== id));
  }

  if (!authChecked) {
    return <div className="page">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="page">
        <h1>Job Tracker</h1>
        <p>Track your job applications straight from your Gmail.</p>
        <a className="login-btn" href={`${SERVER}/auth/google`}>
          Login with Google
        </a>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="topbar">
        <h1>Job Tracker</h1>
        <div className="user">
            {syncMsg && <span>{syncMsg}</span>}
            <button onClick={handleSync} disabled={syncing}>
              {syncing ? "Syncing..." : "Sync Gmail"}
            </button>
          <span>{user.name}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <form className="add-form" onSubmit={handleAdd}>
        <input
          placeholder="Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          required
        />
        <input
          placeholder="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
        />
        <button type="submit">Add</button>
      </form>

      <div className="board">
        {STAGES.map((stage) => (
          <div className="column" key={stage}>
            <h2>
              {stage} ({applications.filter((a) => a.stage === stage).length})
            </h2>
            {applications
              .filter((a) => a.stage === stage)
              .map((app) => (
                <div className="card" key={app._id}>
                  <strong>{app.company}</strong>
                  <p>{app.role}</p>
                  <div className="card-actions">
                    <select
                      value={app.stage}
                      onChange={(e) => moveCard(app._id, e.target.value)}
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button
                      className="delete"
                      onClick={() => deleteCard(app._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;