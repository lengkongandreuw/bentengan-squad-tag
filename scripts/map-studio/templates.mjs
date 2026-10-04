import ts from 'typescript';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { kanalObjectPolygons } from '../../lib/kanal-footprints.js';
// Evaluate trusted repository definitions only, never uploaded map data.
export async function templates(root) {
  const source = await readFile(path.join(root, 'app/prototype.tsx'), 'utf8');
  const start = source.indexOf('const DESIGN_W ='),
    end = source.indexOf('// Custom maps are');
  if (start < 0 || end < start)
    throw new Error('Definisi arena tidak ditemukan.');
  const ctx = {
    structuredClone,
    GAME_RULES: JSON.parse(
      await readFile(path.join(root, 'config/game-rules.json'), 'utf8'),
    ),
    isKanalField: (id) => id === 'kanal2',
    result: null,
  };
  vm.runInNewContext(
    ts.transpile(source.slice(start, end) + ';result=FIELD_CONFIGS;', {
      target: ts.ScriptTarget.ES2022,
    }),
    ctx,
    { timeout: 1000 },
  );
  const fields = JSON.parse(JSON.stringify(ctx.result));
  const src = await readFile(
      path.join(root, 'lib/field-assets.generated.ts'),
      'utf8',
    ),
    tree = ts.createSourceFile('atlas.ts', src, ts.ScriptTarget.Latest, true);
  let atlas;
  for (const s of tree.statements)
    if (ts.isVariableStatement(s))
      for (const d of s.declarationList.declarations)
        if (d.name.getText(tree) === 'FIELD_OBJECT_ATLAS')
          atlas = JSON.parse(
            d.initializer.expression?.getText(tree) ??
              d.initializer.getText(tree),
          );
  const kanalMeta = await sharp(
    await readFile(path.join(root, 'public/field/kanal-object-atlas.webp')),
  ).metadata();
  const asset = (id) => ({
    asset: id.startsWith('kanalNusa')
      ? 'field/kanal-object-atlas.webp'
      : 'field/objects.webp',
    width: id.startsWith('kanalNusa') ? kanalMeta.width : atlas.width,
    height: id.startsWith('kanalNusa') ? kanalMeta.height : atlas.height,
    frames: [atlas.assets[id]],
    fps: 12,
  });
  const points = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
  async function convert(field) {
    const objects = [];
    const visual = (o, id) => ({
      id,
      name: o.asset,
      asset: asset(o.asset),
      x: o.x + o.w / 2 - (o.visualW ?? o.w) / 2,
      y: o.y + o.h - (o.visualH ?? o.h),
      w: o.visualW ?? o.w,
      h: o.visualH ?? o.h,
      rotation: 0,
      opacity: o.opacity ?? 1,
      layer: o.underlay ? 'background' : 'world',
      z: 0,
      behavior: 'decoration',
      slow: 0.5,
      shape: 'rect',
      points,
      visible: true,
      locked: false,
      mirror: !!o.flip,
    });
    for (const [i, o] of field.obstacles.entries()) {
      const v = visual(o, `obj-visual-${i}`);
      if (!o.hidden && !o.underlay) objects.push(v);
      if (field.id === 'kanal2') {
        for (const [j, poly] of kanalObjectPolygons(o).entries()) {
          const x = Math.min(...poly.map((p) => p[0])),
            y = Math.min(...poly.map((p) => p[1])),
            w = Math.max(...poly.map((p) => p[0])) - x,
            h = Math.max(...poly.map((p) => p[1])) - y;
          objects.push({
            ...v,
            id: `obj-collider-${i}-${j}`,
            name: 'Batas ' + o.asset,
            asset: null,
            x,
            y,
            w,
            h,
            shape: 'polygon',
            points: poly.map((p) => ({ x: (p[0] - x) / w, y: (p[1] - y) / h })),
            behavior: 'solid',
          });
        }
      } else
        objects.push({
          ...v,
          id: `obj-collider-${i}`,
          name: 'Batas ' + o.asset,
          asset: null,
          x: o.x,
          y: o.y,
          w: o.w,
          h: o.h,
          behavior: 'parkour',
        });
    }
    for (const [i, o] of field.decorations.entries())
      if (!o.underlay) objects.push(visual(o, `obj-decoration-${i}`));
    const file = field.background,
      meta = await sharp(
        await readFile(path.join(root, 'public/field', file)),
      ).metadata();
    let waterMask;
    if (field.waterMask) {
      const decoded = await sharp(
          await readFile(path.join(root, 'public/field', field.waterMask)),
        )
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true }),
        { width, height, channels } = decoded.info,
        rows = [];
      for (let y = 0; y < height; y++) {
        const row = [];
        let active = false;
        for (let x = 0; x <= width; x++) {
          const hit =
            x < width && decoded.data[(y * width + x) * channels] > 127;
          if (hit !== active) {
            row.push(x);
            active = hit;
          }
        }
        rows.push(row);
      }
      waterMask = { width, height, rows };
    }
    return {
      id: `studio-edit-${field.id}`,
      replaces: field.id,
      name: field.name,
      description:
        field.kicker + ' · Versi editor; sebagian grafik menyatu di terrain.',
      width: field.width,
      height: field.height,
      enabled: false,
      terrain: {
        asset: 'field/' + file,
        width: meta.width,
        height: meta.height,
        frames: [{ x: 0, y: 0, width: meta.width, height: meta.height }],
        fps: 12,
      },
      icon: null,
      terrainMode: 'stretch',
      tileSize: 256,
      objects,
      bases: field.bases,
      prisons: Object.fromEntries(
        Object.entries(field.prisons).map(([t, p]) => [
          t,
          { x: p.x, y: p.y, w: p.w, h: p.h },
        ]),
      ),
      ...(waterMask ? { waterMask } : {}),
    };
  }
  const builtinTemplates = await Promise.all(
    fields.filter((f) => f.id !== 'kampung3d').map(convert),
  );
  const template = structuredClone(builtinTemplates[0]);
  delete template.replaces;
  template.id = 'studio-kampung-copy';
  template.name += ' — salinan';
  return {
    template,
    builtinTemplates,
    builtins: fields.map((f) => ({
      id: f.id,
      name: f.name,
      editable: f.id !== 'kampung3d',
      objectScale: f.objectScale ?? 1,
      baseRadius: f.baseRadius ?? 118,
    })),
    library: Object.keys(atlas.assets).map((id) => ({
      name: id,
      clip: asset(id),
    })),
  };
}
