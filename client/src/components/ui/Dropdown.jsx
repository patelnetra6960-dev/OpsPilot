import { useState, useRef, useEffect } from 'react';

export const Dropdown = ({
  trigger,
  align = 'right',
  width = 'w-56',
  children,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const alignClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2'
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      {isOpen && (
        <div
          className={`absolute ${
            alignClasses[align] || alignClasses.right
          } mt-2 ${width} origin-top-right rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 z-50 focus:outline-none transition-all duration-150 animate-in fade-in-0 zoom-in-95`}
          role="menu"
        >
          <div onClick={() => setIsOpen(false)}>{children}</div>
        </div>
      )}
    </div>
  );
};

export const DropdownItem = ({
  icon: Icon,
  danger = false,
  active = false,
  onClick,
  children,
  className = ''
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-left transition-colors ${
        danger
          ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
          : active
            ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
      } ${className}`}
      role="menuitem"
    >
      {Icon && <Icon className="w-4 h-4 shrink-0 text-current opacity-80" />}
      <span className="truncate">{children}</span>
    </button>
  );
};

export const DropdownDivider = () => (
  <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" role="separator" />
);

export const DropdownHeader = ({ children }) => (
  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
    {children}
  </div>
);

export default Dropdown;
