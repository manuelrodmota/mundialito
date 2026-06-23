import { Button } from '../../atoms/Button'
import { useLang } from '../../i18n'
import './howToPlay.css'

interface HowToPlayProps {
  onBack: () => void
}

/** Concise one-pager guide — what the game is and how a round plays, in plain English.
 *  Reached from the main menu; the in-match coach-marks (CoachMarks) teach the UI itself.
 *  Rich body strings carry inline <b>/<span class="gold"> markup that varies by language,
 *  so they render via dangerouslySetInnerHTML (developer-authored, no user input). */
export function HowToPlay({ onBack }: HowToPlayProps) {
  const { t } = useLang()
  return (
    <div className="screen htp">
      <div className="stadium-bg" />

      <div className="htp-inner">
        <div className="htp-head">
          <div>
            <span className="kicker">{t('screens.howToPlayKicker')}</span>
            <h1>{t('screens.howToPlayTitle')}</h1>
          </div>
          <Button variant="ghost" onClick={onBack}>
            {t('screens.htpBack')}
          </Button>
        </div>

        <section className="htp-card">
          <h2><span className="ico">🎯</span> {t('screens.htpGoalTitle')}</h2>
          <p dangerouslySetInnerHTML={{ __html: t('screens.htpGoalBody') }} />
        </section>

        <section className="htp-card">
          <h2><span className="ico">⚽</span> {t('screens.htpScoreTitle')}</h2>
          <p dangerouslySetInnerHTML={{ __html: t('screens.htpScoreBody1') }} />
          <p dangerouslySetInnerHTML={{ __html: t('screens.htpScoreBody2') }} />
        </section>

        <section className="htp-card">
          <h2><span className="ico">⏱️</span> {t('screens.htpMatchTitle')}</h2>
          <p dangerouslySetInnerHTML={{ __html: t('screens.htpMatchBody') }} />
        </section>

        <section className="htp-card">
          <h2><span className="ico">🔄</span> {t('screens.htpRoundTitle')}</h2>
          <ol className="htp-steps">
            <li dangerouslySetInnerHTML={{ __html: t('screens.htpRoundStep1') }} />
            <li dangerouslySetInnerHTML={{ __html: t('screens.htpRoundStep2') }} />
            <li dangerouslySetInnerHTML={{ __html: t('screens.htpRoundStep3') }} />
            <li dangerouslySetInnerHTML={{ __html: t('screens.htpRoundStep4') }} />
            <li dangerouslySetInnerHTML={{ __html: t('screens.htpRoundStep5') }} />
          </ol>
        </section>

        <section className="htp-card">
          <h2><span className="ico">🃏</span> {t('screens.htpCardsTitle')}</h2>
          <ul className="htp-bullets">
            <li dangerouslySetInnerHTML={{ __html: t('screens.htpCardsBullet1') }} />
            <li dangerouslySetInnerHTML={{ __html: t('screens.htpCardsBullet2') }} />
            <li dangerouslySetInnerHTML={{ __html: t('screens.htpCardsBullet3') }} />
          </ul>
        </section>

        <section className="htp-card">
          <h2><span className="ico">⚡</span> {t('screens.htpEnergyTitle')}</h2>
          <p dangerouslySetInnerHTML={{ __html: t('screens.htpEnergyBody') }} />
        </section>

        <section className="htp-card">
          <h2><span className="ico">🫁</span> {t('screens.htpStaminaTitle')}</h2>
          <p dangerouslySetInnerHTML={{ __html: t('screens.htpStaminaBody') }} />
        </section>

        <section className="htp-card">
          <h2><span className="ico">🏆</span> {t('screens.htpWinningTitle')}</h2>
          <p dangerouslySetInnerHTML={{ __html: t('screens.htpWinningBody') }} />
        </section>

        <p className="htp-tip" dangerouslySetInnerHTML={{ __html: t('screens.htpTip') }} />

        <div className="htp-foot">
          <Button variant="gold" size="big" onClick={onBack}>
            {t('screens.htpGotIt')}
          </Button>
        </div>
      </div>
    </div>
  )
}
