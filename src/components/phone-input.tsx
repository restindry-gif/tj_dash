'use client'

import { useState, useCallback } from 'react'

export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.startsWith('02')) {
    if (digits.length <= 2) return digits
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`
  }
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
}

interface PhoneInputProps {
  name?: string
  defaultValue?: string
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  required?: boolean
}

export function PhoneInput({
  name,
  defaultValue = '',
  value: controlledValue,
  onChange,
  placeholder = '010-0000-0000',
  className = '',
  required,
}: PhoneInputProps) {
  const isControlled = controlledValue !== undefined
  const [internal, setInternal] = useState(() => formatPhoneNumber(defaultValue))

  const display = isControlled ? formatPhoneNumber(controlledValue) : internal

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    if (!isControlled) setInternal(formatted)
    onChange?.(formatted)
  }, [isControlled, onChange])

  return (
    <input
      type="tel"
      inputMode="numeric"
      name={name}
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      required={required}
    />
  )
}
