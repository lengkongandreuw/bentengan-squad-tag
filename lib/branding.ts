import settings from '../config/selection-previews.json';
import { publicAsset } from './characters.ts';

export const PRODUCT_COPYRIGHT = '© 2026 Big Dade Interactive (PT Kawanua Virtual Teknologi). All rights reserved.';

// Optional field keeps older v1 manifests compatible.
export const landingLogoAsset = () => {
  const branding = (settings as { branding?: { logo?: string | null } }).branding;
  return publicAsset(branding?.logo || 'brand/benteng-tag-logo.webp?v=9');
};
