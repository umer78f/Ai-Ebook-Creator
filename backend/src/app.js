const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const authRoutes = require("./routes/authRoutes");
const bookRoutes = require("./routes/bookRoutes");
const aiRoutes = require("./routes/aiRoutes")
const exportRoutes = require("./routes/exportRoutes");


app.use(express.json());
app.use("/backend/uploads", express.static(path.join(__dirname, "uploads")));

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}))


app.use("/api/auth", authRoutes);
app.use("/api/book", bookRoutes);
app.use("/api/ai", aiRoutes)
app.use("/api/export", exportRoutes)


module.exports = app