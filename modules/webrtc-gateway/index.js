const { PeerConnection } = require('werift');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const DEVICE_ID = "653200194ab543ee0foaby";
const LOCAL_KEY = "AwC+HfqU.bW&4Q^2";
const PORT = 8080;

const wss = new WebSocket.Server({ port: PORT });
console.log(`🔺 Gateway falso escuchando en puerto ${PORT}`);

wss.on('connection', (ws, req) => {
  console.log(`🔗 Nueva conexión desde ${req.socket.remoteAddress}`);

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw);
      console.log(`📨 Mensaje:`, msg);

      if (msg.type === 'offer') {
        console.log(`📹 Offer recibido, generando answer...`);
        const pc = new PeerConnection({ iceServers: [] });
        await pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        pc.ontrack = (track) => {
          console.log(`🎥 Track recibido, guardando stream...`);
          const dir = path.join(__dirname, '../../ora-data/streams');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          const file = path.join(dir, `camera_${DEVICE_ID}_${Date.now()}.raw`);
          const wsStream = fs.createWriteStream(file);
          track.on('data', chunk => wsStream.write(chunk));
          track.on('end', () => wsStream.end());
        };

        ws.send(JSON.stringify({ type: 'answer', sdp: pc.localDescription.sdp }));
        console.log(`✅ Answer enviado`);
      }
    } catch (err) {
      console.error('❌ Error:', err);
    }
  });

  ws.on('close', () => console.log(`🔌 Conexión cerrada`));
});
