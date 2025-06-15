import DocsLayout from '../../components/docs/DocsLayout'
import Link from 'next/link'

export default function DocsHome() {
  return (
    <DocsLayout title="Overview">
      <div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-code:text-gray-900 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
        <h1>Homix Documentation</h1>
        <p className="text-lg text-gray-600">
          Welcome to Homix - a cloud-first home automation platform built on NATS messaging.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8 not-prose">
          <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold mb-2">🚀 Quick Start</h3>
            <p className="text-gray-600 mb-4">
              Get Homix running in under 5 minutes with our one-line installer.
            </p>
            <Link href="/docs/quick-start" className="text-blue-600 hover:text-blue-700">
              Get Started →
            </Link>
          </div>

          <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold mb-2">🏗️ Architecture</h3>
            <p className="text-gray-600 mb-4">
              Learn about Homix's cloud-first, NATS-based architecture.
            </p>
            <Link href="/docs/architecture" className="text-blue-600 hover:text-blue-700">
              Learn More →
            </Link>
          </div>

          <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold mb-2">📚 Installation</h3>
            <p className="text-gray-600 mb-4">
              Detailed setup instructions for all platforms and environments.
            </p>
            <Link href="/docs/installation" className="text-blue-600 hover:text-blue-700">
              Install →
            </Link>
          </div>

          <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold mb-2">🔧 Troubleshooting</h3>
            <p className="text-gray-600 mb-4">
              Common issues and solutions for installation and operation.
            </p>
            <Link href="/docs/guides/troubleshooting" className="text-blue-600 hover:text-blue-700">
              Debug →
            </Link>
          </div>
        </div>

        <h2>What is Homix?</h2>
        <p>
          Homix is a modern home automation platform designed for the cloud-first era. It uses 
          NATS messaging for real-time communication between your home and the cloud, providing:
        </p>

        <ul>
          <li><strong>Cloud-First Architecture:</strong> Manage your home from anywhere</li>
          <li><strong>Real-Time Messaging:</strong> Instant device updates via NATS</li>
          <li><strong>Visual Automation Designer:</strong> Create automations with drag-and-drop</li>
          <li><strong>Protocol Agnostic:</strong> Support for Zigbee, Z-Wave, WiFi, and more</li>
          <li><strong>Edge Computing:</strong> Local processing with cloud management</li>
        </ul>

        <h2>Key Components</h2>

        <h3>Edge Server</h3>
        <p>
          Runs locally in your home, handling device communication and local automation execution.
          Connects to Synadia Cloud for remote management.
        </p>

        <h3>Cloud Dashboard</h3>
        <p>
          Web-based interface for managing devices, creating automations, and monitoring your home.
          Accessible from anywhere with internet connection.
        </p>

        <h3>NATS Messaging</h3>
        <p>
          Provides secure, real-time communication between edge servers and the cloud dashboard.
          Powered by Synadia Cloud for enterprise-grade reliability.
        </p>

        <h2>Getting Help</h2>
        <p>
          If you need help getting started or have questions:
        </p>

        <ul>
          <li>Check the <Link href="/docs/guides/troubleshooting">Troubleshooting Guide</Link></li>
          <li>Join our community (Discord coming soon)</li>
          <li>Report issues on <a href="https://github.com/calmera/nats-home-automation/issues" target="_blank" rel="noopener noreferrer">GitHub</a></li>
        </ul>
      </div>
    </DocsLayout>
  )
}