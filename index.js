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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ----------    Завантаження змінних середовища  ----------
dotenv.config();

const app = express();
app.use(
  fileUpload({
    createParentPath: true,
  })
);

app.use(express.json());
app.use(cors());

//---------------------- DB Connection   -----------------------------------

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "project_management",
});

// app.use(
//   fileUpload({
//     createParentPath: true,
//   })
// );

app.get("/", (req, res) => {
  res.json("hello");
});

// --------------   Налаштування Nodemailer   -----------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAILPASSWORD,
  },
});

// --------------------       PROJECTS    -------------------------------------

app.get("/proj", (req, res) => {
  const q = "SELECT * FROM projects";
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
    "INSERT INTO projects (`title`, `description`, `start_date`, `end_date`, `status_id`) VALUES (?)";

  const values = [
    req.body.title,
    req.body.description,
    req.body.start_date,
    req.body.end_date,
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
    "UPDATE projects SET `title` = ?, `description`=?, `start_date`=?, `end_date`=?, `status_id`=? WHERE id =?";

  const values = [
    req.body.title,
    req.body.description,
    req.body.start_date,
    req.body.end_date,
    req.body.status_id,
  ];

  db.query(q, [...values, projectId], (err, data) => {
    if (err) return res.json(err);
    return res.json("Projects has been update");
  });
});

//--------------- !!! upload images !!! ------------------//

app.post("/upload", (req, res) => {
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
            task_priorities.priority_name AS priority_name 
        FROM 
            tasks 
        JOIN 
            task_statuses ON tasks.status_id = task_statuses.id
        JOIN 
            task_priorities ON tasks.priority_id = task_priorities.id
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
            task_priorities.priority_name AS priority_name
        FROM 
            tasks 
        JOIN 
            task_statuses ON tasks.status_id = task_statuses.id
        JOIN 
            task_priorities ON tasks.priority_id = task_priorities.id
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
    "INSERT INTO tasks (`project_id`, `title`, `description`, `start_date`, `end_date`, `priority_id`, `status_id`) VALUES (?)";

  const values = [
    req.body.project_id,
    req.body.title,
    req.body.description,
    req.body.start_date,
    req.body.end_date,
    req.body.priority_id,
    req.body.status_id,
  ];
  db.query(q, [values], (err, data) => {
    if (err) return res.json(err);
    return res.json("Task has been created");
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
    "UPDATE tasks SET `project_id` = ?, `title` = ?, `description`=?, `start_date`=?, `end_date`=?, `priority_id`=?, `status_id`=? WHERE id =?";

  const values = [
    req.body.project_id,
    req.body.title,
    req.body.description,
    req.body.start_date,
    req.body.end_date,
    req.body.priority_id,
    req.body.status_id,
  ];

  db.query(q, [...values, taskId], (err, data) => {
    if (err) return res.json(err);
    return res.json("Task has been update");
  });
});

// ----------------------  USERS   --------------------------

app.get("/users", (req, res) => {
  const q = `
        SELECT 
            users.*,
            roles.name AS role_name 
        FROM 
            users 
        JOIN 
            roles ON users.role_id = roles.id
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
            roles.name AS role_name 
        FROM 
            users 
        JOIN 
            roles ON users.role_id = roles.id
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

app.post("/users", (req, res) => {
  const q =
    "INSERT INTO users (`email`,`password`, `name`, `phone`, `img`, `descr`, `role_id`) VALUES (?)";
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
  ];
  db.query(q, [values], (err, data) => {
    if (err) return res.json(err);
    return res.json("User has been created");
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

app.put("/users/:id", (req, res) => {
  const userId = req.params.id;
  const q =
    "UPDATE users SET `email` = ?, `password` = ?, `name` = ?,  `phone`=?,`img`=?,`descr`=?, `role_id`=? WHERE id =?";

  const values = [
    req.body.email,
    req.body.password,
    req.body.name,
    req.body.phone,
    req.body.img,
    req.body.descr,
    req.body.role_id,
  ];

  db.query(q, [...values, userId], (err, data) => {
    if (err) return res.json(err);
    return res.json("User has been update");
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
            tasks.end_date
        FROM 
            users
        JOIN 
            assignments ON users.id = assignments.user_id
        JOIN 
            tasks ON assignments.task_id = tasks.id
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


// Маршрут для перевірки унікальності  Register page 
app.post("/check-unique", register);



//------------------------   ASSIGNMENTS  ---------------------------

app.get("/assignments", (req, res) => {
  const q = `
        SELECT 
            assignments.*,
            users.name AS user_name 
        FROM 
            assignments 
        JOIN 
            users ON assignments.user_id = users.id
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
            users.name AS user_name 
        FROM 
            assignments 
        JOIN 
            users ON assignments.user_id = users.id
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

//-------------------------------    userdetails     ------------------------

app.listen(3001, () => {
  console.log("Connected to backend!");
});
