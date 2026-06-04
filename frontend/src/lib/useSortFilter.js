import { useState, useMemo } from 'react';

export function useSortFilter(rows, searchFields) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [search, setSearch] = useState('');

  function toggleSort(key) {
    setSortKey((prev) => {
      if (prev === key) { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); return key; }
      setSortDir('asc');
      return key;
    });
  }

  const result = useMemo(() => {
    let out = rows;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((r) =>
        searchFields.some((f) => String(r[f] ?? '').toLowerCase().includes(q))
      );
    }

    if (sortKey) {
      out = [...out].sort((a, b) => {
        const av = a[sortKey] ?? '';
        const bv = b[sortKey] ?? '';
        const cmp = typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return out;
  }, [rows, search, sortKey, sortDir, searchFields]);

  return { result, sortKey, sortDir, toggleSort, search, setSearch };
}
