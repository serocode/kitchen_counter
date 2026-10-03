/** A pill in the status strip above each view. */
export function Chip({
  children,
  background,
  color,
  className = '',
}: {
  children: React.ReactNode;
  background: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-[10px] font-lexend font-bold uppercase tracking-widest ${className}`}
      style={{ background, color }}
    >
      {children}
    </span>
  );
}
