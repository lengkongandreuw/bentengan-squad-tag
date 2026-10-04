export const PAGES_URL =
  'https://lengkongandreuw.github.io/bentengan-squad-tag/';
// Success means the pushed commit AND map revision are served publicly, not just git push.
export async function waitForPagesDeployment({
  commit,
  mapRevision,
  readRuns,
  readPublic,
  onProgress,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  attempts = 40,
}) {
  const started = Date.now();
  for (let i = 0; i < attempts; i++) {
    if (Date.now() - started >= 300000) break;
    const runs = await readRuns(commit).catch(() => []);
    const run = runs.find(
      (r) => r.head_sha === commit && r.path === '.github/workflows/pages.yml',
    );
    if (run?.status === 'completed' && run.conclusion !== 'success')
      throw new Error(
        `Deployment Pages ${run.conclusion}. Commit sudah dipush, tetapi game belum diperbarui. Periksa ${run.html_url}`,
      );
    if (run?.conclusion === 'success') {
      onProgress(
        'Deployment sukses. Memastikan versi map publik terbaru…',
        run.html_url,
      );
      const info = await readPublic().catch(() => null);
      if (info?.commit === commit && info.mapRevision === mapRevision)
        return {
          commit,
          runUrl: run.html_url,
          url: `${PAGES_URL}?build=${commit.slice(0, 12)}`,
        };
    } else
      onProgress(
        run
          ? `GitHub Pages sedang ${run.status}. Tunggu build dan deployment selesai…`
          : 'Commit sudah dipush. Menunggu workflow GitHub Pages…',
        run?.html_url,
      );
    await sleep(8000);
  }
  throw new Error(
    'Commit sudah dipush; deployment/versi publik belum terkonfirmasi dalam5 menit. Jangan publish berulang. Periksa GitHub Actions lalu buka game dengan Ctrl+Shift+R.',
  );
}
