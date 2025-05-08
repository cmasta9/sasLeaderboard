import Database from 'better-sqlite3';
import http from 'http';
import fs from 'fs';
import dotenv from 'dotenv';
import crypto from 'crypto';

const db = new Database('scores.sqlite', {create: true});
db.exec('PRAGMA journal_mode = WAL;');

dotenv.config();

db.prepare(`CREATE TABLE IF NOT EXISTS scores 
(
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE,
    highscore INTEGER NOT NULL DEFAULT 0,
    created INTEGER,
    updated INTEGER,
    address TEXT,
    checker TEXT
)`).run();

const serve = http.createServer((req,res) => {
    console.log(req.url);
    if(req.url === '/' || req.url === 'index.html'){
        fs.readFile('public/index.html',(err,f)=>{
            if(err){
                res.writeHead(500,{'Content-Type': 'text/plain'});
                res.end('Server error');
            }else{
                res.writeHead(200,{'Content-Type':'text/html'});
                res.end(f);
            }
        });
    }else if(req.url === '/favicon.ico'){
        fs.readFile('public/favicon.ico',(err,f)=>{
            if(err){
                res.writeHead(500,{'Content-Type': 'text/plain'});
                res.end('Server error');
            }else{
                res.writeHead(200,{'Content-Type':'image/x-icon'});
                res.end(f);
            }
        });
    }else if(req.url === '/style.css'){
        fs.readFile('public/style.css',(err,f)=>{
            if(err){
                res.writeHead(500,{'Content-Type': 'text/plain'});
                res.end('Server error');
            }else{
                res.writeHead(200,{'Content-Type':'text/css'});
                res.end(f);
            }
        });
    }else if(req.method === "POST"){
        if(req.url === '/submit'){
            let json = '';
            req.on('data',c=>{
                json += c.toString();
            });
            req.on('end',()=>{
                const dater = JSON.parse(json);
                try{
                    if(!dater.name){
                        throw new Error('No name field.');
                    }else{
                        const stat1 = db.prepare('SELECT username FROM scores WHERE username = ?');
                        if(!stat1.get(dater.name) && dater.seecwet === process.env.seecwet){
                            try{
                                const stat2 = db.prepare('INSERT INTO scores (username, highscore, created, updated, address, checker) VALUES (?,?,?,?,?,?)');
                                stat2.run(dater.name,Number(dater.score),Date.now(),Date.now(),dater.address,process.env.secret);
                                res.writeHead(200,{'Content-Type': 'text/plain'});
                                res.end(`${dater.name},${dater.score},${Date.now()}`);
                            }catch(err){
                                console.log(err);
                                res.writeHead(400,{'Content-Type': 'text/plain'});
                                res.end('Unable to add record.');
                            }
                        }else if(dater.seecwet === process.env.seecwet){
                            const stat3 = db.prepare('SELECT highscore,address FROM scores WHERE username = ?');
                            const oldScore = parseInt(stat3.get(dater.name).highscore);
                            const address = stat3.get(dater.name).address;
                            if(oldScore < Number(dater.score) || !oldScore){
                                const checkit = crypto.createHash('sha256').update(`${process.env.secret}${dater.score}${dater.name}`).digest('hex');
                                const stat4 = db.prepare('UPDATE scores SET highscore = ?, address = ?, updated = ?, checker = ? WHERE username = ?');
                                stat4.run(Number(dater.score),dater.address,Date.now(),checkit,dater.name);
                                res.writeHead(200,{'Content-Type': 'text/plain'});
                                res.end(`Updated high score for ${dater.name} to ${dater.score}, address to ${dater.address}`);
                            }else{
                                res.writeHead(200,{'Content-Type': 'text/plain'});
                                res.end('Score not updated.');
                            }
                        }else{
                            res.writeHead(403,{'Content-Type':'text/plain'});
                            res.end('nao u diint');
                        }
                    }
                }catch(err){
                    console.log('Error with post request: ' + err);
                    res.writeHead(400,{'Content-Type':'text/plain'});
                    res.end('There was an error receiving the data.');
                }
            });
        }else if(req.url === '/getUser'){
            let json = '';
            req.on('data', c =>{
                json += c.toString();
            });
            req.on('end',()=>{
                const dater = JSON.parse(json);
                try{
                    const stat = db.prepare('SELECT highscore, address FROM scores WHERE username = ?');
                    const uz = stat.get(dater.name);
                    //console.log(uz);
                    res.writeHead(200,{'Content-Type':'application/json'});
                    res.end(JSON.stringify(uz));
                }catch(err){
                    console.log('Error with getuser' + err);
                    res.writeHead(400,{'Content-Type': 'text/plain'});
                    res.end(`Unable to get high score for ${dater.name}`);
                }
            });
        }
    }else if(req.method === 'GET' && req.url === '/getHigh'){
        const stat = db.prepare(`SELECT username, highscore FROM scores ORDER BY highscore DESC LIMIT ${process.env.highs || 25};`).all();
        res.writeHead(200,{'Content-Type': 'application/json'});
        res.end(JSON.stringify(stat));
    }
});

serve.listen(process.env.PORT || 3000,()=>{
    console.log(`order up on ${process.env.PORT || 3000}`);
});