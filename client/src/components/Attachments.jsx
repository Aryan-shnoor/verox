import { useEffect, useState } from "react";
import {
  getAttachments,
  uploadAttachment,
  deleteAttachment,
  downloadAttachment,
} from "../api.js";
import { formatDate } from "../format.js";
import { btnSecondary } from "../ui.js";

const MAX_SIZE = 5 * 1024 * 1024;

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Attachments({ documentId, canEdit, attemptCount }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    getAttachments(documentId)
      .then((list) => {
        if (!ignore) setFiles(list);
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
  }, [documentId, reloadKey, attemptCount]);

  async function handleUpload(e) {
    const input = e.target;
    const file = input.files[0];
    if (!file) return;

    setError("");
    if (file.size > MAX_SIZE) {
      setError("File is too large. The limit is 5 MB.");
      input.value = "";
      return;
    }

    setUploading(true);
    try {
      await uploadAttachment(documentId, file);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      input.value = "";
    }
  }

  async function handleDownload(file) {
    setError("");
    try {
      await downloadAttachment(documentId, file.id, file.original_filename);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(file) {
    if (!window.confirm(`Remove ${file.original_filename}?`)) return;

    setError("");
    try {
      await deleteAttachment(documentId, file.id);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading && <p className="text-sm text-muted">Loading...</p>}

      {!loading && files.length === 0 && (
        <p className="text-sm text-muted">No files attached.</p>
      )}

      {files.length > 0 && (
        <ul className="divide-y divide-line">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0"
            >
              <div className="min-w-0">
                <button
                  onClick={() => handleDownload(file)}
                  className="block max-w-full truncate text-left text-sm font-semibold hover:text-accent"
                >
                  {file.original_filename}
                </button>
                <p className="text-xs text-muted">
                  {formatSize(file.file_size_bytes)} &middot;{" "}
                  {file.uploaded_by_name} &middot; {formatDate(file.created_at)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-muted">
                  {file.version_number
                    ? `Version ${file.version_number}`
                    : "Not submitted yet"}
                </span>
                {canEdit && !file.version_number && (
                  <button
                    onClick={() => handleDelete(file)}
                    className="text-xs font-medium text-red-700 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <label className={`${btnSecondary} cursor-pointer`}>
            {uploading ? "Uploading..." : "Upload file"}
            <input
              type="file"
              hidden
              disabled={uploading}
              accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.txt"
              onChange={handleUpload}
            />
          </label>
          <span className="text-xs text-muted">
            PDF, Word, Excel, PNG, JPG or TXT, up to 5 MB
          </span>
        </div>
      )}
    </div>
  );
}
