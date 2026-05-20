/**
 * /topuni-ai/ru
 *
 * 2026-05-20: collapsed from a 620-line standalone fork to a thin
 * wrapper around TopUniAI with language="ru". Previously the two
 * pages drifted — the EN component got the 3-step redesign + mono-
 * numeral wizard headers + auto-saved indicator + welcome-back toast
 * while RU stayed on the old structure. Single component means EN
 * and RU stay locked in lock-step from now on.
 *
 * Visible RU copy lives in TopUniAI.tsx as `t("English", "Russian")`
 * pairs. Translate further strings by extending the t() pattern in
 * that file.
 */
import TopUniAI from "./TopUniAI";

const TopUniAIRu = () => <TopUniAI language="ru" />;

export default TopUniAIRu;
