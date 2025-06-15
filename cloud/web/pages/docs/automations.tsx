import DocsLayout from '../../components/docs/DocsLayout'
import Link from 'next/link'

export default function Automations() {
  return (
    <DocsLayout title="Automations">
      <div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-code:text-gray-900 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
        <h1>Automations</h1>
        <p className="text-lg text-gray-600">
          Create intelligent automations using Homix's visual automation designer.
        </p>

        <h2>Visual Automation Designer</h2>
        <p>
          Homix features a powerful drag-and-drop automation designer that makes creating 
          complex automations intuitive. No coding required!
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-6">
          <h4 className="text-blue-800 font-semibold mt-0">Designer Features</h4>
          <ul className="mb-0 text-blue-700">
            <li><strong>Visual Flow:</strong> See your automation logic at a glance</li>
            <li><strong>Drag & Drop:</strong> Build automations by connecting components</li>
            <li><strong>Real-time Testing:</strong> Test automations as you build them</li>
            <li><strong>Variable Support:</strong> Use dynamic values with template variables</li>
          </ul>
        </div>

        <h2>Automation Components</h2>
        <p>
          The automation designer includes several categories of components:
        </p>

        <h3>Triggers</h3>
        <p>
          Triggers start your automations when specific events occur:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 not-prose">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">📱 Device State Changed</h4>
            <p className="text-gray-600 text-sm">Triggers when a device changes state (light turns on, door opens, etc.)</p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">📡 NATS Event</h4>
            <p className="text-gray-600 text-sm">Listen for events on NATS subjects with wildcard support</p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">⏰ Time & Schedule</h4>
            <p className="text-gray-600 text-sm">Trigger at specific times or on cron schedules</p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">🌅 Sunrise/Sunset</h4>
            <p className="text-gray-600 text-sm">Solar-based triggers that adjust to your location</p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">🔄 Interval</h4>
            <p className="text-gray-600 text-sm">Regular interval triggers (every 5 minutes, hourly, etc.)</p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">💾 State Changed</h4>
            <p className="text-gray-600 text-sm">Triggers when KV store values change</p>
          </div>
        </div>

        <h3>Actions</h3>
        <p>
          Actions define what happens when an automation triggers:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 not-prose">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">🎛️ Control Device</h4>
            <p className="text-gray-600 text-sm">Send commands to devices (turn on lights, adjust temperature)</p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">📤 Publish NATS Event</h4>
            <p className="text-gray-600 text-sm">Publish custom events to NATS subjects</p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">💾 Update State</h4>
            <p className="text-gray-600 text-sm">Update values in the KV store</p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">🎬 Activate Scene</h4>
            <p className="text-gray-600 text-sm">Activate predefined scenes</p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">📢 Send Notification</h4>
            <p className="text-gray-600 text-sm">Send notifications to mobile devices or services</p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">⏸️ Delay</h4>
            <p className="text-gray-600 text-sm">Add delays between actions</p>
          </div>
        </div>

        <h3>Conditions</h3>
        <p>
          Conditions control when actions execute:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 not-prose">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">📱 Device State Is</h4>
            <p className="text-gray-600 text-sm">Check if device is in specific state</p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">⏰ Time Between</h4>
            <p className="text-gray-600 text-sm">Check if current time is within range</p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">📅 Day of Week</h4>
            <p className="text-gray-600 text-sm">Check specific days of the week</p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">🔢 Numeric Compare</h4>
            <p className="text-gray-600 text-sm">Compare numeric values with operators</p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">🌅 Sun Position</h4>
            <p className="text-gray-600 text-sm">Check if sun is up or down</p>
          </div>
        </div>

        <h3>Logic Components</h3>
        <p>
          Logic components provide flow control and decision making:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 not-prose">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">🔀 AND/OR/NOT Gates</h4>
            <p className="text-gray-600 text-sm">Boolean logic operations</p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">🔀 Switch</h4>
            <p className="text-gray-600 text-sm">Route flow based on values</p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">🔢 Counter</h4>
            <p className="text-gray-600 text-sm">Count events and trigger actions</p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">⏱️ Timer</h4>
            <p className="text-gray-600 text-sm">Time-based logic and delays</p>
          </div>
        </div>

        <h2>Building Your First Automation</h2>
        <p>
          Let's create a simple automation that turns on lights when you arrive home:
        </p>

        <ol>
          <li>Open the Homix dashboard and navigate to "Automations"</li>
          <li>Click "Create New Automation"</li>
          <li>Drag a "Device State Changed" trigger to the canvas</li>
          <li>Configure it to trigger when your phone's location changes</li>
          <li>Add a "Device State Is" condition to check if you're home</li>
          <li>Add a "Control Device" action to turn on the lights</li>
          <li>Connect the components by dragging from output to input ports</li>
          <li>Save and enable the automation</li>
        </ol>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 my-6">
          <h4 className="text-green-800 font-semibold mt-0">Pro Tip</h4>
          <p className="mb-0 text-green-700">
            Start with simple automations and gradually add complexity. Test each 
            component individually before connecting them together.
          </p>
        </div>

        <h2>Advanced Automation Patterns</h2>

        <h3>Presence Detection</h3>
        <p>
          Create smart presence-aware automations:
        </p>

        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div><strong>Phone Tracking:</strong> Use device tracker integrations</div>
          <div><strong>Motion Sensors:</strong> Detect movement in rooms</div>
          <div><strong>Door Sensors:</strong> Track entry and exit</div>
          <div><strong>Bluetooth Beacons:</strong> Room-level presence detection</div>
        </div>

        <h3>Environmental Automations</h3>
        <p>
          Respond to environmental changes automatically:
        </p>

        <div className="space-y-4">
          <div className="border-l-4 border-blue-400 bg-blue-50 p-4">
            <h4 className="text-blue-800 font-semibold mt-0">Climate Control</h4>
            <p className="text-blue-700 mb-0">
              Adjust temperature based on weather, occupancy, and time of day.
            </p>
          </div>

          <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
            <h4 className="text-yellow-800 font-semibold mt-0">Lighting</h4>
            <p className="text-yellow-700 mb-0">
              Automatically adjust brightness and color temperature throughout the day.
            </p>
          </div>

          <div className="border-l-4 border-green-400 bg-green-50 p-4">
            <h4 className="text-green-800 font-semibold mt-0">Security</h4>
            <p className="text-green-700 mb-0">
              Activate security measures when nobody's home or during specific times.
            </p>
          </div>
        </div>

        <h3>Multi-Stage Automations</h3>
        <p>
          Create complex automations with multiple stages:
        </p>

        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm space-y-2">
          <div># Example: Bedtime Routine</div>
          <div>1. Trigger: Time is 10:00 PM</div>
          <div>2. Condition: Anyone is home</div>
          <div>3. Action: Dim living room lights to 30%</div>
          <div>4. Delay: 30 minutes</div>
          <div>5. Action: Turn off all lights except bedroom</div>
          <div>6. Action: Set thermostat to night mode</div>
          <div>7. Action: Activate security system</div>
        </div>

        <h2>State Management in Automations</h2>

        <h3>Using Variables</h3>
        <p>
          Automations support template variables for dynamic behavior:
        </p>

        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div><code>{"{{device.state}}"}</code> - Current device state</div>
          <div><code>{"{{trigger.time}}"}</code> - When the automation was triggered</div>
          <div><code>{"{{user.name}}"}</code> - User who triggered the automation</div>
          <div><code>{"{{weather.temperature}}"}</code> - Current temperature</div>
          <div><code>{"{{kv.key_name}}"}</code> - Value from KV store</div>
        </div>

        <h3>Persistent State</h3>
        <p>
          Store automation state in the KV store for complex logic:
        </p>

        <ul>
          <li><strong>Counters:</strong> Track how many times something happened</li>
          <li><strong>Timestamps:</strong> Remember when events occurred</li>
          <li><strong>Flags:</strong> Store boolean states for conditions</li>
          <li><strong>User Preferences:</strong> Store user-specific settings</li>
        </ul>

        <h2>Testing and Debugging</h2>

        <h3>Automation Testing</h3>
        <p>
          Test your automations before deploying:
        </p>

        <ol>
          <li><strong>Manual Testing:</strong> Use the "Test" button in the designer</li>
          <li><strong>Simulation:</strong> Use the device simulator to trigger events</li>
          <li><strong>Dry Run:</strong> Enable dry-run mode to see what would happen</li>
          <li><strong>Logging:</strong> Review automation logs for debugging</li>
        </ol>

        <h3>Common Issues</h3>
        <div className="space-y-4">
          <div className="border-l-4 border-red-400 bg-red-50 p-4">
            <h4 className="text-red-800 font-semibold mt-0">Automation Not Triggering</h4>
            <ul className="text-red-700 mb-0">
              <li>Check if automation is enabled</li>
              <li>Verify trigger conditions are met</li>
              <li>Review NATS subject patterns</li>
              <li>Check device connectivity</li>
            </ul>
          </div>

          <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
            <h4 className="text-yellow-800 font-semibold mt-0">Actions Not Executing</h4>
            <ul className="text-yellow-700 mb-0">
              <li>Verify device states and commands</li>
              <li>Check condition logic</li>
              <li>Review variable substitutions</li>
              <li>Test individual components</li>
            </ul>
          </div>

          <div className="border-l-4 border-blue-400 bg-blue-50 p-4">
            <h4 className="text-blue-800 font-semibold mt-0">Performance Issues</h4>
            <ul className="text-blue-700 mb-0">
              <li>Limit trigger frequency</li>
              <li>Use specific NATS subjects</li>
              <li>Optimize condition checking</li>
              <li>Review automation complexity</li>
            </ul>
          </div>
        </div>

        <h2>Automation Examples</h2>

        <h3>Welcome Home</h3>
        <p>
          Turn on lights and adjust climate when arriving home:
        </p>
        <div className="bg-gray-100 rounded p-3 text-sm">
          <strong>Trigger:</strong> Device tracker shows "home"<br/>
          <strong>Condition:</strong> Sun is down<br/>
          <strong>Actions:</strong> Turn on entry lights, set thermostat to 72°F
        </div>

        <h3>Energy Saving</h3>
        <p>
          Automatically reduce energy consumption when nobody's home:
        </p>
        <div className="bg-gray-100 rounded p-3 text-sm">
          <strong>Trigger:</strong> All phones leave home<br/>
          <strong>Actions:</strong> Turn off non-essential lights, set thermostat to away mode, turn off entertainment devices
        </div>

        <h3>Security Alert</h3>
        <p>
          Send notifications for unexpected activity:
        </p>
        <div className="bg-gray-100 rounded p-3 text-sm">
          <strong>Trigger:</strong> Motion detected<br/>
          <strong>Conditions:</strong> Nobody home AND time between 9 AM - 5 PM<br/>
          <strong>Actions:</strong> Send notification, record security footage, turn on lights
        </div>

        <h2>Best Practices</h2>

        <h3>Design Guidelines</h3>
        <ul>
          <li><strong>Start Simple:</strong> Begin with basic automations and add complexity gradually</li>
          <li><strong>Test Thoroughly:</strong> Test all edge cases and failure scenarios</li>
          <li><strong>Use Meaningful Names:</strong> Name automations clearly for easy maintenance</li>
          <li><strong>Document Logic:</strong> Add descriptions for complex automation logic</li>
          <li><strong>Monitor Performance:</strong> Watch for automations that trigger too frequently</li>
        </ul>

        <h3>Maintenance</h3>
        <ul>
          <li>Regularly review automation logs</li>
          <li>Update automations when adding/removing devices</li>
          <li>Archive unused automations</li>
          <li>Keep automation count reasonable for performance</li>
          <li>Version control automation configurations</li>
        </ul>

        <h2>Related Documentation</h2>
        <ul>
          <li><Link href="/docs/devices">Device Management</Link> - Managing devices used in automations</li>
          <li><Link href="/docs/scenes">Scenes</Link> - Using scenes in automations</li>
          <li><Link href="/docs/nats">NATS Messaging</Link> - Understanding the messaging system</li>
          <li><Link href="/docs/guides/troubleshooting">Troubleshooting</Link> - Debugging automation issues</li>
        </ul>
      </div>
    </DocsLayout>
  )
}