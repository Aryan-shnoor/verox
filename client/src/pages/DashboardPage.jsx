import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../authContext.js";
import {
  getSummary,
  getDocuments,
  getPendingReviews,
  getReviewSummary,
} from "../api.js";
import { STATUS_LABELS } from "../constants.js";
import { formatDate } from "../format.js";
import StatusBadge from "../components/StatusBadge.jsx";

const borderColors = {
  TOTAL: "border-navy-700",
  DRAFT: "border-gray-300",
  PENDING_REVIEW: "border-amber-400",
  CHANGES_REQUESTED: "border-blue-400",
  APPROVED: "border-green-500",
  REJECTED: "border-red-500",
};

function Section({ title, children }) {
  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold uppercase text-gray-500">{title}</h2>
      <div className="mt-2 rounded border border-gray-200 bg-white">
        {children}
      </div>
    </div>
  );
}

function Empty({ children }) {
  return <p className="px-4 py-5 text-sm text-gray-500">{children}</p>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isReviewer = user.role === "REVIEWER" || user.role === "ADMIN";
  const isAdmin = user.role === "ADMIN";

  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const [summary, documents, pending, reviewSummary] = await Promise.all([
          getSummary(),
          getDocuments(),
          isReviewer ? getPendingReviews() : [],
          isReviewer ? getReviewSummary() : null,
        ]);
        if (!ignore) {
          setData({
            summary,
            documents: documents.slice(0, 5),
            pending,
            reviewSummary,
          });
        }
      } catch (err) {
        if (!ignore) setError(err.message);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [isReviewer]);

  if (error) {
    return (
      <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </p>
    );
  }
  if (!data) return <p className="text-sm text-gray-500">Loading...</p>;

  const counts = data.summary.documents;
  const cards = [
    { key: "TOTAL", label: "Total", value: counts.total, to: "/documents" },
    ...Object.entries(STATUS_LABELS).map(([status, label]) => ({
      key: status,
      label,
      value: counts[status],
      to: `/documents?status=${status}`,
    })),
  ];

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-navy-900">Dashboard</h1>
          <p className="text-sm text-gray-600">Signed in as {user.full_name}</p>
        </div>
        <Link
          to="/documents/new"
          className="rounded bg-navy-700 px-3 py-2 text-sm font-medium text-white hover:bg-navy-900"
        >
          New Document
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((card) => (
          <Link
            key={card.key}
            to={card.to}
            className={`rounded border border-l-4 border-gray-200 bg-white px-3 py-3 hover:bg-gray-50 ${borderColors[card.key]}`}
          >
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold text-navy-900">
              {card.value}
            </p>
          </Link>
        ))}
      </div>

      {isReviewer && (
        <Section title="Waiting for your decision">
          {data.pending.length === 0 ? (
            <Empty>Nothing is waiting for you.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-2">Title</th>
                    <th className="px-4 py-2">Owner</th>
                    <th className="px-4 py-2">Stage</th>
                    <th className="px-4 py-2">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pending.map((item) => (
                    <tr
                      key={item.document_id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-4 py-2">
                        <Link
                          to={`/documents/${item.document_id}`}
                          className="font-medium text-navy-700 hover:underline"
                        >
                          {item.title}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{item.owner_name}</td>
                      <td className="px-4 py-2">{item.stage_name}</td>
                      <td className="px-4 py-2">
                        {formatDate(item.started_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
            Your decisions so far: {data.reviewSummary.approved} approved,{" "}
            {data.reviewSummary.rejected} rejected,{" "}
            {data.reviewSummary.changesRequested} sent back for changes.
          </p>
        </Section>
      )}

      {isAdmin && (
        <Section title="Pending decisions by reviewer">
          {data.summary.pendingByReviewer.length === 0 ? (
            <Empty>No decisions are pending.</Empty>
          ) : (
            <table className="w-full text-left text-sm">
              <tbody>
                {data.summary.pendingByReviewer.map((reviewer) => (
                  <tr
                    key={reviewer.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-4 py-2">{reviewer.full_name}</td>
                    <td className="px-4 py-2 text-right font-medium">
                      {reviewer.pending}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      )}

      <Section title="Recent documents">
        {data.documents.length === 0 ? (
          <Empty>No documents yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <tbody>
                {data.documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-4 py-2">
                      <Link
                        to={`/documents/${doc.id}`}
                        className="font-medium text-navy-700 hover:underline"
                      >
                        {doc.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{doc.category}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {formatDate(doc.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
