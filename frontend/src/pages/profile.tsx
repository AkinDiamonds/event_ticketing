import { ProfileScreen } from '../screens/profile-screen'

export default function ProfilePage() {
  return (
    <ProfileScreen
      backHref="/"
      ordersHref="/orders"
      adminHref="/admin/events"
    />
  )
}
