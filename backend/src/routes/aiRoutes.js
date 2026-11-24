const express = require("express");
const router = express.Router();
const {generateOutline, generateChapterContent} = require("../controllers/aiController")
const {protect} = require("../middlewares/authMiddleware");

router.use(protect)

router.post("/generate-outline", generateOutline);
router.post("/generate-chapters", generateChapterContent);


module.exports = router