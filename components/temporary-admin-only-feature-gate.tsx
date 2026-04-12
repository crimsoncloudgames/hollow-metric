"use client";

import { useTestingAdminAccess } from "@/components/testing-admin-access-provider";
import { TEMPORARY_TESTING_LOCK_MESSAGE } from "@/lib/testing-access";

type TemporaryAdminOnlyFeatureGateProps = {
  children: React.ReactNode;
};

export function TemporaryAdminOnlyFeatureGate({
  children,
}: TemporaryAdminOnlyFeatureGateProps) {
  const { isTestingAdmin } = useTestingAdminAccess();

  return (
    <div className="relative">
      <fieldset disabled={!isTestingAdmin} className="min-w-0 border-0 p-0">
        <div
          aria-hidden={!isTestingAdmin}
          className={isTestingAdmin ? undefined : "pointer-events-none select-none blur-[10px] saturate-50 opacity-60"}
        >
          {children}
        </div>
      </fieldset>

      {!isTestingAdmin ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-xl rounded-3xl border border-slate-700 bg-slate-950/95 px-6 py-8 text-center shadow-[0_18px_80px_rgba(15,23,42,0.68)] sm:px-8">
            <p className="text-lg font-black leading-8 text-white sm:text-xl">
              {TEMPORARY_TESTING_LOCK_MESSAGE}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}