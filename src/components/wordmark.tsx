// App name with a red-pen tick as its mark.
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-1.5 text-[1.0625rem] font-bold tracking-tight ${className}`}>
      <svg viewBox="0 0 24 24" className="pen h-5 w-5" aria-hidden>
        <path d="M3 13 C6 15 8 18 9.5 20 C12 13 16 7 21.5 3" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
      </svg>
      Interview Prep
    </span>
  );
}
