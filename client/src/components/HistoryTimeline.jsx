import { useState } from "react";
import { formatDateTime } from "../format.js";

const LIMIT = 6;

const labels = {
  CREATED: "Created",
  SUBMITTED: "Submitted for review",
  RESUBMITTED: "Resubmitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CHANGES_REQUESTED: "Requested changes",
};

const dots = {
  CREATED: "bg-slate-400",
  SUBMITTED: "bg-accent",
  RESUBMITTED: "bg-accent",
  APPROVED: "bg-green-600",
  REJECTED: "bg-red-500",
  CHANGES_REQUESTED: "bg-orange-500",
};

export default function HistoryTimeline({ history }) {
  const [showAll, setShowAll] = useState(false);

  if (history.length === 0) {
    return <p className="text-sm text-muted">No history yet.</p>;
  }

  const newestFirst = [...history].reverse();
  const shown = showAll ? newestFirst : newestFirst.slice(0, LIMIT);

  return (
    <>
      <ol className="space-y-5 border-l border-line pl-5">
        {shown.map((item) => (
          <li key={item.id} className="relative">
            <span
              className={`absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white ${dots[item.action]}`}
            />
            <p className="text-sm">
              <span className="font-semibold">{labels[item.action]}</span>{" "}
              <span className="text-muted">by {item.actor_name}</span>
            </p>
            <p className="text-xs text-muted">
              {formatDateTime(item.created_at)}
              {item.attempt_number &&
                ` \u00b7 attempt ${item.attempt_number}${item.stage_order ? `, stage ${item.stage_order}` : ""}`}
            </p>
            {item.comment && (
              <p className="mt-2 whitespace-pre-wrap rounded-lg bg-page px-3 py-2 text-sm">
                {item.comment}
              </p>
            )}
          </li>
        ))}
      </ol>

      {newestFirst.length > LIMIT && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-4 text-sm font-medium text-accent hover:underline"
        >
          Show all {newestFirst.length} events
        </button>
      )}
    </>
  );
}
