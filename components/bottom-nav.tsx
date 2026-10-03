'use client';

export interface NavItem<T extends string> {
  id: T;
  icon: string;
  label: string;
}

interface BottomNavProps<T extends string> {
  items: NavItem<T>[];
  active: T;
  onChange: (id: T) => void;
}

/** The fixed tab bar along the bottom of each section. */
export function BottomNav<T extends string>({ items, active, onChange }: BottomNavProps<T>) {
  return (
    <nav
      aria-label="Views"
      className="fixed bottom-0 left-0 w-full flex justify-around items-center px-2 z-50
                 pt-1.5 md:pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:pb-[max(1.5rem,env(safe-area-inset-bottom))]
                 rounded-t-3xl md:rounded-t-[32px]"
      style={{
        background: 'rgba(9, 14, 21, 0.9)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(209, 255, 0, 0.1)',
        boxShadow: '0 -8px 24px rgba(209, 255, 0, 0.05)',
      }}
    >
      {items.map(item => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className="flex flex-col items-center justify-center px-3 sm:px-6 py-1.5 md:py-2 transition-all duration-200 active:scale-90 cursor-pointer"
            style={{
              background: isActive ? 'var(--kc-accent)' : 'transparent',
              color: isActive ? 'var(--kc-bg)' : 'var(--kc-text-dim)',
              borderRadius: isActive ? '9999px' : '0',
            }}
          >
            <span
              className="material-symbols-outlined text-[18px] md:text-[20px] leading-none mb-0.5"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              aria-hidden="true"
            >
              {item.icon}
            </span>
            <span className="font-lexend text-[9px] md:text-[10px] leading-none uppercase tracking-widest font-semibold">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
