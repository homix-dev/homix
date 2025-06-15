import DocsLayout from '../../components/docs/DocsLayout'
import Link from 'next/link'

export default function NatsMessaging() {
  return (
    <DocsLayout title="NATS Messaging">
      <div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-code:text-gray-900 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
        <h1>NATS Messaging</h1>
        <p className="text-lg text-gray-600">
          Understanding the NATS messaging system that powers Homix communication.
        </p>

        <h2>What is NATS?</h2>
        <p>
          NATS is a simple, secure, and performant communications system for digital systems, 
          services, and devices. Homix uses NATS as its core messaging backbone to enable 
          real-time communication between devices, services, and the cloud.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-6">
          <h4 className="text-blue-800 font-semibold mt-0">Why NATS for Home Automation?</h4>
          <ul className="mb-0 text-blue-700">
            <li><strong>Real-time:</strong> Ultra-low latency messaging for instant device responses</li>
            <li><strong>Scalable:</strong> Handles thousands of devices and messages efficiently</li>
            <li><strong>Resilient:</strong> Built-in redundancy and fault tolerance</li>
            <li><strong>Secure:</strong> Strong authentication and encryption capabilities</li>
            <li><strong>Simple:</strong> Easy to understand subject-based routing</li>
          </ul>
        </div>

        <h2>NATS Architecture in Homix</h2>
        <p>
          Homix uses a hybrid NATS architecture with local and cloud components:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6 not-prose">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">🏠 Local NATS Server</h4>
            <p className="text-gray-600 text-sm mb-3">Runs on your edge server for local communication</p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>Device-to-device communication</li>
              <li>Local automation execution</li>
              <li>Offline operation capability</li>
              <li>Low-latency responses</li>
            </ul>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">☁️ Synadia Cloud</h4>
            <p className="text-gray-600 text-sm mb-3">Global NATS network for cloud connectivity</p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>Remote access and control</li>
              <li>Multi-home management</li>
              <li>Cloud automations</li>
              <li>Mobile app connectivity</li>
            </ul>
          </div>
        </div>

        <h2>Subject Structure</h2>
        <p>
          NATS uses a subject-based messaging system. Homix organizes subjects hierarchically 
          for clear communication patterns:
        </p>

        <h3>Device Communication</h3>
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm space-y-2">
          <div># Device state updates</div>
          <div>home.devices.{"{device_id}"}.state</div>
          <div></div>
          <div># Device commands</div>
          <div>home.devices.{"{device_id}"}.command</div>
          <div></div>
          <div># Device announcements</div>
          <div>home.devices.{"{device_id}"}.announce</div>
          <div></div>
          <div># Device configuration</div>
          <div>home.devices.{"{device_id}"}.config</div>
          <div></div>
          <div># Device offline notifications</div>
          <div>home.devices.{"{device_id}"}.offline</div>
        </div>

        <h3>System Events</h3>
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm space-y-2">
          <div># General events</div>
          <div>home.events.*</div>
          <div></div>
          <div># Service lifecycle</div>
          <div>home.events.system.service_started</div>
          <div>home.events.system.service_stopped</div>
          <div></div>
          <div># User events</div>
          <div>home.events.user.login</div>
          <div>home.events.user.logout</div>
        </div>

        <h3>Automation System</h3>
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm space-y-2">
          <div># Automation triggers</div>
          <div>home.automations.{"{id}"}.trigger</div>
          <div></div>
          <div># Automation status</div>
          <div>home.automations.{"{id}"}.status</div>
          <div></div>
          <div># Scene activation</div>
          <div>home.scenes.{"{id}"}.activate</div>
        </div>

        <h3>Service Health</h3>
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm space-y-2">
          <div># Service status</div>
          <div>home.services.{"{service}"}.status</div>
          <div></div>
          <div># Health checks</div>
          <div>home.services.{"{service}"}.health</div>
          <div></div>
          <div># Discovery</div>
          <div>home.discovery.announce</div>
          <div>home.discovery.request</div>
        </div>

        <h2>Message Patterns</h2>

        <h3>Request-Reply</h3>
        <p>
          Used for commands that need acknowledgment:
        </p>
        <div className="bg-gray-100 rounded-lg p-4 space-y-2 text-sm">
          <div><strong>Request:</strong> Send command to device</div>
          <div><strong>Reply:</strong> Device confirms execution</div>
          <div><strong>Timeout:</strong> Handle no response scenarios</div>
        </div>

        <h3>Publish-Subscribe</h3>
        <p>
          Used for broadcasting state updates and events:
        </p>
        <div className="bg-gray-100 rounded-lg p-4 space-y-2 text-sm">
          <div><strong>Publisher:</strong> Device publishes state changes</div>
          <div><strong>Subscribers:</strong> Multiple services listen for updates</div>
          <div><strong>Wildcards:</strong> Subscribe to patterns like <code>devices.*.state</code></div>
        </div>

        <h3>Queue Groups</h3>
        <p>
          Used for load balancing and high availability:
        </p>
        <div className="bg-gray-100 rounded-lg p-4 space-y-2 text-sm">
          <div><strong>Load Balancing:</strong> Distribute work across multiple instances</div>
          <div><strong>Failover:</strong> Automatic handling of service failures</div>
          <div><strong>Scaling:</strong> Add more workers to handle increased load</div>
        </div>

        <h2>JetStream for Persistence</h2>
        <p>
          Homix uses NATS JetStream for message persistence and guaranteed delivery:
        </p>

        <h3>Streams</h3>
        <div className="space-y-4">
          <div className="border-l-4 border-blue-400 bg-blue-50 p-4">
            <h4 className="text-blue-800 font-semibold mt-0">Device States Stream</h4>
            <p className="text-blue-700 mb-0">
              Stores device state history for analytics and recovery
            </p>
          </div>

          <div className="border-l-4 border-green-400 bg-green-50 p-4">
            <h4 className="text-green-800 font-semibold mt-0">Events Stream</h4>
            <p className="text-green-700 mb-0">
              Persists system events for audit trails and debugging
            </p>
          </div>

          <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
            <h4 className="text-yellow-800 font-semibold mt-0">Automation Stream</h4>
            <p className="text-yellow-700 mb-0">
              Stores automation execution history and state
            </p>
          </div>
        </div>

        <h3>Key-Value Store</h3>
        <p>
          JetStream KV buckets provide distributed state storage:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 not-prose">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">⏱️ With TTL (Expirable)</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li><code>devices</code> - Device cache (2 min)</li>
              <li><code>device_registry</code> - Discovery cache (5 min)</li>
              <li><code>automation-state</code> - Runtime state (varies)</li>
            </ul>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">♾️ Persistent (No TTL)</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li><code>device-configs</code> - Device templates</li>
              <li><code>automations</code> - Automation definitions</li>
              <li><code>scenes</code> - Scene definitions</li>
              <li><code>users</code> - User accounts</li>
            </ul>
          </div>
        </div>

        <h2>Security and Authentication</h2>

        <h3>Synadia Cloud Credentials</h3>
        <p>
          Homix uses Synadia Cloud for secure, authenticated NATS connectivity:
        </p>

        <ol>
          <li>Create account at <a href="https://app.ngs.global" target="_blank" rel="noopener noreferrer">app.ngs.global</a></li>
          <li>Generate credentials file for your context</li>
          <li>Place credentials in <code>~/.synadia/</code></li>
          <li>Edge server automatically uses credentials for cloud connectivity</li>
        </ol>

        <h3>Local Security</h3>
        <p>
          Local NATS server security features:
        </p>

        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div><strong>User Authentication:</strong> Username/password or token-based auth</div>
          <div><strong>TLS Encryption:</strong> Encrypted communication between clients</div>
          <div><strong>Authorization:</strong> Subject-based permissions and ACLs</div>
          <div><strong>Account Isolation:</strong> Separate namespaces for different services</div>
        </div>

        <h2>Using NATS with Homix</h2>

        <h3>Device Integration</h3>
        <p>
          Devices connect to NATS for communication:
        </p>

        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm space-y-2">
          <div># Python example for device integration</div>
          <div>import nats</div>
          <div></div>
          <div>async def device_handler():</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;nc = await nats.connect(&quot;nats://localhost:4222&quot;)</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;# Publish device state</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;await nc.publish(&quot;home.devices.lamp1.state&quot;, </div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;b&apos;{"{\"state\": \"on\", \"brightness\": 80}"}&apos;)</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;# Subscribe to commands</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;await nc.subscribe(&quot;home.devices.lamp1.command&quot;, </div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;cb=handle_command)</div>
        </div>

        <h3>Automation Integration</h3>
        <p>
          Automations use NATS for triggers and actions:
        </p>

        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm space-y-2">
          <div># Subscribe to device events</div>
          <div>nats sub &quot;home.devices.*.state&quot;</div>
          <div></div>
          <div># Publish automation triggers</div>
          <div>nats pub home.automations.welcome_home.trigger &apos;{}{}&apos;</div>
          <div></div>
          <div># Monitor all home events</div>
          <div>nats sub &quot;home.&gt;&quot;</div>
        </div>

        <h3>Dashboard Integration</h3>
        <p>
          Web dashboard connects via WebSocket for real-time updates:
        </p>

        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm space-y-2">
          <div>// JavaScript WebSocket connection</div>
          <div>const nc = await connect({"{"}servers: [&quot;ws://localhost:9222&quot;]{"}"})</div>
          <div></div>
          <div>// Subscribe to device updates</div>
          <div>const sub = nc.subscribe(&quot;home.devices.*.state&quot;)</div>
          <div>for await (const msg of sub) {"{"}</div>
          <div>&nbsp;&nbsp;const device = JSON.parse(new TextDecoder().decode(msg.data))</div>
          <div>&nbsp;&nbsp;updateDashboard(device)</div>
          <div>{"}"}</div>
        </div>

        <h2>Monitoring and Debugging</h2>

        <h3>NATS Monitoring</h3>
        <p>
          Monitor NATS server performance and health:
        </p>

        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div><strong>Web Monitor:</strong> <a href="http://localhost:8222" target="_blank">http://localhost:8222</a></div>
          <div><strong>Server Stats:</strong> <code>nats server check</code></div>
          <div><strong>Connection Info:</strong> <code>nats server ping</code></div>
          <div><strong>Subject Lists:</strong> <code>nats server subjects</code></div>
        </div>

        <h3>Message Debugging</h3>
        <p>
          Debug message flow and content:
        </p>

        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm space-y-2">
          <div># Monitor all messages</div>
          <div>nats sub &quot;&gt;&quot;</div>
          <div></div>
          <div># Monitor device messages only</div>
          <div>nats sub &quot;home.devices.&gt;&quot;</div>
          <div></div>
          <div># Test message publishing</div>
          <div>nats pub home.devices.test.state &apos;{"{\"test\": true}"}&apos;</div>
          <div></div>
          <div># Check JetStream status</div>
          <div>nats stream list</div>
          <div>nats kv list</div>
        </div>

        <h3>Performance Monitoring</h3>
        <p>
          Track NATS performance metrics:
        </p>

        <div className="space-y-4">
          <div className="border-l-4 border-blue-400 bg-blue-50 p-4">
            <h4 className="text-blue-800 font-semibold mt-0">Message Rates</h4>
            <p className="text-blue-700 mb-0">
              Monitor messages per second for capacity planning
            </p>
          </div>

          <div className="border-l-4 border-green-400 bg-green-50 p-4">
            <h4 className="text-green-800 font-semibold mt-0">Latency</h4>
            <p className="text-green-700 mb-0">
              Track round-trip times for performance optimization
            </p>
          </div>

          <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
            <h4 className="text-yellow-800 font-semibold mt-0">Memory Usage</h4>
            <p className="text-yellow-700 mb-0">
              Monitor memory consumption for stream and KV storage
            </p>
          </div>
        </div>

        <h2>Best Practices</h2>

        <h3>Subject Design</h3>
        <ul>
          <li><strong>Hierarchical:</strong> Use dot notation for logical grouping</li>
          <li><strong>Descriptive:</strong> Make subjects self-explanatory</li>
          <li><strong>Consistent:</strong> Follow naming conventions throughout</li>
          <li><strong>Specific:</strong> Use specific subjects to avoid unnecessary traffic</li>
          <li><strong>Versioned:</strong> Consider versioning for API compatibility</li>
        </ul>

        <h3>Message Design</h3>
        <ul>
          <li><strong>JSON Format:</strong> Use JSON for structured data</li>
          <li><strong>Schema Validation:</strong> Define and validate message schemas</li>
          <li><strong>Timestamps:</strong> Include timestamps for ordering and debugging</li>
          <li><strong>Error Handling:</strong> Design for graceful error scenarios</li>
          <li><strong>Size Limits:</strong> Keep messages reasonably sized</li>
        </ul>

        <h3>Performance Optimization</h3>
        <ul>
          <li>Use queue groups for load balancing</li>
          <li>Implement proper backpressure handling</li>
          <li>Choose appropriate JetStream retention policies</li>
          <li>Monitor and tune JetStream limits</li>
          <li>Use wildcards judiciously to avoid message storms</li>
        </ul>

        <h2>Troubleshooting Common Issues</h2>

        <div className="space-y-4">
          <div className="border-l-4 border-red-400 bg-red-50 p-4">
            <h4 className="text-red-800 font-semibold mt-0">Connection Issues</h4>
            <ul className="text-red-700 mb-0">
              <li>Check NATS server is running: <code>nats server check</code></li>
              <li>Verify network connectivity and firewall settings</li>
              <li>Check credentials and authentication</li>
              <li>Review client connection parameters</li>
            </ul>
          </div>

          <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
            <h4 className="text-yellow-800 font-semibold mt-0">Message Delivery Issues</h4>
            <ul className="text-yellow-700 mb-0">
              <li>Verify subject names match exactly</li>
              <li>Check subscriber queue groups</li>
              <li>Review JetStream stream configuration</li>
              <li>Monitor message acknowledgments</li>
            </ul>
          </div>

          <div className="border-l-4 border-blue-400 bg-blue-50 p-4">
            <h4 className="text-blue-800 font-semibold mt-0">Performance Problems</h4>
            <ul className="text-blue-700 mb-0">
              <li>Check message rates and sizes</li>
              <li>Review JetStream resource usage</li>
              <li>Optimize subject patterns and wildcards</li>
              <li>Consider horizontal scaling</li>
            </ul>
          </div>
        </div>

        <h2>Advanced Topics</h2>

        <h3>Multi-Tenancy</h3>
        <p>
          Support multiple homes or organizations:
        </p>
        <div className="bg-gray-100 rounded-lg p-3 text-sm">
          Use NATS accounts to isolate different homes or tenants while sharing infrastructure
        </div>

        <h3>Edge Computing</h3>
        <p>
          Optimize for edge scenarios:
        </p>
        <div className="bg-gray-100 rounded-lg p-3 text-sm">
          Local NATS servers provide low-latency communication even when cloud connectivity is limited
        </div>

        <h3>Integration Patterns</h3>
        <p>
          Common integration approaches:
        </p>
        <div className="bg-gray-100 rounded-lg p-3 text-sm">
          Bridge protocols, transform messages, and integrate with external systems using NATS connectors
        </div>

        <h2>Related Documentation</h2>
        <ul>
          <li><Link href="/docs/devices">Device Management</Link> - How devices use NATS</li>
          <li><Link href="/docs/automations">Automations</Link> - NATS triggers and actions</li>
          <li><Link href="/docs/architecture">Architecture</Link> - Overall system design</li>
          <li><Link href="/docs/guides/troubleshooting">Troubleshooting</Link> - NATS debugging guide</li>
        </ul>

        <h2>External Resources</h2>
        <ul>
          <li><a href="https://nats.io" target="_blank" rel="noopener noreferrer">NATS.io</a> - Official NATS documentation</li>
          <li><a href="https://docs.synadia.com" target="_blank" rel="noopener noreferrer">Synadia Cloud</a> - Cloud NATS service documentation</li>
          <li><a href="https://natsbyexample.com" target="_blank" rel="noopener noreferrer">NATS by Example</a> - Code examples and tutorials</li>
        </ul>
      </div>
    </DocsLayout>
  )
}