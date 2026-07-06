import { getCompany } from '@/lib/company'
import SettingsForm from './SettingsForm'

export default async function SettingsPage() {
  const company = await getCompany()

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Company profile and document defaults.</p>
      </div>
      <SettingsForm key={company.updated_at} company={company} />
    </div>
  )
}
