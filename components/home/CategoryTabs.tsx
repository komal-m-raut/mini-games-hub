'use client';

import { motion } from 'framer-motion';

const CATEGORIES = [
  { id: 'all', label: 'All Games' },
  { id: 'puzzle', label: 'Puzzle' },
  { id: 'reflex', label: 'Reflex' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'relaxing', label: 'Relaxing' },
];

interface CategoryTabsProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryTabs({ activeCategory, onCategoryChange }: CategoryTabsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="flex gap-2 overflow-x-auto pb-2 -mb-2"
    >
      {CATEGORIES.map((category) => (
        <motion.button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={`relative px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
            activeCategory === category.id
              ? 'text-white'
              : 'text-text-muted hover:text-text-primary'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {activeCategory === category.id && (
            <motion.div
              layoutId="category-bg"
              className="absolute inset-0 bg-brand-purple/20 border border-brand-purple/50 rounded-full"
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            />
          )}
          <span className="relative z-10">{category.label}</span>
        </motion.button>
      ))}
    </motion.div>
  );
}
