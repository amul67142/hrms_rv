import { EmployeeLayout } from '@/components/layout/employee-layout'

export default function EmployeeLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return <EmployeeLayout>{children}</EmployeeLayout>
}
