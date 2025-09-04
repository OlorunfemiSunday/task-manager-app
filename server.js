import express from "express";
import session from "express-session";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import morgan from "morgan";
import helmet from "helmet";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to data files
const DATA_DIR = __dirname;
const USERS_FILE = path.join(DATA_DIR, "users.json");
const TASKS_FILE = path.join(DATA_DIR, "tasks.json");

// Ensure files exist
async function ensureDataFiles() {
  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, "[]", "utf8");
  }
  try {
    await fs.access(TASKS_FILE);
  } catch {
    await fs.writeFile(TASKS_FILE, "[]", "utf8");
  }
}
await ensureDataFiles();

// Helpers
async function readJSON(file) {
  const content = await fs.readFile(file, "utf8");
  return JSON.parse(content || "[]");
}
async function writeJSON(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

// App setup
const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessions
app.set("trust proxy", 1);
app.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET || "dev-session-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
      secure: false,
      sameSite: "lax",
    },
  })
);

// 👉 Serve frontend (go up one folder, then into frontend)
app.use(express.static(path.join(__dirname, "frontend")));

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

// ===== Auth routes =====
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "username and password required" });

  const users = await readJSON(USERS_FILE);
  const exists = users.find(
    (u) => u.username.toLowerCase() === String(username).toLowerCase()
  );
  if (exists) return res.status(409).json({ error: "username already taken" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: uuidv4(), username, passwordHash, createdAt: new Date().toISOString() };
  users.push(user);
  await writeJSON(USERS_FILE, users);

  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ message: "signup successful", user: { id: user.id, username: user.username } });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "username and password required" });

  const users = await readJSON(USERS_FILE);
  const user = users.find(
    (u) => u.username.toLowerCase() === String(username).toLowerCase()
  );
  if (!user) return res.status(401).json({ error: "invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "invalid credentials" });

  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ message: "login successful", user: { id: user.id, username: user.username } });
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "could not logout" });
    res.clearCookie("sid");
    res.json({ message: "logout successful" });
  });
});

// ===== Task routes =====
app.get("/api/tasks", requireAuth, async (req, res) => {
  const tasks = await readJSON(TASKS_FILE);
  res.json(tasks.filter((t) => t.userId === req.session.userId));
});

app.post("/api/tasks", requireAuth, async (req, res) => {
  const { title, description = "", priority = "Low" } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });

  const validPriorities = ["Low", "Medium", "High"];
  if (!validPriorities.includes(priority))
    return res.status(400).json({ error: "invalid priority" });

  const tasks = await readJSON(TASKS_FILE);
  const task = {
    id: uuidv4(),
    userId: req.session.userId,
    title,
    description,
    priority,
    done: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tasks.push(task);
  await writeJSON(TASKS_FILE, tasks);
  res.status(201).json(task);
});

app.put("/api/tasks/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { title, description, priority, done } = req.body;
  const tasks = await readJSON(TASKS_FILE);
  const idx = tasks.findIndex((t) => t.id === id && t.userId === req.session.userId);
  if (idx === -1) return res.status(404).json({ error: "task not found" });

  const validPriorities = ["Low", "Medium", "High"];
  if (priority && !validPriorities.includes(priority))
    return res.status(400).json({ error: "invalid priority" });

  tasks[idx] = {
    ...tasks[idx],
    title: title ?? tasks[idx].title,
    description: description ?? tasks[idx].description,
    priority: priority ?? tasks[idx].priority,
    done: typeof done === "boolean" ? done : tasks[idx].done,
    updatedAt: new Date().toISOString(),
  };
  await writeJSON(TASKS_FILE, tasks);
  res.json(tasks[idx]);
});

app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const tasks = await readJSON(TASKS_FILE);
  const idx = tasks.findIndex((t) => t.id === id && t.userId === req.session.userId);
  if (idx === -1) return res.status(404).json({ error: "task not found" });

  const [removed] = tasks.splice(idx, 1);
  await writeJSON(TASKS_FILE, tasks);
  res.json({ message: "deleted", task: removed });
});

// ===== Frontend routes =====
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "frontend", "index.html"))
);

app.get("/dashboard", (req, res) =>
  res.sendFile(path.join(__dirname, "frontend", "dashboard.html"))
);

// Start server
app.listen(PORT, () => {
  console.log(`✅ Task Manager running on http://localhost:${PORT}`);
});
