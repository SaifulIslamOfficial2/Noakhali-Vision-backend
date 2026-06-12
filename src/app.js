import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import auth from "./routes/authRoutes.js";
import news from "./routes/newsRoutes.js";
import comments from "./routes/commentRoutes.js";
import companies from "./routes/companyRoutes.js";
import ads from "./routes/adRoutes.js";
import visitors from "./routes/visitorRoutes.js";
import dashboard from "./routes/dashboardRoutes.js";
import premium from "./routes/premiumRoutes.js";
import team from "./routes/teamRoutes.js";
import push from "./routes/pushRoutes.js";
import rss from "./routes/rssRoutes.js";
import summarize from "./routes/summarizeRoutes.js";
import og from "./routes/ogRoutes.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",").map(o => o.trim()).filter(Boolean);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/health", (_, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.use("/api/auth",       auth);
app.use("/api/news",       news);
app.use("/api/comments",   comments);
app.use("/api/companies",  companies);
app.use("/api/ads",        ads);
app.use("/api/visitors",   visitors);
app.use("/api/dashboard",  dashboard);
app.use("/api/premium",    premium);
app.use("/api/team",       team);
app.use("/api/push",       push);
app.use("/api/rss",        rss);
app.use("/rss.xml",        rss);
app.use("/api/summarize",  summarize);
app.use("/og",             og);

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

export default app;
