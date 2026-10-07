import {
  characterAsset,
  characterFullBodyPortrait,
  characterPreviewIcon,
  type CharacterId,
} from '../../lib/characters.ts';

export const CharacterPreview = ({
  id,
  alt = '',
  eager = false,
  className,
  variant = 'icon',
}: {
  id: CharacterId;
  alt?: string;
  eager?: boolean;
  className?: string;
  variant?: 'icon' | 'full';
}) => (
  <img
    className={className}
    data-character={id}
    src={
      variant === 'full'
        ? characterFullBodyPortrait(id)
        : characterPreviewIcon(id)
    }
    alt={alt}
    loading={eager ? 'eager' : 'lazy'}
    decoding="async"
    onError={(event) => {
      if (event.currentTarget.dataset.fallback === 'true') return;
      event.currentTarget.dataset.fallback = 'true';
      const fallback = characterAsset(id, 'portrait.webp');
      event.currentTarget.src = fallback;
    }}
  />
);
