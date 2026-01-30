import { motion } from 'framer-motion';

interface QuickPromptsProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function QuickPrompts({ prompts, onSelect, disabled }: QuickPromptsProps) {
  return (
    <div className="quick-prompts">
      <span className="quick-prompts-label">Quick questions:</span>
      <motion.div
        className="prompt-chips"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.05 } }
        }}
      >
        {prompts.map((prompt) => (
          <motion.button
            key={prompt}
            className="prompt-chip"
            onClick={() => onSelect(prompt)}
            disabled={disabled}
            variants={{
              hidden: { opacity: 0, scale: 0.8 },
              visible: { opacity: 1, scale: 1 }
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {prompt}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
