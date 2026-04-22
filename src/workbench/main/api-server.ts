import * as http from 'http';
import * as fs from 'fs/promises';
import * as fss from 'fs';
import * as path from 'path';

export function startApiServer(projectRoot: string): void {
  const monacoRoot = path.join(projectRoot, 'node_modules', 'monaco-editor', 'min', 'vs');

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const pathname = decodeURIComponent(req.url || '');

    // --- Static Monaco files: GET /monaco/* ---
    if (req.method === 'GET' && pathname.startsWith('/monaco/')) {
      const relPath = pathname.slice('/monaco/'.length);
      const filePath = path.join(monacoRoot, relPath);

      // Prevent path traversal
      if (!filePath.startsWith(monacoRoot)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      try {
        const ext = path.extname(filePath);
        const contentTypes: Record<string, string> = {
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.ttf': 'font/ttf',
          '.woff': 'font/woff',
          '.woff2': 'font/woff2',
          '.json': 'application/json',
          '.map': 'application/json',
        };
        const contentType = contentTypes[ext] ?? 'application/octet-stream';
        const stream = fss.createReadStream(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        stream.pipe(res);
        stream.on('error', () => {
          if (!res.headersSent) res.writeHead(404);
          res.end();
        });
      } catch {
        res.writeHead(404);
        res.end();
      }
      return;
    }

    // --- POST /api/register-campaign ---
    if (req.method === 'POST' && pathname === '/api/register-campaign') {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', async () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString()) as { filename: string };
          const base = body.filename.replace(/\.json$/, '');

          // filename → PascalCase identifier  e.g. "my_camp" → "MyCamp"
          const ident = base
            .split(/[_\-\s]+/)
            .map(s => s.charAt(0).toUpperCase() + s.slice(1))
            .join('');

          const mainTsPath = path.join(projectRoot, 'src/game/main.ts');
          let src = await fs.readFile(mainTsPath, 'utf-8');

          // Already registered? Skip silently.
          if (src.includes(`./campaigns/${base}.json`)) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, skipped: true }));
            return;
          }

          const lines = src.split('\n');

          // 1) Insert import after the last './campaigns/...' import line
          let lastImportIdx = -1;
          for (let i = 0; i < lines.length; i++) {
            if (/^import \w+ from '\.\/campaigns\//.test(lines[i])) lastImportIdx = i;
          }
          if (lastImportIdx >= 0) {
            lines.splice(lastImportIdx + 1, 0,
              `import ${ident} from './campaigns/${base}.json';`);
          }

          // 2) Insert entry inside the campaigns array (before the closing `];`)
          let inArray = false;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('const campaigns: CampaignExport[] = [')) inArray = true;
            if (inArray && lines[i].trim() === '];') {
              lines.splice(i, 0, `        ${ident} as unknown as CampaignExport,`);
              break;
            }
          }

          await fs.writeFile(mainTsPath, lines.join('\n'), 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, ident }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: String(err) }));
        }
      });
      return;
    }

    // --- GET /api/list/:dir ---
    const listMatch = pathname.match(/^\/api\/list\/(.*)$/);
    if (req.method === 'GET' && listMatch) {
      const dirPath = listMatch[1] || '';
      try {
        const fullPath = path.join(projectRoot, dirPath);
        // Prevent path traversal
        if (!fullPath.startsWith(projectRoot)) {
          res.writeHead(403); res.end('Forbidden'); return;
        }
        const entries = await fs.readdir(fullPath, { withFileTypes: true });
        const files = entries
          .filter(e => e.isFile() && e.name.endsWith('.json'))
          .map(e => e.name)
          .sort();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(files));
      } catch {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('[]');
      }
      return;
    }

    // --- GET /api/load/:filename ---
    const loadMatch = pathname.match(/^\/api\/load\/(.+)$/);
    if (req.method === 'GET' && loadMatch) {
      const filename = loadMatch[1];
      try {
        const fullPath = path.join(projectRoot, filename);
        const content = await fs.readFile(fullPath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(content);
      } catch {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File not found' }));
      }
      return;
    }

    // --- POST /api/save/:filename ---
    const saveMatch = pathname.match(/^\/api\/save\/(.+)$/);
    if (req.method === 'POST' && saveMatch) {
      const filename = saveMatch[1];
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', async () => {
        try {
          const fullPath = path.join(projectRoot, filename);
          await fs.mkdir(path.dirname(fullPath), { recursive: true });
          await fs.writeFile(fullPath, Buffer.concat(chunks));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: String(err) }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  server.listen(3001, '127.0.0.1', () => {
    console.log('[API] http://127.0.0.1:3001  (REST + Monaco static)');
  });
}
