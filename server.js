
const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
require('dotenv').config();

const sqlConfig = {
    user: process.env.DB_USER,              // SQL Server login username
    password: process.env.DB_PASSWORD,          // SQL Server login password
    server: process.env.DB_SERVER,  // SQL Server name
    database: process.env.DB_NAME,          // Database name
    options: {
      encrypt: true,                    // Required for Azure SQL Database
      trustServerCertificate: false     // Change to true for local dev / self-signed certs
    }
};

app.get('/clubs', async (req, res) => {
    try {
        await sql.connect(sqlConfig);
        console.log("connected to pool");
        const response = await sql.query`SELECT TOP 100 * FROM CLUBS`;
        const formattedResult = response.recordset.map(row => ({
            name: row.ClubName,
            description: row.Description,
            link: row.Link,
            facebook: row.Facebook,
            linkedin: row.LinkedIn,
            instagram: row.Instagram,
            youtube: row.YouTube,
            website: row.ClubWebsite
        }));
        res.json(formattedResult);
        // console.log(formattedResult);
    }
    catch(err) {
        console.log("error in fetching club list");
        console.error(err);
    }
    finally {
        sql.close();
    }
});

app.get('/clubs/:title', async (req, res) => {
    try {
        const { title } = req.params;
        console.log("specific club data accessed: " + title);
        await sql.connect(sqlConfig);
        const result = await sql.query`SELECT * FROM CLUBS WHERE ClubName=${title}`;

        if(result.recordset.length === 0) {
            console.log(`Couldn't find club name: ${title}`);
            res.json({
                name: "none",
                description: "none",
                link: "none",
                facebook: null,
                linkedin: null,
                instagram: null,
                youtube: null,
                website: "none"
            });
        } else {
            const clubData = result.recordset[0];
            console.log(clubData);
            res.json({
                name: clubData.ClubName,
                description: clubData.Description,
                link: clubData.Link,
                facebook: clubData.Facebook === "N/A" ? null : clubData.Facebook,
                linkedin: clubData.LinkedIn === "N/A" ? null : clubData.LinkedIn,
                instagram: clubData.Instagram === "N/A" ? null : clubData.Instagram,
                youtube: clubData.YouTube === "N/A" ? null : clubData.YouTube,
                website: clubData.ClubWebsite
            });
        }
    }
    catch(err) {
        console.log("error in retrieving club data");
        console.error(err);
    }
    finally {
        sql.close();
    }
});

app.post("/signup", async (req, res) => {
    const { email, password, interests, clubs } = req.body;
    console.log(`trying to create user with email: ${email}`);

    if(email === undefined || password === undefined) {
        res.status(400).json({ error: "Email or Password is Undefined "});
    } else{
        try {
            await sql.connect(sqlConfig);
            const result = await sql.query`SELECT Email FROM USERS WHERE Email='${email}'`;
    
            if(result.recordset.length !== 0) {
                res.status(400).json({ error: "user already exists" });
            } else {
                const query = `
                    INSERT INTO USERS (Email, Password, Interests, ClubList)
                    VALUES ('${email}', '${password}, '${interests}', '${clubs}')
                `;
                console.log(query);
                await sql.query(query);
                res.status(201).json({ message: `User with email ${email} added successfully` });
            }
        }
        catch(err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        }
        finally {
            sql.close();
        }
    }
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    console.log(`login request for user with email: ${email}`);

    if(email === undefined || password === undefined) {
        res.status(400).json({ error: "Email or Password fields are undefined"});
    } else {
        try {
            await sql.connect(sqlConfig);
            const query = `SELECT Email FROM USERS WHERE Email='${email}' AND Password='${password}'`;
            console.log(query);
            const result = await sql.query(query);
            console.log(result);
            
            if(result.recordset.length === 0) {
                res.status(401).json({ error: "Incorrect Username or Password" });
            } else {
                res.status(200).json({ message: "Successfully logged in" });
            }
        }
        catch(err) {
            console.error(err);
            res.status(500).json({ error: "Internal server error" });
        }
        finally {
            sql.close();
        }
    }
});

app.get("/test", (req, res) => {
    console.log("reached test endpoint");
});

app.get("/", (req, res) => {
    res.json({
        message: "backend home endpoint"
    });
});

app.listen(3000, () => {
    console.log("backend server has started");
});
