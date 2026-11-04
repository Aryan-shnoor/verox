import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { getDocuments, getSummary, downloadDocumentsCsv } from "../api.js";
import { STATUS_LABELS, CATEGORIES } from "../constants.js";
import { formatDate } from "../format.js";
import { btnPrimary, btnSecondary, inputClass } from "../ui.js";
import StatusBadge from "../components/StatusBadge.jsx";

const PAGE_SIZE = 6;
const emptyFilters = { search: "", status: "", category: "" };

function DocumentsList() {
  const [searchParams] = useSearchParams();
  const startStatus = searchParams.get("status");
  const [filters, setFilters] = useState({
    ...emptyFilters,
    status: Object.keys(STATUS_LABELS).includes(startStatus) ? startStatus : "",
  });
  const [searchText, setSearchText] = useState("");
  const [documents, setDocuments] = useState([]);
  const [counts, setCounts] = useState(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
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

  useEffect(() => {
    let ignore = false;

    getSummary()
      .then((data) => {
        if (!ignore) setCounts(data.documents);
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, []);

  function updateFilters(changes) {
    setLoading(true);
    setError("");
    setVisible(PAGE_SIZE);
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

  const hasFilters = filters.search || filters.status || filters.category;
  const shown = documents.slice(0, visible);

  const tabs = [
    { value: "", label: "All", count: counts?.total },
    ...Object.entries(STATUS_LABELS).map(([value, label]) => ({
      value,
      label,
      count: counts?.[value],
    })),
  ];

  const emptyText = hasFilters
    ? "No documents match these filters."
    : "No documents yet.";
  const headClass = "px-4 py-2.5";
  const cellClass = "px-4 py-3";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="mt-1 text-sm text-muted">
            Search, filter and track every document in one place.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className={btnSecondary}
          >
            {downloading ? "Preparing..." : "Download CSV"}
          </button>
          <Link to="/documents/new" className={btnPrimary}>
            New document
          </Link>
        </div>
      </div>

      <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => updateFilters({ status: tab.value })}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium ${
              filters.status === tab.value
                ? "bg-ink text-white"
                : "text-muted hover:bg-white"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 opacity-70">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      <form
        onSubmit={handleSearch}
        className="mt-3 flex flex-col gap-2 md:flex-row"
      >
        <input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search title or description"
          className={`${inputClass} w-full md:w-auto md:flex-1`}
        />
        <select
          value={filters.category}
          onChange={(e) => updateFilters({ category: e.target.value })}
          className={`${inputClass} md:w-48`}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <button type="submit" className={btnPrimary}>
          Search
        </button>
        {hasFilters && (
          <button type="button" onClick={clearFilters} className={btnSecondary}>
            Clear
          </button>
        )}
      </form>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* phones: one card per document */}
      <div className="mt-4 space-y-2 md:hidden">
        {loading && (
          <p className="rounded-[14px] border border-line bg-white px-4 py-8 text-center text-sm text-muted">
            Loading...
          </p>
        )}
        {!loading && documents.length === 0 && (
          <p className="rounded-[14px] border border-line bg-white px-4 py-8 text-center text-sm text-muted">
            {emptyText}
          </p>
        )}
        {!loading &&
          shown.map((doc) => (
            <Link
              key={doc.id}
              to={`/documents/${doc.id}`}
              className="block rounded-[14px] border border-line bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">{doc.title}</p>
                <StatusBadge status={doc.status} />
              </div>
              <p className="mt-1 text-xs text-muted">
                {doc.category} &middot; Added by {doc.owner_name}
              </p>
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 text-xs text-muted">
                <span>
                  {doc.current_reviewer_name
                    ? `With ${doc.current_reviewer_name} (${doc.current_stage_name})`
                    : "Not under review"}
                </span>
                <span className="whitespace-nowrap">
                  {formatDate(doc.updated_at)}
                </span>
              </div>
            </Link>
          ))}
      </div>

      {/* larger screens: table */}
      <div className="mt-4 hidden overflow-x-auto rounded-[14px] border border-line bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-page text-xs font-semibold uppercase tracking-wider text-muted">
              <th className={headClass}>Title</th>
              <th className={headClass}>Category</th>
              <th className={headClass}>Status</th>
              <th className={headClass}>Waiting on</th>
              <th className={headClass}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  Loading...
                </td>
              </tr>
            )}

            {!loading && documents.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  {emptyText}
                </td>
              </tr>
            )}

            {!loading &&
              shown.map((doc) => (
                <tr
                  key={doc.id}
                  className="border-t border-line hover:bg-page/60"
                >
                  <td className={cellClass}>
                    <Link
                      to={`/documents/${doc.id}`}
                      className="font-semibold hover:text-accent"
                    >
                      {doc.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">
                      Added by {doc.owner_name}
                    </p>
                  </td>
                  <td className={cellClass}>{doc.category}</td>
                  <td className={cellClass}>
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className={cellClass}>
                    {doc.current_reviewer_name ? (
                      <>
                        <span className="font-medium">
                          {doc.current_reviewer_name}
                        </span>
                        <p className="mt-0.5 text-xs text-muted">
                          {doc.current_stage_name}
                        </p>
                      </>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className={`${cellClass} whitespace-nowrap text-muted`}>
                    {formatDate(doc.updated_at)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && documents.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            Showing {shown.length} of {documents.length}
          </p>

          {documents.length > visible && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className={btnSecondary}
              >
                Show more
              </button>
              <button
                onClick={() => setVisible(documents.length)}
                className="text-sm font-medium text-accent hover:underline"
              >
                Show all {documents.length}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DocumentsPage() {
  const location = useLocation();
  return <DocumentsList key={location.search} />;
}
