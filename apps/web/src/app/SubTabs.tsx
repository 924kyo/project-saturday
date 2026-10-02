import { useRef } from 'react';

/**
 * Sub-tabs inside a tab (M12 UI-01/UI-02): a keyboard tablist (arrows, Home, End move and select;
 * one tab stop), each tab controlling one panel. Only the selected panel is rendered.
 */
export function SubTabs<T extends string>({
  id,
  label,
  tabs,
  value,
  onChange,
  children,
}: {
  readonly id: string;
  readonly label: string;
  readonly tabs: readonly { readonly id: T; readonly label: string }[];
  readonly value: T;
  readonly onChange: (next: T) => void;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === value),
  );
  const move = (next: number) => {
    const target = (next + tabs.length) % tabs.length;
    onChange(tabs[target]!.id);
    refs.current[target]?.focus();
  };
  return (
    <div className="s2-stack s2-subtabs" id={id}>
      <div
        aria-label={label}
        className="s2-subtabs__list"
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') move(index + 1);
          else if (event.key === 'ArrowLeft') move(index - 1);
          else if (event.key === 'Home') move(0);
          else if (event.key === 'End') move(tabs.length - 1);
          else return;
          event.preventDefault();
        }}
        role="tablist"
      >
        {tabs.map((tab, position) => (
          <button
            aria-controls={`${id}-panel`}
            aria-selected={tab.id === value}
            className={`s2-subtabs__tab ${tab.id === value ? 's2-subtabs__tab--on' : ''}`}
            id={`${id}-tab-${tab.id}`}
            key={tab.id}
            onClick={() => onChange(tab.id)}
            ref={(element) => {
              refs.current[position] = element;
            }}
            role="tab"
            tabIndex={tab.id === value ? 0 : -1}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        aria-labelledby={`${id}-tab-${value}`}
        className="s2-stack"
        id={`${id}-panel`}
        role="tabpanel"
      >
        {children}
      </div>
    </div>
  );
}
