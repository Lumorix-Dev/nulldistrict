import { useState } from "react";
import { LockKeyhole, Mail, UserRound } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    setLoading(true);
    try {
      if (mode === "login") await login(identifier, password);
      else await register(username, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not authenticate.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-copy">
        <span className="kicker">The First Signal</span>
        <h1>Lumorix: Null District</h1>
        <p>
          A sealed district is transmitting again. Create an account, enter Signal Haven,
          and start the first playable online mystery slice.
        </p>
      </section>

      <section className="auth-card">
        <div className="segmented">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Register</button>
        </div>

        {mode === "register" ? (
          <>
            <label>
              <UserRound size={17} />
              <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" />
            </label>
            <label>
              <Mail size={17} />
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
            </label>
          </>
        ) : (
          <label>
            <UserRound size={17} />
            <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="Username or email" />
          </label>
        )}

        <label>
          <LockKeyhole size={17} />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            type="password"
            onKeyDown={(event) => {
              if (event.key === "Enter") void submit();
            }}
          />
        </label>

        {error ? <div className="form-error">{error}</div> : null}
        <button className="primary-button" disabled={loading} onClick={() => void submit()}>
          {loading ? "Contacting relay..." : mode === "login" ? "Enter Account" : "Create Account"}
        </button>
        <button className="text-button" onClick={() => setError("Password reset is a backend placeholder for beta 0.1.")}>
          Forgot password
        </button>
      </section>
    </main>
  );
}
