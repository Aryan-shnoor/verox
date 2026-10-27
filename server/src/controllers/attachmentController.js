const path = require("path");
const attachmentService = require("../services/attachmentService");
const documentService = require("../services/documentService");
const parseId = require("../utils/parseId");

async function uploadAttachment(req, res, next) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid document ID." });
  if (!req.file)
    return res.status(400).json({ message: "Choose a file to upload." });

  try {
    const attachment = await attachmentService.addAttachment(id, req.user, {
      name: path.basename(req.file.originalname).slice(0, 255),
      mimeType: req.file.mimetype,
      size: req.file.size,
      content: req.file.buffer,
    });

    if (!attachment) {
      return res
        .status(404)
        .json({
          message:
            "Document not found, or you can't add files to it right now.",
        });
    }
    res.status(201).json(attachment);
  } catch (err) {
    next(err);
  }
}

async function listAttachments(req, res, next) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid document ID." });

  try {
    const document = await documentService.getDocumentById(id, req.user);
    if (!document)
      return res.status(404).json({ message: "Document not found." });

    res.json(await attachmentService.listAttachments(id));
  } catch (err) {
    next(err);
  }
}

async function downloadAttachment(req, res, next) {
  const id = parseId(req.params.id);
  const attachmentId = parseId(req.params.attachmentId);
  if (!id || !attachmentId)
    return res.status(400).json({ message: "Invalid ID." });

  try {
    const document = await documentService.getDocumentById(id, req.user);
    if (!document)
      return res.status(404).json({ message: "Document not found." });

    const file = await attachmentService.getFile(id, attachmentId);
    if (!file) return res.status(404).json({ message: "File not found." });

    res.set({
      "Content-Type": file.mime_type,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.original_filename)}`,
      "X-Content-Type-Options": "nosniff",
    });
    res.send(file.content);
  } catch (err) {
    next(err);
  }
}

async function deleteAttachment(req, res, next) {
  const id = parseId(req.params.id);
  const attachmentId = parseId(req.params.attachmentId);
  if (!id || !attachmentId)
    return res.status(400).json({ message: "Invalid ID." });

  try {
    const removed = await attachmentService.deleteAttachment(
      id,
      attachmentId,
      req.user,
    );
    if (!removed) {
      return res.status(404).json({
        message:
          "File not found, or it can't be removed (files from submitted versions are kept).",
      });
    }
    res.json({ message: "File removed." });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadAttachment,
  listAttachments,
  downloadAttachment,
  deleteAttachment,
};
