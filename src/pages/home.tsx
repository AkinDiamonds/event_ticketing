import { HomeScreen } from '../screens/home-screen'

export default function HomePage() {
  return (
    <HomeScreen
      tabs={{
        home: '/',
        tickets: '/tickets',
        orders: '/orders',
        profile: '/profile',
      }}
    />
  )
}
