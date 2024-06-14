//file index.js
const path = require('path');
const express = require('express');
const mysql = require('mysql');
const cors = require('cors');

const app = express();

const db = mysql.createPool({
    connectionLimit: 10,
    host: "sql7.freesqldatabase.com",
    user: "sql7713022",
    password: "WaJ6QsHYhb",
    database: "sql7713022"
});

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'build')));

app.get('/*', function (req, res) {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});


app.get("/", (req, res) => {
    res.json("hello");
});

app.get("/books", (req, res) => {
    const q = "SELECT * FROM books";
    db.query(q, (err, data) => {
        if (err) return res.json(err);
        return res.json(data);
    });
});

app.get("/users", (req, res) => {
    const q = "SELECT * FROM users";
    db.query(q, (err, data) => {
        if (err) return res.json(err);
        return res.json(data);
    });
});

app.post("/books", (req, res) => {
    const q = "INSERT INTO books (`title`, `descr`, `price`, `cover`) VALUES (?)";
    const values = [
        req.body.title,
        req.body.descr,
        req.body.price,
        req.body.cover
    ];
    db.query(q, [values], (err, data) => {
        if (err) return res.json(err);
        return res.json("Book has been created");
    });
});

app.delete("/books/:id", (req, res) => {
    const bookId = req.params.id;
    const q = "DELETE FROM books WHERE id = ?";
    db.query(q, [bookId], (err, data) => {
        if (err) return res.json(err);
        return res.json("Book has been deleted");
    });
});

app.put("/books/:id", (req, res) => {
    const bookId = req.params.id;
    const q = "UPDATE books SET `title` = ?, `descr` = ?, `price` = ?, `cover` = ? WHERE id = ?";
    const values = [
        req.body.title,
        req.body.descr,
        req.body.price,
        req.body.cover
    ];
    db.query(q, [...values, bookId], (err, data) => {
        if (err) return res.json(err);
        return res.json("Book has been updated");
    });
});


app.get("/data/:table", (req, res) => {
    const tableName = req.params.table;
    console.log(`Fetching data from table: ${tableName}`); // Логування імені таблиці
    const q = `SELECT * FROM ??`;
    db.query(q, [tableName], (err, data) => {
        if (err) {
            console.error(err); // Логування помилок
            return res.status(500).json(err); // Зміна статусу на 500 для внутрішніх помилок
        }
        console.log(data); // Логування отриманих даних
        return res.json(data);
    });
});



// Function to handle database disconnection and reconnection
const handleDisconnect = () => {
    db.getConnection((err, connection) => {
        if (err) {
            console.error('Error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect
        } else {
            if (connection) connection.release();
        }
    });

    db.on('error', (err) => {
        console.error('db error', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            handleDisconnect(); // Reconnect if connection is lost
        } else {
            throw err;
        }
    });
};

// Initialize the connection handling
handleDisconnect();

app.listen(3001, () => {
    console.log('Connected to backend!');
});
