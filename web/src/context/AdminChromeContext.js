import React, { createContext, useContext, useLayoutEffect, useState } from "react";

const ChromeStateContext = createContext({ title: "", actions: null, backTo: -1 });
const ChromeSetContext = createContext(() => {});

export function AdminChromeProvider({ children }) {
  const [chrome, setChrome] = useState({ title: "", actions: null, backTo: -1 });
  return (
    <ChromeSetContext.Provider value={setChrome}>
      <ChromeStateContext.Provider value={chrome}>
        {children}
      </ChromeStateContext.Provider>
    </ChromeSetContext.Provider>
  );
}

export function useAdminChromeState() {
  return useContext(ChromeStateContext);
}

// Pages call this once. actions may be a node; backTo defaults to -1 (history back).
export function useAdminChrome({ title, actions = null, backTo = -1 }) {
  const setChrome = useContext(ChromeSetContext);
  useLayoutEffect(() => {
    setChrome({ title, actions, backTo });
  }, [setChrome, title, actions, backTo]);
}
