'use client';
/* eslint-disable next/no-img-element -- Static PNG artwork is served directly by the GitHub Pages build. */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CHARACTER_BY_ID, publicAsset, type CharacterId } from '../../lib/characters';
import { canPurchaseUltimateUpgrade, getEffectiveUltimateStats, getNextUltimateUpgrade,
  getTokenBalance, getUltimateUpgradeLevel, ultimateUpgradeCatalog, economyRules,
  purchasePlayerUltimateUpgrade, createLocalId, type LocalPlayerProfile,
  type UltimateUpgradeLevel, type UltimatePurchaseReason } from '../../lib/player-profile';
import { TokenWallet } from './token-wallet';

const names = { raja: 'TITAH HALILINTAR', kaka: 'PERISAI HIJAU' };
const currency = economyRules.currency.label;
const messages: Record<UltimatePurchaseReason, string> = {
  applied: 'Upgrade tersimpan.', insufficient_balance: `${currency} belum cukup. Saldo telah diperbarui.`,
  max_level: 'Level maksimum sudah tercapai.', unsupported_character: 'Karakter ini tidak memiliki upgrade.',
  character_locked: 'Karakter belum terbuka.', duplicate: 'Pembelian ini sudah diproses; tidak dipotong lagi.',
  invalid: 'Data pembelian tidak valid. Tutup panel lalu coba lagi.',
  level_mismatch: 'Level telah berubah. Periksa penawaran terbaru sebelum membeli.',
  storage_failed: `Gagal menyimpan di browser. ${currency} tidak dipotong. Coba lagi setelah penyimpanan tersedia.`,
};
function Stats({ stats }: { stats: Pick<UltimateUpgradeLevel, 'durationMs' | 'castMs' | 'rechargeSeconds' | 'speedMultiplier'> }) {
  return <dl className="ultimate-upgrade-stats">
    <div><dt>Durasi efek</dt><dd>{stats.durationMs / 1000} detik</dd></div>
    <div><dt>Recharge</dt><dd>{stats.rechargeSeconds} detik</dd></div>
    <div><dt>Cast</dt><dd>{stats.castMs / 1000} detik</dd></div>
    {stats.speedMultiplier !== undefined && <div><dt>Speed tim</dt><dd>+{Math.round((stats.speedMultiplier - 1) * 100)}%</dd></div>}
  </dl>;
}

// Presentation reads resolver/catalog only; never performs wallet/stat mutations.
export function UltimateUpgradeDetails({ profile, characterId }: { profile: LocalPlayerProfile; characterId: CharacterId }) {
  const current = getEffectiveUltimateStats(profile, characterId);
  const catalog = ultimateUpgradeCatalog.characters.find(c => c.characterId === characterId);
  if (!current || !catalog) return null;
  const next = getNextUltimateUpgrade(profile, characterId);
  return <>
    <h2 id="ultimate-upgrade-title" className="ultimate-upgrade-title">
      <img src={publicAsset('ui-v2/economy/label.png')} alt="" aria-hidden="true" />
      <span>ULTIMATE — {names[characterId as keyof typeof names] ?? CHARACTER_BY_ID[characterId].name}</span>
    </h2>
    <div className="ultimate-upgrade-meta"><p>LEVEL {current.level} / {catalog.levels.length - 1}</p>
      <TokenWallet profile={profile} /></div>
    <div className="ultimate-upgrade-comparison">
      <section><h3>SAAT INI</h3><Stats stats={current} /></section>
      {next && <section><h3>LEVEL BERIKUTNYA · {next.level}</h3><Stats stats={next} /></section>}
    </div>
    {next ? <div className="ultimate-upgrade-cost"><p>Biaya: <b>{next.cost} {currency}</b></p>
      {getTokenBalance(profile) < next.cost && <p>Butuh {next.cost - getTokenBalance(profile)} {currency} lagi.</p>}</div>
      : <p>MAX LEVEL — Ultimate sudah maksimal.</p>}
  </>;
}

export function UltimateUpgradePanel({ profile, characterId, onRefresh }: {
  profile: LocalPlayerProfile; characterId: CharacterId; onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [quote, setQuote] = useState<{ level: number; cost: number; transactionId: string } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const busy = useRef(false);
  const consumedQuote = useRef('');
  const current = getEffectiveUltimateStats(profile, characterId);
  const next = getNextUltimateUpgrade(profile, characterId);
  useEffect(() => {
    if (!open || !dialog.current) return;
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, [open]);
  const close = () => { setOpen(false); setQuote(null); setMessage(''); };
  const confirm = () => {
    if (!quote || busy.current || consumedQuote.current === quote.transactionId) return;
    busy.current = true;
    consumedQuote.current = quote.transactionId;
    try {
      const result = purchasePlayerUltimateUpgrade(characterId, quote.transactionId, quote.level);
      setMessage(result ? result.applied ? `Berhasil! Ultimate level ${result.currentLevel} tersimpan.` : messages[result.reason]
        : 'Profil tidak tersedia. Buka kembali profil pemain.');
      setQuote(null);
      onRefresh();
    } catch {
      setMessage('Pembelian tidak dapat diproses. Muat ulang profil sebelum mencoba kembali.');
      setQuote(null);
      onRefresh();
    } finally { busy.current = false; }
  };
  return <div className="selection-economy">
    <TokenWallet profile={profile} />
    {current && <button type="button" onKeyDown={event => event.stopPropagation()}
      onClick={() => setOpen(true)}>UPGRADE ULTIMATE · LV.{current.level}</button>}
    {open && current && typeof document !== 'undefined' && createPortal(
      <dialog ref={dialog} className="ultimate-upgrade-dialog" aria-labelledby="ultimate-upgrade-title"
        onKeyDown={event => event.stopPropagation()} onCancel={close}>
        <div className="ultimate-upgrade-card">
        <button type="button" className="ultimate-upgrade-close" onClick={close} autoFocus aria-label="Tutup upgrade">
          <img src={publicAsset('ui-v2/economy/close.png')} alt="" aria-hidden="true" /><span aria-hidden="true">×</span>
        </button>
        <UltimateUpgradeDetails profile={profile} characterId={characterId} />
        {quote ? <section className="ultimate-purchase-confirm" aria-label="Konfirmasi pembelian">
          <h3>KONFIRMASI LEVEL {quote.level + 1}</h3>
          <p>{CHARACTER_BY_ID[characterId].name} · {quote.cost} {currency}</p>
          <p>Saldo setelah pembelian: {Math.max(0, getTokenBalance(profile) - quote.cost)} {currency}</p>
          {(!canPurchaseUltimateUpgrade(profile, characterId) || getUltimateUpgradeLevel(profile, characterId) !== quote.level) &&
            <p role="alert">Saldo atau level telah berubah. Batalkan dan periksa penawaran terbaru.</p>}
          <button type="button" disabled={!canPurchaseUltimateUpgrade(profile, characterId) || getUltimateUpgradeLevel(profile, characterId) !== quote.level}
            onClick={confirm}>KONFIRMASI PEMBELIAN</button>
          <button type="button" onClick={() => setQuote(null)}>BATAL</button>
        </section> : <div className="ultimate-upgrade-footer"><button type="button" disabled={!canPurchaseUltimateUpgrade(profile, characterId)}
          onClick={() => { if (next) { setMessage(''); setQuote({ level: getUltimateUpgradeLevel(profile, characterId), cost: next.cost, transactionId: createLocalId('ultimate-purchase') }); } }}>
          {!next ? 'MAX LEVEL' : canPurchaseUltimateUpgrade(profile, characterId) ? `UPGRADE · ${next.cost} ${currency}` : `${currency} BELUM CUKUP`}
        </button><small>Upgrade berlaku pada pertandingan berikutnya. Data tersimpan lokal di browser ini.</small></div>}
        <output aria-live="polite">{message}</output>
        <img className="ultimate-upgrade-accent" src={publicAsset('ui-v2/economy/accent.png')} alt="" aria-hidden="true" />
        </div>
      </dialog>, document.body)}
  </div>;
}
