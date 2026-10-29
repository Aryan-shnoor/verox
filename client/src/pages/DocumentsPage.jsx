import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../authContext.js";
import { getDocuments, downloadDocumentsCsv } from "../api.js";
import { STATUS_LABELS, CATEGORIES } from "../constants.js";
import { formatDate } from "../format.js";
import StatusBadge from "../components/StatusBadge.jsx";

const emptyFilters = { search: "", status: "", category: "" };

export default function DocumentsPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState(emptyFilters);
  const [searchText, setSearchText] = useState("");
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let ignore = false;

    getDocuments(filters)
      .then((data) => {
        if (!ignore) setDocuments(data);
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
  }, [filters]);

  function updateFilters(changes) {
    setLoading(true);
    setError("");
    setFilters((current) => ({ ...current, ...changes }));
  }

  function handleSearch(e) {
    e.preventDefault();
    updateFilters({ search: searchText.trim() });
  }

  function clearFilters() {
    setSearchText("");
    updateFilters(emptyFilters);
  }

  async function handleDownload() {
    setDownloading(true);
    setError("");
    try {
      await downloadDocumentsCsv(filters);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  }

  const showOwner = user.role !== "EMPLOYEE";
  const hasFilters = filters.search || filters.status || filters.category;
  const selectClass =
    "rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-navy-700 focus:outline-none";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-navy-900">Documents</h1>
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            {downloading ? "Preparing..." : "Download CSV"}
          </button>
          <Link
            to="/documents/new"
            className="rounded bg-navy-700 px-3 py-2 text-sm font-medium text-white hover:bg-navy-900"
          >
            New Document
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 md:flex-row">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search title or description"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded bg-navy-700 px-3 py-2 text-sm text-white hover:bg-navy-900"
          >
            Search
          </button>
        </form>

        <select
          value={filters.status}
          onChange={(e) => updateFilters({ status: e.target.value })}
          className={selectClass}
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={filters.category}
          onChange={(e) => updateFilters({ category: e.target.value })}
          className={selectClass}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded border border-gray-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Waiting on</th>
              {showOwner && <th className="px-4 py-2">Owner</th>}
              <th className="px-4 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={showOwner ? 6 : 5}
                  className="px-4 py-6 text-center text-gray-500"
                >
                  Loading...
                </td>
              </tr>
            )}

            {!loading && documents.length === 0 && (
              <tr>
                <td
                  colSpan={showOwner ? 6 : 5}
                  className="px-4 py-6 text-center text-gray-500"
                >
                  {hasFilters
                    ? "No documents match these filters."
                    : "No documents yet."}
                </td>
              </tr>
            )}

            {!loading &&
              documents.map((doc) => (
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
                  <td className="px-4 py-2">
                    {doc.current_reviewer_name
                      ? `${doc.current_reviewer_name} (${doc.current_stage_name})`
                      : "-"}
                  </td>
                  {showOwner && <td className="px-4 py-2">{doc.owner_name}</td>}
                  <td className="px-4 py-2">{formatDate(doc.updated_at)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
