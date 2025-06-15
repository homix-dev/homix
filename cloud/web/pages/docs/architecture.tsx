import DocsLayout from '../../components/docs/DocsLayout'
import Link from 'next/link'

export default function Architecture() {
  return (
    <DocsLayout title="Architecture">
      <div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-code:text-gray-900 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
        <h1>System Architecture</h1>
        <p className="text-lg text-gray-600">
          Learn how Homix's cloud-first, NATS-based architecture works.
        </p>

        <h2>Overview</h2>
        <p>
          Homix uses a distributed architecture that combines edge computing with cloud management. 
          The system is built around NATS messaging for real-time communication between components.
        </p>

        <div className="bg-gray-50 rounded-lg p-6 my-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center items-center space-x-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">🏠</div>
                <div className="mt-2 text-sm font-medium">Edge Server</div>
                <div className="text-xs text-gray-500">Your Home</div>
              </div>
              <div className="text-center">
                <div className="text-2xl">↔️</div>
                <div className="text-xs text-gray-500">NATS</div>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 bg-green-100 rounded-lg flex items-center justify-center text-2xl">☁️</div>
                <div className="mt-2 text-sm font-medium">Synadia Cloud</div>
                <div className="text-xs text-gray-500">Global</div>
              </div>
              <div className="text-center">
                <div className="text-2xl">↔️</div>
                <div className="text-xs text-gray-500">WebSocket</div>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">💻</div>
                <div className="mt-2 text-sm font-medium">Web App</div>
                <div className="text-xs text-gray-500">Anywhere</div>
              </div>
            </div>
          </div>
        </div>

        <h2>Core Components</h2>

        <h3>Edge Server</h3>
        <p>
          The edge server runs locally in your home and serves as the bridge between your devices 
          and the cloud. It handles:
        </p>

        <ul>
          <li><strong>Device Communication:</strong> Direct integration with smart home devices</li>
          <li><strong>Local Automation:</strong> Execute automations without cloud dependency</li>
          <li><strong>State Management:</strong> Cache device states locally</li>
          <li><strong>Protocol Translation:</strong> Convert between device protocols and NATS</li>
          <li><strong>Cloud Synchronization:</strong> Keep cloud in sync with local state</li>
        </ul>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-6">
          <h4 className="text-blue-800 font-semibold mt-0">Offline Operation</h4>
          <p className="mb-0 text-blue-700">
            The edge server continues to operate even when disconnected from the cloud, 
            ensuring your automations keep running.
          </p>
        </div>

        <h3>NATS Messaging</h3>
        <p>
          NATS provides the messaging backbone for Homix, enabling:
        </p>

        <ul>
          <li><strong>Real-Time Communication:</strong> Instant message delivery</li>
          <li><strong>Publish-Subscribe:</strong> Decoupled component communication</li>
          <li><strong>Persistent Streams:</strong> JetStream for reliable message delivery</li>
          <li><strong>Key-Value Store:</strong> Distributed state management</li>
          <li><strong>Request-Reply:</strong> Synchronous operations when needed</li>
        </ul>

        <h3>Cloud Dashboard</h3>
        <p>
          The web-based dashboard connects directly to NATS via WebSocket, providing:
        </p>

        <ul>
          <li><strong>Real-Time Updates:</strong> Live device state changes</li>
          <li><strong>Visual Automation Designer:</strong> Drag-and-drop automation creation</li>
          <li><strong>Remote Management:</strong> Control devices from anywhere</li>
          <li><strong>Multi-Home Support:</strong> Manage multiple edge servers</li>
        </ul>

        <h2>NATS Subject Structure</h2>
        <p>
          Homix uses a hierarchical subject structure for organizing messages:
        </p>

        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm space-y-1">
          <div># Device communication</div>
          <div>home.devices.{'<device_id>'}.state     # Device state updates</div>
          <div>home.devices.{'<device_id>'}.command   # Device commands</div>
          <div>home.devices.{'<device_id>'}.config    # Device configuration</div>
          <div></div>
          <div># System events</div>
          <div>home.events.system.service_started    # Service notifications</div>
          <div>home.edge.announce                    # Edge server announcements</div>
          <div></div>
          <div># Automations</div>
          <div>home.automations.{'<id>'}.trigger     # Automation triggers</div>
          <div>home.automations.{'<id>'}.status      # Automation status</div>
        </div>

        <h2>Data Flow</h2>

        <h3>Device State Updates</h3>
        <ol>
          <li>Device changes state (e.g., light turns on)</li>
          <li>Edge server detects change</li>
          <li>Edge server publishes to <code>home.devices.light1.state</code></li>
          <li>Cloud dashboard receives update via NATS WebSocket</li>
          <li>UI updates in real-time</li>
        </ol>

        <h3>Device Commands</h3>
        <ol>
          <li>User clicks button in dashboard</li>
          <li>Dashboard publishes to <code>home.devices.light1.command</code></li>
          <li>Edge server receives command</li>
          <li>Edge server executes command on device</li>
          <li>Device state update flows back (see above)</li>
        </ol>

        <h3>Automation Execution</h3>
        <ol>
          <li>Trigger condition met (e.g., time of day)</li>
          <li>Edge server publishes trigger event</li>
          <li>Automation engine processes trigger</li>
          <li>Actions executed (device commands, notifications, etc.)</li>
          <li>Status updates published to cloud</li>
        </ol>

        <h2>Key-Value Storage</h2>
        <p>
          Homix uses NATS KV buckets for distributed state management:
        </p>

        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="border border-gray-300 px-4 py-2 text-left">Bucket</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Purpose</th>
                <th className="border border-gray-300 px-4 py-2 text-left">TTL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-2 font-mono">devices</td>
                <td className="border border-gray-300 px-4 py-2">Device registry cache</td>
                <td className="border border-gray-300 px-4 py-2">2 minutes</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 font-mono">automations</td>
                <td className="border border-gray-300 px-4 py-2">Automation definitions</td>
                <td className="border border-gray-300 px-4 py-2">Persistent</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2 font-mono">scenes</td>
                <td className="border border-gray-300 px-4 py-2">Scene definitions</td>
                <td className="border border-gray-300 px-4 py-2">Persistent</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 font-mono">automation-state</td>
                <td className="border border-gray-300 px-4 py-2">Runtime automation state</td>
                <td className="border border-gray-300 px-4 py-2">Varies</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>Security</h2>

        <h3>Authentication</h3>
        <p>
          Homix uses NATS JWT authentication via Synadia Cloud:
        </p>

        <ul>
          <li><strong>Credentials Files:</strong> Securely store authentication tokens</li>
          <li><strong>Automatic Rotation:</strong> Tokens refreshed automatically</li>
          <li><strong>Scoped Access:</strong> Fine-grained permissions per component</li>
        </ul>

        <h3>Transport Security</h3>
        <ul>
          <li><strong>TLS Encryption:</strong> All NATS traffic encrypted in transit</li>
          <li><strong>WebSocket Security:</strong> WSS for browser connections</li>
          <li><strong>Certificate Validation:</strong> Verify server identity</li>
        </ul>

        <h2>Scalability</h2>

        <h3>Horizontal Scaling</h3>
        <p>
          The architecture supports scaling in multiple dimensions:
        </p>

        <ul>
          <li><strong>Multiple Homes:</strong> Each edge server operates independently</li>
          <li><strong>Device Scaling:</strong> Support for thousands of devices per home</li>
          <li><strong>Geographic Distribution:</strong> Global NATS infrastructure</li>
          <li><strong>Load Balancing:</strong> Multiple cloud dashboard instances</li>
        </ul>

        <h3>Performance Characteristics</h3>
        <ul>
          <li><strong>Low Latency:</strong> Sub-second response times</li>
          <li><strong>High Throughput:</strong> Thousands of messages per second</li>
          <li><strong>Efficient Bandwidth:</strong> Binary protocol with compression</li>
          <li><strong>Local Processing:</strong> Reduced cloud dependency</li>
        </ul>

        <h2>Deployment Patterns</h2>

        <h3>Single Home</h3>
        <p>
          Basic deployment with one edge server and cloud access:
        </p>
        <ul>
          <li>Edge server in home network</li>
          <li>Synadia Cloud for messaging</li>
          <li>Web dashboard for management</li>
        </ul>

        <h3>Multi-Home</h3>
        <p>
          Multiple properties with centralized management:
        </p>
        <ul>
          <li>Edge server per location</li>
          <li>Shared cloud dashboard</li>
          <li>Cross-home automations possible</li>
        </ul>

        <h3>Air-Gapped</h3>
        <p>
          Local-only deployment without cloud connectivity:
        </p>
        <ul>
          <li>Edge server with local NATS</li>
          <li>Local dashboard only</li>
          <li>No remote access</li>
        </ul>

        <h2>Design Principles</h2>

        <h3>Cloud-First</h3>
        <p>
          Designed for cloud management with local execution for reliability.
        </p>

        <h3>Event-Driven</h3>
        <p>
          All communication happens through events, enabling loose coupling and scalability.
        </p>

        <h3>Real-Time</h3>
        <p>
          Low-latency messaging ensures immediate response to device changes and user actions.
        </p>

        <h3>Fault Tolerant</h3>
        <p>
          System continues operating during network partitions and component failures.
        </p>

        <h2>Next Steps</h2>
        <p>
          To learn more about specific components:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 not-prose">
          <Link href="/docs/nats" className="block border rounded-lg p-4 hover:shadow-md transition-shadow">
            <h4 className="font-semibold mb-2">📡 NATS Messaging</h4>
            <p className="text-gray-600 text-sm">Deep dive into NATS subjects and patterns</p>
          </Link>

          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-semibold mb-2">🏠 Edge Server</h4>
            <p className="text-gray-600 text-sm">Learn about the edge server internals (coming soon)</p>
          </div>

          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-semibold mb-2">🔌 API Reference</h4>
            <p className="text-gray-600 text-sm">Complete NATS subject and message reference (coming soon)</p>
          </div>

          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-semibold mb-2">☁️ Synadia Setup</h4>
            <p className="text-gray-600 text-sm">Configure Synadia Cloud for your deployment (coming soon)</p>
          </div>
        </div>
      </div>
    </DocsLayout>
  )
}