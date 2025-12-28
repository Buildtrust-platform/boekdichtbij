import { type ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
  centered?: boolean;
}

const sizeStyles = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-6xl",
};

export function PageContainer({
  children,
  size = "md",
  className = "",
  centered = false,
}: PageContainerProps) {
  return (
    <main
      className={`
        min-h-screen bg-gray-50
        ${centered ? "flex items-center justify-center" : ""}
      `}
    >
      <div
        className={`
          w-full mx-auto px-4 sm:px-6
          ${centered ? "" : "py-8 sm:py-12"}
          ${sizeStyles[size]}
          ${className}
        `}
      >
        {children}
      </div>
    </main>
  );
}

export default PageContainer;
