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

    const q = "INSERT INTO projects (`title`, `description`, `start_date`, `end_date`, `status`) VALUES (?)"
    
    const values = [
        req.body.title,
        req.body.description,
        req.body.start_date,
        req.body.end_date,
        req.body.status,
       
    ]
    db.query(q, [values], (err, data)=>{
        if(err) return res.json(err);
            return res.json("Project has been created");
    });

});

app.delete("/projects/:id", (req, res)=>{
    const projectId = req.params.id;
    const q = "DELETE FROM projects WHERE id = ?"

    db.query(q, [projectId], (err, data)=>{
        if(err) return res.json(err);
            return res.json("Project has been deleted");
    });
})

app.put("/projects/:id", (req, res)=>{
    const projectId = req.params.id;
    const q = "UPDATE projects SET `title` = ?, `description`=?, `start_date`=?, `end_date`=?, `status`=? WHERE id =?"
    


    const values = [
        req.body.title,
        req.body.description,
        req.body.start_date,
        req.body.end_date,
        req.body.status,
    ]

    db.query(q, [...values, projectId], (err, data)=>{
        if(err) return res.json(err);
            return res.json("Projects has been update");
    });
})


app.listen(3001, ()=>{
    console.log('Connecte to backend!');

} )