/* eslint-disable next/no-img-element -- Static PNG artwork is served directly by the GitHub Pages build. */
import { getTokenBalance, economyRules, type LocalPlayerProfile } from '../../lib/player-profile';
import { publicAsset } from '../../lib/characters';

export function TokenWallet({ profile }: { profile: LocalPlayerProfile }) {
  return <span className="token-wallet" aria-label={`Saldo ${getTokenBalance(profile)} ${economyRules.currency.label}`}>
    <img src={publicAsset('ui-v2/economy/doi-coin.png')} alt="" aria-hidden="true" />
    <span>{economyRules.currency.label}</span> <b>{getTokenBalance(profile).toLocaleString('id-ID')}</b>
  </span>;
}
