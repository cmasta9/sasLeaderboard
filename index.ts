import {serve,file} from 'bun';
//import {createHash} from 'crypto';
import update from './api/update.js';

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kymtwkcicebyayomtkte.supabase.co';
//const sb = createClient(supabaseUrl, process.env.SUPABASE_KEY);

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
        }else if(url.pathname === '/submit' && req.method === 'POST'){
            const json = await req.json();
            const res = await update(json);
            return new Response(res);
        }
        return new Response('404');
    },
});

console.log(`order up on port ${process.env.PORT || 3000}`);