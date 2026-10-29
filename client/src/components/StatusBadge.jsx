import { STATUS_LABELS } from "../constants.js";

const styles = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING_REVIEW: "bg-amber-100 text-amber-800",
  CHANGES_REQUESTED: "bg-blue-100 text-blue-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
