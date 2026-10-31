import { useState } from "react";
import { decide } from "../api.js";

const questions = {
  APPROVED: "Approve this document?",
  CHANGES_REQUESTED: "Send this document back for changes?",
  REJECTED: "Reject this document? This ends the review.",
};

export default function DecisionPanel({ documentId, stageName, onDone }) {
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

  const buttonClass =
    "rounded px-4 py-2 text-sm font-medium text-white disabled:opacity-60";

  return (
    <div className="mt-4 rounded border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-700">
        Your decision: {stageName}
      </p>

      {error && (
        <p className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Comment (required to reject or request changes)"
        className="mt-2 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
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
          className={`${buttonClass} bg-blue-700 hover:bg-blue-800`}
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
