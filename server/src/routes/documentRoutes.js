const express = require("express");
const {
  createDocument,
  listDocuments,
  getDocument,
  updateDocument,
} = require("../controllers/documentController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.post("/", createDocument);
router.get("/", listDocuments);
router.get("/:id", getDocument);
router.patch("/:id", updateDocument);

module.exports = router;
