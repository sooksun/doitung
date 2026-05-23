// app/components/ui/Input.tsx
'use client';

import React, { forwardRef, useId } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  leftIcon?: React.ReactNode;
  /** Slot rendered on the right inside the field (e.g. a show/hide password button). */
  rightSlot?: React.ReactNode;
  /** className for the outer .de-field wrapper (the input itself uses `className`). */
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helper, error, leftIcon, rightSlot, containerClassName, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id || `de-input-${autoId}`;
  const helperId = helper ? `${inputId}-helper` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined;

  const wrapClasses = [
    'de-input-wrap',
    leftIcon ? 'de-input-wrap--has-left' : '',
    rightSlot ? 'de-input-wrap--has-right' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const fieldClasses = ['de-input-field', error ? 'de-input-field--error' : '', className || '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={['de-field', containerClassName || ''].filter(Boolean).join(' ')}>
      {label && (
        <label className="de-field__label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className={wrapClasses}>
        {leftIcon && (
          <span className="de-input-wrap__icon" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={fieldClasses}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        {rightSlot && <span className="de-input-wrap__right">{rightSlot}</span>}
      </div>
      {error ? (
        <span className="de-field__error" id={errorId} role="alert">
          {error}
        </span>
      ) : (
        helper && (
          <span className="de-field__helper" id={helperId}>
            {helper}
          </span>
        )
      )}
    </div>
  );
});
