import DocsLayout from '../../components/docs/DocsLayout'
import Link from 'next/link'

export default function Scenes() {
  return (
    <DocsLayout title="Scenes">
      <div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-code:text-gray-900 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
        <h1>Scenes</h1>
        <p className="text-lg text-gray-600">
          Create and manage scenes to control multiple devices with a single action.
        </p>

        <h2>What are Scenes?</h2>
        <p>
          Scenes are predefined configurations that set multiple devices to specific states 
          simultaneously. Think of them as snapshots of your home's state that you can 
          instantly activate.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-6">
          <h4 className="text-blue-800 font-semibold mt-0">Scene Benefits</h4>
          <ul className="mb-0 text-blue-700">
            <li><strong>One-Touch Control:</strong> Set multiple devices with a single action</li>
            <li><strong>Consistent Experience:</strong> Reproduce the same ambiance reliably</li>
            <li><strong>Automation Integration:</strong> Use scenes in automations and schedules</li>
            <li><strong>Quick Setup:</strong> Instantly configure rooms for different activities</li>
          </ul>
        </div>

        <h2>Types of Scenes</h2>
        <p>
          Homix supports different types of scenes for various use cases:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6 not-prose">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">🏠 Room Scenes</h4>
            <p className="text-gray-600 text-sm mb-3">Control all devices in a specific room</p>
            <div className="text-xs text-gray-500">
              Examples: "Living Room Movie", "Bedroom Sleep", "Kitchen Cooking"
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">🌍 Global Scenes</h4>
            <p className="text-gray-600 text-sm mb-3">Control devices throughout the entire home</p>
            <div className="text-xs text-gray-500">
              Examples: "Good Morning", "Away Mode", "Good Night", "Party Time"
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">🎭 Activity Scenes</h4>
            <p className="text-gray-600 text-sm mb-3">Optimized for specific activities</p>
            <div className="text-xs text-gray-500">
              Examples: "Reading", "Cooking", "Working", "Relaxing"
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">🚨 Security Scenes</h4>
            <p className="text-gray-600 text-sm mb-3">Activate security and safety measures</p>
            <div className="text-xs text-gray-500">
              Examples: "Vacation Mode", "Night Security", "Emergency"
            </div>
          </div>
        </div>

        <h2>Creating Your First Scene</h2>
        <p>
          Follow these steps to create a new scene:
        </p>

        <ol>
          <li>Navigate to the "Scenes" section in the Homix dashboard</li>
          <li>Click "Create New Scene"</li>
          <li>Give your scene a descriptive name (e.g., "Living Room Movie Night")</li>
          <li>Add devices by clicking "Add Device"</li>
          <li>Configure the desired state for each device</li>
          <li>Test the scene to ensure it works as expected</li>
          <li>Save and activate when needed</li>
        </ol>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 my-6">
          <h4 className="text-green-800 font-semibold mt-0">Pro Tip</h4>
          <p className="mb-0 text-green-700">
            Set up your devices manually to the desired states first, then use the 
            "Capture Current State" feature to quickly create a scene from the current setup.
          </p>
        </div>

        <h2>Scene Configuration</h2>

        <h3>Device States</h3>
        <p>
          Each device in a scene can be configured with specific states:
        </p>

        <div className="space-y-4">
          <div className="border-l-4 border-blue-400 bg-blue-50 p-4">
            <h4 className="text-blue-800 font-semibold mt-0">Lighting</h4>
            <ul className="text-blue-700 mb-0">
              <li>On/Off state</li>
              <li>Brightness level (0-100%)</li>
              <li>Color temperature (warm/cool)</li>
              <li>RGB color values</li>
              <li>Transition duration</li>
            </ul>
          </div>

          <div className="border-l-4 border-green-400 bg-green-50 p-4">
            <h4 className="text-green-800 font-semibold mt-0">Climate Control</h4>
            <ul className="text-green-700 mb-0">
              <li>Target temperature</li>
              <li>Heating/cooling mode</li>
              <li>Fan speed</li>
              <li>Humidity settings</li>
            </ul>
          </div>

          <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
            <h4 className="text-yellow-800 font-semibold mt-0">Media & Entertainment</h4>
            <ul className="text-yellow-700 mb-0">
              <li>Volume levels</li>
              <li>Input sources</li>
              <li>Power states</li>
              <li>Playlist or content selection</li>
            </ul>
          </div>

          <div className="border-l-4 border-purple-400 bg-purple-50 p-4">
            <h4 className="text-purple-800 font-semibold mt-0">Window Treatments</h4>
            <ul className="text-purple-700 mb-0">
              <li>Position (open/closed percentage)</li>
              <li>Tilt angle for blinds</li>
              <li>Operation speed</li>
            </ul>
          </div>
        </div>

        <h3>Advanced Scene Options</h3>
        <p>
          Customize scene behavior with advanced options:
        </p>

        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div>
            <strong>Execution Order:</strong> Control the sequence in which devices are activated
          </div>
          <div>
            <strong>Delays:</strong> Add delays between device activations for smooth transitions
          </div>
          <div>
            <strong>Conditions:</strong> Only activate devices if certain conditions are met
          </div>
          <div>
            <strong>Fallback Actions:</strong> Alternative actions if primary devices are unavailable
          </div>
          <div>
            <strong>Restoration:</strong> Option to restore previous states when scene is deactivated
          </div>
        </div>

        <h2>Scene Examples</h2>

        <h3>Good Morning Scene</h3>
        <p>
          Start your day with a comprehensive morning routine:
        </p>
        <div className="bg-gray-100 rounded-lg p-4 space-y-2 text-sm">
          <div><strong>Bedroom:</strong> Gradually increase lights to 80%, open blinds to 75%</div>
          <div><strong>Kitchen:</strong> Turn on under-cabinet lights, start coffee maker</div>
          <div><strong>Bathroom:</strong> Turn on mirror lights, set heated floor to 75°F</div>
          <div><strong>Living Room:</strong> Turn on ambient lighting, display weather on smart display</div>
          <div><strong>Climate:</strong> Set temperature to 72°F throughout the house</div>
        </div>

        <h3>Movie Night Scene</h3>
        <p>
          Create the perfect ambiance for movie watching:
        </p>
        <div className="bg-gray-100 rounded-lg p-4 space-y-2 text-sm">
          <div><strong>Living Room Lights:</strong> Dim to 20%, warm color temperature</div>
          <div><strong>TV:</strong> Turn on, switch to media player input</div>
          <div><strong>Sound System:</strong> Turn on, set volume to 40%</div>
          <div><strong>Accent Lighting:</strong> Enable bias lighting behind TV</div>
          <div><strong>Window Treatments:</strong> Close blinds completely</div>
        </div>

        <h3>Away Mode Scene</h3>
        <p>
          Secure and optimize your home when leaving:
        </p>
        <div className="bg-gray-100 rounded-lg p-4 space-y-2 text-sm">
          <div><strong>Lights:</strong> Turn off all lights except security lighting</div>
          <div><strong>Climate:</strong> Set to away mode (energy saving)</div>
          <div><strong>Security:</strong> Arm security system, enable cameras</div>
          <div><strong>Appliances:</strong> Turn off non-essential devices</div>
          <div><strong>Doors:</strong> Ensure all doors are locked</div>
        </div>

        <h3>Bedtime Scene</h3>
        <p>
          Wind down for the night with a relaxing routine:
        </p>
        <div className="bg-gray-100 rounded-lg p-4 space-y-2 text-sm">
          <div><strong>All Lights:</strong> Turn off except bedroom and hallway path lighting</div>
          <div><strong>Bedroom:</strong> Dim lights to 10%, warm color</div>
          <div><strong>Climate:</strong> Lower temperature to 68°F</div>
          <div><strong>Security:</strong> Enable night mode, arm motion sensors</div>
          <div><strong>Entertainment:</strong> Turn off TVs and music systems</div>
        </div>

        <h2>Scene Activation</h2>

        <h3>Manual Activation</h3>
        <p>
          Activate scenes manually through various methods:
        </p>

        <ul>
          <li><strong>Dashboard:</strong> Click the scene button in the web interface</li>
          <li><strong>Mobile App:</strong> Tap scene buttons on your mobile device</li>
          <li><strong>Voice Commands:</strong> "Hey Google, activate Movie Night scene"</li>
          <li><strong>Physical Buttons:</strong> Assign scenes to smart switches or remotes</li>
          <li><strong>Shortcuts:</strong> Use device-specific shortcuts and widgets</li>
        </ul>

        <h3>Automated Activation</h3>
        <p>
          Integrate scenes into automations for smart activation:
        </p>

        <div className="space-y-4">
          <div className="border-l-4 border-blue-400 bg-blue-50 p-4">
            <h4 className="text-blue-800 font-semibold mt-0">Time-Based</h4>
            <p className="text-blue-700 mb-0">
              Activate scenes at specific times or based on sunrise/sunset
            </p>
          </div>

          <div className="border-l-4 border-green-400 bg-green-50 p-4">
            <h4 className="text-green-800 font-semibold mt-0">Presence-Based</h4>
            <p className="text-green-700 mb-0">
              Activate when people arrive, leave, or move between rooms
            </p>
          </div>

          <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
            <h4 className="text-yellow-800 font-semibold mt-0">Event-Based</h4>
            <p className="text-yellow-700 mb-0">
              Activate based on device states, weather conditions, or calendar events
            </p>
          </div>
        </div>

        <h2>Scene Management</h2>

        <h3>Organization</h3>
        <p>
          Keep your scenes organized for easy management:
        </p>

        <ul>
          <li><strong>Categories:</strong> Group scenes by room, activity, or time of day</li>
          <li><strong>Favorites:</strong> Mark frequently used scenes as favorites</li>
          <li><strong>Tags:</strong> Use tags for flexible organization and filtering</li>
          <li><strong>Folders:</strong> Create hierarchical folder structures</li>
          <li><strong>Search:</strong> Use search functionality to quickly find scenes</li>
        </ul>

        <h3>Scene Scheduling</h3>
        <p>
          Schedule scenes to activate automatically:
        </p>

        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm space-y-2">
          <div># Example scene schedules</div>
          <div>Good Morning: Monday-Friday at 6:30 AM</div>
          <div>Away Mode: Monday-Friday at 8:00 AM</div>
          <div>Welcome Home: Monday-Friday at 6:00 PM</div>
          <div>Bedtime: Daily at 10:30 PM</div>
          <div>Weekend Sleep-in: Saturday-Sunday at 8:30 AM</div>
        </div>

        <h2>Scene Testing and Validation</h2>

        <h3>Testing Strategies</h3>
        <p>
          Test your scenes thoroughly before relying on them:
        </p>

        <ol>
          <li><strong>Device Check:</strong> Verify all devices are online and responsive</li>
          <li><strong>State Validation:</strong> Confirm each device reaches the expected state</li>
          <li><strong>Timing Tests:</strong> Check execution timing and delays</li>
          <li><strong>Condition Testing:</strong> Test scenes under different conditions</li>
          <li><strong>Fallback Testing:</strong> Test behavior when devices are unavailable</li>
        </ol>

        <h3>Scene Monitoring</h3>
        <p>
          Monitor scene performance and reliability:
        </p>

        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div><strong>Execution Logs:</strong> Review scene activation history</div>
          <div><strong>Error Tracking:</strong> Monitor failed device activations</div>
          <div><strong>Performance Metrics:</strong> Track execution times</div>
          <div><strong>Usage Statistics:</strong> See which scenes are used most</div>
        </div>

        <h2>Troubleshooting Scenes</h2>

        <h3>Common Issues</h3>
        <div className="space-y-4">
          <div className="border-l-4 border-red-400 bg-red-50 p-4">
            <h4 className="text-red-800 font-semibold mt-0">Scene Not Activating</h4>
            <ul className="text-red-700 mb-0">
              <li>Check if scene is enabled</li>
              <li>Verify device connectivity</li>
              <li>Review condition requirements</li>
              <li>Check NATS connectivity</li>
            </ul>
          </div>

          <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
            <h4 className="text-yellow-800 font-semibold mt-0">Partial Scene Execution</h4>
            <ul className="text-yellow-700 mb-0">
              <li>Identify which devices failed</li>
              <li>Check device-specific error logs</li>
              <li>Verify device states and capabilities</li>
              <li>Test individual device commands</li>
            </ul>
          </div>

          <div className="border-l-4 border-blue-400 bg-blue-50 p-4">
            <h4 className="text-blue-800 font-semibold mt-0">Slow Scene Execution</h4>
            <ul className="text-blue-700 mb-0">
              <li>Check network performance</li>
              <li>Reduce unnecessary delays</li>
              <li>Optimize device communication protocols</li>
              <li>Consider device grouping strategies</li>
            </ul>
          </div>
        </div>

        <h2>Advanced Scene Features</h2>

        <h3>Scene Variables</h3>
        <p>
          Use variables to make scenes more dynamic:
        </p>

        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div><code>{"{{time.hour}}"}</code> - Current hour for time-based adjustments</div>
          <div><code>{"{{weather.condition}}"}</code> - Weather-based scene modifications</div>
          <div><code>{"{{occupancy.count}}"}</code> - Number of people home</div>
          <div><code>{"{{user.preferences}}"}</code> - User-specific settings</div>
        </div>

        <h3>Scene Inheritance</h3>
        <p>
          Create scene templates and inherit from them:
        </p>

        <ul>
          <li><strong>Base Scenes:</strong> Define common device configurations</li>
          <li><strong>Scene Extensions:</strong> Modify base scenes for specific situations</li>
          <li><strong>Room Templates:</strong> Create reusable room configurations</li>
          <li><strong>Seasonal Variations:</strong> Modify scenes based on seasons</li>
        </ul>

        <h2>Best Practices</h2>

        <h3>Design Guidelines</h3>
        <ul>
          <li><strong>Keep It Simple:</strong> Start with basic scenes and add complexity gradually</li>
          <li><strong>Use Descriptive Names:</strong> Make scene names clear and meaningful</li>
          <li><strong>Test Regularly:</strong> Verify scenes work as expected after device changes</li>
          <li><strong>Plan for Failures:</strong> Design fallback behaviors for unreliable devices</li>
          <li><strong>Consider Context:</strong> Design scenes that work in different situations</li>
        </ul>

        <h3>Performance Tips</h3>
        <ul>
          <li>Group devices by communication protocol for faster execution</li>
          <li>Use appropriate delays to avoid overwhelming devices</li>
          <li>Limit the number of devices in a single scene for reliability</li>
          <li>Cache device states to reduce unnecessary commands</li>
          <li>Use conditional execution to skip unnecessary actions</li>
        </ul>

        <h2>Related Documentation</h2>
        <ul>
          <li><Link href="/docs/devices">Device Management</Link> - Managing devices used in scenes</li>
          <li><Link href="/docs/automations">Automations</Link> - Using scenes in automations</li>
          <li><Link href="/docs/nats">NATS Messaging</Link> - Understanding scene communication</li>
          <li><Link href="/docs/guides/troubleshooting">Troubleshooting</Link> - Debugging scene issues</li>
        </ul>
      </div>
    </DocsLayout>
  )
}