export type AuthLogContext = {
  outcome: "allow" | "deny";
  reason: string;
  status: number;
};
