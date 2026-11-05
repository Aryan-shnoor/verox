import { useState } from "react";
import { decide } from "../api.js";
import { inputClass } from "../ui.js";

const questions = {
  APPROVED: "Approve this document?",
  CHANGES_REQUESTED: "Send this document back for changes?",
  REJECTED: "Reject this document? This ends the review.",
};

const buttonBase =
  "rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60";

export default function DecisionPanel({ documentId, onDone }) {
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function choose(action) {
    const text = comment.trim();

    if (action !== "APPROVED" && !text) {
      setError("Write a comment before you send back or reject.");
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

      <label
        htmlFor={`comment-${documentId}`}
        className="block text-[13px] font-semibold"
      >
        Comment
      </label>
      <textarea
        id={`comment-${documentId}`}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={4}
        maxLength={1000}
        placeholder="Add a note for the document owner"
        className={`${inputClass} mt-1.5 block w-full`}
      />
      <p className="mt-1 text-xs text-muted">
        Required when you send back or reject.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => choose("APPROVED")}
          disabled={busy}
          className={`${buttonBase} bg-green-700 text-white hover:bg-green-800`}
        >
          Approve
        </button>
        <button
          onClick={() => choose("CHANGES_REQUESTED")}
          disabled={busy}
          className={`${buttonBase} border border-line-strong bg-white text-ink hover:bg-page`}
        >
          Send back for changes
        </button>
        <button
          onClick={() => choose("REJECTED")}
          disabled={busy}
          className={`${buttonBase} border border-red-300 bg-white text-red-700 hover:bg-red-50`}
        >
          Reject
        </button>
      </div>
    </div>
  );
}
