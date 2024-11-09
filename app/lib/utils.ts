import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const nullsFirst = <T>(compareFn: (a: T, b: T) => number) => (a: T | null, b: T | null) => {
  if (a === null) return -1
  if (b === null) return 1
  return compareFn(a, b)
}
