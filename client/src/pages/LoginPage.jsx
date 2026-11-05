import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../authContext.js";
import { btnPrimary, authInput, authInputError } from "../ui.js";
import AuthLayout from "../components/AuthLayout.jsx";
import PasswordInput from "../components/PasswordInput.jsx";

export default function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInvalid(false);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      if (err.message === "Invalid email or password.") {
        setInvalid(true);
        setError("Incorrect email or password. Please try again.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  const labelClass = "mb-1.5 block text-[13px] font-semibold";

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue to Verox."
      footer={
        <>
          No account?{" "}
          <Link
            to="/register"
            className="font-semibold text-accent hover:underline"
          >
            Register
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-[18px]">
        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg bg-[#fdecea] px-3.5 py-3 text-[13px] text-[#8a1c12]"
          >
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            placeholder="you@company.com"
            disabled={loading}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setInvalid(false);
            }}
            className={invalid ? authInputError : authInput}
          />
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            disabled={loading}
            invalid={invalid}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setInvalid(false);
            }}
          />
          {invalid && (
            <p className="mt-1.5 text-xs text-[#b42318]">
              Check your password and try again.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`${btnPrimary} flex h-12 w-full items-center justify-center gap-2.5`}
        >
          {loading && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          )}
          {loading ? "Signing in" : "Sign in"}
        </button>

        {loading && (
          <p className="text-center text-xs text-muted">
            The first sign-in can take a minute while the server wakes up.
          </p>
        )}
      </form>
    </AuthLayout>
  );
}
