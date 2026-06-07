const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
const db = new Database(path.join(__dirname, 'flowtalk.db'));
db.pragma('journal_mode = WAL');
db.exec('CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, zone TEXT, author TEXT, avatar TEXT, title TEXT, content TEXT, time TEXT, likes INTEGER DEFAULT 0); CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, post_id TEXT, author TEXT, avatar TEXT, content TEXT, time TEXT, likes INTEGER DEFAULT 0); CREATE TABLE IF NOT EXISTS likes (post_id TEXT, user TEXT, UNIQUE(post_id, user)); CREATE TABLE IF NOT EXISTS market_items (id TEXT PRIMARY KEY, type TEXT, author TEXT, title TEXT, desc TEXT, time TEXT); CREATE TABLE IF NOT EXISTS feedbacks (id TEXT PRIMARY KEY, author TEXT, category TEXT, content TEXT, status TEXT DEFAULT \'pending\', reply TEXT, time TEXT);');
app.get('/api/posts', (req, res) => { const posts = db.prepare('SELECT * FROM posts ORDER BY time DESC').all(); res.json(posts); });
app.post('/api/posts', (req, res) => { const p = req.body; db.prepare('INSERT OR REPLACE INTO posts VALUES (?,?,?,?,?,?,?,?)').run(p.id, p.zone, p.author, p.avatar, p.title, p.content, p.time, p.likes || 0); res.json({ ok: true }); });
app.get('/api/market', (req, res) => { const items = db.prepare('SELECT * FROM market_items ORDER BY time DESC').all(); res.json(items); });
app.post('/api/market', (req, res) => { const m = req.body; db.prepare('INSERT OR REPLACE INTO market_items VALUES (?,?,?,?,?,?)').run(m.id, m.type, m.author, m.title, m.desc, m.time); res.json({ ok: true }); });
app.get('/api/feedbacks', (req, res) => { const items = db.prepare('SELECT * FROM feedbacks ORDER BY time DESC').all(); res.json(items); });
app.post('/api/feedbacks', (req, res) => { const f = req.body; db.prepare('INSERT INTO feedbacks VALUES (?,?,?,?,?,?,?)').run(f.id, f.author, f.category, f.content, f.status || 'pending', f.reply || '', f.time); res.json({ ok: true }); });
app.put('/api/feedbacks/:id', (req, res) => { const s = req.body.status; if (s) db.prepare('UPDATE feedbacks SET status = ? WHERE id = ?').run(s, req.params.id); res.json({ ok: true }); });
app.post('/api/seed', (req, res) => {
  const cnt = db.prepare('SELECT COUNT(*) as c FROM market_items').get();
  if (cnt.c > 0) return res.json({ok:true});
  const ins = db.prepare('INSERT INTO market_items VALUES (?,?,?,?,?,?)');
  ins.run('m1','job','林小明','字节跳动-前端','薪资40-60K','10分钟前');
  ins.run('m2','job','陈晓雨','蚂蚁集团-AI算法','薪资50-80K','30分钟前');
  ins.run('m3','help','张三丰','求简历修改','后端方向求帮忙','1小时前');
  res.json({ok:true});
});
const PORT = process.env.PORT || 3001;
app.listen(PORT);
// AI chat proxy - keeps API key server-side
app.post('/api/ai/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.json({ reply: '' });
  try {
    const r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer sk-0ab46f2d12184af4ad8abac420488091' },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是小Q，FlowTalk平台的AI面谈官，专门服务腾讯离职员工。请用温暖、共情的语气回应。控制在80字以内。' },
          { role: 'user', content: message }
        ],
        max_tokens: 100,
      })
    });
    const data = await r.json();
    res.json({ reply: data?.choices?.[0]?.message?.content || '' });
  } catch { res.json({ reply: '' }); }
});
