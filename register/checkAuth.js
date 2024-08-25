import { db } from "../connect/connect.js";
export const register = (req, res) => {
    const { name, email } = req.body;
  
    // Перевірка наявності користувача з таким `name`
    const nameQuery = "SELECT COUNT(*) AS count FROM users WHERE name = ?";
    db.query(nameQuery, [name], (err, nameResult) => {
      if (err) return res.status(500).json({ message: "Database error", error: err });
  
      const nameExists = nameResult[0].count > 0;
  
      // Перевірка наявності користувача з такою `email`
      const emailQuery = "SELECT COUNT(*) AS count FROM users WHERE email = ?";
      db.query(emailQuery, [email], (err, emailResult) => {
        if (err) return res.status(500).json({ message: "Database error", error: err });
  
        const emailExists = emailResult[0].count > 0;
  
        // Повернення результатів перевірки
        res.json({
          nameExists: nameExists,
          emailExists: emailExists,
        });
      });
    });
  }