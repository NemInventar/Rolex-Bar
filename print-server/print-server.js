const http = require('http');
const printer = require('@thiagoelg/node-printer');

const PORT = 3001;
const PRINTER_NAME = 'RONGTA 80mm Series Printer';
const ESC = 0x1B, GS = 0x1D;

function buildReceipt(o) {
  function rjust(left, right, total) {
    right = String(right);
    left = left.slice(0, total - right.length - 1);
    return left + ' '.repeat(Math.max(1, total - left.length - right.length)) + right;
  }
  const chunks = [
    Buffer.from([ESC, 0x40]),
    Buffer.from([ESC, 0x61, 0x01]),
    Buffer.from([ESC, 0x45, 0x01]),
    Buffer.from('ROLEX BAR\n'),
    Buffer.from([ESC, 0x45, 0x00]),
    Buffer.from('-- URDHËRIM --\n'),
    Buffer.from([ESC, 0x61, 0x00]),
    Buffer.from('--------------------------------\n'),
    Buffer.from('Tavolina: ' + (o.bord || '-') + '\n'),
    Buffer.from('Porosi #: ' + (o.ordre_nummer || '-') + '\n'),
    Buffer.from('Ora: ' + new Date(o.oprettet).toLocaleTimeString('sq-AL') + '\n'),
    Buffer.from('Kamarier: ' + (o.bruger_navn || '-') + '\n'),
    Buffer.from('--------------------------------\n'),
    ...(o.items || []).map(i =>
      Buffer.from(rjust(i.antal + 'x ' + i.produkt_navn, (i.produkt_pris * i.antal).toFixed(2) + 'E', 32) + '\n')
    ),
    Buffer.from('--------------------------------\n'),
    Buffer.from([ESC, 0x45, 0x01]),
    Buffer.from('TOTALI: ' + Number(o.total).toFixed(2) + ' EUR\n'),
    Buffer.from([ESC, 0x45, 0x00]),
    Buffer.from('\n\n\n'),
    Buffer.from([GS, 0x56, 0x00]),
  ];
  return Buffer.concat(chunks);
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200); res.end(JSON.stringify({ ok: true })); return;
  }

  if (req.method === 'POST' && req.url === '/print') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const order = JSON.parse(body);
        const data = buildReceipt(order);
        printer.printDirect({
          data,
          printer: PRINTER_NAME,
          type: 'RAW',
          success: id => { console.log('Print OK, job', id); res.writeHead(200); res.end('{"ok":true}'); },
          error: err => { console.error('Print fejl:', err); res.writeHead(500); res.end(JSON.stringify({ error: String(err) })); }
        });
      } catch (e) {
        console.error(e);
        res.writeHead(400); res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else {
    res.writeHead(404); res.end();
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Rolex Bar printserver korer pa port ' + PORT);
  console.log('Printer: ' + PRINTER_NAME);
});
