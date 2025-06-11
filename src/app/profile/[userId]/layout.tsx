import PublicProfileLayout from '@/components/layout/MainNavbar'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PublicProfileLayout>{children}</PublicProfileLayout>
}