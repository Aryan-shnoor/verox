import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../authContext.js";
import { register } from "../api.js";
import { btnPrimary, authInput, authInputError } from "../ui.js";
import AuthLayout from "../components/AuthLayout.jsx";
import PasswordInput from "../components/PasswordInput.jsx";

export default function RegisterPage() {
  const { user, login } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setErrorField("");

    if (password !== confirm) {
      setErrorField("confirm");
      return;
    }

    setLoading(true);
    try {
      await register(fullName, email, password);
      await login(email, password);
    } catch (err) {
      setError(err.message);
      if (err.message.includes("already registered")) setErrorField("email");
    } finally {
      setLoading(false);
    }
  }

  function clearIf(field) {
    if (errorField === field) setErrorField("");
  }

  const labelClass = "mb-1.5 block text-[13px] font-semibold";

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It takes less than a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-accent hover:underline"
          >
            Sign in
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
          <label htmlFor="fullName" className={labelClass}>
            Full name
          </label>
          <input
            id="fullName"
            required
            autoFocus
            maxLength={120}
            autoComplete="name"
            placeholder="Your full name"
            disabled={loading}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={authInput}
          />
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            disabled={loading}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearIf("email");
            }}
            className={errorField === "email" ? authInputError : authInput}
          />
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <PasswordInput
            id="password"
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            disabled={loading}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-muted">
            At least 8 characters. A mix of letters and numbers is better.
          </p>
        </div>

        <div>
          <label htmlFor="confirm" className={labelClass}>
            Confirm password
          </label>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            placeholder="Repeat your password"
            disabled={loading}
            invalid={errorField === "confirm"}
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              clearIf("confirm");
            }}
          />
          {errorField === "confirm" && (
            <p className="mt-1.5 text-xs text-[#b42318]">
              Passwords don't match.
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
          {loading ? "Creating account" : "Create account"}
        </button>

        {loading && (
          <p className="text-center text-xs text-muted">
            The first request can take a minute while the server wakes up.
          </p>
        )}
      </form>
    </AuthLayout>
  );
}
