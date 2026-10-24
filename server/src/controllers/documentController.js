const documentService = require("../services/documentService");

const VALID_STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "REJECTED",
];

function parseId(value) {
  if (!/^[1-9]\d*$/.test(String(value ?? ""))) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function handleError(res, error) {
  console.error("Document API error:", error.message);

  if (error.code === "23503") {
    return res.status(400).json({
      success: false,
      message: "The selected user or workflow does not exist.",
    });
  }

  if (error.code === "23514" || error.code === "23502") {
    return res.status(400).json({
      success: false,
      message: "The document data violates a database constraint.",
    });
  }

  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
  });
}

// TEMPORARY local-development identity.
// Replace with req.user.id after authentication is implemented.
// Never trust a client-supplied owner ID in production.
function getTemporaryOwnerId(req) {
  return parseId(req.body?.ownerId ?? req.query?.ownerId);
}

async function createDocument(req, res) {
  const { title, category, description, workflowId } = req.body;
  const ownerId = getTemporaryOwnerId(req);

  if (typeof title !== "string" || !title.trim() || title.trim().length > 200) {
    return res.status(400).json({
      success: false,
      message: "Title is required and must be 200 characters or fewer.",
    });
  }

  if (
    typeof category !== "string" ||
    !category.trim() ||
    category.trim().length > 100
  ) {
    return res.status(400).json({
      success: false,
      message: "A valid category is required.",
    });
  }

  if (!ownerId) {
    return res.status(400).json({
      success: false,
      message: "A valid ownerId is required for local testing.",
    });
  }

  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message: "Description must be text.",
    });
  }

  const parsedWorkflowId =
    workflowId === undefined || workflowId === null || workflowId === ""
      ? null
      : parseId(workflowId);

  if (workflowId && !parsedWorkflowId) {
    return res.status(400).json({
      success: false,
      message: "workflowId must be a positive integer.",
    });
  }

  try {
    const document = await documentService.createDocument({
      title: title.trim(),
      category: category.trim(),
      description,
      ownerId,
      workflowId: parsedWorkflowId,
    });

    return res.status(201).json({
      success: true,
      message: "Document draft created successfully.",
      data: document,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function listDocuments(req, res) {
  const { status, search } = req.query;
  const ownerId = getTemporaryOwnerId(req);

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid document status.",
    });
  }

  if (search !== undefined && typeof search !== "string") {
    return res.status(400).json({
      success: false,
      message: "Search must be text.",
    });
  }

  try {
    const documents = await documentService.listDocuments({
      ownerId,
      status,
      search,
    });

    return res.status(200).json({
      success: true,
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getDocument(req, res) {
  const id = parseId(req.params.id);

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Invalid document ID.",
    });
  }

  try {
    const document = await documentService.getDocumentById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: document,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateDocument(req, res) {
  const id = parseId(req.params.id);

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Invalid document ID.",
    });
  }

  const { title, category, description, workflowId } = req.body;

  if (Object.keys(req.body).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Provide at least one field to update.",
    });
  }

  if (
    title !== undefined &&
    (typeof title !== "string" || !title.trim() || title.trim().length > 200)
  ) {
    return res.status(400).json({
      success: false,
      message: "Title must be non-empty text of at most 200 characters.",
    });
  }

  if (
    category !== undefined &&
    (typeof category !== "string" ||
      !category.trim() ||
      category.trim().length > 100)
  ) {
    return res.status(400).json({
      success: false,
      message: "Category must be non-empty text of at most 100 characters.",
    });
  }

  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message: "Description must be text or null.",
    });
  }

  const parsedWorkflowId =
    workflowId === undefined || workflowId === null || workflowId === ""
      ? null
      : parseId(workflowId);

  if (workflowId && !parsedWorkflowId) {
    return res.status(400).json({
      success: false,
      message: "workflowId must be a positive integer.",
    });
  }

  try {
    const document = await documentService.updateDraft(id, {
      title: title === undefined ? undefined : title.trim(),
      category: category === undefined ? undefined : category.trim(),
      description,
      workflowId: parsedWorkflowId,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Draft not found or document is no longer editable.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Draft updated successfully.",
      data: document,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  createDocument,
  listDocuments,
  getDocument,
  updateDocument,
};
