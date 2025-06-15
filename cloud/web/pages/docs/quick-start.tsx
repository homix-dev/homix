import DocsLayout from '../../components/docs/DocsLayout'
import Link from 'next/link'

export default function QuickStart() {
  return (
    <DocsLayout title="Quick Start">
      <div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-code:text-gray-900 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
        <h1>Quick Start Guide</h1>
        <p className="text-lg text-gray-600">
          Get Homix running in your home in under 5 minutes.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-6">
          <h3 className="text-blue-800 font-semibold mt-0">Prerequisites</h3>
          <ul className="mb-0 text-blue-700">
            <li>Linux, macOS, or Windows machine</li>
            <li>Docker or Podman installed</li>
            <li>Internet connection</li>
          </ul>
        </div>

        <h2>Step 1: Install Homix Edge Server</h2>
        <p>
          Run the one-line installer to set up the Homix edge server in your home:
        </p>

        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm">
          curl -sSL https://get.homix.dev | sh
        </div>

        <p>
          This will:
        </p>
        <ul>
          <li>Download and start the Homix edge server</li>
          <li>Set up the local configuration</li>
          <li>Check for Synadia Cloud credentials</li>
        </ul>

        <h3>Alternative: Force Container Tool</h3>
        <p>
          If you have both Docker and Podman installed, you can force a specific tool:
        </p>

        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm space-y-2">
          <div># Force Docker</div>
          <div>curl -sSL https://get.homix.dev | CONTAINER_TOOL=docker sh</div>
          <div></div>
          <div># Force Podman</div>
          <div>curl -sSL https://get.homix.dev | CONTAINER_TOOL=podman sh</div>
        </div>

        <h2>Step 2: Set up Synadia Cloud (Optional)</h2>
        <p>
          For cloud access and remote management, set up a Synadia Cloud account:
        </p>

        <ol>
          <li>
            Sign up at <a href="https://app.ngs.global" target="_blank" rel="noopener noreferrer">
              app.ngs.global
            </a>
          </li>
          <li>Create a new context called "home"</li>
          <li>Download your credentials to <code>~/.synadia/</code></li>
          <li>Restart the edge server to pick up credentials</li>
        </ol>

        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm">
          <div># Restart edge server after adding credentials</div>
          <div>cd ~/.homix && docker compose restart</div>
        </div>

        <h2>Step 3: Access the Dashboard</h2>
        <p>
          Once the edge server is running, you can access Homix in two ways:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6 not-prose">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">🏠 Local Dashboard</h4>
            <p className="text-gray-600 mb-2">Access via your local network:</p>
            <a 
              href="http://localhost:8080" 
              className="text-blue-600 hover:text-blue-700 font-mono text-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              http://localhost:8080
            </a>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">☁️ Cloud Dashboard</h4>
            <p className="text-gray-600 mb-2">Access from anywhere (requires Synadia Cloud):</p>
            <a 
              href="https://app.homix.dev" 
              className="text-blue-600 hover:text-blue-700 font-mono text-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://app.homix.dev
            </a>
          </div>
        </div>

        <h2>Step 4: Add Your First Device</h2>
        <p>
          With Homix running, you can now start adding devices:
        </p>

        <ol>
          <li>Open the dashboard (local or cloud)</li>
          <li>Navigate to the "Devices" section</li>
          <li>Click "Add Device" or use auto-discovery</li>
          <li>Follow the device-specific setup instructions</li>
        </ol>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-6">
          <h4 className="text-yellow-800 font-semibold mt-0">Device Discovery</h4>
          <p className="mb-0 text-yellow-700">
            Homix can automatically discover many devices on your network. Look for the 
            "Auto-discover devices" button in the devices section.
          </p>
        </div>

        <h2>Next Steps</h2>
        <p>
          Now that you have Homix running, explore these features:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 not-prose">
          <Link href="/docs/devices" className="block border rounded-lg p-4 hover:shadow-md transition-shadow">
            <h4 className="font-semibold mb-2">📱 Device Management</h4>
            <p className="text-gray-600 text-sm">Learn how to add and configure devices</p>
          </Link>

          <Link href="/docs/automations" className="block border rounded-lg p-4 hover:shadow-md transition-shadow">
            <h4 className="font-semibold mb-2">⚡ Create Automations</h4>
            <p className="text-gray-600 text-sm">Build automations with the visual designer</p>
          </Link>

          <Link href="/docs/scenes" className="block border rounded-lg p-4 hover:shadow-md transition-shadow">
            <h4 className="font-semibold mb-2">🎬 Scene Management</h4>
            <p className="text-gray-600 text-sm">Create and manage scenes for your home</p>
          </Link>

          <Link href="/docs/guides/troubleshooting" className="block border rounded-lg p-4 hover:shadow-md transition-shadow">
            <h4 className="font-semibold mb-2">🔧 Troubleshooting</h4>
            <p className="text-gray-600 text-sm">Common issues and solutions</p>
          </Link>
        </div>

        <h2>Need Help?</h2>
        <p>
          If you run into issues during setup:
        </p>

        <ul>
          <li>Check the <Link href="/docs/installation">detailed installation guide</Link></li>
          <li>Review the <Link href="/docs/guides/troubleshooting">troubleshooting guide</Link></li>
          <li>Join our community (Discord coming soon)</li>
        </ul>
      </div>
    </DocsLayout>
  )
}