import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "danger";
  className?: string;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  className = "",
  children,
  ...props
}) => {
  const variantClass =
    variant === "outline"
      ? "btn-outline"
      : variant === "danger"
      ? "btn-danger"
      : "btn-primary";

  return (
    <button
      {...props}
      className={`btn ${variantClass} ${className}`.trim()}
    >
      {children}
    </button>
  );
};
