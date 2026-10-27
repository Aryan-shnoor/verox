const documentService = require("../services/documentService");
const approvalService = require("../services/approvalService");
const toCsv = require("../utils/toCsv");

const STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "REJECTED",
];

const COLUMNS = [
  { key: "id", label: "ID" },
  { key: "title", label: "Title" },
  { key: "category", label: "Category" },
  { key: "owner_name", label: "Owner" },
  { key: "status", label: "Status" },
  { key: "current_stage_name", label: "Current stage" },
  { key: "current_reviewer_name", label: "Current reviewer" },
  { key: "created_at", label: "Created" },
  { key: "updated_at", label: "Last updated" },
];

async function summary(req, res, next) {
  try {
    const result = { documents: await documentService.countByStatus(req.user) };

    if (req.user.role === "ADMIN") {
      result.pendingByReviewer = await approvalService.pendingByReviewer();
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function documentsCsv(req, res, next) {
  const { status, category, search } = req.query;

  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid document status." });
  }
  if (
    (category !== undefined && typeof category !== "string") ||
    (search !== undefined && typeof search !== "string")
  ) {
    return res
      .status(400)
      .json({ message: "Category and search must be text." });
  }

  try {
    const documents = await documentService.listDocuments({
      user: req.user,
      status,
      category,
      search,
    });

    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="verox-documents.csv"',
    });
    // the BOM at the start makes Excel read the file as UTF-8
    res.send("\uFEFF" + toCsv(COLUMNS, documents));
  } catch (err) {
    next(err);
  }
}

module.exports = { summary, documentsCsv };
