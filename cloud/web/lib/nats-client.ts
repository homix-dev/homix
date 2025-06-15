import { connect, NatsConnection, StringCodec, Subscription, credsAuthenticator } from 'nats.ws'

export interface HomixConfig {
  wsUrl: string
  credentials: string
}

export interface Home {
  id: string
  name: string
  location?: {
    latitude: number
    longitude: number
    timezone: string
  }
  connected: boolean
  lastSeen?: Date
}

export interface Device {
  id: string
  name: string
  type: string
  state: any
  homeId: string
  lastUpdate: Date
}

class NatsClient {
  private nc: NatsConnection | null = null
  private sc = StringCodec()
  private subscriptions: Map<string, Subscription> = new Map()
  
  async connect(config: HomixConfig): Promise<void> {
    try {
      // Create authenticator from credentials
      const authenticator = credsAuthenticator(new TextEncoder().encode(config.credentials))

      // Connect to NATS
      this.nc = await connect({
        servers: config.wsUrl,
        authenticator: authenticator,
        reconnect: true,
        maxReconnectAttempts: -1,
        reconnectTimeWait: 2000,
        waitOnFirstConnect: true,
      })

      // Log connection success
      ;(() => console.log('Connected to NATS via WebSocket'))()
      
      // Monitor connection events
      ;(async () => {
        for await (const status of this.nc!.status()) {
          ;(() => console.log(`NATS connection status: ${status.type}`))()
        }
      })()
    } catch (err) {
      ;(() => console.error('Failed to connect to NATS:', err))()
      throw err
    }
  }

  async disconnect(): Promise<void> {
    // Unsubscribe all
    for (const sub of this.subscriptions.values()) {
      sub.unsubscribe()
    }
    this.subscriptions.clear()

    // Close connection
    if (this.nc) {
      await this.nc.close()
      this.nc = null
    }
  }

  isConnected(): boolean {
    return this.nc !== null && !this.nc.isClosed()
  }

  // Subscribe to home announcements
  async subscribeToHomes(callback: (home: Home) => void): Promise<void> {
    if (!this.nc) throw new Error('Not connected')

    // Edge server publishes to home.edge.announce
    const sub = this.nc.subscribe('home.edge.announce')
    this.subscriptions.set('homes', sub)

    ;(async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(this.sc.decode(msg.data))
          
          const home: Home = {
            id: data.id || 'default',
            name: data.name || 'Unknown Home',
            location: data.location,
            connected: true,
            lastSeen: new Date()
          }
          
          callback(home)
        } catch (err) {
          ;(() => console.error('Error processing home announcement:', err))()
        }
      }
    })()
  }

  // Subscribe to device updates
  async subscribeToDevices(homeId: string, callback: (device: Device) => void): Promise<void> {
    if (!this.nc) throw new Error('Not connected')

    // Subscribe to device state updates: home.devices.{device_id}.state
    const sub = this.nc.subscribe('home.devices.*.state')
    this.subscriptions.set(`devices-${homeId}`, sub)

    ;(async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(this.sc.decode(msg.data))
          const parts = msg.subject.split('.')
          const deviceId = parts[2] // home.devices.{device_id}.state
          
          const device: Device = {
            id: deviceId,
            name: data.name || deviceId,
            type: data.type || 'unknown',
            state: data.state || data,
            homeId: homeId,
            lastUpdate: new Date()
          }
          
          callback(device)
        } catch (err) {
          ;(() => console.error('Error processing device update:', err))()
        }
      }
    })()
  }

  // Send device command
  async sendCommand(homeId: string, deviceId: string, command: any): Promise<void> {
    if (!this.nc) throw new Error('Not connected')

    // Command subject: home.devices.{device_id}.command
    const subject = `home.devices.${deviceId}.command`
    const data = this.sc.encode(JSON.stringify(command))
    
    await this.nc.publish(subject, data)
  }

  // Get device state (request/reply)
  async getDeviceState(homeId: string, deviceId: string): Promise<any> {
    if (!this.nc) throw new Error('Not connected')

    // Request subject: home.devices.{device_id}.get
    const subject = `home.devices.${deviceId}.get`
    const data = this.sc.encode(JSON.stringify({ action: 'get_state' }))
    
    try {
      const msg = await this.nc.request(subject, data, { timeout: 5000 })
      return JSON.parse(this.sc.decode(msg.data))
    } catch (err) {
      ;(() => console.error('Failed to get device state:', err))()
      throw err
    }
  }
}

// Singleton instance
let client: NatsClient | null = null

export function getNatsClient(): NatsClient {
  if (!client) {
    client = new NatsClient()
  }
  return client
}

export default NatsClient