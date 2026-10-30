import { formatDateTime } from "../format.js";

const labels = {
  WAITING: "Waiting",
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CHANGES_REQUESTED: "Changes requested",
  SKIPPED: "Skipped",
};

const styles = {
  WAITING: "bg-gray-100 text-gray-600",
  PENDING: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CHANGES_REQUESTED: "bg-blue-100 text-blue-800",
  SKIPPED: "bg-gray-100 text-gray-500",
};

function Chip({ status }) {
  return (
    <span
      className={`whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export default function ApprovalStages({ attempts }) {
  if (attempts.length === 0) {
    return <p className="text-sm text-gray-500">Not submitted yet.</p>;
  }

  const newestFirst = [...attempts].reverse();

  return (
    <div className="space-y-4">
      {newestFirst.map((attempt) => (
        <div key={attempt.id} className="rounded border border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2 text-sm">
            <span className="font-medium">
              Attempt {attempt.attempt_number}
            </span>
            <span className="text-gray-500">
              Started {formatDateTime(attempt.started_at)}
            </span>
            <Chip status={attempt.status} />
          </div>

          <ul className="divide-y divide-gray-100">
            {attempt.stages.map((stage) => (
              <li
                key={stage.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span>
                  {stage.stage_order}. {stage.stage_name}{" "}
                  <span className="text-gray-500">({stage.reviewer_name})</span>
                </span>
                <Chip status={stage.status} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
