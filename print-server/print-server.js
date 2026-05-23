const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3001;
const PRINTER_NAME = 'RONGTA 80mm Series Printer';
const PS_SCRIPT = path.join(__dirname, 'print-raw.ps1');
const ESC = 0x1B, GS = 0x1D;

// Albanian characters ë/ç don't exist in printer's CP437 charset
function norm(str) {
  return String(str || '')
    .replace(/ë/g, 'e').replace(/Ë/g, 'E')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C');
}

function rjust(left, right, total) {
  right = String(right);
  left = norm(left).slice(0, total - right.length - 1);
  return left + ' '.repeat(Math.max(1, total - left.length - right.length)) + right;
}

function buildKitchenSlip(o) {
  const chunks = [
    Buffer.from([ESC, 0x40]),
    Buffer.from([ESC, 0x61, 0x01]),
    Buffer.from([ESC, 0x45, 0x01]),
    Buffer.from('ROLEX BAR\n'),
    Buffer.from([ESC, 0x45, 0x00]),
    Buffer.from('Bar & Restaurant\n'),
    Buffer.from([ESC, 0x61, 0x00]),
    Buffer.from('--------------------------------\n'),
    Buffer.from([ESC, 0x61, 0x01]),
    Buffer.from([ESC, 0x45, 0x01]),
    Buffer.from([ESC, 0x21, 0x10]),
    Buffer.from('*** POROSI ***\n'),
    Buffer.from([ESC, 0x21, 0x00]),
    Buffer.from([ESC, 0x45, 0x00]),
    Buffer.from([ESC, 0x61, 0x00]),
    Buffer.from('--------------------------------\n'),
    Buffer.from('Tavolina: ' + norm(o.bord || '-') + '\n'),
    Buffer.from('Porosi #: ' + (o.ordre_nummer || '-') + '\n'),
    Buffer.from('Ora: ' + new Date(o.oprettet).toLocaleTimeString('sq-AL', {hour:'2-digit',minute:'2-digit',hour12:false}) + '\n'),
    Buffer.from('Kamarier: ' + norm(o.bruger_navn || '-') + '\n'),
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

function buildReceiptSlip(o) {
  const met = o.betaling === 'kontant' ? 'Kesh' : o.betaling === 'kort' ? 'Karte' : 'Mobil';
  const chunks = [
    Buffer.from([ESC, 0x40]),
    Buffer.from([ESC, 0x61, 0x01]),
    Buffer.from([ESC, 0x45, 0x01]),
    Buffer.from('ROLEX BAR\n'),
    Buffer.from([ESC, 0x45, 0x00]),
    Buffer.from('Bar & Restaurant\n'),
    Buffer.from([ESC, 0x61, 0x00]),
    Buffer.from('--------------------------------\n'),
    Buffer.from('Tavolina: ' + norm(o.bord || '-') + '\n'),
    Buffer.from('Porosi #: ' + (o.ordre_nummer || '-') + '\n'),
    Buffer.from('Ora: ' + new Date(o.oprettet).toLocaleTimeString('sq-AL', {hour:'2-digit',minute:'2-digit',hour12:false}) + '\n'),
    Buffer.from('Kamarier: ' + norm(o.bruger_navn || '-') + '\n'),
    Buffer.from('--------------------------------\n'),
    ...(o.items || []).map(i =>
      Buffer.from(rjust(i.antal + 'x ' + i.produkt_navn, (i.produkt_pris * i.antal).toFixed(2) + 'E', 32) + '\n')
    ),
    Buffer.from('================================\n'),
    Buffer.from([ESC, 0x45, 0x01]),
    Buffer.from('TOTALI: ' + Number(o.total).toFixed(2) + ' EUR\n'),
    Buffer.from([ESC, 0x45, 0x00]),
    Buffer.from('Paguar me: ' + met + '\n'),
    ...(Number(o.kusuri) > 0.001 ? [Buffer.from('Kusuri: ' + Number(o.kusuri).toFixed(2) + ' EUR\n')] : []),
    Buffer.from('================================\n'),
    Buffer.from([ESC, 0x61, 0x01]),
    Buffer.from([ESC, 0x45, 0x01]),
    Buffer.from('FATURA E PAGUAR\n'),
    Buffer.from([ESC, 0x45, 0x00]),
    Buffer.from('Faleminderit!\n'),
    Buffer.from([ESC, 0x61, 0x00]),
    Buffer.from('\n\n\n'),
    Buffer.from([GS, 0x56, 0x00]),
  ];
  return Buffer.concat(chunks);
}

function printRaw(data) {
  const tmpFile = path.join(os.tmpdir(), 'receipt_' + Date.now() + '.bin');
  fs.writeFileSync(tmpFile, data);
  try {
    execSync(
      `powershell -ExecutionPolicy Bypass -File "${PS_SCRIPT}" -PrinterName "${PRINTER_NAME}" -DataFile "${tmpFile}"`,
      { timeout: 15000 }
    );
  } finally {
    try { fs.unlinkSync(tmpFile); } catch (_) {}
  }
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
        const data = order.printType === 'receipt'
          ? buildReceiptSlip(order)
          : buildKitchenSlip(order);
        printRaw(data);
        console.log('Print OK [' + (order.printType || 'kitchen') + ']:', order.ordre_nummer || '-');
        res.writeHead(200); res.end('{"ok":true}');
      } catch (e) {
        console.error('Print error:', e.message);
        res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else {
    res.writeHead(404); res.end();
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Rolex Bar printserver korer pa port ' + PORT);
  console.log('Printer: ' + PRINTER_NAME);
  console.log('PS script: ' + PS_SCRIPT);
});
