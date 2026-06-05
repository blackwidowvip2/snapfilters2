import React, { useState } from 'react';
import { FILTER_CATEGORIES, FILTERS } from '../filters/registry';
import { useStore } from '../store/useStore';
import styles from './FilterBar.module.css';

export const FilterBar: React.FC = () => {
  const { activeFilter, setFilter } = useStore();
  const [activeCat, setActiveCat] = useState(FILTER_CATEGORIES[0].id);

  const visible = FILTERS.filter(f => f.category === activeCat);

  return (
    <div className={styles.bar}>
      {/* Category tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeFilter === 'none' ? styles.tabActive : ''}`}
          onClick={() => { setFilter('none'); setActiveCat(FILTER_CATEGORIES[0].id); }}
        >
          🚫 Ingen
        </button>
        {FILTER_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`${styles.tab} ${activeCat === cat.id ? styles.tabActive : ''}`}
            onClick={() => setActiveCat(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Filter strip */}
      <div className={styles.strip}>
        {visible.map(f => (
          <button
            key={f.id}
            className={`${styles.filterBtn} ${activeFilter === f.id ? styles.filterBtnActive : ''}`}
            onClick={() => setFilter(f.id)}
            title={f.description}
          >
            <span className={styles.filterIcon}>{f.icon}</span>
            <span className={styles.filterLabel}>{f.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
