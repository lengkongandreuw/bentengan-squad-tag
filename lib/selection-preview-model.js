// Stable presentation contract shared by the game and the LOCAL editor.
// x/y are percentages of the image slot, anchored at its bottom centre.
/** @typedef {{animated:string|null,static:string|null,scale:number,x:number,y:number}} PreviewEntry */
/** @param {string} id @returns {PreviewEntry} */
export const previewDefaults = (id) => ({
  animated: null, static: null, scale: id === 'boke' ? 1.05 : id === 'kodo' ? 1.17 : 1,
  x: 0, y: 0,
});

/** @param {{characters:Record<string,Partial<PreviewEntry>>}} document @param {string} id @returns {PreviewEntry} */
export function previewEntry(document, id) {
  return { ...previewDefaults(id), ...document.characters[id] };
}

/** @param {PreviewEntry} entry @param {boolean} [active] */
export function previewStyle(entry, active = true) {
  return {
    width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center bottom',
    transformOrigin: 'center bottom',
    transform: active ? `translate(${entry.x}%, ${entry.y}%) scale(${entry.scale})` : 'none',
  };
}

/**
 * @param {{version?:unknown,characters?:unknown,branding?:unknown}} document
 * @param {string[]} ids
 */
export function validatePreviewDocument(document, ids) {
  if (!document || document.version !== 1 || !document.characters || Array.isArray(document.characters))
    throw new Error('Versi konfigurasi preview tidak didukung.');
  /** @type {{version:number,characters:Record<string,PreviewEntry>,branding?:{logo:string|null}}} */
  const clean = { version: 1, characters: {} };
  if (document.branding !== undefined) {
    const logo = /** @type {{logo?:unknown}} */ (document.branding)?.logo;
    if (logo !== null && (typeof logo !== 'string' || !/^selection-previews\/brand\/[a-f0-9]{64}\.(png|webp|jpg)$/.test(logo)))
      throw new Error('Path logo tidak valid.');
    clean.branding = { logo };
  }
  for (const [id, value] of Object.entries(document.characters)) {
    if (!ids.includes(id) || !value || typeof value !== 'object') throw new Error('ID karakter tidak valid.');
    const entry = { ...previewDefaults(id), ...value };
    /** @type {Array<{key:'scale'|'x'|'y',min:number,max:number}>} */
    const bounds = [{ key: 'scale', min: .25, max: 2 }, { key: 'x', min: -50, max: 50 }, { key: 'y', min: -50, max: 50 }];
    for (const { key, min, max } of bounds) {
      if (typeof entry[key] !== 'number' || !Number.isFinite(entry[key]) || entry[key] < min || entry[key] > max)
        throw new Error(`${id}: ${key} di luar batas.`);
    }
    for (const kind of /** @type {Array<'animated'|'static'>} */ (['animated', 'static'])) {
      if (entry[kind] !== null && (typeof entry[kind] !== 'string' ||
        !new RegExp(`^selection-previews/${id}/[a-f0-9]{64}\\.(gif|png|webp|jpg)$`).test(entry[kind])))
        throw new Error(`${id}: path aset tidak valid.`);
    }
    clean.characters[id] = { animated: entry.animated, static: entry.static, scale: entry.scale, x: entry.x, y: entry.y };
  }
  return clean;
}
