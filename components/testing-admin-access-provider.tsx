"use client";

import { createContext, useContext } from "react";

import { isTestingAdminEmail } from "@/lib/testing-access";

type TestingAdminAccessContextValue = {
  isTestingAdmin: boolean;
  userEmail: string | null;
};

const TestingAdminAccessContext = createContext<TestingAdminAccessContextValue>({
  isTestingAdmin: false,
  userEmail: null,
});

type TestingAdminAccessProviderProps = {
  userEmail: string | null;
  children: React.ReactNode;
};

export function TestingAdminAccessProvider({
  userEmail,
  children,
}: TestingAdminAccessProviderProps) {
  const normalizedUserEmail = typeof userEmail === "string" && userEmail.trim() ? userEmail.trim() : null;

  return (
    <TestingAdminAccessContext.Provider
      value={{
        isTestingAdmin: isTestingAdminEmail(normalizedUserEmail),
        userEmail: normalizedUserEmail,
      }}
    >
      {children}
    </TestingAdminAccessContext.Provider>
  );
}

export function useTestingAdminAccess() {
  return useContext(TestingAdminAccessContext);
}