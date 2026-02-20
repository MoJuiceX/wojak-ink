/**
 * Aggressive Rival Messages
 * 
 * Maximum aggression level copy for the position indicator.
 * Dynamic variants based on point gap.
 */

export interface RivalMessageContext {
  rivalName: string;
  pointsAhead: number;
  wasJustPassed?: boolean;
}

/**
 * Standard aggressive messages (any gap)
 */
const STANDARD_MESSAGES = [
  "🎯 {gap} pts to DETHRONE {rival}'s reign 💀",
  "🎯 {gap} pts. {rival}'s spot has your name on it. TAKE IT.",
  "🎯 {gap} pts to make {rival} a footnote in history.",
  "🎯 {gap} pts between you and ending {rival}. Finish them.",
  "🎯 {rival}'s throne is waiting. {gap} pts. Claim it.",
];

/**
 * Small gap messages (<50 pts) - Extra urgent
 */
const SMALL_GAP_MESSAGES = [
  "🔥 {rival} is SWEATING. Just {gap} pts. END THIS.",
  "🔥 {gap} pts. One good run and {rival} is DONE.",
  "🔥 SO CLOSE. {gap} pts to destroy {rival}.",
  "🔥 {gap} pts. {rival} can feel you breathing down their neck.",
  "🔥 {rival}'s lead is crumbling. {gap} pts. FINISH THEM.",
];

/**
 * Large gap messages (>200 pts) - Motivational grind
 */
const LARGE_GAP_MESSAGES = [
  "💪 {gap} pts to topple {rival}. The climb starts now.",
  "💪 {rival} has {gap} pts on you. Time to GRIND.",
  "💪 {gap} pts. {rival} thinks they're safe. Prove them wrong.",
  "💪 {gap} pts is nothing. Hunt down {rival}.",
  "💪 The gap to {rival}: {gap} pts. Every point counts.",
];

/**
 * Just got passed messages - Personal vendetta
 */
const PASSED_MESSAGES = [
  "😤 {rival} just took YOUR spot. {gap} pts to take it back. NOW.",
  "😤 {rival} passed you. {gap} pts to make it personal.",
  "😤 {rival} thinks they're better? {gap} pts says otherwise.",
  "😤 {rival} stole your rank. {gap} pts to get it back.",
  "😤 You let {rival} pass you? {gap} pts. FIX THIS.",
];

/**
 * Get a random message from an array
 */
function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Format message with context
 */
function formatMessage(template: string, context: RivalMessageContext): string {
  return template
    .replace(/{rival}/g, context.rivalName)
    .replace(/{gap}/g, context.pointsAhead.toLocaleString());
}

/**
 * Get aggressive rival message based on context
 */
export function getRivalMessage(context: RivalMessageContext): string {
  const { pointsAhead, wasJustPassed } = context;

  let messages: string[];

  if (wasJustPassed) {
    messages = PASSED_MESSAGES;
  } else if (pointsAhead < 50) {
    messages = SMALL_GAP_MESSAGES;
  } else if (pointsAhead > 200) {
    messages = LARGE_GAP_MESSAGES;
  } else {
    messages = STANDARD_MESSAGES;
  }

  const template = getRandomMessage(messages);
  return formatMessage(template, context);
}

/**
 * Get a deterministic message (for consistent display)
 * Uses rivalName + pointsAhead to generate consistent index
 */
export function getDeterministicRivalMessage(context: RivalMessageContext): string {
  const { pointsAhead, wasJustPassed, rivalName } = context;

  let messages: string[];

  if (wasJustPassed) {
    messages = PASSED_MESSAGES;
  } else if (pointsAhead < 50) {
    messages = SMALL_GAP_MESSAGES;
  } else if (pointsAhead > 200) {
    messages = LARGE_GAP_MESSAGES;
  } else {
    messages = STANDARD_MESSAGES;
  }

  // Create deterministic index from rivalName
  const hash = rivalName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = hash % messages.length;

  const template = messages[index];
  return formatMessage(template, context);
}

/**
 * Collapsed peek bar text (shorter)
 */
export function getPeekBarText(context: RivalMessageContext): string {
  const { rivalName, pointsAhead } = context;
  
  if (pointsAhead < 50) {
    return `🔥 ${pointsAhead} pts to DETHRONE ${rivalName}!`;
  }
  return `🎯 ${pointsAhead} pts to overtake ${rivalName}`;
}

/**
 * Get all message categories for preview/testing
 */
export function getAllMessageCategories() {
  return {
    standard: STANDARD_MESSAGES,
    smallGap: SMALL_GAP_MESSAGES,
    largeGap: LARGE_GAP_MESSAGES,
    passed: PASSED_MESSAGES,
  };
}
