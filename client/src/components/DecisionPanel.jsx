import { useState } from "react";
import { decide } from "../api.js";
import { inputClass } from "../ui.js";

const questions = {
  APPROVED: "Approve this document?",
  CHANGES_REQUESTED: "Send this document back for changes?",
  REJECTED: "Reject this document? This ends the review.",
};

const buttonClass =
  "flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none";

export default function DecisionPanel({ documentId, onDone }) {
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function choose(action) {
    const text = comment.trim();

    if (action !== "APPROVED" && !text) {
      setError("Write a comment before you reject or request changes.");
      return;
    }
    if (!window.confirm(questions[action])) return;

    setError("");
    setBusy(true);
    try {
      const result = await decide(documentId, action, text);
      setComment("");
      onDone(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Comment (required to reject or request changes)"
        className={`${inputClass} block w-full`}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => choose("APPROVED")}
          disabled={busy}
          className={`${buttonClass} bg-green-700 hover:bg-green-800`}
        >
          Approve
        </button>
        <button
          onClick={() => choose("CHANGES_REQUESTED")}
          disabled={busy}
          className={`${buttonClass} bg-orange-700 hover:bg-orange-800`}
        >
          Request changes
        </button>
        <button
          onClick={() => choose("REJECTED")}
          disabled={busy}
          className={`${buttonClass} bg-red-700 hover:bg-red-800`}
        >
          Reject
        </button>
      </div>
    </div>
  );
}
