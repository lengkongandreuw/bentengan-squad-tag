/* oxlint-disable next/no-img-element -- Static Pages PNGs are losslessly staged and preloaded through the existing UI resolver; no image server is available. */
import { useEffect, useRef } from 'react';
import { t } from '../../lib/language';
import type { CharacterId } from '../../lib/characters';
import { CHARACTER_BY_ID } from '../../lib/characters.ts';
import type { Faction, FieldConfig, FieldId } from '../world/map-data/field-types';
import { CharacterPreview } from './character-preview.tsx';
import { mapSelectionFiles, mapSelectionTheme, type ArenaSelectionState } from './map-selection-assets';

export const FieldSelectScreen = ({ faction, selectedFieldId, fields, squad,
  arenaStates, resolveAsset, onSelect, onStep, onStart, formats, matchFormat, onMatchFormat }: {
  faction?: Faction | null; selectedFieldId: FieldId; fields: FieldConfig[]; squad: CharacterId[];
  arenaStates: ArenaSelectionState[]; resolveAsset: (file: string) => string;
  onSelect: (id: FieldId) => void; onStep: (direction: -1 | 1) => void; onStart: () => void;
  /** Match format choice (5 rounds / 7-round tournament); omitted hides the toggle. */
  formats?: { id: string; label: string }[]; matchFormat?: string; onMatchFormat?: (id: string) => void;
}) => {
  const list = useRef<HTMLDivElement>(null);
  const selected = fields.find(field => field.id === selectedFieldId) ?? fields[0];
  const state = arenaStates.find(item => item.id === selected?.id);
  const unlocked = state?.unlocked === true;
  const files = mapSelectionFiles(faction);
  const requirement = state?.requirementParts?.length
    ? t(`Selesaikan syarat: ${state.requirementParts.map(part => t(part)).join(', ')}.`)
    : t(state?.requirement ?? 'Arena ini belum dapat dimainkan.');
  const art = (part: keyof typeof files) => resolveAsset(files[part]);
  useEffect(() => {
    const container = list.current;
    const row = container?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!container || !row) return;
    if (row.offsetTop < container.scrollTop) container.scrollTop = row.offsetTop;
    else if (row.offsetTop + row.offsetHeight > container.scrollTop + container.clientHeight)
      container.scrollTop = row.offsetTop + row.offsetHeight - container.clientHeight;
    if (row.offsetLeft < container.scrollLeft) container.scrollLeft = row.offsetLeft;
    else if (row.offsetLeft + row.offsetWidth > container.scrollLeft + container.clientWidth)
      container.scrollLeft = row.offsetLeft + row.offsetWidth - container.clientWidth;
  }, [selectedFieldId]);
  if (!selected) return null;
  return <section className={`map-select-v2 theme-${mapSelectionTheme(faction)}`} aria-labelledby="field-title">
    <h1 id="field-title" className="sr-only">{t('Pilih arena')}</h1>
    <div className="map-select-stage">
      <div className={`map-main-preview ${unlocked ? '' : 'locked'}`}>
        <img src={resolveAsset(`fields/${selected.id}.webp`)} alt={t(selected.name)} />
        {!unlocked && <img className="map-preview-lock" src={art('lock')} alt={t('TERKUNCI')} />}
      </div>
      <img className="map-art-frame" src={art('frame')} alt="" aria-hidden="true" />
      <img className="map-art-title" src={art('title')} alt="" aria-hidden="true" />
      <div className="map-arena-list" ref={list} aria-label={t('Pilihan arena')}>
        {fields.map(field => {
          const active = field.id === selectedFieldId;
          const locked = !arenaStates.find(item => item.id === field.id)?.unlocked;
          return <button type="button" key={field.id} className={`map-arena-row ${active ? 'selected' : ''}`}
            aria-pressed={active} aria-label={`${t(field.name)}${locked ? ` · ${t('TERKUNCI')}` : ''}`}
            onClick={() => onSelect(field.id)} title={t(field.name)}>
            <img className="map-row-art" src={art(active ? 'selectedRow' : 'row')} alt="" aria-hidden="true" />
            <span className="map-row-thumbnail"><img src={resolveAsset(`fields/${field.id}.webp`)} alt="" />
              {locked && <img className="map-row-lock" src={art('lock')} alt="" />}</span>
            <strong>{t(field.name)}</strong>
          </button>;
        })}
      </div>
      <div className="map-list-navigation">
        <button type="button" onClick={() => onStep(-1)} aria-label={t('Arena sebelumnya')}>‹</button>
        <span>{fields.findIndex(field => field.id === selected.id) + 1} / {fields.length}</span>
        <button type="button" onClick={() => onStep(1)} aria-label={t('Arena berikutnya')}>›</button>
      </div>
      <div className="map-arena-info" aria-live="polite">
        <img src={art('info')} alt="" aria-hidden="true" />
        <div className="map-info-difficulty">{t(selected.difficulty)}</div>
        <h2 title={t(selected.name)}>{t(selected.name)}</h2>
        <p>{unlocked ? t(selected.kicker) : t(requirement || 'Arena ini belum dapat dimainkan.')}</p>
      </div>
      <div className="map-squad" aria-label={t('Skuad')}>
        {squad.map((id, index) => <figure key={id} className={index === 0 ? 'controlled' : ''}>
          <CharacterPreview id={id} alt={t(CHARACTER_BY_ID[id].name)} eager={index === 0} />
          <figcaption>{t(index === 0 ? 'KAMU' : CHARACTER_BY_ID[id].name)}</figcaption>
        </figure>)}
      </div>
      {formats && onMatchFormat && (
        <div className="map-format-toggle" aria-label={t('Format match')}>
          {formats.map(format => (
            <button key={format.id} type="button" aria-pressed={matchFormat === format.id}
              className={matchFormat === format.id ? 'active' : ''} onClick={() => onMatchFormat(format.id)}>
              {t(format.label)}
            </button>
          ))}
        </div>
      )}
      <button type="button" className="map-start-match" aria-label={t('Mulai Match')}
        disabled={!unlocked} aria-disabled={!unlocked} onClick={() => { if (unlocked) onStart(); }}>
        <img src={art('start')} alt="" aria-hidden="true" />
      </button>
    </div>
  </section>;
};
