import express from "express"
import mysql from "mysql"
import cors from "cors"

const app = express()

// connect to db

const db = mysql.createConnection({
    host: "sql7.freesqldatabase.com",
    user: "sql7713022",
    password: "WaJ6QsHYhb",
    database : "sql7713022"
})

app.use(express.json())
app.use(cors())

app.get("/", (req, res)=> {
    res.json("hello")
})


app.get("/books", (req, res)=>{
    const q = "SELECT * FROM books"
    db.query(q, (err, data)=>{
        if(err) return res.json(err)
            return res.json(data)
    })
})

app.post("/books", (req, res)=>{

    const q = "INSERT INTO books (`title`, `descr`, `price`, `cover`) VALUES (?)"
    
    const values = [
        req.body.title,
        req.body.descr,
        req.body.price,
        req.body.cover,
    ]
    db.query(q, [values], (err, data)=>{
        if(err) return res.json(err);
            return res.json("Book has been created");
    });

});

app.delete("/books/:id", (req, res)=>{
    const bookId = req.params.id;
    const q = "DELETE FROM books WHERE id = ?"

    db.query(q, [bookId], (err, data)=>{
        if(err) return res.json(err);
            return res.json("Book has been deleted");
    });
})

app.put("/books/:id", (req, res)=>{
    const bookId = req.params.id;
    const q = "UPDATE books SET `title` = ?, `descr`=?, `price`=?, `cover`=? WHERE id =?"
    


    const values = [
        req.body.title,
        req.body.descr,
        req.body.price,
        req.body.cover,
    ]

    db.query(q, [...values, bookId], (err, data)=>{
        if(err) return res.json(err);
            return res.json("Book has been update");
    });
})


app.listen(3001, ()=>{
    console.log('Connect to backend!');

} )