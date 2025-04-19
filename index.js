import express from "express";
import mysql from "mysql";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import fileUpload from "express-fileupload";
import { dirname } from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import cookieParser from "cookie-parser";
import { register } from "./register/checkAuth.js";
import path from "path";
import mongoose from "mongoose";
import { Server } from "socket.io";
import http from "http";
import { time } from "console";
import connectToMongoDB from "./databases/connectToMongoDB.js";
import { promisify } from "util";
// import cloudinary from "cloudinary";
import fs from 'fs';
import deleteOldStories from "./cronJobs/deleteOldStories.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ----------    Завантаження змінних середовища  ----------
dotenv.config();
const PORT = process.env.PORT || 3001;

const app = express();


app.use(
  fileUpload({
    createParentPath: true,
  })
);


const storage = multer.memoryStorage(); // ⬅️ Зберігати в оперативці
const upload = multer({ storage: storage });


app.use(cookieParser());

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

deleteOldStories();

//---------------------- DB Connection   -----------------------------------

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "project_management",
});

const query = promisify(db.query).bind(db);

// cloudinary.v2.config({
//   cloud_name: "dj2gnypib",
//   api_key: "732897359219285",
//   api_secret: "WU8cy0aG-Vf6Kbt-4epVK-1NYEc",
// });
//---------------------- mongoose DB Connection   -----------------------------------

// mongoose.connect("mongodb://localhost:27017/social_platform", {
//   // useNewUrlParser: true,
//   // useUnifiedTopology: true,
// });

app.get("/", (req, res) => {
  res.json("hello");
});

// --------------   Налаштування Nodemailer   -----------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_SYSTEM,
    pass: process.env.EMAILPASSWORD_SYSTEM,
  },
});

// --------------------       PROJECTS    -------------------------------------

app.get("/home", (req, res) => {
  const q = `SELECT 
    p.id AS project_id, 
    p.title AS project_title, 
    p.description AS project_description, 
    p.start_date AS project_start_date, 
    p.end_date AS project_end_date,
    
    t.id AS task_id, 
    t.title AS task_title, 
    t.description AS task_description, 
    t.start_date AS task_start_date, 
    t.end_date AS task_end_date, 

    u.id AS user_id,
    u.name AS user_name,
    u.email AS user_email,
    u.img AS user_image,

    ts.status_name AS task_status, 
    ps.status_name AS project_status 

FROM 
    projects p
JOIN 
    tasks t ON p.id = t.project_id
JOIN 
    assignments a ON t.id = a.task_id
JOIN 
    users u ON a.user_id = u.id
JOIN 
    task_statuses ts ON t.status_id = ts.id -- З'єднуємо таблицю task_statuses за статусом завдання
JOIN 
    project_statuses ps ON p.status_id = ps.id 
ORDER BY 
    p.id, t.id, u.id;

  `;

  db.query(q, (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

app.get("/projects", (req, res) => {
  const q = `
    SELECT 
        p.*, -- Вибираємо всі поля з таблиці проектів
        ps.status_name AS status_name, -- Вибираємо назву статусу проекту ТА даємо їй псевдонім status_name
        pi.url AS image_url -- Вибираємо URL зображення ТА даємо їй псевдонім image_url
    FROM 
        projects p -- З таблиці проектів
    JOIN 
        project_statuses ps ON p.status_id = ps.id -- Приєднуємо таблицю статусів за ID статусу
    LEFT JOIN 
        ( -- Підзапит для вибору головного зображення
            SELECT 
                project_id, 
                url 
            FROM 
                project_images 
            WHERE 
                id IN ( -- Вибираємо зображення з мінімальним ID для кожного проекту
                SELECT MIN(id) 
                FROM project_images 
                GROUP BY project_id
            )
        ) pi ON pi.project_id = p.id -- Приєднуємо таблицю зображень до таблиці проектів
        
    `;
  db.query(q, (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

app.get("/projects/:id", (req, res) => {
  const projectId = req.params.id;
  const q = `
        SELECT 
            projects.*,  
            project_statuses.status_name AS status_name 
        FROM 
            projects 
        JOIN 
            project_statuses ON projects.status_id = project_statuses.id
        WHERE projects.id = ?
    `;
  db.query(q, [projectId], (err, data) => {
    if (err) return res.json(err);
    if (data.length === 0)
      return res.status(404).json({ message: "Project not found" });
    return res.json(data[0]);
  });
});

app.get("/projectdetails/:id", (req, res) => {
  const projectId = req.params.id; // Змінив на projectId
  const q = `
        SELECT 
            projects.id AS project_id,
            projects.title AS project_title,
            projects.start_date AS project_start_date,
            projects.actual_end_date AS project_actual_end_date,
            tasks.title AS task_title,
            tasks.start_date AS task_start_date,
            tasks.end_date AS task_end_date,
            tasks.actual_end_date AS task_actual_end_date
        FROM 
            projects
        LEFT JOIN 
            tasks ON tasks.project_id = projects.id
        WHERE 
            projects.id = ?
    `;

  db.query(q, [projectId], (err, data) => {
    if (err) return res.json(err);
    if (data.length === 0)
      return res
        .status(404)
        .json({ message: "No tasks found for this project" });
    return res.json(data);
  });
});

app.get("/project_statuses", (req, res) => {
  const q = "SELECT * FROM project_statuses";
  db.query(q, (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

app.get("/project_images", (req, res) => {
  const q = "SELECT * FROM project_images";
  db.query(q, (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

app.post("/projects", (req, res) => {
  const q =
    "INSERT INTO projects (`title`, `description`, `start_date`, `end_date`, `actual_end_date`, `status_id`) VALUES (?)";

  const values = [
    req.body.title,
    req.body.description,
    req.body.start_date,
    req.body.end_date,
    req.body.actual_end_date,
    req.body.status_id,
  ];

  db.query(q, [values], (err, data) => {
    if (err) return res.json(err);

    // Повертаємо ID нового проекту
    return res.json({ insertId: data.insertId });
  });
});

app.delete("/project_images/:id", (req, res) => {
  const imagesId = req.params.id;
  const q = "DELETE FROM project_images WHERE id = ?";

  db.query(q, [imagesId], (err, data) => {
    if (err) return res.json(err);
    return res.json("images has been deleted");
  });
});

app.delete("/projects/:id", (req, res) => {
  const projectId = req.params.id;
  const q = "DELETE FROM projects WHERE id = ?";

  db.query(q, [projectId], (err, data) => {
    if (err) return res.json(err);
    return res.json("Project has been deleted");
  });
});

app.put("/projects/:id", (req, res) => {
  const projectId = req.params.id;
  const q =
    "UPDATE projects SET `title` = ?, `description`=?, `start_date`=?, `end_date`=?, `actual_end_date`=?, `status_id`=? WHERE id =?";

  const values = [
    req.body.title,
    req.body.description,
    req.body.start_date,
    req.body.end_date,
    req.body.actual_end_date,
    req.body.status_id,
  ];

  db.query(q, [...values, projectId], (err, data) => {
    if (err) return res.json(err);
    return res.json("Projects has been update");
  });
});

//--------------- !!! project upload images !!! ------------------//

app.post("/upload_project", (req, res) => {
  if (!req.files || !req.files.files) {
    return res.status(400).json({ msg: "No files uploaded" });
  }

  const files = Array.isArray(req.files.files)
    ? req.files.files
    : [req.files.files];
  const { project_id } = req.body;

  let uploadedFiles = [];

  files.forEach((file, index) => {
    const newFileName = encodeURI(Date.now() + `-${index}-` + file.name);
    const filePath = `/images/${newFileName}`;

    file.mv(`${__dirname}/../client/public/images/${newFileName}`, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send(err);
      }

      // SQL-запит для додавання URL зображення в таблицю project_images
      const q = "INSERT INTO project_images (project_id, url) VALUES (?, ?)";
      db.query(q, [project_id, filePath], (err, data) => {
        if (err) {
          console.error("DB Error: ", err);
          return res
            .status(500)
            .json({ msg: "Failed to insert image into database" });
        }

        uploadedFiles.push({ fileName: file.name, filePath });

        if (uploadedFiles.length === files.length) {
          // Повертаємо відповідь після завантаження всіх файлів
          res.json({ uploadedFiles });
        }
      });
    });
  });
});

// --------------------       TASKS     -------------------------------------

app.get("/tasks", (req, res) => {
  const q = `
        SELECT 
            tasks.*,  
            task_statuses.status_name AS status_name, 
            task_priorities.priority_name AS priority_name,
            projects.title AS project_title,
            ti.url AS image_url -- Вибираємо URL зображення ТА даємо їй псевдонім image_url  
        FROM 
            tasks 
        JOIN 
            task_statuses ON tasks.status_id = task_statuses.id
        JOIN 
            task_priorities ON tasks.priority_id = task_priorities.id
        JOIN 
            projects ON tasks.project_id = projects.id
        LEFT JOIN 
        ( -- Підзапит для вибору головного зображення
            SELECT 
                task_id, 
                url 
            FROM 
                task_images 
            WHERE 
                id IN ( -- Вибираємо зображення з мінімальним ID для кожного завдання
                SELECT MIN(id) 
                FROM task_images 
                GROUP BY task_id
            )
        ) ti ON ti.task_id = tasks.id -- Приєднуємо таблицю зображень до таблиці завдань    
    `;
  db.query(q, (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

app.get("/tasks/:id", (req, res) => {
  const taskId = req.params.id;
  const q = `
        SELECT 
            tasks.*,  
            task_statuses.status_name AS status_name,
            task_priorities.priority_name AS priority_name,
            projects.title AS project_title 
        FROM 
            tasks 
        JOIN 
            task_statuses ON tasks.status_id = task_statuses.id
        JOIN 
            task_priorities ON tasks.priority_id = task_priorities.id
        JOIN 
            projects ON tasks.project_id = projects.id
        WHERE tasks.id = ?
    `;
  db.query(q, [taskId], (err, data) => {
    if (err) return res.json(err);
    if (data.length === 0)
      return res.status(404).json({ message: "Task not found" });
    return res.json(data[0]);
  });
});

app.get("/task_statuses", (req, res) => {
  const q = "SELECT * FROM task_statuses";
  db.query(q, (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

app.get("/task_priorities", (req, res) => {
  const q = "SELECT * FROM task_priorities";
  db.query(q, (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

app.post("/tasks", (req, res) => {
  const q =
    "INSERT INTO tasks (`project_id`, `title`, `description`, `start_date`, `end_date`, `actual_end_date`, `priority_id`, `status_id`) VALUES (?)";

  const values = [
    req.body.project_id,
    req.body.title,
    req.body.description,
    req.body.start_date,
    req.body.end_date,
    req.body.actual_end_date,
    req.body.priority_id,
    req.body.status_id,
  ];
  db.query(q, [values], (err, data) => {
    if (err) return res.json(err);
    // Повертаємо ID нового завдання
    return res.json({ insertId: data.insertId });
  });
});

app.delete("/tasks/:id", (req, res) => {
  const taskId = req.params.id;
  const q = "DELETE FROM tasks WHERE id = ?";

  db.query(q, [taskId], (err, data) => {
    if (err) return res.json(err);
    return res.json("Task has been deleted");
  });
});

app.put("/tasks/:id", (req, res) => {
  const taskId = req.params.id;
  const q =
    "UPDATE tasks SET `project_id` = ?, `title` = ?, `description`=?, `start_date`=?, `end_date`=?, `actual_end_date`=?,`priority_id`=?, `status_id`=?, `rating`=? WHERE id =?";

  const values = [
    req.body.project_id,
    req.body.title,
    req.body.description,
    req.body.start_date,
    req.body.end_date,
    req.body.actual_end_date,
    req.body.priority_id,
    req.body.status_id,
    req.body.rating,
  ];

  db.query(q, [...values, taskId], (err, data) => {
    if (err) return res.json(err);
    return res.json("Task has been update");
  });
});

app.get("/task_images", (req, res) => {
  const q = "SELECT * FROM task_images";
  db.query(q, (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

app.delete("/task_images/:id", (req, res) => {
  const imagesId = req.params.id;
  const q = "DELETE FROM task_images WHERE id = ?";

  db.query(q, [imagesId], (err, data) => {
    if (err) return res.json(err);
    return res.json("images has been deleted");
  });
});

//--------------- !!! task upload images !!! ------------------//

app.post("/upload_task", (req, res) => {
  if (!req.files || !req.files.files) {
    return res.status(400).json({ msg: "No files uploaded" });
  }

  const files = Array.isArray(req.files.files)
    ? req.files.files
    : [req.files.files];
  const { task_id } = req.body;

  let uploadedFiles = [];

  files.forEach((file, index) => {
    const newFileName = encodeURI(Date.now() + `-${index}-` + file.name);
    const filePath = `/images/${newFileName}`;

    file.mv(`${__dirname}/../client/public/images/${newFileName}`, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send(err);
      }

      // SQL-запит для додавання URL зображення в таблицю project_images
      const q = "INSERT INTO task_images (task_id, url) VALUES (?, ?)";
      db.query(q, [task_id, filePath], (err, data) => {
        if (err) {
          console.error("DB Error: ", err);
          return res
            .status(500)
            .json({ msg: "Failed to insert image into database" });
        }

        uploadedFiles.push({ fileName: file.name, filePath });

        if (uploadedFiles.length === files.length) {
          // Повертаємо відповідь після завантаження всіх файлів
          res.json({ uploadedFiles });
        }
      });
    });
  });
});

// ----------------------  USERS    --------------------------

app.post("/upload_user", (req, res) => {
  console.log("Request files:", req.files);

  if (!req.files || !req.files.files) {
    return res.status(400).json({ msg: "No files uploaded" });
  }

  const file = req.files.files;
  console.log("Uploaded file:", file);

  const uniqueFileName = `${Date.now()}-${file.name}`; // Унікальне ім'я
  const uploadDir = path.join(__dirname, "../client/public/images/");
  const filePath = path.join(uploadDir, uniqueFileName);

  file.mv(filePath, (err) => {
    if (err) {
      console.error("File move error:", err);
      return res.status(500).json({ msg: "Failed to move file" });
    }

    // Оновлення бази даних з правильним іменем
    const q = "UPDATE users SET img = ? WHERE id = ?";
    db.query(q, [`/images/${uniqueFileName}`, req.body.userId], (err, data) => {
      if (err) {
        console.error("DB Error: ", err);
        return res
          .status(500)
          .json({ msg: "Failed to update image in the database" });
      }

      res.json({
        msg: "Image uploaded successfully",
        url: `/images/${uniqueFileName}`, // Правильний шлях
      });
    });
  });
});

// ----------- kanban for users -------------
app.get("/kanban/:userId", (req, res) => {
  const userId = req.params.userId;
  const q = "SELECT * FROM user_kanbans WHERE user_id = ?";
  db.query(q, [userId], (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

app.delete("/kanban/:id", (req, res) => {
  const taskId = req.params.id;
  const q = "DELETE FROM user_kanbans  WHERE id = ?";

  db.query(q, [taskId], (err, data) => {
    if (err) return res.json(err);
    return res.json("task has been deleted");
  });
});

app.post("/kanban", (req, res) => {
  try {
    const q =
      "INSERT INTO user_kanbans (`user_id`, `task_description`) VALUES(?)";
    const values = [req.body.user_id, req.body.task_description];
    db.query(q, [values], (err, data) => {
      res.json("Task created");
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

app.put("/kanban/:id", (req, res) => {
  const taskId = req.params.id;
  const newStatus = req.body.status;
  const q = "UPDATE user_kanbans SET status = ? WHERE id = ?";

  db.query(q, [newStatus, taskId], (err, data) => {
    if (err) return res.status(500).json(err);
    return res.json("Task status updated successfully");
  });
});

app.delete("/delkanban/:userId", (req, res) => {
  const userId = req.params.userId; // Виправлено на userId
  const q = "DELETE FROM user_kanbans WHERE user_id = ?";

  db.query(q, [userId], (err, data) => {
    if (err) return res.json(err);
    return res.json("User kanban has been deleted");
  });
});

// ----------- END kanban for users -------------

app.get("/users", (req, res) => {
  const q = `
        SELECT 
            users.*,
            roles.name AS role_name,
            jobs.name AS job_name
        FROM 
            users 
        JOIN 
            roles ON users.role_id = roles.id
        JOIN 
            jobs ON users.job_id = jobs.id
    `;
  db.query(q, (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

app.get("/users/:id", (req, res) => {
  const userId = req.params.id;
  const q = `
        SELECT 
            users.*,  
            roles.name AS role_name,
            jobs.name AS job_name 
        FROM 
            users 
        JOIN 
            roles ON users.role_id = roles.id
        JOIN 
            jobs ON users.job_id = jobs.id
        WHERE users.id = ?
    `;
  db.query(q, [userId], (err, data) => {
    if (err) return res.json(err);
    if (data.length === 0)
      return res.status(404).json({ message: "User not found" });
    return res.json(data[0]);
  });
});

app.get("/roles", (req, res) => {
  const q = "SELECT * FROM roles";
  db.query(q, (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

app.get("/jobs", (req, res) => {
  const q = "SELECT * FROM jobs";
  db.query(q, (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

app.put("/users/:id", (req, res) => {
  const userId = req.params.id;

  // Якщо в запиті пароль, то хешуємо його
  let hashedPassword = req.body.password;
  if (req.body.password) {
    const salt = bcrypt.genSaltSync(10);
    hashedPassword = bcrypt.hashSync(req.body.password, salt);
  }

  const q =
    "UPDATE users SET `email` = ?,  `name` = ?,  `password`=?, `phone`=?,`img`=?,`descr`=?, `role_id`=?, `job_id`=? WHERE id =?";

  const values = [
    req.body.email,
    req.body.name,
    hashedPassword,
    req.body.phone,
    req.body.img,
    req.body.descr,
    req.body.role_id,
    req.body.job_id,
  ];

  db.query(q, [...values, userId], (err, data) => {
    if (err) return res.json(err);
    return res.json("User has been updated");
  });
});

app.get("/userdetails/:id", (req, res) => {
  const userId = req.params.id;
  const q = `
         SELECT 
            users.id AS user_id,
            users.name AS user_name,
            tasks.title AS task_title,
            tasks.start_date,
            tasks.end_date,
            tasks.actual_end_date,
            assignments.assigned_date,
            task_priorities.id AS task_priorities_id,
            tasks.rating AS task_rating
        FROM 
            users
        JOIN 
            assignments ON users.id = assignments.user_id
        JOIN 
            tasks ON assignments.task_id = tasks.id
        JOIN 
            task_priorities ON task_priorities.id = tasks.priority_id
        WHERE 
            users.id = ?
    `;
  db.query(q, [userId], (err, data) => {
    if (err) return res.json(err);
    if (data.length === 0)
      return res.status(404).json({ message: "No tasks found for this user" });
    return res.json(data);
  });
});

app.delete("/users/:id", (req, res) => {
  const userId = req.params.id;
  const q = "DELETE FROM users WHERE id = ?";

  db.query(q, [userId], (err, data) => {
    if (err) return res.json(err);
    return res.json("User has been deleted");
  });
});

//+++++++++++++++++++++ authenticateToken ++++++++++++++++++++++++++
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  // console.log("Authorization Header:", authHeader);
  // console.log("Extracted Token:", token);

  if (!token) {
    // console.log("Токен відсутній");
    return res.sendStatus(401); // Якщо токен відсутній
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log("Недійсний токен:", err.message);
      return res.sendStatus(403); // Якщо токен недійсний
    }

    req.user = user; // Зберігаємо інформацію про користувача в запиті
    next(); // Переходимо до наступного middleware або обробника маршруту
  });
};

// ++++++++++++++++++ app.post Додавання юзера , Регістрація ++++++++++++++++++

app.post("/users", (req, res) => {
  const q =
    "INSERT INTO users (`email`,`password`, `name`, `phone`, `img`, `descr`, `role_id`, `job_id`) VALUES (?)";
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(req.body.password, salt);
  const values = [
    req.body.email,
    hashedPassword,
    req.body.name,
    req.body.phone,
    req.body.img,
    req.body.descr,
    req.body.role_id,
    req.body.job_id,
  ];
  db.query(q, [values], (err, data) => {
    if (err) return res.json(err);
    return res.json({ insertId: data.insertId });
  });
});

//+++++++++  login  ++++++

app.post("/login", (req, res) => {
  const q = `
    SELECT 
      users.*,  
      roles.name AS role_name 
    FROM 
      users 
    JOIN 
      roles ON users.role_id = roles.id
    WHERE 
      email = ?
  `;

  db.query(q, [req.body.email], (err, data) => {
    if (err) return res.json(err);
    if (data.length === 0)
      return res.status(404).json({ message: "Користувача не знайдено!" });

    const isPasswordCorrect = bcrypt.compareSync(
      req.body.password,
      data[0].password
    );

    if (!isPasswordCorrect)
      return res.status(400).json({ message: "Неправильний пароль!" });

    // Створення JWT токену з role_name
    const token = jwt.sign(
      { id: data[0].id, email: data[0].email, role_name: data[0].role_name }, // Додаємо role_name
      process.env.JWT_SECRET, // Секретний ключ для підписання токенів
      { expiresIn: "1d" } // Термін дії токену
    );

    return res.json({ token });
  });
});

//+++++++++++    Маршрут для аутентифікації      ++++++++++++++++++++
app.get("/me", authenticateToken, (req, res) => {
  // console.log("Запит на маршрут /me");
  // console.log("Інформація про користувача з токену:", req.user);

  const userId = req.user.id;
  // console.log("ID користувача для SQL-запиту:", userId);
  const q = `
        SELECT 
            users.*,  
            roles.name AS role_name 
        FROM 
            users 
        JOIN 
            roles ON users.role_id = roles.id
        WHERE users.id = ?
    `;
  db.query(q, [userId], (err, data) => {
    if (err) {
      console.log("Помилка SQL-запиту:", err);
      return res.status(500).json({ message: "Помилка запиту до бази даних" });
    }
    // console.log("Результат SQL-запиту:", data);
    if (data.length === 0) {
      console.log("Користувача не знайдено в базі даних для ID:", userId);
      return res.status(404).json({ message: "User not found" });
    }
    return res.json(data[0]);
  });
});

// Маршрут для перевірки унікальності  Register page

app.post("/check-unique", register);

//------------------------   ASSIGNMENTS  ---------------------------

app.get("/assignments", (req, res) => {
  const q = `
        SELECT 
            assignments.*,
            users.name AS user_name,
            tasks.title AS task_title 
        FROM 
            assignments 
        JOIN 
            users ON assignments.user_id = users.id
        JOIN 
            tasks ON assignments.task_id = tasks.id
    `;
  db.query(q, (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

app.get("/assignments/:id", (req, res) => {
  const assignmentId = req.params.id;
  const q = `
        SELECT 
            assignments.*,  
            users.name AS user_name,
             tasks.title AS task_title 
        FROM 
            assignments 
        JOIN 
            users ON assignments.user_id = users.id
        JOIN 
            tasks ON assignments.task_id = tasks.id
        WHERE assignments.id = ?
    `;
  db.query(q, [assignmentId], (err, data) => {
    if (err) return res.json(err);
    if (data.length === 0)
      return res.status(404).json({ message: "Assignments not found" });
    return res.json(data[0]);
  });
});

app.post("/assignments", (req, res) => {
  const q =
    "INSERT INTO assignments (`task_id`, `user_id`, `assigned_date`) VALUES (?)";

  const values = [req.body.task_id, req.body.user_id, req.body.assigned_date];
  db.query(q, [values], (err, data) => {
    if (err) return res.json(err);

    // ----   Пошук користувача для отримання його email ---
    const userId = req.body.user_id;
    const userQuery = "SELECT email FROM users WHERE id = ?";
    db.query(userQuery, [userId], (err, userData) => {
      if (err) return res.json(err);
      if (userData.length === 0)
        return res.status(404).json({ message: "User not found" });

      const userEmail = userData[0].email;

      //------>    Відправка email  <--------
      const mailOptions = {
        from: "kupchynskyi_o_o@students.pstu.edu",
        to: userEmail,
        subject: "Нове призначення завдання",
        text: `Вам було призначено нове завдання з ID ${req.body.task_id} на дату ${req.body.assigned_date}.`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          return console.log(error);
        }
        console.log("Email sent: " + info.response);
      });

      return res.json("Assignments has been created and email sent");
    });
  });
});

app.delete("/assignments/:id", (req, res) => {
  const assignmentId = req.params.id;
  const q = "DELETE FROM assignments WHERE id = ?";

  db.query(q, [assignmentId], (err, data) => {
    if (err) return res.json(err);
    return res.json("Assignments has been deleted");
  });
});

app.put("/assignments/:id", (req, res) => {
  const assignmentId = req.params.id;
  const q =
    "UPDATE assignments SET `task_id` = ?, `user_id` = ?, `assigned_date`=? WHERE id =?";

  const values = [req.body.task_id, req.body.user_id, req.body.assigned_date];

  db.query(q, [...values, assignmentId], (err, data) => {
    if (err) return res.json(err);
    return res.json("Assignments has been update");
  });
});

//-------------------------------   dashboard   ------------------------------

app.get("/dashboard", (req, res) => {
  const q = `
        SELECT 
            tasks.title AS task_title,
            projects.title AS project_title,
            users.name AS user_name,
            assignments.assigned_date,
            tasks.start_date,
            tasks.end_date,
            task_statuses.status_name AS task_status,
            project_statuses.status_name AS project_status,
            users.id AS user_id
        FROM 
            assignments
        JOIN 
            tasks ON assignments.task_id = tasks.id
        JOIN 
            projects ON tasks.project_id = projects.id
        JOIN 
            users ON assignments.user_id = users.id
        JOIN 
            task_statuses ON tasks.status_id = task_statuses.id
        JOIN 
            project_statuses ON projects.status_id = project_statuses.id
    `;
  db.query(q, (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

//-------------------------------    news    ------------------------

app.get("/news", (req, res) => {
  const q = `
    SELECT 
      news.*,
      users.id AS user_id,
      roles.name AS role_name

    FROM
      news
    JOIN
      users ON news.user_id = users.id
    JOIN
      roles ON users.role_id = roles.id

    `;
  db.query(q, (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

app.post("/news", (req, res) => {
 
    const q = "INSERT INTO news (`user_id`, `news_text`) VALUES(?)";
    const values = [req.body.user_id, req.body.news_text];


    
    db.query(q, [values], async (err, data) => {
      if (err) {
        console.error(" Error inserting post:", err);
        return res.status(500).json({ error: "Database error" });
      }
  
      const insertedNewsId = data.insertId;
  
      // Отримаємо всіх користувачів крім адміна
      db.query("SELECT id, name FROM users WHERE id != 1", async (err, users) => {
        if (err) {
          console.error(" Error fetching users:", err);
          return res.status(500).json({ error: "Error fetching users" });
        }
  
        // Отримаємо автора поста для імені в повідомленні
        db.query(
          "SELECT name FROM users WHERE id = ?",
          [req.body.user_id],
          async (err, result) => {
            if (err || result.length === 0) {
              console.error(" Error fetching author name:", err);
              return res.status(500).json({ error: "Author not found" });
            }
  
            const authorName = result[0].name;
  
            try {
              // Обрізаємо повідомлення
              const rawMessage = `Від <b>${authorName}</b> нова новина: <i>"${
                req.body.news_text}</i>"`;
              const shortMessage =
                rawMessage.length > 200
                  ? rawMessage.slice(0, 197) + "..."
                  : rawMessage;
  
              const notifications = users.map((user) => ({
                userId: 1, // адмін
                receiverId: user.id,
                userName: "news", // тип
                chatId: `1_${user.id}`,
                message: shortMessage, // обрізане повідомлення
                entityId: insertedNewsId,
                timestamp: new Date(),
                replyTo: null,
                edited: false,
                attachments: [],
                isRead: false,
              }));
  
              await Message.insertMany(notifications);
  
              // Надсилаємо через сокет кожному користувачу
              notifications.forEach((notif) => {
                io.to(notif.receiverId).emit("notification", notif);
              });
  
              console.log(
                " Notifications inserted for all users (excluding admin)",
                notifications
              );
              return res.status(201).json({ insertId: insertedNewsId });
            } catch (e) {
              console.error(" Error inserting notifications:", e);
              return res.status(500).json({ error: "Notification insert error" });
            }
          }
        );
      });
    });
});

app.delete("/news/:id", async (req, res) => {
  const newsId = req.params.id;

  try {
    // 1. Видаляємо Повідомлення з MongoDB

    await Message.deleteMany({ userName: "news", entityId: Number(newsId) });
    console.log("Повідомлення видалено");

    // 2. Видаляємо пост з MySQL
    const query = "DELETE FROM news WHERE id = ?";
    db.query(query, [newsId], (err, result) => {
      if (err) {
        console.error("Помилка при видаленні news з MySQL:", err);
        return res
          .status(500)
          .json({ error: "Error deleting news from MySQL" });
      }

      // Повертаємо успішну відповідь
      res.json({ message: "News and message have been deleted successfully" });
    });
  } catch (err) {
    console.error("Помилка при видаленні message або news:", err);
    return res
      .status(500)
      .json({ error: "Error deleting likes from MongoDB or news from MySQL" });
  }
});

//-------------------------------    social    ------------------------

//-------------------------------    posts    ------------------------

app.get("/posts", (req, res) => {
  const q = `
    SELECT posts.*, users.name, users.email, users.img AS user_img
    FROM posts
    INNER JOIN users ON posts.user_id = users.id
  `;

  db.query(q, (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

app.post("/posts", (req, res) => {
  const q =
    "INSERT INTO posts (`description`, `img`, `user_id`, `created_time`) VALUES (?, ?, ?, NOW())";

  const values = [
    req.body.description || "",
    req.body.img || "",
    req.body.user_id,
  ];

  db.query(q, values, async (err, data) => {
    if (err) {
      console.error(" Error inserting post:", err);
      return res.status(500).json({ error: "Database error" });
    }

    const insertedPostId = data.insertId;

    // Отримаємо всіх користувачів крім адміна
    db.query("SELECT id, name FROM users WHERE id != 1", async (err, users) => {
      if (err) {
        console.error(" Error fetching users:", err);
        return res.status(500).json({ error: "Error fetching users" });
      }

      // Отримаємо автора поста для імені в повідомленні
      db.query(
        "SELECT name FROM users WHERE id = ?",
        [req.body.user_id],
        async (err, result) => {
          if (err || result.length === 0) {
            console.error(" Error fetching author name:", err);
            return res.status(500).json({ error: "Author not found" });
          }

          const authorName = result[0].name;

          try {
            // Обрізаємо повідомлення
            const rawMessage = `Від <b>${authorName}</b> в соцмережі новий <b>пост</b>: <i>"${
              req.body.description || "Без опису"
            }</i>"`;
            const shortMessage =
              rawMessage.length > 200
                ? rawMessage.slice(0, 197) + "..."
                : rawMessage;

            const notifications = users.map((user) => ({
              userId: 1, // адмін
              receiverId: user.id,
              userName: "post", // тип
              chatId: `1_${user.id}`,
              message: shortMessage, // обрізане повідомлення
              entityId: insertedPostId,
              timestamp: new Date(),
              replyTo: null,
              edited: false,
              attachments: [],
              isRead: false,
            }));

            await Message.insertMany(notifications);

            // Надсилаємо через сокет кожному користувачу
            notifications.forEach((notif) => {
              io.to(notif.receiverId).emit("notification", notif);
            });

            console.log(
              " Notifications inserted for all users (excluding admin)",
              notifications
            );
            return res.status(201).json({ insertId: insertedPostId });
          } catch (e) {
            console.error(" Error inserting notifications:", e);
            return res.status(500).json({ error: "Notification insert error" });
          }
        }
      );
    });
  });
});

app.post("/upload_post", (req, res) => {
  console.log("Request files:", req.files);

  if (!req.files || !req.files.files) {
    return res.status(400).json({ msg: "No files uploaded" });
  }

  const file = req.files.files;
  console.log("Uploaded file:", file);

  const uniqueFileName = `${Date.now()}-${file.name}`; // Унікальне ім'я
  const uploadDir = path.join(__dirname, "../client/public/images/");
  const filePath = path.join(uploadDir, uniqueFileName);

  file.mv(filePath, (err) => {
    if (err) {
      console.error("File move error:", err);
      return res.status(500).json({ msg: "Failed to move file" });
    }

    // Оновлення бази даних з правильним іменем
    const q = "UPDATE posts SET img = ? WHERE id = ?";
    db.query(q, [`/images/${uniqueFileName}`, req.body.postId], (err, data) => {
      if (err) {
        console.error("DB Error: ", err);
        return res
          .status(500)
          .json({ msg: "Failed to update image in the database" });
      }

      res.json({
        msg: "Image uploaded successfully",
        url: `/images/${uniqueFileName}`, // Правильний шлях
      });
    });
  });
});

app.put("/posts/:id", (req, res) => {
  const postId = req.params.id;
  const q = "UPDATE posts SET `description` = ?, `img`=? WHERE id =?";

  const values = [req.body.description, req.body.img];

  db.query(q, [...values, postId], (err, data) => {
    if (err) return res.json(err);
    return res.json("Post has been update");
  });
});

app.delete("/posts/:id", async (req, res) => {
  const postId = Number(req.params.id);

  try {
    // 1. Видаляємо лайки до поста з MongoDB
    await Like.deleteMany({ entityId: postId, type: "post" });
    await Message.deleteMany({ userName: "post", entityId: postId });
    console.log("Лайки та повідомлення до поста видалено");

    // 2. Отримуємо всі коментарі до поста з MySQL
    const commentQuery = "SELECT id FROM comments WHERE post_id = ?";
    db.query(commentQuery, [postId], async (err, comments) => {
      if (err) {
        console.error("Помилка при отриманні коментарів:", err);
        return res.status(500).json({ error: "Error fetching comments" });
      }

      const commentIds = comments.map((c) => c.id);

      if (commentIds.length > 0) {
        // 3. Видаляємо лайки та повідомлення до коментарів у MongoDB
        await Like.deleteMany({ entityId: { $in: commentIds }, type: "comment" });
        await Message.deleteMany({ userName: "comment", entityId: { $in: commentIds } });
        console.log("Лайки та повідомлення до коментарів видалено");

        // 4. Видаляємо коментарі з MySQL
        const deleteCommentsQuery = "DELETE FROM comments WHERE post_id = ?";
        db.query(deleteCommentsQuery, [postId], (err) => {
          if (err) {
            console.error("Помилка при видаленні коментарів:", err);
            return res.status(500).json({ error: "Error deleting comments" });
          }
        });
      }

      // 5. Видаляємо пост з MySQL
      const deletePostQuery = "DELETE FROM posts WHERE id = ?";
      db.query(deletePostQuery, [postId], (err) => {
        if (err) {
          console.error("Помилка при видаленні поста:", err);
          return res.status(500).json({ error: "Error deleting post" });
        }

        res.json({ message: "Пост, коментарі, лайки і повідомлення видалені успішно" });
      });
    });
  } catch (err) {
    console.error("Загальна помилка при видаленні:", err);
    return res.status(500).json({ error: "Server error during deletion" });
  }
});


// ---------------------------- Comments ---------------------------------

app.get("/comments", (req, res) => {
  const { postId } = req.query;

  if (!postId) {
    return res.status(400).json({ error: "postId is required" });
  }

  const q = `
    SELECT comments.*, users.name, users.email, users.img AS user_img
    FROM comments
    INNER JOIN users ON comments.user_id = users.id
    WHERE comments.post_id = ?
  `;

  db.query(q, [postId], (err, data) => {
    if (err) return res.status(500).json({ error: "Database error" });
    return res.json(data);
  });
});

app.post("/comments", (req, res) => {
  const { description, post_id, user_id } = req.body;

  if (!description || !post_id || !user_id) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const q = `
    INSERT INTO comments (description, post_id, user_id, created_time) 
    VALUES (?, ?, ?, NOW())
  `;

  const values = [description, post_id, user_id];

  db.query(q, values, (err, data) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    const insertedCommentId = data.insertId;

    // Отримаємо всіх користувачів крім адміна
    db.query("SELECT id, name FROM users WHERE id != 1", async (err, users) => {
      if (err) {
        console.error("Error fetching users:", err);
        return res.status(500).json({ error: "Error fetching users" });
      }

      // Отримаємо автора коментаря
      db.query(
        "SELECT name FROM users WHERE id = ?",
        [user_id],
        (err, resultUser) => {
          if (err || resultUser.length === 0) {
            console.error("Error fetching author name:", err);
            return res.status(500).json({ error: "Author not found" });
          }

          const authorName = resultUser[0].name;

          // Отримаємо опис поста
          db.query(
            "SELECT description FROM posts WHERE id = ?",
            [post_id],
            async (err, resultPost) => {
              if (err || resultPost.length === 0) {
                console.error("Error fetching post description:", err);
                return res
                  .status(500)
                  .json({ error: "Post description not found" });
              }

              const postDescription = resultPost[0].description;

              const shortPostDescription =
                postDescription.length > 100
                  ? postDescription.slice(0, 97) + "..."
                  : postDescription;

              const shortDescription =
                description.length > 100
                  ? description.slice(0, 97) + "..."
                  : description;

              try {
                // Створення повідомлення
                const rawMessage = `Від <b> ${authorName}</b> новий <b>коментар</b>:<br/> "<i>${shortDescription}</i>"<br/> <b>пост в соцмережі:</b><br/>"<i>${shortPostDescription}</i>"`;

                const notifications = users.map((user) => ({
                  userId: 1, // адмін
                  receiverId: user.id,
                  userName: "comment", // тип
                  chatId: `1_${user.id}`,
                  message: rawMessage,
                  entityId: insertedCommentId,
                  timestamp: new Date(),
                  replyTo: null,
                  edited: false,
                  attachments: [],
                  isRead: false,
                }));

                await Message.insertMany(notifications);

                // Надсилаємо через сокет кожному користувачу
                notifications.forEach((notif) => {
                  io.to(notif.receiverId).emit("notification", notif);
                });

                console.log(
                  "Notifications inserted for all users (excluding admin)",
                  notifications
                );
                return res.status(201).json({ insertId: insertedCommentId });
              } catch (e) {
                console.error("Error inserting notifications:", e);
                return res
                  .status(500)
                  .json({ error: "Notification insert error" });
              }
            }
          );
        }
      );
    });
  });
});

app.get("/comments/count", (req, res) => {
  const { postId } = req.query;

  if (!postId) {
    return res.status(400).json({ error: "postId is required" });
  }

  const q = `SELECT COUNT(*) AS count FROM comments WHERE post_id = ?`;

  db.query(q, [postId], (err, data) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    return res.json({ count: data[0].count });
  });
});

app.delete("/comments/:id", async (req, res) => {
  const commentId = Number(req.params.id);
  try {
    await Like.deleteMany({ entityId: commentId, type: "comment" });
    console.log("Лайки видалено");

    await Message.deleteMany({ userName: "comment", entityId: commentId });
    console.log("Повідомлення видалено");

    const q = "DELETE FROM comments WHERE id = ?";
    db.query(q, [commentId], (err, data) => {
      if (err) {
        console.error("Помилка при видаленні comment з MySQL:", err);
        return res
          .status(500)
          .json({ error: "Error deleting comment from MySQL" });
      }

      res.json({ message: "comment and likes have been deleted successfully" });
    });
  } catch (err) {
    console.error("Помилка при видаленні лайків або comment:", err);
    return res.status(500).json({
      error: "Error deleting likes from MongoDB or comment from MySQL",
    });
  }
});

// ---------------------------------  STORIES ----------------------------

app.get("/stories", (req, res) => {
  const q = `
    SELECT stories.*, users.name, users.email, users.img AS user_img
    FROM stories
    INNER JOIN users ON stories.user_id = users.id
  `;

  db.query(q, (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

app.post("/stories", (req, res) => {
  const q =
    "INSERT INTO stories (`description`, `video`, `user_id`, `created_at`, `expires_at`) VALUES (?, ?, ?, NOW(), ?)";

  const values = [
    req.body.description || "",
    req.body.video || "",
    req.body.user_id,
    req.body.expires_at,// сюди передаєм дату з фронта

  ];

  db.query(q, values, async (err, data) => {
    if (err) {
      console.error(" Error inserting story:", err);
      return res.status(500).json({ error: "Database error" });
    }

    const insertedStoryId = data.insertId;

    // Отримаємо всіх користувачів крім адміна
    db.query("SELECT id, name FROM users WHERE id != 1", async (err, users) => {
      if (err) {
        console.error(" Error fetching users:", err);
        return res.status(500).json({ error: "Error fetching users" });
      }

      // Отримаємо автора поста для імені в повідомленні
      db.query(
        "SELECT name FROM users WHERE id = ?",
        [req.body.user_id],
        async (err, result) => {
          if (err || result.length === 0) {
            console.error(" Error fetching author name:", err);
            return res.status(500).json({ error: "Author not found" });
          }

          const authorName = result[0].name;

          try {
            // Обрізаємо повідомлення
            const rawMessage = `Від <b>${authorName}</b> в соцмережі нова <b>Story</b>: <i>"${
              req.body.description || "Без опису"
            }</i>"`;
            const shortMessage =
              rawMessage.length > 200
                ? rawMessage.slice(0, 197) + "..."
                : rawMessage;

            const notifications = users.map((user) => ({
              userId: 1, // адмін
              receiverId: user.id,
              userName: "story", // тип
              chatId: `1_${user.id}`,
              message: shortMessage, // обрізане повідомлення
              entityId: insertedStoryId,
              timestamp: new Date(),
              replyTo: null,
              edited: false,
              attachments: [],
              isRead: false,
            }));

            await Message.insertMany(notifications);

            // Надсилаємо через сокет кожному користувачу
            notifications.forEach((notif) => {
              io.to(notif.receiverId).emit("notification", notif);
            });

            console.log(
              " Notifications inserted for all users (excluding admin)",
              notifications
            );
            return res.status(201).json({ insertId: insertedStoryId });
          } catch (e) {
            console.error(" Error inserting notifications:", e);
            return res.status(500).json({ error: "Notification insert error" });
          }
        }
      );
    });
  });
});

app.post("/upload_story", (req, res) => {
  console.log("Request files:", req.files);

  if (!req.files || !req.files.files) {
    return res.status(400).json({ msg: "No files uploaded" });
  }

  const file = req.files.files;
  console.log("Uploaded file:", file);

  const allowedTypes = [
    'video/mp4', 'video/webm', 'video/ogg',
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'
  ];
  
  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({ msg: "Unsupported file format" });
  }

  const uniqueFileName = `${Date.now()}-${file.name}`;
  const uploadDir = path.join(__dirname, "../client/public/uploads/stories");
  const filePath = path.join(uploadDir, uniqueFileName);

  // Створити папку, якщо її немає
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  file.mv(filePath, (err) => {
    if (err) {
      console.error("File move error:", err);
      return res.status(500).json({ msg: "Failed to move file" });
    }

    if (!req.body.storyId) {
      return res.status(400).json({ msg: "Missing story ID" });
    }

    const q = "UPDATE stories SET video = ? WHERE id = ?";
    db.query(q, [`/uploads/stories/${uniqueFileName}`, req.body.storyId], (err, data) => {
      if (err) {
        console.error("DB Error: ", err);
        return res.status(500).json({ msg: "Failed to update media in the database" });
      }

      res.json({
        msg: "Media uploaded successfully",
        url: `/uploads/stories/${uniqueFileName}`,
      });
    });
  });
});


// -------------------------  likes  -----------------------------------
const likeSchema = new mongoose.Schema({
  toUserId: Number, // автор посту/коментаря
  fromUserId: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ["post", "comment"],
    required: true,
  },
  entityId: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

likeSchema.index({ entityId: 1, type: 1 });
likeSchema.index({ fromUserId: 1, entityId: 1, type: 1 }, { unique: true });

const Like = mongoose.model("Like", likeSchema);

app.get("/api/likes", async (req, res) => {
  try {
    const likes = await Like.find();

    res.json(
      likes.map((like) => ({
        id: like._id,
        toUserId: like.toUserId,
        fromUserId: like.fromUserId,
        type: like.type,
        entityId: like.entityId,
        time: like.timestamp ? like.timestamp.toISOString() : "No time",
      }))
    );
  } catch (err) {
    console.error("Error fetching general messages:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/likes", async (req, res) => {
  try {
    const { toUserId, fromUserId, type, entityId } = req.body;

    const existing = await Like.findOne({ fromUserId, type, entityId });

    if (existing) {
      await existing.deleteOne();
      const count = await Like.countDocuments({ type, entityId });
      return res.status(200).json({ liked: false, count });
    } else {
      const newLike = new Like({ toUserId, fromUserId, type, entityId });
      await newLike.save();
      const count = await Like.countDocuments({ type, entityId });
      return res.status(201).json({ liked: true, count });
    }
  } catch (err) {
    console.error("Error handling like:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ------------------------- new general_messages wiht mongoDB  -----------------------------------

const generalMessageSchema = new mongoose.Schema({
  userId: Number,
  receiverId: Number,
  chatId: String,
  userName: String,
  message: String,
  replyTo: mongoose.Schema.Types.ObjectId,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const GeneralMessage = mongoose.model("GeneralMessage", generalMessageSchema);

app.get("/api/general-messages", async (req, res) => {
  try {
    const messages = await GeneralMessage.find().sort({ timestamp: 1 });

    const replyToIds = messages
      .filter((msg) => msg.replyTo !== null)
      .map((msg) => msg.replyTo);

    const existingReplies = await GeneralMessage.find(
      { _id: { $in: replyToIds } },
      "_id message"
    );

    const replyMap = existingReplies.reduce((acc, msg) => {
      acc[msg._id] = msg.message;
      return acc;
    }, {});

    res.json(
      messages.map((msg) => ({
        id: msg._id,
        chatId: msg.chatId,
        userName: msg.userName,
        userId: msg.userId,
        receiverId: msg.receiverId,
        message: msg.message,
        time: msg.timestamp ? msg.timestamp.toISOString() : "No time",
        replyTo: msg.replyTo
          ? replyMap[msg.replyTo]
            ? { id: msg.replyTo, message: replyMap[msg.replyTo] }
            : "Deleted"
          : null,
      }))
    );
  } catch (err) {
    console.error("Error fetching general messages:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.put("/api/general-messages/:id", async (req, res) => {
  try {
    const { message } = req.body;
    const updatedGeneralMessage = await GeneralMessage.findByIdAndUpdate(
      req.params.id,
      { message },
      { new: true }
    );
    if (updatedGeneralMessage) {
      io.emit("message_updated", updatedGeneralMessage);
      res.json({ message: "Message updated successfully" });
    } else {
      res.status(404).send("Message not found");
    }
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// Видалення повідомлення
app.delete("/api/general-messages/:id", async (req, res) => {
  try {
    const deletedGeneralMessage = await GeneralMessage.findByIdAndDelete(
      req.params.id
    );
    if (deletedGeneralMessage) {
      io.emit("message_deleted", req.params.id); // Розсилка оновлення через Socket.io
      res.json({ message: "Message deleted successfully" });
    } else {
      res.status(404).send("Message not found");
    }
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// -------------------------------  chat MongoBD  -----------------------------

const messageSchema = new mongoose.Schema({
  userId: Number,
  receiverId: Number,
  userName: String,
  entityId: Number,
  chatId: String,
  message: String,
  timestamp: Date,
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  edited: Boolean,
  attachments: [String],
  isRead: { type: Boolean, default: false },
});

const Message = mongoose.model("Message", messageSchema);

app.get("/api/messages", async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: 1 });

    // Отримуємо унікальні ObjectId з поля replyTo
    const replyToIds = messages
      .filter((msg) => msg.replyTo !== null) // Беремо тільки ті, які не null
      .map((msg) => msg.replyTo); // Витягуємо самі ID

    // Шукаємо ці ID в БД
    const existingReplies = await Message.find(
      { _id: { $in: replyToIds } },
      "_id message"
    );

    // Створюємо мапу існуючих ID
    const replyMap = existingReplies.reduce((acc, msg) => {
      acc[msg._id] = msg.message;
      return acc;
    }, {});

    // console.log("Fetched Messages:");
    // messages.forEach(msg => {
    //     if (msg.replyTo === null) {
    //         console.log(`Message ID: ${msg._id} | replyTo: NULL (не було відповіді)`);
    //     } else if (replyMap[msg.replyTo]) {
    //         console.log(`Message ID: ${msg._id} | replyTo ID: ${msg.replyTo} (ІСНУЄ в БД)`);
    //     } else {
    //         console.log(`Message ID: ${msg._id} | replyTo ID: ${msg.replyTo} (ВИДАЛЕНО!)`);
    //     }
    // });

    res.json(
      messages.map((msg) => ({
        id: msg._id,
        chatId: msg.chatId,
        entityId: msg.entityId,
        userName: msg.userName,
        userId: msg.userId,
        receiverId: msg.receiverId,
        message: msg.message,
        time: msg.timestamp ? msg.timestamp.toISOString() : "No time",
        replyTo: msg.replyTo
          ? replyMap[msg.replyTo]
            ? { id: msg.replyTo, message: replyMap[msg.replyTo] }
            : "Deleted"
          : null,
      }))
    );

    // console.log(messages)
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Додавання нового повідомлення
app.post("/api/messages", async (req, res) => {
  try {
    const { userId, receiverId, chatId, entityId, userName, message, replyTo } =
      req.body;

    const data = {
      userId,
      receiverId,
      chatId,
      entityId,
      userName,
      message,
      replyTo: replyTo || null,
      timestamp: new Date().toISOString(),
    };

    let newMessage;
    if (chatId === "general_chat") {
      newMessage = new GeneralMessage(data);
    } else {
      newMessage = new Message(data);
    }

    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (err) {
    console.error("Error saving message:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Редагування повідомлення
app.put("/api/messages/:id", async (req, res) => {
  try {
    const { message } = req.body;
    const updatedMessage = await Message.findByIdAndUpdate(
      req.params.id,
      { message },
      { new: true } // Отримати оновлене повідомлення
    );
    if (updatedMessage) {
      io.emit("message_updated", updatedMessage); // Розсилка оновлення через Socket.io
      res.json({ message: "Message updated successfully" });
    } else {
      res.status(404).send("Message not found");
    }
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// Видалення повідомлення
app.delete("/api/messages/:id", async (req, res) => {
  try {
    const deletedMessage = await Message.findByIdAndDelete(req.params.id);
    if (deletedMessage) {
      io.emit("message_deleted", req.params.id); // Розсилка оновлення через Socket.io
      res.json({ message: "Message deleted successfully" });
    } else {
      res.status(404).send("Message not found");
    }
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

//------------------------------- read status (сповіщення)  ------------------------
app.put("/api/messages/read/:chatId/:userId", async (req, res) => {
  try {
    await Message.updateMany(
      {
        chatId: req.params.chatId,
        userId: { $ne: req.params.userId },
        isRead: false,
      },
      { $set: { isRead: true } }
    );
    res.sendStatus(200);
  } catch (err) {
    console.error("Error updating read status:", err);
    res.sendStatus(500);
  }
});

app.get("/api/messages/unread/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const count = await Message.countDocuments({
      receiverId: userId,
      isRead: false,
    });

    res.json({ count });
  } catch (error) {
    console.error("Error counting unread messages:", error);
    res.status(500).json({ error: "Server error" });
  }
});

//
app.get("/api/messages/unread-by-chat/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log("Getting unread counts for user:", userId);

    const unreadCounts = await Message.aggregate([
      { $match: { receiverId: parseInt(userId), isRead: false } },
      { $group: { _id: "$chatId", count: { $sum: 1 } } },
    ]);

    console.log("Unread counts for user:", unreadCounts);

    // Завжди повертай 200 — навіть якщо порожньо
    res.status(200).json(unreadCounts);
  } catch (err) {
    console.error("Error fetching unread counts:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ----------------------  Messenger -----------------------------

// ---------------------------  Socket io  -------------------------

const server = http.createServer(app); // Створюємо сервер через http.createServer
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // URL  фронтенду
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
}); // Ініціалізуємо socket.io через server

// Налаштування обробки підключення клієнтів
io.on("connection", (socket) => {
  console.log("A user connected");

  // Додавання користувача до кімнати
  socket.on("joinRoom", (userId) => {
    socket.join(userId); // Користувач потрапляє в кімнату за його userId
    console.log(`User with ID: ${userId} joined room`);
  });

  socket.on("markMessagesAsRead", ({ chatId, userId }) => {
    console.log(`Messages in chat ${chatId} marked as read by user ${userId}`);

    // 🔔 Повідомляємо всіх, а не лише того, хто прочитав
    // io.emit("messagesRead", { chatId, userId });
  });
  // Обробка події 'message'
  // Backend (Socket.io - message event)

  socket.on("messagesRead", ({ chatId, userId, unreadCountInChat }) => {
    console.log(
      `User ${userId} has read messages in chat ${chatId}, unreadCountInChat: ${unreadCountInChat}`
    );

    // Надсилаємо назад клієнту
    io.to(userId).emit("messagesRead", { userId, unreadCountInChat });
  });

  socket.on("message", (msg) => {
    console.log("Message received: ", msg);

    const senderId = msg.userId;
    const targetUserId = msg.receiverId;

    console.log("Sending notification to user", targetUserId);

    io.to(targetUserId).emit("notification", {
      receiverId: msg.receiverId,
      userId: msg.userId,
      userName: msg.userName,
      chatId: msg.chatId,
      message: msg.message,
      timestamp: new Date(),
      isRead: false,
      replyTo: msg.replyTo,
      attachments: msg.attachments,
      _id: msg._id,
      __v: msg.__v,
      id: msg.id,
    });
    console.log("Message received!!!: ", msg);
    io.emit("message", msg);
  });
});

//----------------------- statistics STATISTICS ---------------------------

app.get("/api/communication-stats", async (req, res) => {
  try {
    // SQL-запит для об'єднання постів і коментарів
    const combinedQuery = `
      SELECT id, user_id, created_time AS timestamp, 'post' AS type FROM posts
      UNION ALL
      SELECT id, user_id, created_time AS timestamp, 'comment' AS type FROM comments
      ORDER BY timestamp;
    `;

    // Виконання SQL-запиту з використанням Promise
    const sqlResults = await new Promise((resolve, reject) => {
      db.query(combinedQuery, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    // Отримання повідомлень з MongoDB
    const messages = await Message.find({}, "_id userId timestamp").sort({
      timestamp: 1,
    });

    // Об'єднання результатів
    const stats = [
      ...sqlResults.map((row) => ({
        id: row.id,
        userId: row.user_id,
        timestamp: row.timestamp,
        type: row.type,
      })),
      ...messages.map((m) => ({
        id: m._id,
        userId: m.userId,
        timestamp: m.timestamp,
        type: "message",
      })),
    ];

    res.json(stats);
  } catch (err) {
    console.error("Error fetching communication stats:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ------------------------- search MySQL  -----------------------------------

app.get("/api/search", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json([]);

  const searchTerm = `%${q}%`;

  try {
    const users = await query(
      "SELECT id, name AS title, 'user' AS type FROM users WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?",
      [searchTerm, searchTerm, searchTerm]
    );
    
    const projects = await query(
      `SELECT id, title AS title, 'project' AS type
       FROM projects
       WHERE title LIKE ? OR description LIKE ?`,
      [searchTerm, searchTerm]
    );
    
    const tasks = await query(
      `SELECT id, title AS title, 'task' AS type
       FROM tasks
       WHERE title LIKE ? OR description LIKE ?`,
      [searchTerm, searchTerm]
    );
    
  
    

    const allResults = [...users, ...projects, ...tasks];
    res.json(allResults);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
});


app.post("/api/send-file", async (req, res) => {
  const { comment, from } = req.body;

  if (!req.files || !req.files.file) {
    return res.status(400).json({ message: "Файл не отримано" });
  }

  const file = req.files.file;

  try {
    await transporter.sendMail({
      from: `"${from}" <kupchynskyi_o_o@students.pstu.edu>`,
      to: "euromaster.dn.ua@gmail.com",
      subject: `Файл від користувача ${from}`,
      text: `Коментар: ${comment || "Без коментаря"}`,
      attachments: [
        {
          filename: file.name,     //  Назва файлу
          content: file.data,      //  Вміст з express-fileupload
        },
      ],
    });

    res.status(200).json({ message: "Email надіслано" });
  } catch (err) {
    console.error("Помилка при надсиланні:", err);
    res.status(500).json({ message: "Помилка при надсиланні" });
  }
});






server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  connectToMongoDB();
});
