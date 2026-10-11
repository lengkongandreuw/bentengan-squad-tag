import type { MatchFormatView } from '../game-core/snapshot-types';
import type { Team } from '../world/map-data/field-types';
import { PERK_BY_ID, type PerkId } from '../gameplay/perks.ts';
import { teamName } from '../world/team-tables.ts';
import { t } from '../../lib/language';

const perk = (id: string) => PERK_BY_ID[id as PerkId];

// Small active-perk badges next to a team's score. Tooltip carries the effect.
export const PerkIcons = ({ perks, team }: { perks: string[]; team: Team }) =>
  perks.length ? (
    <span className={`hud-perks ${team}`} aria-label={t(`Perk ${teamName(team)}: ${perks.map((id) => perk(id)?.name ?? id).join(', ')}`)}>
      {perks.map((id) => (
        <i key={id} title={`${perk(id)?.name ?? id} · ${t(perk(id)?.description ?? '')}`}>{perk(id)?.icon ?? '•'}</i>
      ))}
    </span>
  ) : null;

// Between-round perk draft. The losing team picks one of three; the winner then
// receives one of the rest at random. Pure presentation: the pick goes out via onPick.
export const PerkDraftPanel = ({
  draft,
  playerTeam,
  onPick,
}: {
  draft: NonNullable<MatchFormatView['draft']>;
  playerTeam: Team;
  onPick: (id: PerkId) => void;
}) => {
  const loserName = teamName(draft.loser);
  const winnerName = teamName(draft.winner);
  return (
    <section className="perk-draft" aria-labelledby="perk-draft-title">
      <header>
        <span>{t('DRAFT PERK')}</span>
        <h3 id="perk-draft-title">
          {t(draft.resolved
            ? 'Perk dipilih untuk sisa match'
            : draft.humanPicks
              ? `Pilih 1 perk untuk timmu · ${draft.remaining} detik`
              : `${loserName} sedang memilih perk…`)}
        </h3>
        {!draft.resolved && draft.humanPicks && (
          <p>{t('Timmu kalah di ronde ini. Perk berlaku sampai match selesai; tim pemenang mendapat 1 perk sisa secara acak.')}</p>
        )}
      </header>
      {!draft.resolved && draft.offer.length > 0 && (
        <fieldset className="perk-draft-options">
          <legend className="sr-only">{t('Pilihan perk')}</legend>
          {draft.offer.map((id) => (
            <button
              key={id}
              type="button"
              className="perk-option"
              disabled={!draft.humanPicks}
              onClick={() => onPick(id as PerkId)}
            >
              <i aria-hidden="true">{perk(id)?.icon}</i>
              <b>{t(perk(id)?.name ?? id)}</b>
              <small>{t(perk(id)?.description ?? '')}</small>
            </button>
          ))}
        </fieldset>
      )}
      {draft.resolved && (
        <ul className="perk-draft-result">
          {draft.loserPick && (
            <li className={draft.loser === playerTeam ? 'mine' : ''}>
              <i aria-hidden="true">{perk(draft.loserPick)?.icon}</i>
              {t(`${loserName} · ${perk(draft.loserPick)?.name ?? draft.loserPick}`)}
            </li>
          )}
          {draft.winnerPick && (
            <li className={draft.winner === playerTeam ? 'mine' : ''}>
              <i aria-hidden="true">{perk(draft.winnerPick)?.icon}</i>
              {t(`${winnerName} · ${perk(draft.winnerPick)?.name ?? draft.winnerPick}`)}
            </li>
          )}
          {!draft.loserPick && !draft.winnerPick && <li>{t('Kedua tim sudah memiliki perk maksimal.')}</li>}
        </ul>
      )}
    </section>
  );
};

// Per-round summary for the final recap: winner, how, points and duration.
export const RoundHistoryTable = ({ match }: { match: MatchFormatView }) => (
  <table className="round-history">
    <caption>{t('Rekap ronde')} · {t(match.label)}</caption>
    <thead>
      <tr><th>{t('Ronde')}</th><th>{t('Pemenang')}</th><th>{t('Cara menang')}</th><th>{t('Poin')}</th><th>{t('Durasi')}</th></tr>
    </thead>
    <tbody>
      {match.rounds.map((r) => (
        <tr key={r.round} className={r.winner}>
          <td>{r.golden ? t('Emas') : r.final ? `${r.round} · ×2` : r.round}</td>
          <td>{t(teamName(r.winner))}</td>
          <td>{t(r.reason)}</td>
          <td>+{r.points}</td>
          <td>{Math.floor(r.durationSec / 60)}:{String(r.durationSec % 60).padStart(2, '0')}</td>
        </tr>
      ))}
    </tbody>
  </table>
);
