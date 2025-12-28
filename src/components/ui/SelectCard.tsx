import { type ReactNode } from "react";

interface SelectCardProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function SelectCard({
  selected,
  onClick,
  children,
  disabled = false,
  className = "",
}: SelectCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full text-left p-4 rounded-xl border-2 transition-all duration-150
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
        ${
          selected
            ? "border-primary-500 bg-primary-50 shadow-sm"
            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${className}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Radio indicator */}
        <div
          className={`
            mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
            transition-all duration-150
            ${selected ? "border-primary-500 bg-primary-500" : "border-gray-300"}
          `}
        >
          {selected && (
            <div className="w-2 h-2 rounded-full bg-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </button>
  );
}

interface SelectCardTitleProps {
  children: ReactNode;
  className?: string;
}

export function SelectCardTitle({ children, className = "" }: SelectCardTitleProps) {
  return (
    <span className={`block font-medium text-gray-900 ${className}`}>
      {children}
    </span>
  );
}

interface SelectCardDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function SelectCardDescription({ children, className = "" }: SelectCardDescriptionProps) {
  return (
    <span className={`block text-sm text-gray-500 mt-0.5 ${className}`}>
      {children}
    </span>
  );
}

interface SelectCardPriceProps {
  children: ReactNode;
  className?: string;
}

export function SelectCardPrice({ children, className = "" }: SelectCardPriceProps) {
  return (
    <span className={`block text-lg font-semibold text-primary-600 mt-1 ${className}`}>
      {children}
    </span>
  );
}

export default SelectCard;
