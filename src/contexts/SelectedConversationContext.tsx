import React, { createContext, useContext, useState } from "react";

type SelectedConversationContextValue = {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
};

const SelectedConversationContext = createContext<SelectedConversationContextValue | undefined>(undefined);

export function SelectedConversationProvider({ children }: { children: React.ReactNode }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <SelectedConversationContext.Provider value={{ selectedId, setSelectedId }}>
      {children}
    </SelectedConversationContext.Provider>
  );
}

export function useSelectedConversation() {
  const ctx = useContext(SelectedConversationContext);
  if (!ctx) throw new Error("useSelectedConversation must be used within SelectedConversationProvider");
  return ctx;
}