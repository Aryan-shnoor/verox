const approvalService = require("../services/approvalService");
const documentService = require("../services/documentService");
const parseId = require("../utils/parseId");

async function submitDocument(req, res, next) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid document ID." });

  const { comment } = req.body || {};
  if (
    comment != null &&
    (typeof comment !== "string" || comment.length > 1000)
  ) {
    return res
      .status(400)
      .json({ message: "Comment must be text of 1000 characters or fewer." });
  }

  try {
    await approvalService.submitDocument(id, req.user, comment?.trim() || null);

    const document = await documentService.getDocumentById(id, req.user);
    const approval = await approvalService.getApproval(id);
    res.json({ document, ...approval });
  } catch (err) {
    next(err);
  }
}

async function getApproval(req, res, next) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid document ID." });

  try {
    // same access rule as viewing the document itself
    const document = await documentService.getDocumentById(id, req.user);
    if (!document)
      return res.status(404).json({ message: "Document not found." });

    const approval = await approvalService.getApproval(id);
    res.json({ document, ...approval });
  } catch (err) {
    next(err);
  }
}


const ACTIONS = ["APPROVED", "REJECTED", "CHANGES_REQUESTED"];

async function decideDocument(req, res, next) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid document ID." });

  const { action, comment } = req.body || {};

  if (!ACTIONS.includes(action)) {
    return res.status(400).json({
      message: "Action must be APPROVED, REJECTED or CHANGES_REQUESTED.",
    });
  }
  if (comment != null && typeof comment !== "string") {
    return res.status(400).json({ message: "Comment must be text." });
  }

  const text = comment ? comment.trim() : "";
  if (text.length > 1000) {
    return res
      .status(400)
      .json({ message: "Comment must be 1000 characters or fewer." });
  }
  if (action !== "APPROVED" && !text) {
    return res.status(400).json({
      message: "A comment is required when rejecting or requesting changes.",
    });
  }

  try {
    await approvalService.decide(id, req.user, action, text || null);

    const document = await documentService.getDocumentById(id, req.user);
    const approval = await approvalService.getApproval(id);
    res.json({ document, ...approval });
  } catch (err) {
    next(err);
  }
}

async function listPending(req, res, next) {
  try {
    res.json(await approvalService.listPending(req.user.id));
  } catch (err) {
    next(err);
  }
}

async function listReviewHistory(req, res, next) {
  try {
    res.json(await approvalService.listReviewHistory(req.user.id));
  } catch (err) {
    next(err);
  }
}

async function reviewSummary(req, res, next) {
  try {
    const pending = await approvalService.listPending(req.user.id);
    const history = await approvalService.listReviewHistory(req.user.id);

    res.json({
      pending: pending.length,
      approved: history.filter((h) => h.action === "APPROVED").length,
      rejected: history.filter((h) => h.action === "REJECTED").length,
      changesRequested: history.filter((h) => h.action === "CHANGES_REQUESTED")
        .length,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  submitDocument,
  getApproval,
  decideDocument,
  listPending,
  listReviewHistory,
  reviewSummary,
};
