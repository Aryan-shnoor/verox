const express = require("express");
const {
  createDocument,
  listDocuments,
  getDocument,
  updateDocument,
} = require("../controllers/documentController");

const router = express.Router();

router.post("/", createDocument);
router.get("/", listDocuments);
router.get("/:id", getDocument);
router.patch("/:id", updateDocument);

module.exports = router;
