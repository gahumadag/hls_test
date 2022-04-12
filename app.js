const express = require('express');
require('dotenv').config();
const mysql = require('mysql');
const session = require('express-session');
const mysql_store = require('express-mysql-session')(session);
const db = require('./db');
const crypto = require('crypto');
const {hashSync, genSaltSync, compareSync } = require('bcryptjs');
const nunjucks = require('nunjucks');

const PORT = process.env.PORT || 3050;

const options ={
    connectionLimit: 10,
    password: process.env.DB_PASS,
    user: process.env.DB_USER,
    database: process.env.MYSQL_DB,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    createDatabaseTable: true,
    schema: {
        tableName: 'user_sessions',
        columnNames: {
            session_id: 'id',
            expires: 'expires',
            data: 'data'
        }
    }
}

const pool = mysql.createPool(options);
const  sessionStore = new mysql_store(options, pool);

const app = express();

var request_time = function (req, res, next) {
    req.request_time = Date.now();
    next();
};

nunjucks.configure( 'templates', {
    autoescape: true,
    cache: false,
    express: app
}) ;

app.engine('html', nunjucks.render);
app.set('view engine', 'html');

app.use(request_time);
app.use(express.static('public'));
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 
app.use(session({
    name: process.env.SESS_NAME,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    secret: process.env.SESS_SECRET,
    cookie: {
        maxAge: 60*60*24*1000,
        sameSite: true,
    }
}))
app.use('/static', express.static('public'));

app.listen(PORT, ()=> {
    console.log(`Server running on port ${PORT}`);
})

const redirect_login =(req, res, next) => {
    if(!req.session.user_id){
        res.redirect('/login');
    }
    else{
        next();
    }
}

const redirect_home =(req, res, next) => {
    if(req.session.user_id){
        res.redirect('/home');
    }
    else{
        next();
    }
}

app.get('/', redirect_login, (req, res)=>{
    const { user_id } = req.session
    redirect_home(req, res);
});

app.get('/home', redirect_login, async(req,res)=>{
    const {user_id} = req.session
    if(user_id){
        try{
            const user = await db.get_user(user_id);
            let  data = {
                current_user: user[0],
                uuid: crypto.randomUUID()
            }
            res.render("index.html", data);
        } catch(e) {
            console.log(e);
            res.sendStatus(404);
        }
    }
    else{
        return res.redirect('/login')
    }
});

app.get('/login', redirect_home, (req,res)=>{
    res.render("users/login.html");
});

app.get('/register', (req,res)=>{
    res.render("users/register.html");
});

app.post('/login', redirect_home, async(req, res, next)=>{
    try{ 
        const email = req.body.email;
        let password = req.body.password;
        user = await db.get_user_by_email(email);
        if(!user){
            return res.send({
                message: "Invalid email"
            })
        }
        if(!compareSync(password, user.password)){
            return res.send({
                message: "Invalid  password"
            })
        
        }
        req.session.user_id = user.id
        return res.redirect('/home');
    } catch(e){
        console.log(e);
    }
});
app.post('/register', async (req, res, next)=>{
    try{
        const name = req.body.name;
        const email = req.body.email;
        const salt = genSaltSync(10);
        let password = hashSync(req.body.password, salt);
        if (!name || !email || !password) {
                return res.sendStatus(400);
        }        
        const user =  await db.insert_user(name, email, password).then(insert_id=>{return db.get_user(insert_id);});
        req.session.user_id = user.id
        return res.redirect('/login')
    } catch(e){    
        console.log(e);
        res.sendStatus(400);
    }
});
app.get('/logout', redirect_login, (req, res)=>{
    req.session.destroy(err => {
        if(err){
            return res.redirect('/home')
        }
        sessionStore.close()
        res.clearCookie(process.env.SESS_NAME)
        res.redirect('/login')
    })
})

app.get('/playlist', redirect_login, async(req,res)=>{
    try{
        const { user_id } = req.session
        s_uuid = req.query.uuid;
        let vsession = await db.get_session(s_uuid);
        if(!vsession){
            console.log("new session for " + s_uuid);
            vsession = await db.new_session(user_id, s_uuid).then(
                insertId => {
                    return db.get_session(s_uuid);
                }
            );
            console.log("new session with seq " + vsession.current_sequence);
        }
        seq = vsession.current_sequence
        console.log(seq);
        data = {
            sequence: seq,
            seq1: (seq % 64),
            seq2: ((seq+1) % 64),
            seq3: ((seq+2) % 64),
        }
        await db.update_session(seq + 1, vsession.session_uuid)
        res.render("files/playlist.m3u8", data);
    } catch(e) {
        console.log(e);
        res.sendStatus(404);
    }
});

app.all('*', redirect_login, function(req, res) {
    res.redirect('/home');
});