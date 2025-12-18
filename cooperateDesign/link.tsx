// cooperateDesign/link.tsx
import React from 'react';
import clsx from 'clsx';
import Link, { LinkProps as NextLinkProps } from "next/link";

export type CLinkProps = NextLinkProps & 
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    variant?: 'primary' | 'warn' | 'danger';
  };

const baseStyles =
  'rounded-lg px-4 py-2 font-semibold transition-colors duration-200 focus:outline-none disabled:opacity-50 dark:text-white text-gray-900';

const variants = {
  primary: 'dark:bg-pink-500 hover:dark:bg-pink-600 bg-blue-300 hover:bg-blue-400',
  warn: 'bg-yellow-500 hover:bg-yellow-600',
  danger: 'bg-red-500 hover:bg-red-600',
} as const;

const CLink = React.forwardRef<HTMLAnchorElement, CLinkProps>(
  ({ variant = 'primary', className, href, ...props }, ref) => {
    return (
      <Link
        ref={ref}
        href={href}
        className={clsx(baseStyles, variants[variant], className)}
        {...props}
      />
    );
  }
);

CLink.displayName = 'CLink';
export default CLink;
