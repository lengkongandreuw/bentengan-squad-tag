'use client';
import { t } from '../../lib/language';

/* eslint-disable next/no-img-element -- Static PNG artwork is served directly by the GitHub Pages build. */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CHARACTER_BY_ID, publicAsset, type CharacterId } from '../../lib/characters.ts';
import { canPurchaseUltimateUpgrade, getEffectiveUltimateStats, getNextUltimateUpgrade,
  getTokenBalance, getUltimateUpgradeLevel, ultimateUpgradeCatalog, economyRules,
  purchasePlayerUltimateUpgrade, createLocalId, type LocalPlayerProfile,
  type UltimateUpgradeLevel, type UltimatePurchaseReason } from '../../lib/player-profile/index.ts';
import { TokenWallet } from './token-wallet.tsx';

const names = { raja: 'TITAH HALILINTAR', kaka: 'PERISAI HIJAU' };
const currency = economyRules.currency.label;
const messages: Record<UltimatePurchaseReason, string> = {
  applied: 'Upgrade siap untuk pertandingan berikutnya.', insufficient_balance: `${currency} belum cukup. Cek saldo terbarumu.`,
  max_level: 'Level maksimum sudah tercapai.', unsupported_character: 'Karakter ini tidak memiliki upgrade.',
  character_locked: 'Buka karakter ini dulu untuk upgrade.', duplicate: 'Upgrade ini sudah dibeli. DOI tidak dipotong dua kali.',
  invalid: 'Upgrade belum bisa diproses. Tutup panel, lalu coba lagi.',
  level_mismatch: 'Level sudah berubah. Cek upgrade terbaru sebelum membeli.',
  storage_failed: `Gagal menyimpan di browser. ${currency} tidak dipotong. Coba lagi setelah penyimpanan tersedia.`,
};
function Stats({ stats }: { stats: Pick<UltimateUpgradeLevel, 'durationMs' | 'castMs' | 'rechargeSeconds' | 'speedMultiplier'> }) {
  return <dl className="ultimate-upgrade-stats">
    <div><dt>{t("Durasi efek")}</dt><dd>{t(stats.durationMs / 1000)}{t(" detik")}</dd></div>
    <div><dt>{t("Isi ulang")}</dt><dd>{t(stats.rechargeSeconds)}{t(" detik")}</dd></div>
    <div><dt>{t("Waktu aktivasi")}</dt><dd>{t(stats.castMs / 1000)}{t(" detik")}</dd></div>
    {t(stats.speedMultiplier !== undefined && <div><dt>{t("Kecepatan tim")}</dt><dd>{t("+")}{t(Math.round((stats.speedMultiplier - 1) * 100))}{t("%")}</dd></div>)}
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
      <span>{t("ULTIMATE — ")}{t(names[characterId as keyof typeof names] ?? CHARACTER_BY_ID[characterId].name)}</span>
    </h2>
    <div className="ultimate-upgrade-meta"><p>{t("LEVEL ")}{t(current.level)}{t(" / ")}{t(catalog.levels.length - 1)}</p>
      <TokenWallet profile={profile} /></div>
    <div className="ultimate-upgrade-comparison">
      <section><h3>{t("SAAT INI")}</h3><Stats stats={current} /></section>
      {t(next && <section><h3>{t("LEVEL BERIKUTNYA · ")}{t(next.level)}</h3><Stats stats={next} /></section>)}
    </div>
    {t(next ? <div className="ultimate-upgrade-cost"><p>{t("Biaya: ")}<b>{t(next.cost)} {t(currency)}</b></p>
      {t(getTokenBalance(profile) < next.cost && <p>{t("Butuh ")}{t(next.cost - getTokenBalance(profile))} {t(currency)}{t(" lagi.")}</p>)}</div>
      : <p>{t("LEVEL MAKSIMAL — Ultimate sudah mentok!")}</p>)}
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
    {t(current && <button type="button" onKeyDown={event => event.stopPropagation()}
      onClick={() => setOpen(true)}>{t("UPGRADE ULTIMATE · LV.")}{t(current.level)}</button>)}
    {t(open && current && typeof document !== 'undefined' && createPortal(
      <dialog ref={dialog} className="ultimate-upgrade-dialog" aria-labelledby="ultimate-upgrade-title"
        onKeyDown={event => event.stopPropagation()} onCancel={close}>
        <div className="ultimate-upgrade-card">
        <button type="button" className="ultimate-upgrade-close" onClick={close} autoFocus aria-label={t("Tutup upgrade")}>
          <img src={publicAsset('ui-v2/economy/close.png')} alt="" aria-hidden="true" /><span aria-hidden="true">{t("×")}</span>
        </button>
        <UltimateUpgradeDetails profile={profile} characterId={characterId} />
        {t(quote ? <section className="ultimate-purchase-confirm" aria-label={t("Konfirmasi pembelian")}>
          <h3>{t("KONFIRMASI LEVEL ")}{t(quote.level + 1)}</h3>
          <p>{t(CHARACTER_BY_ID[characterId].name)}{t(" · ")}{t(quote.cost)} {t(currency)}</p>
          <p>{t("Saldo setelah pembelian: ")}{t(Math.max(0, getTokenBalance(profile) - quote.cost))} {t(currency)}</p>
          {t((!canPurchaseUltimateUpgrade(profile, characterId) || getUltimateUpgradeLevel(profile, characterId) !== quote.level) &&
            <p role="alert">{t("Saldo atau level telah berubah. Batalkan dan periksa penawaran terbaru.")}</p>)}
          <button type="button" disabled={!canPurchaseUltimateUpgrade(profile, characterId) || getUltimateUpgradeLevel(profile, characterId) !== quote.level}
            onClick={confirm}>{t("KONFIRMASI PEMBELIAN")}</button>
          <button type="button" onClick={() => setQuote(null)}>{t("BATAL")}</button>
        </section> : <div className="ultimate-upgrade-footer"><button type="button" disabled={!canPurchaseUltimateUpgrade(profile, characterId)}
          onClick={() => { if (next) { setMessage(''); setQuote({ level: getUltimateUpgradeLevel(profile, characterId), cost: next.cost, transactionId: createLocalId('ultimate-purchase') }); } }}>
          {t(!next ? 'LEVEL MAKSIMAL' : canPurchaseUltimateUpgrade(profile, characterId) ? `UPGRADE · ${next.cost} ${currency}` : `${currency} BELUM CUKUP`)}
        </button><small>{t("Dipakai mulai pertandingan berikutnya. Tersimpan di browser ini, bukan akun online.")}</small></div>)}
        <output aria-live="polite">{t(message)}</output>
        <img className="ultimate-upgrade-accent" src={publicAsset('ui-v2/economy/accent.png')} alt="" aria-hidden="true" />
        </div>
      </dialog>, document.body))}
  </div>;
}
