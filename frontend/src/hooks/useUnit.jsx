import { createContext, useContext, useState } from 'react';

const UnitContext = createContext({ unit: 'kg', setUnit: () => {} });

export function UnitProvider({ children }) {
  const [unit, setUnitState] = useState(() => localStorage.getItem('ht_unit') || 'kg');

  function setUnit(u) {
    setUnitState(u);
    localStorage.setItem('ht_unit', u);
  }

  return <UnitContext.Provider value={{ unit, setUnit }}>{children}</UnitContext.Provider>;
}

export function useUnit() {
  return useContext(UnitContext);
}
