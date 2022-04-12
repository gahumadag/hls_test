const mysql = require('mysql');
const pool = mysql.createPool({
    connectionLimit: 10,
    password: process.env.DB_PASS,
    user: process.env.DB_USER,
    database: process.env.MYSQL_DB,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT
});

let db = {};

db.get_user = (id) =>{
    return new Promise((resolve, reject)=>{
        pool.query('SELECT * FROM users WHERE id= ?', [id], (error, user)=>{
            if(error){
                return reject(error);
            }
            return resolve(user);
        });
    });
};

db.get_user_by_email = (email) =>{
    return new Promise((resolve, reject)=>{
        pool.query('SELECT * FROM users WHERE email = ?', [email], (error, users)=>{
            if(error){
                return reject(error);
            }
            return resolve(users[0]);
        });
    });
};

db.insert_user = (name, email, password) =>{
    return new Promise((resolve, reject)=>{
        pool.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, password], (error, result)=>{
            if(error){
                return reject(error);
            }
            return resolve(result.insertId);
        });
    });
};

db.new_session = (user_id, session_uuid) =>{
    return new Promise((resolve, reject)=>{
        pool.query('INSERT INTO video_sessions (user_id, session_uuid, current_sequence) VALUES (?, ?, 0)', [user_id, session_uuid], (error, result)=>{
            if(error){
                return reject(error);
            }
            return resolve(result.insertId);
        });
    });
};

db.get_session = (session_uuid) =>{
    return new Promise((resolve, reject)=>{
        pool.query('SELECT * FROM video_sessions WHERE session_uuid = ?', [session_uuid], (error, vsession)=>{
            if(error){
                return reject(error);
            }
            return resolve(vsession[0]);
        });
    });
};

db.update_session = (new_seq, session_uuid) =>{
    return new Promise((resolve, reject)=>{
        pool.query('UPDATE video_sessions SET current_sequence = ? WHERE session_uuid = ?', [new_seq, session_uuid], (error, result)=>{
            if(error){
                return reject(error);
            }
            return resolve(result);
        });
    });
};

module.exports = db;