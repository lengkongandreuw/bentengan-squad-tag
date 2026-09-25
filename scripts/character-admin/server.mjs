import http from 'node:http';
import { readFile, writeFile, mkdir, rename, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import { validatePreviewDocument } from '../../lib/selection-preview-model.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const mime = { '.gif': 'image/gif', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const maxBytes = 20 * 1024 * 1024;

export async function inspectImage(bytes, kind) {
  if (!['animated', 'static'].includes(kind) || bytes.length > maxBytes || !bytes.length) throw new Error('Upload maksimal 20 MB.');
  const meta = await sharp(bytes, { limitInputPixels: 32_000_000 }).metadata();
  if (!['gif', 'png', 'webp', 'jpeg'].includes(meta.format)) throw new Error('Gunakan GIF, PNG, WebP, atau JPG. SVG tidak diperbolehkan.');
  if (!meta.width || !meta.height || meta.width > 4096 || (meta.pageHeight ?? meta.height) > 4096 ||
      (meta.pages ?? 1) > 300 || meta.width * (meta.pageHeight ?? meta.height) * (meta.pages ?? 1) > 180_000_000)
    throw new Error('Gambar terlalu besar: maksimal sisi 4096 px, 300 frame / 180 juta total pixel.');
  if (kind === 'static' && (meta.pages ?? 1) > 1) throw new Error('Preview inactive harus gambar statis, bukan animasi.');
  return meta.format === 'jpeg' ? 'jpg' : meta.format;
}

function command(program, args, timeout = 180000) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { cwd: root, windowsHide: true, shell: false,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' } });
    let output = '';
    const collect = chunk => { output = (output + chunk).slice(-14000); };
    child.stdout.on('data', collect); child.stderr.on('data', collect);
    const timer = setTimeout(() => { child.kill(); reject(new Error('Perintah melewati batas waktu. Periksa terminal/Git sebelum mencoba lagi.')); }, timeout);
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => { clearTimeout(timer); code === 0 ? resolve(output.trimEnd()) : reject(new Error(output || `Perintah gagal (${code}).`)); });
  });
}

export async function startAdmin(port = 4318, projectRoot = root) {
  const root = projectRoot;
  const configFile = path.join(root, 'config/selection-previews.json');
  const rules = JSON.parse(await readFile(path.join(root, 'config/game-rules.json'), 'utf8'));
  const roster = Object.entries(rules.teams).flatMap(([team, data]) => data.roster.map(id => ({ id, team, name: id === 'ciici' ? 'Ciici' : id[0].toUpperCase() + id.slice(1) })));
  const ids = roster.map(item => item.id);
  const token = randomBytes(32).toString('hex');
  let origin;
  let busy = false;
  let job = { status: 'idle', message: '' };
  const readConfig = async () => {
    const raw = await readFile(configFile);
    return { document: validatePreviewDocument(JSON.parse(raw), ids), revision: hash(raw) };
  };
  const owned = name => name === 'config/selection-previews.json' || /^public\/selection-previews\/[a-z]+\/[a-f0-9]{64}\.(gif|png|webp|jpg)$/.test(name);
  const git = args => command('git', ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, ...args]);
  async function publish() {
    try {
      job = { status: 'running', message: 'Memeriksa Git dan build…' };
      if (await git(['branch', '--show-current']) !== 'main') throw new Error('Publish hanya dari branch main.');
      const remote = await git(['remote', 'get-url', 'github']);
      if (!['https://github.com/lengkongandreuw/bentengan-squad-tag.git', 'git@github.com:lengkongandreuw/bentengan-squad-tag.git'].includes(remote)) throw new Error('Remote github tidak sesuai proyek.');
      const changes = await git(['status', '--porcelain', '--untracked-files=all']);
      if (changes.split('\n').filter(Boolean).some(line => !owned(line.slice(3))))
        throw new Error('Ada perubahan di luar preview. Simpan/commit perubahan tersebut secara terpisah dahulu; panel tidak akan memasukkannya.');
      const current = await readConfig();
      const assets = new Set();
      for (const entry of Object.values(current.document.characters)) for (const kind of ['animated', 'static'])
        if (entry[kind]) { await stat(path.join(root, 'public', entry[kind])); assets.add(`public/${entry[kind]}`); }
      if (current.document.branding?.logo) {
        await stat(path.join(root, 'public', current.document.branding.logo));
        assets.add(`public/${current.document.branding.logo}`);
      }
      await command(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'), '--noEmit']);
      await command(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'build', '--config', 'vite.github.config.ts']);
      await git(['add', '--', 'config/selection-previews.json', ...assets]);
      if (await git(['diff', '--cached', '--name-only'])) await git(['commit', '-m', 'Update character selection previews from local editor']);
      job.message = 'Mengirim ke GitHub…';
      // Authentication remains in the OS credential store, never in browser/config.
      await git(['-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential', 'push', 'github', 'main']);
      job = { status: 'success', message: 'Push berhasil. Tunggu centang hijau deployment GitHub Actions sebelum memeriksa situs publik.' };
    } catch (error) {
      job = { status: 'error', message: `Publish belum selesai: ${error.message}\nTidak ada force-push. Commit lokal yang sudah dibuat tetap tersimpan; periksa Git lalu coba lagi.` };
    } finally { busy = false; }
  }
  const server = http.createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const json = (code, value) => { response.writeHead(code, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(value)); };
    try {
      if (request.headers.host !== new URL(origin).host ||
        (request.headers.origin && request.headers.origin !== origin) ||
        request.headers['sec-fetch-site'] === 'cross-site') return json(403, { error: 'Akses hanya dari panel lokal yang sama.' });
      const url = new URL(request.url, origin);
      if (request.method === 'GET') {
        if (url.pathname === '/api/state') return json(200, { ...await readConfig(), roster, token, job });
        if (url.pathname === '/api/job') return json(200, job);
        const files = { '/': 'index.html', '/editor.js': 'editor.js', '/editor.css': 'editor.css' };
        if (files[url.pathname]) {
          response.setHeader('Content-Type', url.pathname.endsWith('.js') ? 'text/javascript' : url.pathname.endsWith('.css') ? 'text/css' : 'text/html');
          return response.end(await readFile(path.join(directory, files[url.pathname])));
        }
        if (url.pathname === '/model.js') { response.setHeader('Content-Type', 'text/javascript'); return response.end(await readFile(path.join(root, 'lib/selection-preview-model.js'))); }
        // Explicit image routes only; never serve repository files or credentials.
        const candidate = decodeURIComponent(url.pathname).slice(1);
        if (/^(selection-previews\/[a-z]+\/[a-f0-9]{64}\.(gif|png|webp|jpg)|ui-v2\/portraits\/[a-z]+\.webp|brand\/benteng-tag-logo\.webp|favicon-bst\.png)$/.test(candidate)) {
          const target = await realpath(path.join(root, 'public', candidate));
          const publicDir = await realpath(path.join(root, 'public'));
          if (!target.startsWith(publicDir + path.sep)) return json(403, { error: 'Path tidak valid.' });
          response.setHeader('Content-Type', mime[path.extname(target)]);
          return response.end(await readFile(target));
        }
        return json(404, { error: 'Tidak ditemukan.' });
      }
      if (request.method !== 'POST' || request.headers.origin !== origin || request.headers['x-admin-token'] !== token)
        return json(403, { error: 'Sesi tidak valid. Muat ulang panel.' });
      if (busy) return json(409, { error: 'Operasi lain sedang berjalan.' });
      if (!['/api/save', '/api/logo', '/api/publish'].includes(url.pathname)) return json(404, { error: 'Tidak ditemukan.' });
      busy = true;
      try {
        if (request.headers['content-type'] !== 'application/json') throw new Error('Gunakan JSON.');
        let size = 0; const chunks = [];
        for await (const chunk of request) { size += chunk.length; if (size > maxBytes * 3) throw new Error('Upload terlalu besar.'); chunks.push(chunk); }
        const data = JSON.parse(Buffer.concat(chunks).toString());
        const current = await readConfig();
        if (data.revision !== current.revision) return json(409, { error: 'Konfigurasi berubah di sesi lain. Muat ulang sebelum menyimpan.' });
        if (url.pathname === '/api/publish') { void publish(); json(202, { status: 'running' }); return; }
        const logoRequest = url.pathname === '/api/logo';
        if (!logoRequest && !ids.includes(data.id)) throw new Error('Karakter tidak valid.');
        const document = logoRequest ? structuredClone(current.document) : validatePreviewDocument({ ...current.document, characters: { ...current.document.characters, [data.id]: data.entry } }, ids);
        const assets = [];
        if (logoRequest) {
          if (data.upload === null) document.branding = { logo: null };
          else {
            if (typeof data.upload !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(data.upload)) throw new Error('Upload logo rusak.');
            const bytes = Buffer.from(data.upload, 'base64');
            const extension = await inspectImage(bytes, 'static');
            if (extension === 'gif') throw new Error('Logo memakai PNG, WebP, atau JPG statis.');
            const relative = `selection-previews/brand/${hash(bytes)}.${extension}`;
            assets.push({ relative, bytes }); document.branding = { logo: relative };
          }
        }
        for (const kind of logoRequest ? [] : ['animated', 'static']) {
          const encoded = data.uploads?.[kind];
          if (!encoded) continue;
          if (typeof encoded !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) throw new Error('Upload rusak.');
          const bytes = Buffer.from(encoded, 'base64');
          const extension = await inspectImage(bytes, kind);
          const relative = `selection-previews/${data.id}/${hash(bytes)}.${extension}`;
          assets.push({ relative, bytes }); document.characters[data.id][kind] = relative;
        }
        for (const entry of Object.values(document.characters)) for (const kind of ['animated', 'static'])
          if (entry[kind] && !assets.some(asset => asset.relative === entry[kind])) await stat(path.join(root, 'public', entry[kind]));
        if (document.branding?.logo && !assets.some(asset => asset.relative === document.branding.logo)) await stat(path.join(root, 'public', document.branding.logo));
        for (const asset of assets) {
          await mkdir(path.dirname(path.join(root, 'public', asset.relative)), { recursive: true });
          await writeFile(path.join(root, 'public', asset.relative), asset.bytes, { flag: 'wx' }).catch(error => { if (error.code !== 'EEXIST') throw error; });
        }
        await mkdir(path.join(root, '.preview-admin'), { recursive: true });
        await writeFile(path.join(root, '.preview-admin', `backup-${Date.now()}.json`), JSON.stringify(current.document, null, 2));
        const temporary = `${configFile}.tmp`;
        await writeFile(temporary, `${JSON.stringify(document, null, 2)}\n`);
        await rename(temporary, configFile);
        json(200, await readConfig());
      } finally { if (job.status !== 'running') busy = false; }
    } catch (error) { json(400, { error: error.code === 'ENOENT' ? 'Aset tidak ditemukan.' : error.message }); }
  });
  server.requestTimeout = 30000;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  origin = `http://127.0.0.1:${server.address().port}`;
  return { server, origin };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { origin } = await startAdmin(Number(process.env.CHARACTER_ADMIN_PORT || 4318));
  console.log(`\nPanel karakter lokal: ${origin}\nBuka alamat tersebut di browser. Ctrl+C untuk menutup. Jangan expose melalui tunnel.\n`);
}
