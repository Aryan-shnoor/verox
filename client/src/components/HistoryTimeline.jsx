import { formatDateTime } from "../format.js";

const labels = {
  CREATED: "Created",
  SUBMITTED: "Submitted for review",
  RESUBMITTED: "Resubmitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CHANGES_REQUESTED: "Requested changes",
};

export default function HistoryTimeline({ history }) {
  if (history.length === 0) {
    return <p className="text-sm text-gray-500">No history yet.</p>;
  }

  return (
    <ol className="space-y-4 border-l border-gray-200 pl-4">
      {history.map((item) => (
        <li key={item.id}>
          <p className="text-sm">
            <span className="font-medium">{labels[item.action]}</span> by{" "}
            {item.actor_name}
            {item.attempt_number && (
              <span className="text-gray-500">
                {" "}
                (attempt {item.attempt_number}
                {item.stage_order ? `, stage ${item.stage_order}` : ""})
              </span>
            )}
          </p>
          <p className="text-xs text-gray-500">
            {formatDateTime(item.created_at)}
          </p>
          {item.comment && (
            <p className="mt-1 whitespace-pre-wrap rounded bg-gray-50 px-3 py-2 text-sm text-gray-700">
              {item.comment}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
