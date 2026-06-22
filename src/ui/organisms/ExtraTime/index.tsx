import { motion, useReducedMotion } from 'framer-motion'
import { fadeIn } from '../../motion'
import { useLang } from '../../i18n'

/** Extra-time banner and board treatment — v10 sudden-death golden goal indicator. */
export function ExtraTimeBanner() {
  const shouldReduceMotion = useReducedMotion()
  const { t } = useLang()

  const variants = shouldReduceMotion ? undefined : fadeIn

  return (
    <motion.div
      className="et-banner7"
      style={{ position: 'static', transform: 'none' }}
      variants={variants}
      initial="hidden"
      animate="visible"
    >
      <span className="et-dot" />
      <b>{t('et.extraTime')}</b>
      <span className="et-sep">·</span>
      {t('et.suddenDeath')}
      <span className="et-sep">·</span>
      {t('et.biggerChance')}
      <span className="et-sep">·</span>
      xG ×2
    </motion.div>
  )
}
