import express from "express"
import mysql from "mysql"
import cors from "cors"




const app = express()

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database : "project_management"
})

app.use(express.json())
app.use(cors())

app.get("/", (req, res)=> {
    res.json("hello")
})


app.get("/projects", (req, res)=>{
    const q = "SELECT * FROM projects"
    db.query(q, (err, data)=>{
        if(err) return res.json(err)
            return res.json(data)
    })
})

app.post("/projects", (req, res)=>{

    const q = "INSERT INTO projects (`title`, `description`, `status`) VALUES (?)"
    
    const values = [
        req.body.title,
        req.body.description,
        req.body.status,
       
    ]
    db.query(q, [values], (err, data)=>{
        if(err) return res.json(err);
            return res.json("Project has been created");
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
    console.log('Connecte to backend!');

} )