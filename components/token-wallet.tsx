import { t, getLanguage } from '../lib/language';
/* eslint-disable next/no-img-element -- Static PNG artwork is served directly by the GitHub Pages build. */
import { getTokenBalance, economyRules, type LocalPlayerProfile } from '../lib/player-profile';
import { publicAsset } from '../lib/characters';

export function TokenWallet({ profile }: { profile: LocalPlayerProfile }) {
  return <span className="token-wallet" aria-label={t(`Saldo ${getTokenBalance(profile)} ${economyRules.currency.label}`)}>
    <img src={publicAsset('ui-v2/economy/doi-coin.png')} alt="" aria-hidden="true" />
    <span>{t(economyRules.currency.label)}</span> <b>{t(getTokenBalance(profile).toLocaleString(getLanguage()==='id'?'id-ID':'en-US'))}</b>
  </span>;
}
