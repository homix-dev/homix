import DocsLayout from '../../../components/docs/DocsLayout'
import Link from 'next/link'

export default function Troubleshooting() {
  return (
    <DocsLayout title="Troubleshooting">
      <div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-code:text-gray-900 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
        <h1>Troubleshooting Guide</h1>
        <p className="text-lg text-gray-600">
          Common issues and solutions for Homix installation and operation.
        </p>

        <h2>Installation Issues</h2>

        <div className="space-y-6">
          <div className="border-l-4 border-red-400 bg-red-50 p-4 rounded-r-lg">
            <h3 className="text-red-800 mt-0">Docker not found</h3>
            <p className="text-red-700 mb-2">
              <strong>Error:</strong> <code>command not found: docker</code>
            </p>
            <p className="text-red-700 mb-2">
              <strong>Solution:</strong>
            </p>
            <ul className="text-red-700">
              <li>Install Docker Desktop: <a href="https://docs.docker.com/get-docker/" className="underline">docs.docker.com/get-docker</a></li>
              <li>On Linux: <code>sudo apt install docker.io</code> (Ubuntu/Debian)</li>
              <li>Ensure Docker is running: <code>docker version</code></li>
            </ul>
          </div>

          <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4 rounded-r-lg">
            <h3 className="text-yellow-800 mt-0">Permission denied</h3>
            <p className="text-yellow-700 mb-2">
              <strong>Error:</strong> <code>permission denied while trying to connect to the Docker daemon</code>
            </p>
            <p className="text-yellow-700 mb-2">
              <strong>Solution:</strong>
            </p>
            <div className="bg-gray-900 text-gray-100 rounded p-2 font-mono text-sm my-2">
              <div>sudo usermod -aG docker $USER</div>
              <div>newgrp docker  # or log out and back in</div>
            </div>
          </div>

          <div className="border-l-4 border-blue-400 bg-blue-50 p-4 rounded-r-lg">
            <h3 className="text-blue-800 mt-0">Port already in use</h3>
            <p className="text-blue-700 mb-2">
              <strong>Error:</strong> <code>port 8080 already in use</code>
            </p>
            <p className="text-blue-700 mb-2">
              <strong>Solution:</strong>
            </p>
            <ol className="text-blue-700">
              <li>Stop the conflicting service: <code>sudo lsof -i :8080</code></li>
              <li>Or edit <code>~/.homix/docker-compose.yml</code> to use different ports</li>
              <li>Change <code>8080:8080</code> to <code>8081:8080</code></li>
              <li>Restart: <code>docker compose up -d</code></li>
            </ol>
          </div>

          <div className="border-l-4 border-purple-400 bg-purple-50 p-4 rounded-r-lg">
            <h3 className="text-purple-800 mt-0">Container failed to start</h3>
            <p className="text-purple-700 mb-2">
              <strong>Error:</strong> <code>container homix-edge exited with code 1</code>
            </p>
            <p className="text-purple-700 mb-2">
              <strong>Solution:</strong>
            </p>
            <div className="bg-gray-900 text-gray-100 rounded p-2 font-mono text-sm my-2">
              <div># Check logs for detailed error</div>
              <div>cd ~/.homix && docker compose logs -f</div>
            </div>
          </div>
        </div>

        <h2>Connectivity Issues</h2>

        <div className="space-y-6">
          <div className="border-l-4 border-red-400 bg-red-50 p-4 rounded-r-lg">
            <h3 className="text-red-800 mt-0">Cannot connect to cloud dashboard</h3>
            <p className="text-red-700 mb-2">
              <strong>Symptoms:</strong> Cloud dashboard shows "connecting..." forever
            </p>
            <p className="text-red-700 mb-2">
              <strong>Solutions:</strong>
            </p>
            <ol className="text-red-700">
              <li>Check Synadia credentials are in <code>~/.synadia/</code></li>
              <li>Verify credentials file format (should contain JWT and seed)</li>
              <li>Check edge server logs: <code>docker compose logs</code></li>
              <li>Test NATS connectivity: <code>nats server check</code> (if nats CLI installed)</li>
            </ol>
          </div>

          <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4 rounded-r-lg">
            <h3 className="text-yellow-800 mt-0">Local dashboard not accessible</h3>
            <p className="text-yellow-700 mb-2">
              <strong>Symptoms:</strong> <code>http://localhost:8080</code> times out
            </p>
            <p className="text-yellow-700 mb-2">
              <strong>Solutions:</strong>
            </p>
            <ol className="text-yellow-700">
              <li>Check if container is running: <code>docker ps | grep homix</code></li>
              <li>Verify port mapping: should show <code>0.0.0.0:8080-&gt;8080/tcp</code></li>
              <li>Check firewall settings (Windows/macOS)</li>
              <li>Try <code>http://127.0.0.1:8080</code> instead</li>
            </ol>
          </div>

          <div className="border-l-4 border-blue-400 bg-blue-50 p-4 rounded-r-lg">
            <h3 className="text-blue-800 mt-0">Edge server not announcing</h3>
            <p className="text-blue-700 mb-2">
              <strong>Symptoms:</strong> No homes appear in cloud dashboard
            </p>
            <p className="text-blue-700 mb-2">
              <strong>Solutions:</strong>
            </p>
            <ol className="text-blue-700">
              <li>Check edge server logs for NATS connection errors</li>
              <li>Verify internet connectivity from edge server</li>
              <li>Check system time is synchronized (important for JWT)</li>
              <li>Restart edge server: <code>docker compose restart</code></li>
            </ol>
          </div>
        </div>

        <h2>Device Issues</h2>

        <div className="space-y-6">
          <div className="border-l-4 border-red-400 bg-red-50 p-4 rounded-r-lg">
            <h3 className="text-red-800 mt-0">Devices not discovered</h3>
            <p className="text-red-700 mb-2">
              <strong>Symptoms:</strong> No devices appear in device list
            </p>
            <p className="text-red-700 mb-2">
              <strong>Solutions:</strong>
            </p>
            <ol className="text-red-700">
              <li>Ensure devices are on same network as edge server</li>
              <li>Check device-specific setup requirements</li>
              <li>Verify mDNS/Bonjour is working: <code>avahi-browse -a</code> (Linux)</li>
              <li>Manual device addition if auto-discovery fails</li>
            </ol>
          </div>

          <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4 rounded-r-lg">
            <h3 className="text-yellow-800 mt-0">Device commands not working</h3>
            <p className="text-yellow-700 mb-2">
              <strong>Symptoms:</strong> Clicking device controls has no effect
            </p>
            <p className="text-yellow-700 mb-2">
              <strong>Solutions:</strong>
            </p>
            <ol className="text-yellow-700">
              <li>Check device state in edge server logs</li>
              <li>Verify device protocol configuration</li>
              <li>Test device with manufacturer app first</li>
              <li>Check network connectivity to device</li>
            </ol>
          </div>

          <div className="border-l-4 border-blue-400 bg-blue-50 p-4 rounded-r-lg">
            <h3 className="text-blue-800 mt-0">Device states not updating</h3>
            <p className="text-blue-700 mb-2">
              <strong>Symptoms:</strong> Dashboard shows stale device states
            </p>
            <p className="text-blue-700 mb-2">
              <strong>Solutions:</strong>
            </p>
            <ol className="text-blue-700">
              <li>Check NATS subscription in browser console</li>
              <li>Verify edge server is publishing state updates</li>
              <li>Check for WebSocket connectivity issues</li>
              <li>Refresh browser or reconnect to cloud</li>
            </ol>
          </div>
        </div>

        <h2>Performance Issues</h2>

        <div className="space-y-6">
          <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4 rounded-r-lg">
            <h3 className="text-yellow-800 mt-0">High CPU usage</h3>
            <p className="text-yellow-700 mb-2">
              <strong>Symptoms:</strong> Edge server consuming excessive CPU
            </p>
            <p className="text-yellow-700 mb-2">
              <strong>Solutions:</strong>
            </p>
            <ol className="text-yellow-700">
              <li>Check for automation loops in logs</li>
              <li>Reduce device polling frequency</li>
              <li>Review automation trigger conditions</li>
              <li>Consider hardware upgrade if managing many devices</li>
            </ol>
          </div>

          <div className="border-l-4 border-blue-400 bg-blue-50 p-4 rounded-r-lg">
            <h3 className="text-blue-800 mt-0">High memory usage</h3>
            <p className="text-blue-700 mb-2">
              <strong>Symptoms:</strong> Edge server using lots of RAM
            </p>
            <p className="text-blue-700 mb-2">
              <strong>Solutions:</strong>
            </p>
            <ol className="text-blue-700">
              <li>Check for memory leaks in logs</li>
              <li>Reduce device state cache TTL</li>
              <li>Restart edge server periodically</li>
              <li>Monitor with: <code>docker stats homix-edge</code></li>
            </ol>
          </div>

          <div className="border-l-4 border-green-400 bg-green-50 p-4 rounded-r-lg">
            <h3 className="text-green-800 mt-0">Slow response times</h3>
            <p className="text-green-700 mb-2">
              <strong>Symptoms:</strong> Commands take several seconds to execute
            </p>
            <p className="text-green-700 mb-2">
              <strong>Solutions:</strong>
            </p>
            <ol className="text-green-700">
              <li>Check network latency to devices</li>
              <li>Verify NATS connection health</li>
              <li>Use local automation for time-critical operations</li>
              <li>Consider edge server hardware upgrade</li>
            </ol>
          </div>
        </div>

        <h2>Debugging Commands</h2>

        <h3>Container Status</h3>
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm space-y-1">
          <div># Check if Homix is running</div>
          <div>docker ps | grep homix</div>
          <div></div>
          <div># View container logs</div>
          <div>cd ~/.homix && docker compose logs -f</div>
          <div></div>
          <div># Check resource usage</div>
          <div>docker stats homix-edge</div>
          <div></div>
          <div># Restart services</div>
          <div>cd ~/.homix && docker compose restart</div>
        </div>

        <h3>Network Debugging</h3>
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm space-y-1">
          <div># Check port availability</div>
          <div>sudo netstat -tlnp | grep :8080</div>
          <div></div>
          <div># Test local dashboard</div>
          <div>curl -I http://localhost:8080</div>
          <div></div>
          <div># Check DNS resolution</div>
          <div>nslookup connect.ngs.global</div>
          <div></div>
          <div># Test NATS connectivity (if CLI installed)</div>
          <div>nats server ping --server=nats://connect.ngs.global:4222</div>
        </div>

        <h3>Configuration Check</h3>
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm space-y-1">
          <div># View current configuration</div>
          <div>cat ~/.homix/docker-compose.yml</div>
          <div></div>
          <div># Check credentials file</div>
          <div>ls -la ~/.synadia/</div>
          <div></div>
          <div># Validate credentials format</div>
          <div>head -5 ~/.synadia/NGS-*.creds</div>
        </div>

        <h2>Log Analysis</h2>

        <h3>Common Log Messages</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium">✅ Normal Operation</h4>
            <div className="bg-gray-100 rounded p-2 font-mono text-sm">
              Connected to NATS via WebSocket<br/>
              Edge server started successfully<br/>
              Device discovered: living-room-light
            </div>
          </div>

          <div>
            <h4 className="font-medium">⚠️ Warnings</h4>
            <div className="bg-yellow-100 rounded p-2 font-mono text-sm">
              Failed to connect to device, retrying...<br/>
              NATS connection lost, reconnecting...<br/>
              Device state cache expired
            </div>
          </div>

          <div>
            <h4 className="font-medium">❌ Errors</h4>
            <div className="bg-red-100 rounded p-2 font-mono text-sm">
              NATS authentication failed<br/>
              Device protocol error: timeout<br/>
              Failed to parse automation config
            </div>
          </div>
        </div>

        <h2>Getting Help</h2>

        <p>
          If you're still having issues after trying these solutions:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 not-prose">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">💬 Community Support</h4>
            <p className="text-gray-600 mb-2">Community Discord coming soon</p>
            <span className="text-gray-400">
              Discord server setup in progress
            </span>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">🐛 Bug Reports</h4>
            <p className="text-gray-600 mb-2">Report issues on GitHub:</p>
            <a 
              href="https://github.com/calmera/nats-home-automation/issues" 
              className="text-blue-600 hover:text-blue-700"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Issues
            </a>
          </div>
        </div>

        <h3>When Reporting Issues</h3>
        <p>
          Please include the following information:
        </p>

        <ul>
          <li><strong>Operating System:</strong> Linux distribution, macOS version, etc.</li>
          <li><strong>Container Platform:</strong> Docker version or Podman version</li>
          <li><strong>Homix Version:</strong> From <code>docker images | grep homix</code></li>
          <li><strong>Error Messages:</strong> Exact error text from logs</li>
          <li><strong>Steps to Reproduce:</strong> What actions led to the issue</li>
          <li><strong>Configuration:</strong> Sanitized version of your setup</li>
        </ul>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-6">
          <h4 className="text-blue-800 font-semibold mt-0">Log Collection Script</h4>
          <p className="text-blue-700 mb-2">
            Use this command to collect system information for bug reports:
          </p>
          <div className="bg-gray-900 text-gray-100 rounded p-2 font-mono text-sm">
            cd ~/.homix && docker compose logs --tail=100 &gt; homix-logs.txt
          </div>
        </div>

        <h2>Related Documentation</h2>
        <ul>
          <li><Link href="/docs/installation">Installation Guide</Link> - Complete setup instructions</li>
          <li><Link href="/docs/architecture">Architecture</Link> - Understanding how components work</li>
          <li>Synadia Setup Guide - Cloud connectivity configuration (coming soon)</li>
        </ul>
      </div>
    </DocsLayout>
  )
}