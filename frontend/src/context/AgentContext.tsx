import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import useAgent from "../hooks/useAgent";

type AgentContextValue = ReturnType<
  typeof useAgent
>;

const AgentContext =
  createContext<AgentContextValue | null>(
    null
  );

export function AgentProvider({
  children,
  customerId,
}: {
  children: ReactNode;
  customerId: string;
}) {
  const agent = useAgent({
    customerId,
  });

  return (
    <AgentContext.Provider value={agent}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgentContext() {
  const context =
    useContext(AgentContext);

  if (!context) {
    throw new Error(
      "useAgentContext must be used inside AgentProvider"
    );
  }

  return context;
}

export default AgentContext;