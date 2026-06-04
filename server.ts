import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { User, Project, Widget, WidgetSettings } from "./src/types";

// Firebase Admin SDK for high-privilege server-side access
import admin from "firebase-admin";

const app = express();
const PORT = 3000;

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Permissive CORS and Frame Ancestor headers to ensure embeds are never blocked in iframe embeds
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader("Content-Security-Policy", "frame-ancestors *;");
  res.removeHeader("X-Frame-Options");
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// Ensure uploads and database directory exists
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const DB_FILE = path.join(UPLOADS_DIR, "db.json");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Database initial state
interface Database {
  users: User[];
  passwords: Record<string, string>; // userId -> password (basic mock)
  projects: Project[];
  widgets: Widget[];
}

const defaultDB: Database = {
  users: [],
  passwords: {},
  projects: [],
  widgets: [],
};

// Database helper functions
function readDB(): Database {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading database file, using fallback:", err);
  }
  return defaultDB;
}

function writeDB(db: Database) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing database file:", err);
  }
}

// Initialize file database
if (!fs.existsSync(DB_FILE)) {
  writeDB(defaultDB);
}

// Initialize server-side Firebase Admin SDK
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let firestoreDb: admin.firestore.Firestore | null = null;
let firebaseStorageBucket: any = null;

try {
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      credential: admin.credential.applicationDefault()
    });
    firestoreDb = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
      ? admin.firestore(firebaseConfig.firestoreDatabaseId)
      : admin.firestore();
    firebaseStorageBucket = admin.storage().bucket();
    console.log("[Firebase Admin Server] Admin SDK successfully initialized for database ID:", firebaseConfig.firestoreDatabaseId);
  } else {
    console.warn("[Firebase Admin Server] Config file not found. Falling back to local db.json.");
  }
} catch (err) {
  console.error("[Firebase Admin Server] Initialization error:", err);
}

// Migration helper
async function migrateDbToFirestore() {
  if (!firestoreDb) return;

  // Verify if the Firestore database is actually accessible (e.g. exists and has no NOT_FOUND errors)
  try {
    console.log("[Firebase Admin Server] Testing connection to Firestore database...");
    await firestoreDb.collection("projects").limit(1).get();
    console.log("[Firebase Admin Server] Firestore database connection test successful!");
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.warn("[Firebase Admin Server] Firestore database testing failed. Error:", errMsg);
    if (errMsg.includes("NOT_FOUND") || errMsg.includes("5 NOT_FOUND") || errMsg.includes("Database not found") || errMsg.includes("not been created") || errMsg.includes("not found")) {
      console.warn("[Firebase Admin Server] Firestore is NOT provisioned or NOT_FOUND in this project. Safely disabling firestoreDb and falling back to local JSON db.");
    } else {
      console.warn("[Firebase Admin Server] Other database access error. Safely disabling firestoreDb and falling back to db.json.");
    }
    firestoreDb = null;
    return;
  }

  try {
    if (fs.existsSync(DB_FILE)) {
      console.log("[Migration] db.json found. Migrating data to Firestore...");
      const localData = JSON.parse(fs.readFileSync(DB_FILE, "utf-8")) as Database;
      
      // 1. Migrate Users
      if (localData.users && localData.users.length > 0) {
        console.log(`[Migration] Migrating ${localData.users.length} users...`);
        for (const user of localData.users) {
          const uDoc = await firestoreDb.collection("users").doc(user.id).get();
          if (!uDoc.exists) {
            await firestoreDb.collection("users").doc(user.id).set(user);
          }
        }
      }

      // 2. Migrate Projects
      if (localData.projects && localData.projects.length > 0) {
        console.log(`[Migration] Migrating ${localData.projects.length} projects...`);
        for (const project of localData.projects) {
          const pDoc = await firestoreDb.collection("projects").doc(project.id).get();
          if (!pDoc.exists) {
            await firestoreDb.collection("projects").doc(project.id).set(project);
          }
        }
      }

      // 3. Migrate Widgets (and upload files if needed)
      if (localData.widgets && localData.widgets.length > 0) {
        console.log(`[Migration] Migrating ${localData.widgets.length} widgets...`);
        for (const widget of localData.widgets) {
          const wDoc = await firestoreDb.collection("widgets").doc(widget.id).get();
          let updatedWidget = { ...widget };
          
          if (wDoc.exists) {
            continue;
          }

          if (widget.url.startsWith("/uploads/") && firebaseStorageBucket) {
            const filename = path.basename(widget.url);
            const localFilePath = path.join(UPLOADS_DIR, filename);
            if (fs.existsSync(localFilePath)) {
              try {
                console.log(`[Migration] Uploading file to Firebase Storage: ${filename}...`);
                const fileBuffer = fs.readFileSync(localFilePath);
                const ext = path.extname(filename);
                const storagePath = `widgets/${widget.id}-${Date.now()}${ext}`;
                const file = firebaseStorageBucket.file(storagePath);
                
                await file.save(fileBuffer, {
                  metadata: {
                    contentType: widget.type === "video" ? "video/mp4" : "image/png",
                  }
                });
                await file.makePublic().catch(() => {});
                const url = `https://storage.googleapis.com/${firebaseStorageBucket.name}/${storagePath}`;
                updatedWidget.url = url;
                console.log(`[Migration] Migrated widget ${widget.id} file uploaded successfully to public URL: ${url}`);
                // Safely remove the local file
                fs.unlinkSync(localFilePath);
              } catch (err) {
                console.error(`[Migration] Failed to upload ${filename}:`, err);
              }
            }
          }

          await firestoreDb.collection("widgets").doc(updatedWidget.id).set(updatedWidget);
        }
      }
      
      console.log("[Migration] Migration completed successfully!");
      fs.renameSync(DB_FILE, DB_FILE + ".bak");
    }
  } catch (err) {
    console.error("[Migration] Error migrating database:", err);
  }
}

// Serve uploaded files statically
app.use("/uploads", express.static(UPLOADS_DIR));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 3 * 1024 * 1024 * 1024, // 3GB max file size (as requested by user)
  },
});

// Authentication middleware
const auth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Необходима авторизация" });
  }

  const userId = authHeader.replace("Bearer ", "").trim();
  
  if (firestoreDb) {
    try {
      const uDoc = await firestoreDb.collection("users").doc(userId).get();
      if (!uDoc.exists) {
        return res.status(401).json({ error: "Пользователь не найден или сессия истекла" });
      }
      (req as any).user = uDoc.data() as User;
      next();
    } catch (e) {
      console.error("Auth error with Firestore, trying local file fallback:", e);
      const dbObj = readDB();
      const user = dbObj.users.find((u) => u.id === userId);
      if (!user) {
        return res.status(401).json({ error: "Пользователь не найден или сессия истекла" });
      }
      (req as any).user = user;
      next();
    }
  } else {
    const dbObj = readDB();
    const user = dbObj.users.find((u) => u.id === userId);

    if (!user) {
      return res.status(401).json({ error: "Пользователь не найден или сессия истекла" });
    }

    (req as any).user = user;
    next();
  }
};

// ==========================================
// API ENDPOINTS
// ==========================================

// Firebase Sync endpoint (unified auth for email/phone)
app.post("/api/auth/firebase-sync", async (req, res) => {
  const { uid, email, phoneNumber, photoURL } = req.body;
  if (!uid) {
    return res.status(400).json({ error: "Необходим Firebase UID" });
  }

  let user: User;

  if (firestoreDb) {
    try {
      const uDocRef = firestoreDb.collection("users").doc(uid);
      const uDoc = await uDocRef.get();
      if (!uDoc.exists) {
        user = {
          id: uid,
          email: email || undefined,
          phoneNumber: phoneNumber || undefined,
          photoURL: photoURL || undefined,
          createdAt: new Date().toISOString(),
        };
        await uDocRef.set(user);
      } else {
        user = uDoc.data() as User;
        let updated = false;
        if (email && user.email !== email) {
          user.email = email;
          updated = true;
        }
        if (phoneNumber && user.phoneNumber !== phoneNumber) {
          user.phoneNumber = phoneNumber;
          updated = true;
        }
        if (photoURL && user.photoURL !== photoURL) {
          user.photoURL = photoURL;
          updated = true;
        }
        if (updated) {
          await uDocRef.set(user);
        }
      }
    } catch (err) {
      console.error("[Firebase Server] Sync error with Firestore, falling back to db.json", err);
      const db = readDB();
      let localUser = db.users.find((u) => u.id === uid);
      if (!localUser) {
        localUser = {
          id: uid,
          email: email || undefined,
          phoneNumber: phoneNumber || undefined,
          photoURL: photoURL || undefined,
          createdAt: new Date().toISOString(),
        };
        db.users.push(localUser);
        writeDB(db);
      }
      user = localUser;
    }
  } else {
    const db = readDB();
    let localUser = db.users.find((u) => u.id === uid);
    if (!localUser) {
      localUser = {
        id: uid,
        email: email || undefined,
        phoneNumber: phoneNumber || undefined,
        photoURL: photoURL || undefined,
        createdAt: new Date().toISOString(),
      };
      db.users.push(localUser);
      writeDB(db);
    }
    user = localUser;
  }

  res.json({
    message: "Синхронизация Firebase успешна",
    token: user.id,
    user,
  });
});

// Register (legacy fallback/unused now with firebase, but keep to avoid breaking anything)
app.post("/api/auth/register", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Введите email и пароль" });
  }

  const db = readDB();
  const userExists = db.users.some((u) => u.email && u.email.toLowerCase() === email.toLowerCase());

  if (userExists) {
    return res.status(400).json({ error: "Пользователь с таким email уже зарегистрирован" });
  }

  const newUser: User = {
    id: "user_" + Math.random().toString(36).substring(2, 11),
    email,
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  db.passwords[newUser.id] = password;
  writeDB(db);

  res.status(201).json({
    message: "Регистрация успешна",
    token: newUser.id,
    user: newUser,
  });
});

// Login (legacy fallback/unused now with firebase, but keep to avoid breaking anything)
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Введите email и пароль" });
  }

  const db = readDB();
  const user = db.users.find((u) => u.email && u.email.toLowerCase() === email.toLowerCase());

  if (!user || db.passwords[user.id] !== password) {
    return res.status(400).json({ error: "Неверный email или пароль" });
  }

  res.json({
    message: "Вход успешен",
    token: user.id,
    user,
  });
});

// Get current user profile
app.get("/api/auth/me", auth, (req, res) => {
  res.json({ user: (req as any).user });
});

// Project endpoints
app.get("/api/projects", auth, async (req, res) => {
  const user = (req as any).user as User;
  
  if (firestoreDb) {
    try {
      const pSnap = await firestoreDb.collection("projects").where("userId", "==", user.id).get();
      const userProjects: Project[] = [];
      pSnap.forEach((doc) => {
        userProjects.push(doc.data() as Project);
      });

      // Sort by createdAt descending
      userProjects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const enrichedProjects = [];
      for (const proj of userProjects) {
        const wSnap = await firestoreDb.collection("widgets").where("projectId", "==", proj.id).get();
        enrichedProjects.push({ ...proj, widgetsCount: wSnap.size });
      }

      return res.json({ projects: enrichedProjects });
    } catch (err) {
      console.error("[Firebase Server] Error fetching projects from Firestore, falling back:", err);
    }
  }

  // Fallback to local db.json
  const db = readDB();
  const userProjects = db.projects.filter((p) => p.userId === user.id);
  const enrichedProjects = userProjects.map((proj) => {
    const widgetsCount = db.widgets.filter((w) => w.projectId === proj.id).length;
    return { ...proj, widgetsCount };
  });
  res.json({ projects: enrichedProjects });
});

app.post("/api/projects", auth, async (req, res) => {
  const user = (req as any).user as User;
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Название проекта обязательно" });
  }

  const newProject: Project = {
    id: "proj_" + Math.random().toString(36).substring(2, 11),
    userId: user.id,
    name,
    description: description || "",
    createdAt: new Date().toISOString(),
  };

  if (firestoreDb) {
    try {
      await firestoreDb.collection("projects").doc(newProject.id).set(newProject);
      return res.status(201).json({ project: newProject });
    } catch (err) {
      console.error("[Firebase Server] Error saving project to Firestore, falling back:", err);
    }
  }

  // Fallback
  const db = readDB();
  db.projects.push(newProject);
  writeDB(db);
  res.status(201).json({ project: newProject });
});

app.delete("/api/projects/:id", auth, async (req, res) => {
  const user = (req as any).user as User;
  const { id } = req.params;

  if (firestoreDb) {
    try {
      const pDocRef = firestoreDb.collection("projects").doc(id);
      const pDoc = await pDocRef.get();
      if (!pDoc.exists || (pDoc.data() as Project).userId !== user.id) {
        return res.status(404).json({ error: "Проект не найден" });
      }

      const wSnap = await firestoreDb.collection("widgets").where("projectId", "==", id).get();
      for (const wDoc of wSnap.docs) {
        const widget = wDoc.data() as Widget;
        
        if (firebaseStorageBucket && (widget.url.includes("storage.googleapis.com") || widget.url.includes("firebasestorage.googleapis.com"))) {
          try {
            let pathInBucket = "";
            if (widget.url.includes("storage.googleapis.com")) {
              const parts = widget.url.split("/" + firebaseStorageBucket.name + "/");
              if (parts.length > 1) {
                pathInBucket = parts[1];
              }
            } else {
              const match = widget.url.match(/\/o\/(.+?)\?/);
              if (match && match[1]) {
                pathInBucket = decodeURIComponent(match[1]);
              }
            }
            if (pathInBucket) {
              await firebaseStorageBucket.file(pathInBucket).delete();
            }
          } catch (storageErr) {
            console.error("[Firebase Server] Storage delete failed during project wipe:", storageErr);
          }
        } else {
          const filename = path.basename(widget.url);
          const filePath = path.join(UPLOADS_DIR, filename);
          if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (e) {}
          }
        }

        await firestoreDb.collection("widgets").doc(widget.id).delete();
      }

      await pDocRef.delete();
      return res.json({ success: true, message: "Проект успешно удален" });
    } catch (err) {
      console.error("[Firebase Server] Error deleting project in Firestore, falling back:", err);
    }
  }

  // Fallback
  const db = readDB();
  const projectIdx = db.projects.findIndex((p) => p.id === id && p.userId === user.id);

  if (projectIdx === -1) {
    return res.status(404).json({ error: "Проект не найден" });
  }

  const pWidgets = db.widgets.filter((w) => w.projectId === id);
  pWidgets.forEach((w) => {
    const filename = path.basename(w.url);
    const filePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (err) {}
    }
  });

  db.widgets = db.widgets.filter((w) => w.projectId !== id);
  db.projects.splice(projectIdx, 1);
  writeDB(db);

  res.json({ success: true, message: "Проект успешно удален" });
});

// Single Project with its widgets
app.get("/api/projects/:id", auth, async (req, res) => {
  const user = (req as any).user as User;
  const { id } = req.params;

  if (firestoreDb) {
    try {
      const pDoc = await firestoreDb.collection("projects").doc(id).get();
      if (!pDoc.exists || (pDoc.data() as Project).userId !== user.id) {
        return res.status(404).json({ error: "Проект не найден" });
      }

      const wSnap = await firestoreDb.collection("widgets").where("projectId", "==", id).get();
      const widgets: Widget[] = [];
      wSnap.forEach((doc) => {
        widgets.push(doc.data() as Widget);
      });

      widgets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return res.json({ project: pDoc.data() as Project, widgets });
    } catch (err) {
      console.error("[Firebase Server] Error fetching project detail from Firestore, falling back:", err);
    }
  }

  // Fallback
  const db = readDB();
  const project = db.projects.find((p) => p.id === id && p.userId === user.id);

  if (!project) {
    return res.status(404).json({ error: "Проект не найден" });
  }

  const widgets = db.widgets.filter((w) => w.projectId === id);
  res.json({ project, widgets });
});

// Upload widget asset
app.post("/api/projects/:id/upload", auth, (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      console.error("Multer error during upload:", err);
      return res.status(400).json({ error: `Ошибка загрузки: ${err.message || err}` });
    }
    next();
  });
}, async (req, res) => {
  const user = (req as any).user as User;
  const { id: projectId } = req.params;
  const { type, name } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: "Файл не загружен" });
  }

  let project: Project | null = null;

  if (firestoreDb) {
    try {
      const pDoc = await firestoreDb.collection("projects").doc(projectId).get();
      if (pDoc.exists && (pDoc.data() as Project).userId === user.id) {
        project = pDoc.data() as Project;
      }
    } catch (err) {
      console.error("[Firebase Server] Error finding project during upload:", err);
    }
  } else {
    const db = readDB();
    const p = db.projects.find((p) => p.id === projectId && p.userId === user.id);
    if (p) project = p;
  }

  if (!project) {
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(404).json({ error: "Проект не найден" });
  }

  const determinedType: "video" | "image" | "audio" = type || (
    req.file.mimetype.startsWith("video") ? "video" : (req.file.mimetype.startsWith("audio") || req.file.originalname.endsWith(".mp3") ? "audio" : "image")
  );
  const uniqueWidgetId = "widg_" + Math.random().toString(36).substring(2, 11);
  let fileUrl = `/uploads/${req.file.filename}`;

  // Upload file to permanent Firebase Storage
  if (firebaseStorageBucket) {
    try {
      console.log(`[Firebase Server] Uploading ${req.file.filename} to Firebase Storage...`);
      const fileBuffer = fs.readFileSync(req.file.path);
      const ext = path.extname(req.file.originalname);
      const storagePath = `widgets/${uniqueWidgetId}-${Date.now()}${ext}`;
      const file = firebaseStorageBucket.file(storagePath);
      
      await file.save(fileBuffer, {
        metadata: {
          contentType: req.file.mimetype,
        }
      });
      await file.makePublic().catch(() => {});
      const permanentUrl = `https://storage.googleapis.com/${firebaseStorageBucket.name}/${storagePath}`;
      
      fileUrl = permanentUrl;
      console.log(`[Firebase Server] File successfully uploaded to permanent Storage URL: ${fileUrl}`);

      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (err) {
      console.error("[Firebase Server] Firebase Storage upload failed, falling back to local file:", err);
    }
  }

  const defaultSettings: WidgetSettings = {
    autoplay: false,
    loop: false,
    controls: true,
    muted: false,
    accentColor: "#6366f1", // Indigo-500
    borderRadius: "8px",
    customTitle: name || req.file.originalname,
    aspectRatio: "auto",
    customWidth: "100%",
    borderStyle: "none",
    gradientBg: "none",
    mediaEffect: "none",
  };

  const newWidget: Widget = {
    id: uniqueWidgetId,
    projectId,
    name: name || req.file.originalname,
    type: determinedType,
    url: fileUrl,
    originalName: req.file.originalname,
    size: req.file.size,
    createdAt: new Date().toISOString(),
    settings: defaultSettings,
  };

  if (firestoreDb) {
    try {
      await firestoreDb.collection("widgets").doc(newWidget.id).set(newWidget);
      return res.status(201).json({ widget: newWidget });
    } catch (err) {
      console.error("[Firebase Server] Error saving widget in Firestore, falling back:", err);
    }
  }

  const db = readDB();
  db.widgets.push(newWidget);
  writeDB(db);

  res.status(201).json({ widget: newWidget });
});

// Update widget settings
app.put("/api/widgets/:id/settings", auth, async (req, res) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const { settings } = req.body;

  if (firestoreDb) {
    try {
      const wDocRef = firestoreDb.collection("widgets").doc(id);
      const wDoc = await wDocRef.get();
      if (!wDoc.exists) {
        return res.status(404).json({ error: "Виджет не найден" });
      }

      const widget = wDoc.data() as Widget;

      const pDoc = await firestoreDb.collection("projects").doc(widget.projectId).get();
      if (!pDoc.exists || (pDoc.data() as Project).userId !== user.id) {
        return res.status(403).json({ error: "Нет прав на изменение настроек" });
      }

      widget.settings = { ...widget.settings, ...settings };
      await wDocRef.set(widget);
      return res.json({ widget });
    } catch (err) {
      console.error("[Firebase Server] Error updating widget in Firestore, falling back:", err);
    }
  }

  // Fallback
  const db = readDB();
  const widgetIdx = db.widgets.findIndex((w) => w.id === id);

  if (widgetIdx === -1) {
    return res.status(404).json({ error: "Виджет не найден" });
  }

  const widget = db.widgets[widgetIdx];
  const project = db.projects.find((p) => p.id === widget.projectId && p.userId === user.id);
  if (!project) {
    return res.status(403).json({ error: "Нет прав на изменение настроек" });
  }

  widget.settings = { ...widget.settings, ...settings };
  writeDB(db);

  res.json({ widget });
});

// Delete widget
app.delete("/api/widgets/:id", auth, async (req, res) => {
  const user = (req as any).user as User;
  const { id } = req.params;

  if (firestoreDb) {
    try {
      const wDocRef = firestoreDb.collection("widgets").doc(id);
      const wDoc = await wDocRef.get();
      if (!wDoc.exists) {
        return res.status(404).json({ error: "Виджет не найден" });
      }

      const widget = wDoc.data() as Widget;

      const pDoc = await firestoreDb.collection("projects").doc(widget.projectId).get();
      if (!pDoc.exists || (pDoc.data() as Project).userId !== user.id) {
        return res.status(403).json({ error: "Нет прав на удаление виджета" });
      }

      if (firebaseStorageBucket && (widget.url.includes("storage.googleapis.com") || widget.url.includes("firebasestorage.googleapis.com"))) {
        try {
          let pathInBucket = "";
          if (widget.url.includes("storage.googleapis.com")) {
            const parts = widget.url.split("/" + firebaseStorageBucket.name + "/");
            if (parts.length > 1) {
              pathInBucket = parts[1];
            }
          } else {
            const match = widget.url.match(/\/o\/(.+?)\?/);
            if (match && match[1]) {
              pathInBucket = decodeURIComponent(match[1]);
            }
          }
          if (pathInBucket) {
            await firebaseStorageBucket.file(pathInBucket).delete();
            console.log("[Firebase Server] Deleted stored file:", pathInBucket);
          }
        } catch (storageErr) {
          console.error("[Firebase Server] Storage file deletion failed during widget deletion:", storageErr);
        }
      } else {
        const filename = path.basename(widget.url);
        const filePath = path.join(UPLOADS_DIR, filename);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (e) {}
        }
      }

      await wDocRef.delete();
      return res.json({ success: true, message: "Виджет удален" });
    } catch (err) {
      console.error("[Firebase Server] Error deleting widget inside Firestore, falling back:", err);
    }
  }

  // Fallback
  const db = readDB();
  const widgetIdx = db.widgets.findIndex((w) => w.id === id);

  if (widgetIdx === -1) {
    return res.status(404).json({ error: "Виджет не найден" });
  }

  const widget = db.widgets[widgetIdx];
  const project = db.projects.find((p) => p.id === widget.projectId && p.userId === user.id);
  if (!project) {
    return res.status(403).json({ error: "Нет прав на удаление виджета" });
  }

  const filename = path.basename(widget.url);
  const filePath = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch (err) {}
  }

  db.widgets.splice(widgetIdx, 1);
  writeDB(db);

  res.json({ success: true, message: "Виджет удален" });
});

// Public GET widget info (for embed viewer client-side loading)
app.get("/api/embed-widget/:id", async (req, res) => {
  const { id } = req.params;

  if (firestoreDb) {
    try {
      const wDocRef = firestoreDb.collection("widgets").doc(id);
      const wDoc = await wDocRef.get();
      if (wDoc.exists) {
        const widgetData = wDoc.data() as any;
        const newViews = (widgetData.views || 0) + 1;
        await wDocRef.update({ views: newViews });
        widgetData.views = newViews;
        return res.json({ widget: widgetData });
      }
    } catch (err) {
      console.error("[Firebase Server] Error fetching embed-widget from Firestore, trying fallback:", err);
    }
  }

  // Fallback to local db.json
  const db = readDB();
  const widget = db.widgets.find((w) => w.id === id) as any;

  if (!widget) {
    return res.status(404).json({ error: "Виджет не найден" });
  }

  widget.views = (widget.views || 0) + 1;
  writeDB(db);

  res.json({ widget });
});

// Global Error Logging Helpers
const logErrorToFile = (source: string, err: any) => {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] [${source}] ${err?.stack || err || "Unknown Error"}\n`;
  try {
    fs.appendFileSync(path.join(UPLOADS_DIR, "error-log.txt"), logMsg, "utf-8");
  } catch (logErr) {
    console.error("Failed writing to error-log.txt", logErr);
  }
};

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception registered:", err);
  logErrorToFile("uncaughtException", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection registered:", reason);
  logErrorToFile("unhandledRejection", reason);
});

// Express error handler middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Express Error Middleware caught error:", err);
  logErrorToFile("expressMiddleware", err);
  res.status(500).json({ error: "Внутренняя ошибка сервера", details: err?.message || err });
});

// ==========================================
// STATIC VITE HANDLING & SPA FALLBACK
// ==========================================

async function startServer() {
  // Trigger automatic db.json migration to cloud Firestore and Firebase Storage
  await migrateDbToFirestore();

  if (process.env.NODE_ENV !== "production") {
    // Vite Dev Mode configuration
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode configuration
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[HostVidgets] Backend running on http://localhost:${PORT}`);
  });
}

startServer();
