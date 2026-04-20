import { redirect } from 'next/navigation'

// /configure → redirect to first step
export default function ConfigureRootPage() {
  redirect('/configure/upload')
}
