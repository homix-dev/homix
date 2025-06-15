import { useEffect, useState, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import CredentialsManager from '../../components/CredentialsManager'
import { getNatsClient, Home, Device } from '../../lib/nats-client'

export default function App() {
  const router = useRouter()
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [homes, setHomes] = useState<Map<string, Home>>(new Map())
  const [selectedHome, setSelectedHome] = useState<string | null>(null)
  const [devices, setDevices] = useState<Map<string, Device>>(new Map())

  useEffect(() => {
    // Check for stored credentials
    const storedCreds = localStorage.getItem('homix_creds')
    if (storedCreds) {
      connectToNats(storedCreds)
    } else {
      setLoading(false)
    }
  }, [])

  const connectToNats = useCallback(async (credentials: string) => {
    try {
      setLoading(true)
      const client = getNatsClient()
      
      // Use Synadia Cloud WebSocket endpoint
      await client.connect({
        wsUrl: 'wss://connect.ngs.global:443',
        credentials
      })
      
      setConnected(true)
      
      // Subscribe to home announcements
      await client.subscribeToHomes((home) => {
        setHomes(prev => new Map(prev).set(home.id, home))
      })
      
      setLoading(false)
    } catch (err) {
      console.error('Failed to connect:', err)
      setLoading(false)
      setConnected(false)
      // Clear invalid creds
      localStorage.removeItem('homix_creds')
    }
  }, [])

  const handleHomeSelect = useCallback(async (homeId: string) => {
    setSelectedHome(homeId)
    
    // Subscribe to devices for this home
    const client = getNatsClient()
    await client.subscribeToDevices(homeId, (device) => {
      setDevices(prev => new Map(prev).set(device.id, device))
    })
  }, [])

  const handleDeviceCommand = useCallback(async (deviceId: string, command: any) => {
    if (!selectedHome) return
    
    const client = getNatsClient()
    await client.sendCommand(selectedHome, deviceId, command)
  }, [selectedHome])

  const handleDisconnect = useCallback(async () => {
    const client = getNatsClient()
    await client.disconnect()
    localStorage.removeItem('homix_creds')
    setConnected(false)
    setHomes(new Map())
    setDevices(new Map())
    setSelectedHome(null)
  }, [])

  return (
    <>
      <Head>
        <title>Homix Cloud</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <span className="text-2xl mr-2">🏠</span>
                <h1 className="text-xl font-semibold">Homix Cloud</h1>
              </div>
              <div className="flex items-center space-x-4">
                {connected && (
                  <>
                    <span className="text-sm text-green-600 flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      Connected
                    </span>
                    <button
                      onClick={handleDisconnect}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Disconnect
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Connecting to NATS...</p>
            </div>
          ) : !connected ? (
            <CredentialsManager onCredentialsLoaded={connectToNats} />
          ) : (
            <div>
              {/* Home Selector */}
              {homes.size > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Home
                  </label>
                  <select
                    value={selectedHome || ''}
                    onChange={(e) => handleHomeSelect(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a home...</option>
                    {Array.from(homes.values()).map(home => (
                      <option key={home.id} value={home.id}>
                        {home.name} ({home.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Waiting for Homes */}
              {homes.size === 0 && (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <div className="inline-block p-4 bg-gray-100 rounded-full mb-4">
                    <span className="text-4xl">🏠</span>
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Waiting for homes...</h2>
                  <p className="text-gray-600 mb-4">
                    Make sure your Homix Edge server is running and connected.
                  </p>
                  <div className="text-sm text-gray-500">
                    Listening for announcements on <code className="bg-gray-100 px-2 py-1 rounded">home.edge.announce</code>
                  </div>
                </div>
              )}

              {/* Devices Grid */}
              {selectedHome && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Devices</h2>
                  {devices.size === 0 ? (
                    <div className="text-center py-8 bg-white rounded-lg shadow">
                      <p className="text-gray-600">No devices found in this home.</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Devices will appear here when they connect.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.from(devices.values()).map(device => (
                        <div key={device.id} className="bg-white rounded-lg shadow p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold">{device.name}</h3>
                            <span className="text-xs text-gray-500">{device.type}</span>
                          </div>
                          
                          {/* Simple on/off control for demo */}
                          {device.type === 'switch' && (
                            <div className="mt-4">
                              <button
                                onClick={() => handleDeviceCommand(device.id, { 
                                  action: 'toggle' 
                                })}
                                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                              >
                                Toggle
                              </button>
                            </div>
                          )}
                          
                          {/* Show device state */}
                          <div className="mt-2 text-xs text-gray-600">
                            <pre className="bg-gray-50 p-2 rounded overflow-x-auto">
                              {JSON.stringify(device.state, null, 2)}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  )
}