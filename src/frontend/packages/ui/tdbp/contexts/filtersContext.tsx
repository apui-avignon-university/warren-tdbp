import React, {
  createContext,
  Dispatch,
  SetStateAction,
  useMemo,
  useState,
} from "react";
import { getDefaultDate } from "../utils";

export interface FiltersContextType {
  until: string;
  setUntil: Dispatch<SetStateAction<string>>;
}

const FiltersContext = createContext<FiltersContextType | null>(null);

export const FiltersProvider: React.FC<{ children: any }> = ({ children }) => {
  const defaultDates = getDefaultDate();
  const [until, setUntil] = useState<string>(defaultDates);

  const value = useMemo(() => ({ until, setUntil }), [until]);

  return (
    <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
  );
};

export default FiltersContext;
