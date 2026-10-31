import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPendingReviews, getReviewHistory } from "../api.js";
import { formatDate, formatDateTime } from "../format.js";
import StatusBadge from "../components/StatusBadge.jsx";

export default function ReviewsPage() {
  const [tab, setTab] = useState("pending");
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    Promise.all([getPendingReviews(), getReviewHistory()])
      .then(([pendingList, historyList]) => {
        if (ignore) return;
        setPending(pendingList);
        setHistory(historyList);
      })
      .catch((err) => {
        if (!ignore) setError(err.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  function tabClass(name) {
    return `border-b-2 px-3 py-2 text-sm font-medium ${
      tab === name
        ? "border-navy-700 text-navy-900"
        : "border-transparent text-gray-500 hover:text-gray-700"
    }`;
  }

  const headClass =
    "border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500";

  return (
    <div className="max-w-6xl">
      <h1 className="text-xl font-semibold text-navy-900">My Reviews</h1>

      <div className="mt-4 flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab("pending")}
          className={tabClass("pending")}
        >
          Waiting for me ({pending.length})
        </button>
        <button
          onClick={() => setTab("history")}
          className={tabClass("history")}
        >
          My decisions ({history.length})
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded border border-gray-200 bg-white">
        {loading && (
          <p className="px-4 py-6 text-center text-sm text-gray-500">
            Loading...
          </p>
        )}

        {!loading && tab === "pending" && (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className={headClass}>
              <tr>
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Owner</th>
                <th className="px-4 py-2">Stage</th>
                <th className="px-4 py-2">Attempt</th>
                <th className="px-4 py-2">Submitted</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    Nothing is waiting for your decision.
                  </td>
                </tr>
              )}
              {pending.map((item) => (
                <tr
                  key={item.document_id}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="px-4 py-2 font-medium">{item.title}</td>
                  <td className="px-4 py-2">{item.category}</td>
                  <td className="px-4 py-2">{item.owner_name}</td>
                  <td className="px-4 py-2">{item.stage_name}</td>
                  <td className="px-4 py-2">{item.attempt_number}</td>
                  <td className="px-4 py-2">{formatDate(item.started_at)}</td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      to={`/documents/${item.document_id}`}
                      className="rounded bg-navy-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-900"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && tab === "history" && (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className={headClass}>
              <tr>
                <th className="px-4 py-2">Document</th>
                <th className="px-4 py-2">Decision</th>
                <th className="px-4 py-2">Stage</th>
                <th className="px-4 py-2">Comment</th>
                <th className="px-4 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    You haven't made any decisions yet.
                  </td>
                </tr>
              )}
              {history.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-100 align-top last:border-0"
                >
                  <td className="px-4 py-2">
                    <Link
                      to={`/documents/${item.document_id}`}
                      className="font-medium text-navy-700 hover:underline"
                    >
                      {item.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={item.action} />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    Stage {item.stage_order}, attempt {item.attempt_number}
                  </td>
                  <td className="max-w-xs whitespace-pre-wrap px-4 py-2 text-gray-700">
                    {item.comment || "-"}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {formatDateTime(item.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
