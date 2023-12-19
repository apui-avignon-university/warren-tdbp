import React from "react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { QueryClientProvider } from "@tanstack/react-query";
import { CunninghamProvider } from "@openfun/cunningham-react";
import { queryClient } from "../libs/react-query";
import { LTIProvider } from "../contexts/LTIContext";
import { FiltersProvider as TDBPProvider } from "../tdbp/contexts/filtersContext";
import { FiltersProvider as VideoProvider } from "../video/contexts/filtersContext";

type AppProviderProps = {
  children: React.ReactNode;
};

// FIXME - Refactor to decouple video providers from the general App Provider to improve maintainability and usability.
const AppProvider = ({ children }: AppProviderProps) => (
  <CunninghamProvider>
    <LTIProvider>
      <VideoProvider>
        <TDBPProvider>
          <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen />
          </QueryClientProvider>
        </TDBPProvider>
      </VideoProvider>
    </LTIProvider>
  </CunninghamProvider>
);
export default AppProvider;
