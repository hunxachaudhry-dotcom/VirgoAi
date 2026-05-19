import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Plan = "free" | "premium" | "admin";

interface PlanContextValue {
  plan: Plan;
  code: string | null;
  setPlan: (plan: Plan, code: string) => void;
  clearPlan: () => void;
  allowedDurations: number[];
  canGenerate: boolean;
  isPremium: boolean;
}

const PlanContext = createContext<PlanContextValue | null>(null);

const PLAN_ALLOWED_DURATIONS: Record<Plan, number[]> = {
  free: [2, 3, 4, 5],
  premium: [2, 3, 4, 5, 8],
  admin: [2, 3, 4, 5, 8],
};

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlanState] = useState<Plan>("free");
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    const storedCode = localStorage.getItem("plan_code");
    const storedPlan = localStorage.getItem("plan") as Plan | null;
    if (storedCode && storedPlan && storedPlan !== "free") {
      setPlanState(storedPlan);
      setCode(storedCode);
    }
  }, []);

  const setPlan = (newPlan: Plan, newCode: string) => {
    setPlanState(newPlan);
    setCode(newCode);
    localStorage.setItem("plan", newPlan);
    localStorage.setItem("plan_code", newCode);
  };

  const clearPlan = () => {
    setPlanState("free");
    setCode(null);
    localStorage.removeItem("plan");
    localStorage.removeItem("plan_code");
  };

  return (
    <PlanContext.Provider
      value={{
        plan,
        code,
        setPlan,
        clearPlan,
        allowedDurations: PLAN_ALLOWED_DURATIONS[plan],
        canGenerate: true,
        isPremium: plan === "premium" || plan === "admin",
      }}
    >
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used within PlanProvider");
  return ctx;
}
