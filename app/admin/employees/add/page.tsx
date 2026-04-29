'use client'

import { redirect } from 'next/navigation'

// The "Add Employee" flow uses the dialog on the employees list page.
// This page redirects there so any stale links still work.
export default function AddEmployeePage() {
  redirect('/admin/employees')
}
