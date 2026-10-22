// Red-pen marks, the grader's hand: circled scores and margin ticks.

// A slightly uneven loop that overshoots its start, like a quick circle in pen.
const LOOP = "M54 8 C80 5 97 17 95 37 C93 58 67 67 44 65 C19 63 3 50 5 32 C7 15 29 5 60 9";

export function PenScore({ score, max, size = "md" }: { score: number; max: number; size?: "sm" | "md" | "lg" }) {
  const fontSize = { sm: "1.25rem", md: "1.75rem", lg: "4rem" }[size];
  return (
    <span className="pen-score" style={{ fontSize }} role="img" aria-label={`${score} out of ${max}`}>
      <span className="pen-score-num">
        <svg viewBox="0 0 100 70" preserveAspectRatio="none" aria-hidden>
          <path d={LOOP} vectorEffect="non-scaling-stroke" />
        </svg>
        {score}
      </span>
      <span className="pen-score-max">/{max}</span>
    </span>
  );
}

export function PenMark({ kind }: { kind: "pass" | "fail" | "tried" }) {
  if (kind === "tried") {
    return (
      <span className="pen-hand text-lg leading-none" aria-label="Tried, not passed yet">
        tried
      </span>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="pen h-6 w-6" role="img" aria-label={kind === "pass" ? "Passed" : "Failed"}>
      <path
        d={kind === "pass" ? "M3 13 C6 15 8 18 9.5 20 C12 13 16 7 21.5 3" : "M5 5 C10 10 14 14 19 19 M19 5 C14 9 10 14 5 19"}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </svg>
  );
}
