import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
} from 'date-fns'

/**
 * Merges class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as currency (INR by default)
 */
export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Formats a date string or Date object
 */
export function formatDate(date: Date | string | null | undefined, fmt = 'dd MMM yyyy'): string {
  if (!date) return '—'
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return '—'
  return format(d, fmt)
}

/**
 * Returns the full name of a month (1-12)
 */
export function getMonthName(month: number): string {
  const date = new Date(2000, month - 1, 1)
  return format(date, 'MMMM')
}

/**
 * Parses an ISO date string to a Date object
 */
export function parseDate(dateStr: string): Date {
  return parseISO(dateStr)
}

/**
 * Formats a Date object to YYYY-MM-DD
 */
export function formatISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/**
 * Returns the start and end dates of a given month/year
 */
export function getMonthDateRange(month: number, year: number): { start: Date; end: Date } {
  const start = startOfMonth(new Date(year, month - 1, 1))
  const end = endOfMonth(start)
  return { start, end }
}

/**
 * Returns the number of days in a given month/year
 */
export function getMonthDays(month: number, year: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * Generates a random employee code (EMP + 4 digits)
 */
export function generateEmployeeCode(): string {
  const prefix = 'EMP'
  const random = Math.floor(Math.random() * 9000 + 1000)
  return `${prefix}${random}`
}

/**
 * Removes non-numeric characters from a phone number string
 */
export function parsePhoneNumber(value: string): string {
  if (!value) return ''
  return String(value).replace(/[^0-9]/g, '')
}

/**
 * Simple email validator
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
