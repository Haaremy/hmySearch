// cooperateDesign/link.tsx
import React from 'react';
import clsx from 'clsx';

export type MainProps = React.AnchorHTMLAttributes<HTMLAnchorElement>;

const baseStyles = `
w-full min-h-screen flex flex-col items-center justify-start p-4 sm:p-8 pt-20 transition-all duration-300
bg-pink-100 text-gray-900
dark:bg-gray-900 dark:text-white
truedark:bg-black truedark:text-white 
`;


const Main = React.forwardRef<HTMLAnchorElement, MainProps>(
  ({className, href, ...props }, ref) => {
    return (
      <main
        ref={ref}
        className={clsx(baseStyles, className)}
        {...props}
      />
    );
  }
);

Main.displayName = 'Main';
export default Main;
