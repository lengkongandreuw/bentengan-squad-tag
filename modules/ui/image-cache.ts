import { publicAsset, kakaUltimateSpriteAsset } from '../../lib/characters.ts';
import { FIELD_ASSET_VERSION } from '../../lib/field-assets.generated.ts';

const fieldImages = new Map<string, HTMLImageElement>();
let sprintDustImage: HTMLImageElement | null = null;
let kakaUltimateImage: HTMLImageElement | null = null;

export const getSprintDustImage = () => {
  if (sprintDustImage) return sprintDustImage;
  sprintDustImage = new Image();
  sprintDustImage.decoding = 'async';
  sprintDustImage.src = publicAsset('vfx/sprint-dust.webp?v=7');
  return sprintDustImage;
};

export const getKakaUltimateImage = () => {
  if (kakaUltimateImage) return kakaUltimateImage;
  kakaUltimateImage = new Image();
  kakaUltimateImage.decoding = 'async';
  kakaUltimateImage.src = kakaUltimateSpriteAsset();
  return kakaUltimateImage;
};

export const getFieldImage = (asset: string) => {
  const url = publicAsset(`field/${asset}?v=${FIELD_ASSET_VERSION}`);
  const cached = fieldImages.get(url);
  if (cached) return cached;
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  fieldImages.set(url, image);
  return image;
};
