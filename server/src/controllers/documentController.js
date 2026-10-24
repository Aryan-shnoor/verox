const documentService = require("../services/documentService");

const STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "REJECTED",
];

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// returns an error message, or null if the fields are fine
function checkFields({ title, category, description, workflowId }, partial) {
  if (!partial || title !== undefined) {
    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 200
    ) {
      return "Title is required and must be 200 characters or fewer.";
    }
  }
  if (!partial || category !== undefined) {
    if (
      typeof category !== "string" ||
      !category.trim() ||
      category.trim().length > 100
    ) {
      return "Category is required and must be 100 characters or fewer.";
    }
  }
  if (description != null && typeof description !== "string") {
    return "Description must be text.";
  }
  if (workflowId != null && workflowId !== "" && !parseId(workflowId)) {
    return "workflowId must be a positive integer.";
  }
  return null;
}

// temporary until login exists, then this becomes req.user.id
function getOwnerId(req) {
  return parseId(req.body?.ownerId ?? req.query.ownerId);
}

async function createDocument(req, res, next) {
  const body = req.body || {};

  const problem = checkFields(body, false);
  if (problem) return res.status(400).json({ message: problem });

  const ownerId = getOwnerId(req);
  if (!ownerId) {
    return res
      .status(400)
      .json({ message: "ownerId is required until login is added." });
  }

  try {
    const document = await documentService.createDocument({
      title: body.title.trim(),
      category: body.category.trim(),
      description: body.description,
      ownerId,
      workflowId: body.workflowId ? parseId(body.workflowId) : null,
    });
    res.status(201).json(document);
  } catch (err) {
    next(err);
  }
}

async function listDocuments(req, res, next) {
  const { status, search } = req.query;

  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid document status." });
  }
  if (search !== undefined && typeof search !== "string") {
    return res.status(400).json({ message: "Search must be text." });
  }

  try {
    const documents = await documentService.listDocuments({
      ownerId: getOwnerId(req),
      status,
      search,
    });
    res.json(documents);
  } catch (err) {
    next(err);
  }
}

async function getDocument(req, res, next) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid document ID." });

  try {
    const document = await documentService.getDocumentById(id);
    if (!document)
      return res.status(404).json({ message: "Document not found." });
    res.json(document);
  } catch (err) {
    next(err);
  }
}

async function updateDocument(req, res, next) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid document ID." });

  const body = req.body || {};
  if (Object.keys(body).length === 0) {
    return res
      .status(400)
      .json({ message: "Send at least one field to update." });
  }

  const problem = checkFields(body, true);
  if (problem) return res.status(400).json({ message: problem });

  try {
    const document = await documentService.updateDocument(id, {
      title: body.title?.trim(),
      category: body.category?.trim(),
      description: body.description,
      workflowId: body.workflowId ? parseId(body.workflowId) : undefined,
    });
    if (!document) {
      return res
        .status(404)
        .json({ message: "Document not found or can't be edited right now." });
    }
    res.json(document);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createDocument,
  listDocuments,
  getDocument,
  updateDocument,
};
