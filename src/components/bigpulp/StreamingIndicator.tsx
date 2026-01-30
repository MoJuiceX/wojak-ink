import { motion } from 'framer-motion';

interface StreamingIndicatorProps {
  stage: 'analyzing' | 'searching' | 'generating' | null;
}

const STAGE_MESSAGES = {
  analyzing: 'Analyzing your question...',
  searching: 'Searching collection data...',
  generating: 'Generating response...',
};

export function StreamingIndicator({ stage }: StreamingIndicatorProps) {
  if (!stage) return null;

  return (
    <motion.div
      className="streaming-indicator"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="streaming-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span className="streaming-text">{STAGE_MESSAGES[stage]}</span>
    </motion.div>
  );
}
