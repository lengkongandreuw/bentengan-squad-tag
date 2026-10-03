// Shared browser/server harness: never silently hide built-in arenas.
export function validateCatalog(catalog) {
  const restart = 'Server Map Studio versi lama/tidak lengkap. Simpan draft yang masih terbuka, restart terminal dengan npm run admin:maps, lalu refresh panel.';
  if (!Array.isArray(catalog?.builtins) || !Array.isArray(catalog?.builtinTemplates))
    throw new Error(restart);
  const expected = ['kampung', 'pasar', 'taman', 'kanal', 'kanal2'];
  for (const id of expected) {
    if (!catalog.builtins.some(b => b.id === id && b.editable) ||
        !catalog.builtinTemplates.some(m => m.replaces === id))
      throw new Error(`${restart} Map bawaan hilang: ${id}.`);
  }
  return catalog;
}
