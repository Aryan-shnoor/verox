const express = require("express");
const { summary, documentsCsv } = require("../controllers/reportController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.get("/summary", summary);
router.get("/documents", documentsCsv);

module.exports = router;
