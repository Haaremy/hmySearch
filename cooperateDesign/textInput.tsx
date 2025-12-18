// cooperateDesign/TextInput.tsx
import React from 'react';
import clsx from 'clsx';

// Props für ein normales Textinput
export type TextInputProps = React.InputHTMLAttributes<HTMLInputElement>;

// Optional: Basis-Styles für alle TextInputs
const baseStyles = `
  w-full px-3 py-2 rounded-lg border shadow-lg focus:outline-none focus:ring-2 focus:ring-pink-500
  bg-white border-gray-300 
  dark:bg-gray-700 dark:border-gray-600 dark:text-white
  truedark:bg-black truedark:border-white truedark:text-white
`;



const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ type = "text", className, ...props }, ref) => {
    return (
      <input
        type={type}
        className={clsx(baseStyles, className)}
        ref={ref}
        {...props}
      />
    );
  }
);


TextInput.displayName = 'TextInput';

export default TextInput;
