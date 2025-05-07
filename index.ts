import {serve,file} from 'bun';
import {createHash} from 'crypto';
import Database from 'bun:sqlite';

const db = new Database('scores.sqlite', {create: true});
db.exec('PRAGMA journal_mode = WAL;');

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

serve({
    port: process.env.PORT || 3000,
    async fetch(req){
        const url = new URL(req.url);
        if(url.pathname === '/'){
            return new Response(file('public/index.html'));
        }else if(url.pathname === '/favicon.ico'){
            return new Response(file('public/favicon.ico'));
        }else if(url.pathname === '/style.css'){
            return new Response(file('public/style.css'));
        }else if(req.method === "POST"){
            if(url.pathname === '/submit'){
                try{
                    const dater = await req.json();
                    if(!dater.name){
                        throw new Error('No name field.');
                    }else{
                        const stat1 = db.prepare('SELECT username FROM scores WHERE username = ?');
                        if(!stat1.get(dater.name) && dater.secwet === process.env.secwet){
                            try{
                                const stat2 = db.prepare('INSERT INTO scores (username, highscore, created, updated, address, checker) VALUES (?,?,?,?,?,?)');
                                stat2.run(dater.name,Number(dater.score),Date.now(),Date.now(),dater.address,process.env.secret);
                                return new Response(`${dater.name},${dater.score},${Date.now()}`);
                            }catch(err){
                                console.log(err);
                                return new Response('Unable to add record.', {status: 400});
                            }
                        }else if(dater.secwet === process.env.secwet){
                            const stat3 = db.prepare('SELECT highscore,address FROM scores WHERE username = ?');
                            const oldScore = parseInt(stat3.get(dater.name).highscore);
                            const address = stat3.get(dater.name).address;
                            if(oldScore < Number(dater.score) || !oldScore){
                                const checkit = createHash('sha256').update(`${process.env.secret}${dater.score}${dater.name}`).digest('hex');
                                const stat4 = db.prepare('UPDATE scores SET highscore = ?, address = ?, updated = ?, checker = ? WHERE username = ?');
                                stat4.run(Number(dater.score),dater.address,Date.now(),checkit,dater.name);
                                return new Response(`Updated high score for ${dater.name} to ${dater.score}, address to ${dater.address}`);
                            }
                            return new Response('Score not updated.');
                        }else{
                            return new Response('nao u diint');
                        }
                    }
                }catch(err){
                    console.log('Error with post request: ' + err);
                    return new Response('There was an error receiving the data.', {status: 400});
                }
            }else if(url.pathname === '/getUser'){
                const dater = await req.json();
                try{
                    const stat = db.query('SELECT highscore, address FROM scores WHERE username = ?');
                    const uz = stat.get(dater.name);
                    //console.log(uz);
                    return await new Response(JSON.stringify(uz),{
                        headers: {'Content-Type': 'application/json'},
                    });
                }catch(err){
                    console.log('Error with getuser' + err);
                    return new Response(`Unable to get high score for ${dater.name}`, {status: 400});
                }
                
            }
        }else if(req.method === 'GET'){
            const stat = db.query(`SELECT username, highscore FROM scores ORDER BY highscore DESC LIMIT ${process.env.highs || 25};`).all();
            return new Response(JSON.stringify(stat),{
                headers: {'Content-Type': 'application/json'},
            });
        }
        return new Response('404');
    },
});

console.log(`order up on port ${process.env.PORT || 3000}`);