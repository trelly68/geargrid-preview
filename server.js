import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

// Board Posts API
app.get('/api/v1/jobs', (req, res) => {
  res.json([
    {
      id: 'job-101',
      title: '2018 Ford F-150 — Front Brake Pads',
      category: 'Brakes & Suspension',
      budget: '$280 - $360',
      has_parts: true,
      urgency: 'ASAP / Today',
      city: 'Moreno Valley, CA',
      zip: '92553',
      description: 'Squealing noise when braking. Need ceramic pads installed in driveway.'
    },
    {
      id: 'job-102',
      title: '2016 Honda Civic — Alternator Swap',
      category: 'Starter / Battery',
      budget: '$320 - $420',
      has_parts: false,
      urgency: 'Next 2–3 Days',
      city: 'Riverside, CA',
      zip: '92501',
      description: 'Car slow to crank and battery light turned on yesterday while driving.'
    }
  ]);
});

// Interactive Web UI
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>GearGrid — Board Preview</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
        .container { max-width: 550px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 1px solid #334155; padding-bottom: 12px; margin-bottom: 20px; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
        .badge { background: #16a34a; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
        .btn { background: #2563eb; color: #fff; border: none; padding: 10px 14px; border-radius: 6px; cursor: pointer; font-weight: bold; width: 100%; margin-top: 10px; }
        .chat-box { background: #020617; border: 1px solid #334155; border-radius: 6px; padding: 10px; margin-top: 10px; height: 100px; overflow-y: auto; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin:0;">⚙️ GearGrid Board Preview</h2>
          <p style="color:#94a3b8; font-size:13px; margin:4px 0 0 0;">Inland Empire Repair Board</p>
        </div>
        <div id="job-board">Loading posts...</div>
      </div>

      <script>
        async function loadBoard() {
          const res = await fetch('/api/v1/jobs');
          const jobs = await res.json();
          const container = document.getElementById('job-board');
          container.innerHTML = jobs.map(j => \`
            <div class="card">
              <span class="badge">\${j.urgency}</span>
              <h3 style="margin:8px 0 4px 0;">\${j.title}</h3>
              <p style="color:#cbd5e1; margin:4px 0; font-size:13px;"><strong>Location:</strong> \${j.city} (\${j.zip})</p>
              <p style="color:#cbd5e1; margin:4px 0; font-size:13px;"><strong>Budget:</strong> \${j.budget} | <strong>Parts:</strong> \${j.has_parts ? 'Has Parts' : 'Tech Supplies'}</p>
              <p style="color:#94a3b8; font-style:italic; font-size:13px;">"\${j.description}"</p>
              <button class="btn" onclick="startChat('\${j.id}')">Hit Post & Open Chat</button>
              <div id="chat-\${j.id}" style="display:none; margin-top:10px;">
                <div class="chat-box" id="messages-\${j.id}"></div>
                <div style="display:flex; gap:6px; margin-top:6px;">
                  <input type="text" id="input-\${j.id}" placeholder="Type a message..." style="flex:1; padding:6px; border-radius:4px; border:1px solid #334155; background:#0f172a; color:#fff;">
                  <button onclick="sendMessage('\${j.id}')" style="background:#16a34a; color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">Send</button>
                </div>
              </div>
            </div>
          \`).join('');
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        let ws = new WebSocket(protocol + '//' + window.location.host);

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          const box = document.getElementById('messages-' + msg.roomId);
          if (box) {
            box.innerHTML += \`<div><strong>\${msg.sender}:</strong> \${msg.text}</div>\`;
            box.scrollTop = box.scrollHeight;
          }
        };

        function startChat(id) {
          document.getElementById('chat-' + id).style.display = 'block';
        }

        function sendMessage(id) {
          const input = document.getElementById('input-' + id);
          if (input.value.trim() !== '') {
            ws.send(JSON.stringify({ roomId: id, sender: 'Mechanic', text: input.value }));
            input.value = '';
          }
        }

        loadBoard();
      </script>
    </body>
    </html>
  `);
});

// WebSocket Server
wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    const message = JSON.parse(data);
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify(message));
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
