import Link from 'next/link';

export type EditorialButtonProps = {
  href: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  showArrow?: boolean;
  className?: string;
};

export default function EditorialButton({
  href,
  label,
  variant = 'primary',
  showArrow = true,
  className = '',
}: EditorialButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-between gap-4 px-6 py-3.5 text-xs font-mono tracking-[0.2em] uppercase transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)] select-none';

  const variants = {
    primary:
      'bg-[var(--primary)] text-[var(--background)] border border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:border-[var(--primary-soft)] active:scale-[0.99]',
    secondary:
      'bg-transparent text-[var(--primary)] border border-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--background)] active:scale-[0.99]',
    ghost:
      'bg-transparent text-[var(--primary)] border-b border-[var(--primary)] px-0 py-1 hover:opacity-75 rounded-none',
  };

  return (
    <Link
      href={href}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      <span>{label}</span>
      {showArrow && (
        <span className="transition-transform duration-200 transform group-hover:translate-x-1">
          ↗
        </span>
      )}
    </Link>
  );
}