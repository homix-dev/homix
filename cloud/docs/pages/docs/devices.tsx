import DocsLayout from '../../components/docs/DocsLayout'
import Link from 'next/link'

export default function Devices() {
  return (
    <DocsLayout title="Device Management">
      <div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-code:text-gray-900 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
        <h1>Device Management</h1>
        <p className="text-lg text-gray-600">
          Learn how to add, configure, and manage devices in your Homix system.
        </p>

        <h2>Supported Device Types</h2>
        <p>
          Homix supports a wide variety of smart home devices through different protocols:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6 not-prose">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">💡 Lighting</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Smart bulbs (Philips Hue, LIFX)</li>
              <li>Smart switches</li>
              <li>Dimmers</li>
              <li>LED strips</li>
            </ul>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">🌡️ Climate Control</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Thermostats</li>
              <li>Temperature sensors</li>
              <li>Humidity sensors</li>
              <li>Smart vents</li>
            </ul>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">🔒 Security</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Smart locks</li>
              <li>Door/window sensors</li>
              <li>Motion detectors</li>
              <li>Security cameras</li>
            </ul>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">🏠 Home Control</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Smart plugs</li>
              <li>Window covers</li>
              <li>Garage doors</li>
              <li>Smart speakers</li>
            </ul>
          </div>
        </div>

        <h2>Device Discovery</h2>
        <p>
          Homix can automatically discover many devices on your network using several methods:
        </p>

        <h3>Automatic Discovery</h3>
        <ol>
          <li>Open the Homix dashboard</li>
          <li>Navigate to the "Devices" section</li>
          <li>Click "Auto-discover devices"</li>
          <li>Wait for the scan to complete</li>
          <li>Review and add discovered devices</li>
        </ol>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-6">
          <h4 className="text-blue-800 font-semibold mt-0">Discovery Methods</h4>
          <ul className="mb-0 text-blue-700">
            <li><strong>mDNS/Bonjour:</strong> Discovers network-enabled devices</li>
            <li><strong>UPnP:</strong> Finds multimedia and control devices</li>
            <li><strong>Protocol scanning:</strong> Zigbee, Z-Wave, WiFi protocols</li>
            <li><strong>Manufacturer APIs:</strong> Cloud-connected devices</li>
          </ul>
        </div>

        <h3>Manual Device Addition</h3>
        <p>
          For devices that can't be auto-discovered, you can add them manually:
        </p>

        <ol>
          <li>Click "Add Device" in the devices section</li>
          <li>Select the device type or protocol</li>
          <li>Enter device-specific information (IP address, device ID, etc.)</li>
          <li>Configure authentication if required</li>
          <li>Test the connection and save</li>
        </ol>

        <h2>Device Configuration</h2>

        <h3>Basic Settings</h3>
        <p>
          Each device can be configured with:
        </p>

        <ul>
          <li><strong>Name:</strong> Friendly name for the device</li>
          <li><strong>Room:</strong> Assign to a specific room or area</li>
          <li><strong>Tags:</strong> Labels for grouping and automation</li>
          <li><strong>Icon:</strong> Visual representation in the dashboard</li>
        </ul>

        <h3>Advanced Configuration</h3>
        <div className="space-y-4">
          <div className="border-l-4 border-blue-400 bg-blue-50 p-4">
            <h4 className="text-blue-800 font-semibold mt-0">Protocol Settings</h4>
            <p className="text-blue-700 mb-0">
              Configure protocol-specific parameters like polling intervals, 
              authentication keys, and communication preferences.
            </p>
          </div>

          <div className="border-l-4 border-green-400 bg-green-50 p-4">
            <h4 className="text-green-800 font-semibold mt-0">State Mapping</h4>
            <p className="text-green-700 mb-0">
              Map device states to standard Homix formats for consistent 
              automation and display across different device types.
            </p>
          </div>

          <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
            <h4 className="text-yellow-800 font-semibold mt-0">Update Frequency</h4>
            <p className="text-yellow-700 mb-0">
              Set how often the device state is polled or how frequently 
              it reports changes to optimize performance and battery life.
            </p>
          </div>
        </div>

        <h2>Device States and Commands</h2>

        <h3>Understanding Device States</h3>
        <p>
          Device states represent the current condition of a device. Common states include:
        </p>

        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div><strong>Binary states:</strong> <code>on/off</code>, <code>open/closed</code>, <code>locked/unlocked</code></div>
          <div><strong>Numeric states:</strong> <code>temperature</code>, <code>brightness</code>, <code>battery_level</code></div>
          <div><strong>Text states:</strong> <code>mode</code>, <code>status</code>, <code>color</code></div>
          <div><strong>Complex states:</strong> JSON objects with multiple properties</div>
        </div>

        <h3>Sending Commands</h3>
        <p>
          Control devices by sending commands through the dashboard or automations:
        </p>

        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm space-y-2">
          <div># Example NATS commands</div>
          <div>nats pub home.devices.living-room-light.command &apos;{"{\"action\": \"turn_on\"}"}&apos;</div>
          <div>nats pub home.devices.thermostat.command &apos;{"{\"temperature\": 72}"}&apos;</div>
          <div>nats pub home.devices.garage-door.command &apos;{"{\"action\": \"open\"}"}&apos;</div>
        </div>

        <h2>Device Groups and Rooms</h2>

        <h3>Organizing Devices</h3>
        <p>
          Group devices logically for easier management:
        </p>

        <ul>
          <li><strong>Rooms:</strong> Organize by physical location (Living Room, Kitchen, Bedroom)</li>
          <li><strong>Device Types:</strong> Group by function (All Lights, All Sensors, Security Devices)</li>
          <li><strong>Custom Groups:</strong> Create custom groupings for specific automation needs</li>
        </ul>

        <h3>Group Actions</h3>
        <p>
          Perform actions on entire groups:
        </p>

        <ul>
          <li>Turn off all lights in a room</li>
          <li>Set all thermostats to away mode</li>
          <li>Check battery levels of all sensors</li>
          <li>Update firmware for all devices of a type</li>
        </ul>

        <h2>Device Health and Monitoring</h2>

        <h3>Health Indicators</h3>
        <p>
          Monitor device health through various indicators:
        </p>

        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <span className="w-3 h-3 bg-green-500 rounded-full mt-1 flex-shrink-0"></span>
            <div>
              <strong>Online:</strong> Device is responding and functioning normally
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <span className="w-3 h-3 bg-yellow-500 rounded-full mt-1 flex-shrink-0"></span>
            <div>
              <strong>Warning:</strong> Device has issues but is still functional (low battery, weak signal)
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <span className="w-3 h-3 bg-red-500 rounded-full mt-1 flex-shrink-0"></span>
            <div>
              <strong>Offline:</strong> Device is not responding or has lost connection
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <span className="w-3 h-3 bg-gray-500 rounded-full mt-1 flex-shrink-0"></span>
            <div>
              <strong>Unknown:</strong> Device status cannot be determined
            </div>
          </div>
        </div>

        <h3>Troubleshooting Device Issues</h3>
        <p>
          Common device problems and solutions:
        </p>

        <div className="space-y-4">
          <div className="border-l-4 border-red-400 bg-red-50 p-4">
            <h4 className="text-red-800 font-semibold mt-0">Device Not Responding</h4>
            <ul className="text-red-700 mb-0">
              <li>Check network connectivity</li>
              <li>Verify power supply</li>
              <li>Restart the device</li>
              <li>Check protocol-specific requirements</li>
            </ul>
          </div>

          <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
            <h4 className="text-yellow-800 font-semibold mt-0">Slow Response Times</h4>
            <ul className="text-yellow-700 mb-0">
              <li>Check network congestion</li>
              <li>Adjust polling frequency</li>
              <li>Move closer to hub/router</li>
              <li>Update device firmware</li>
            </ul>
          </div>

          <div className="border-l-4 border-blue-400 bg-blue-50 p-4">
            <h4 className="text-blue-800 font-semibold mt-0">Inconsistent States</h4>
            <ul className="text-blue-700 mb-0">
              <li>Refresh device state manually</li>
              <li>Check for interference</li>
              <li>Verify state mapping configuration</li>
              <li>Reset device and reconfigure</li>
            </ul>
          </div>
        </div>

        <h2>Device Security</h2>

        <h3>Authentication</h3>
        <p>
          Secure your devices with proper authentication:
        </p>

        <ul>
          <li><strong>API Keys:</strong> Use manufacturer-provided API keys</li>
          <li><strong>Certificates:</strong> Install device certificates for encrypted communication</li>
          <li><strong>Local Authentication:</strong> Use local credentials when available</li>
          <li><strong>Network Isolation:</strong> Consider VLANs for device isolation</li>
        </ul>

        <h3>Best Practices</h3>
        <ul>
          <li>Change default passwords on all devices</li>
          <li>Keep device firmware updated</li>
          <li>Use separate network for IoT devices when possible</li>
          <li>Regularly audit device access and permissions</li>
          <li>Monitor device communications for unusual activity</li>
        </ul>

        <h2>Integration Examples</h2>

        <h3>Popular Device Integrations</h3>
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold">Philips Hue</h4>
            <div className="bg-gray-900 text-gray-100 rounded p-3 font-mono text-sm">
              # Auto-discovery finds Hue bridge<br/>
              # Manual: Add bridge IP and generate API key<br/>
              # Supports: Lights, sensors, switches
            </div>
          </div>

          <div>
            <h4 className="font-semibold">Nest Thermostat</h4>
            <div className="bg-gray-900 text-gray-100 rounded p-3 font-mono text-sm">
              # Requires Google Developer account<br/>
              # Uses OAuth2 for authentication<br/>
              # Supports: Temperature control, schedules, sensors
            </div>
          </div>

          <div>
            <h4 className="font-semibold">Zigbee Devices</h4>
            <div className="bg-gray-900 text-gray-100 rounded p-3 font-mono text-sm">
              # Requires Zigbee coordinator (Conbee, CC2531)<br/>
              # Uses Zigbee2MQTT bridge<br/>
              # Supports: Wide variety of manufacturers
            </div>
          </div>
        </div>

        <h2>Related Documentation</h2>
        <ul>
          <li><Link href="/docs/automations">Automations</Link> - Using devices in automations</li>
          <li><Link href="/docs/scenes">Scenes</Link> - Creating device scenes</li>
          <li><Link href="/docs/guides/troubleshooting">Troubleshooting</Link> - Device troubleshooting</li>
        </ul>
      </div>
    </DocsLayout>
  )
}