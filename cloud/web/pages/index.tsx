import Head from 'next/head'
import Link from 'next/link'

export default function Home() {
  return (
    <>
      <Head>
        <title>Homix - Home automation, beautifully mixed</title>
        <meta name="description" content="Open source home automation platform built on NATS" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
        {/* Navigation */}
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🏠</span>
              <span className="text-2xl font-bold text-gray-900">Homix</span>
            </div>
            <div className="flex items-center space-x-6">
              <Link href="/docs" className="text-gray-600 hover:text-gray-900">
                Documentation
              </Link>
              <Link href="https://github.com/calmera/homix" className="text-gray-600 hover:text-gray-900">
                GitHub
              </Link>
              <Link href="/app" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                Launch App
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="container mx-auto px-6 py-20">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Home automation,<br />beautifully mixed
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Open source, cloud-first home automation built on NATS messaging. 
              Control your devices, create automations, and manage your home from anywhere.
            </p>
            
            {/* Install Command */}
            <div className="bg-gray-900 text-white rounded-lg p-4 mb-8 max-w-xl mx-auto">
              <code className="text-sm">curl -sSL https://get.homix.dev | sh</code>
            </div>

            <div className="flex gap-4 justify-center">
              <Link href="/app" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 text-lg">
                Get Started
              </Link>
              <Link href="/docs" className="bg-white text-gray-900 px-6 py-3 rounded-lg hover:bg-gray-100 text-lg border border-gray-200">
                Learn More
              </Link>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="container mx-auto px-6 py-20">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-3xl mb-4">☁️</div>
              <h3 className="text-xl font-semibold mb-2">Cloud-First</h3>
              <p className="text-gray-600">
                Manage your home from anywhere with Synadia Cloud integration. 
                Secure, reliable, and always accessible.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-3xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
              <p className="text-gray-600">
                Built on NATS for sub-millisecond message delivery. 
                Your automations run instantly.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-3xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold mb-2">Secure by Design</h3>
              <p className="text-gray-600">
                JWT authentication, encrypted connections, and fine-grained 
                permissions keep your home safe.
              </p>
            </div>
          </div>
        </div>

        {/* Architecture */}
        <div className="container mx-auto px-6 py-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Simple Architecture</h2>
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold text-lg mb-4">🏠 At Home</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Single edge server container</li>
                    <li>• Connects to all your devices</li>
                    <li>• Runs automations locally</li>
                    <li>• Works offline</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-4">☁️ In the Cloud</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Web-based management UI</li>
                    <li>• Automation designer</li>
                    <li>• Multi-home support</li>
                    <li>• Secure remote access</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="container mx-auto px-6 py-20">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-12 text-white text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-xl mb-8 opacity-90">
              Install Homix in less than 5 minutes
            </p>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 max-w-xl mx-auto">
              <code className="text-sm">curl -sSL https://get.homix.dev | sh</code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="container mx-auto px-6 py-8 text-center text-gray-600">
          <p>© 2024 Homix. Built with ❤️ on NATS.</p>
        </footer>
      </div>
    </>
  )
}