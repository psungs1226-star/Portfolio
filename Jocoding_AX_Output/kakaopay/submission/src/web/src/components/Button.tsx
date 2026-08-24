import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary';
  }
>;

export function Button({
  children,
  variant = 'primary',
  type = 'button',
  ...buttonProps
}: ButtonProps) {
  return (
    <button className={`button button-${variant}`} type={type} {...buttonProps}>
      {children}
    </button>
  );
}
