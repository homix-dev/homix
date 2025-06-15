import { ReactNode } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

interface DocsLayoutProps {
  children: ReactNode
  title?: string
}

const navigation = [
  {
    title: 'Getting Started',
    items: [
      { title: 'Overview', href: '/docs' },
      { title: 'Quick Start', href: '/docs/quick-start' },
      { title: 'Installation', href: '/docs/installation' },
    ]
  },
  {
    title: 'Core Concepts',
    items: [
      { title: 'Architecture', href: '/docs/architecture' },
      { title: 'NATS Messaging', href: '/docs/nats' },
    ]
  },
  {
    title: 'Features',
    items: [
      { title: 'Device Management', href: '/docs/devices' },
      { title: 'Automations', href: '/docs/automations' },
      { title: 'Scenes', href: '/docs/scenes' },
    ]
  },
  {
    title: 'Guides',
    items: [
      { title: 'Troubleshooting', href: '/docs/guides/troubleshooting' },
    ]
  }
]

export default function DocsLayout({ children, title }: DocsLayoutProps) {
  const router = useRouter()

  return (
    <>
      <Head>
        <title>{title ? `${title} | Homix Docs` : 'Homix Documentation'}</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Link href="/" className="flex items-center">
                  <span className="text-2xl mr-2">🏠</span>
                  <span className="text-xl font-semibold">Homix</span>
                </Link>
                <span className="ml-4 text-gray-400">/</span>
                <Link href="/docs" className="ml-4 text-blue-600 hover:text-blue-700">
                  Documentation
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <Link
                  href="/app"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
                >
                  Open App
                </Link>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="lg:flex gap-8">
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 mb-8 lg:mb-0">
              <div className="sticky top-8">
                <nav className="space-y-6">
                  {navigation.map((section) => (
                    <div key={section.title}>
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                        {section.title}
                      </h3>
                      <ul className="space-y-1">
                        {section.items.map((item) => {
                          const isActive = router.pathname === item.href
                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                                  isActive
                                    ? 'bg-blue-50 text-blue-700 font-medium'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                              >
                                {item.title}
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 min-w-0">
              <article className="bg-white rounded-lg shadow-sm border p-8 lg:p-12">
                {children}
              </article>
            </main>
          </div>
        </div>
      </div>
    </>
  )
}