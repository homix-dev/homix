import DocsLayout from '../../components/docs/DocsLayout'
import Link from 'next/link'

export default function Installation() {
  return (
    <DocsLayout title="Installation">
      <div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-code:text-gray-900 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
        <h1>Installation Guide</h1>
        <p className="text-lg text-gray-600">
          Detailed instructions for installing Homix in various environments.
        </p>

        <h2>System Requirements</h2>

        <h3>Minimum Requirements</h3>
        <ul>
          <li><strong>OS:</strong> Linux, macOS, or Windows with WSL2</li>
          <li><strong>Memory:</strong> 512MB RAM</li>
          <li><strong>Storage:</strong> 1GB free space</li>
          <li><strong>Network:</strong> Internet connection for cloud features</li>
        </ul>

        <h3>Recommended Requirements</h3>
        <ul>
          <li><strong>Memory:</strong> 2GB+ RAM</li>
          <li><strong>Storage:</strong> 5GB+ free space</li>
          <li><strong>Network:</strong> Ethernet connection for reliability</li>
        </ul>

        <h2>Container Platform</h2>
        <p>
          Homix requires either Docker or Podman to run. Choose one:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6 not-prose">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">🐳 Docker (Recommended)</h4>
            <p className="text-gray-600 mb-4">Most widely supported, includes Docker Desktop</p>
            <div className="space-y-2 text-sm">
              <div><strong>macOS:</strong> <a href="https://docs.docker.com/desktop/install/mac-install/" target="_blank">Docker Desktop</a></div>
              <div><strong>Windows:</strong> <a href="https://docs.docker.com/desktop/install/windows-install/" target="_blank">Docker Desktop</a></div>
              <div><strong>Linux:</strong> <code>apt install docker.io docker-compose-plugin</code></div>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">📦 Podman (Alternative)</h4>
            <p className="text-gray-600 mb-4">Daemonless, rootless container platform</p>
            <div className="space-y-2 text-sm">
              <div><strong>Installation:</strong> <a href="https://podman.io/getting-started/installation" target="_blank">podman.io</a></div>
              <div><strong>Compose:</strong> <code>pip install podman-compose</code></div>
            </div>
          </div>
        </div>

        <h2>Quick Installation</h2>
        <p>
          The fastest way to get started:
        </p>

        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm">
          curl -sSL https://get.homix.dev | sh
        </div>

        <p>
          This installer will:
        </p>
        <ol>
          <li>Detect your container platform (Docker/Podman)</li>
          <li>Check for required tools</li>
          <li>Look for Synadia Cloud credentials</li>
          <li>Create configuration directory (<code>~/.homix</code>)</li>
          <li>Download and start the edge server</li>
        </ol>

        <h2>Advanced Installation Options</h2>

        <h3>Environment Variables</h3>
        <p>
          Customize the installation with environment variables:
        </p>

        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div>
            <h4 className="font-medium">Force Container Tool</h4>
            <div className="bg-gray-900 text-gray-100 rounded p-2 font-mono text-sm mt-2">
              curl -sSL https://get.homix.dev | CONTAINER_TOOL=podman sh
            </div>
          </div>

          <div>
            <h4 className="font-medium">Custom Installation Directory</h4>
            <div className="bg-gray-900 text-gray-100 rounded p-2 font-mono text-sm mt-2">
              curl -sSL https://get.homix.dev | HOMIX_DIR=/opt/homix sh
            </div>
          </div>

          <div>
            <h4 className="font-medium">Specific Version</h4>
            <div className="bg-gray-900 text-gray-100 rounded p-2 font-mono text-sm mt-2">
              curl -sSL https://get.homix.dev | HOMIX_VERSION=v1.0.0 sh
            </div>
          </div>

          <div>
            <h4 className="font-medium">Legacy Docker Compose</h4>
            <div className="bg-gray-900 text-gray-100 rounded p-2 font-mono text-sm mt-2">
              curl -sSL https://get.homix.dev | COMPOSE_CMD="docker-compose" sh
            </div>
          </div>
        </div>

        <h3>Manual Installation</h3>
        <p>
          For more control, you can install manually:
        </p>

        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm space-y-2">
          <div># Download installer</div>
          <div>curl -sSL https://get.homix.dev &gt; install.sh</div>
          <div></div>
          <div># Review and customize</div>
          <div>nano install.sh</div>
          <div></div>
          <div># Run with custom environment</div>
          <div>CONTAINER_TOOL=podman HOMIX_DIR=/opt/homix bash install.sh</div>
        </div>

        <h2>Platform-Specific Instructions</h2>

        <h3>macOS</h3>
        <ol>
          <li>Install Docker Desktop from <a href="https://docs.docker.com/desktop/install/mac-install/">docker.com</a></li>
          <li>Start Docker Desktop</li>
          <li>Run the Homix installer</li>
        </ol>

        <h3>Windows (WSL2)</h3>
        <ol>
          <li>Enable WSL2 and install a Linux distribution</li>
          <li>Install Docker Desktop with WSL2 backend</li>
          <li>Run the installer from WSL2 terminal</li>
        </ol>

        <h3>Linux (Ubuntu/Debian)</h3>
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm space-y-2">
          <div># Install Docker</div>
          <div>sudo apt update</div>
          <div>sudo apt install docker.io docker-compose-plugin</div>
          <div>sudo usermod -aG docker $USER</div>
          <div></div>
          <div># Log out and back in, then:</div>
          <div>curl -sSL https://get.homix.dev | sh</div>
        </div>

        <h3>Linux (RHEL/CentOS/Fedora)</h3>
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm space-y-2">
          <div># Install Docker</div>
          <div>sudo dnf install docker docker-compose-plugin</div>
          <div>sudo systemctl enable --now docker</div>
          <div>sudo usermod -aG docker $USER</div>
          <div></div>
          <div># Log out and back in, then:</div>
          <div>curl -sSL https://get.homix.dev | sh</div>
        </div>

        <h2>Synadia Cloud Setup</h2>
        <p>
          For cloud features and remote access, set up Synadia Cloud:
        </p>

        <ol>
          <li>
            Create account at{' '}
            <a href="https://app.ngs.global" target="_blank" rel="noopener noreferrer">
              app.ngs.global
            </a>
          </li>
          <li>Create a new context named "home"</li>
          <li>Download your credentials file</li>
          <li>Save it to <code>~/.synadia/NGS-Home-yourname.creds</code></li>
          <li>Restart Homix to pick up credentials</li>
        </ol>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-6">
          <h4 className="text-yellow-800 font-semibold mt-0">Credentials File Location</h4>
          <p className="mb-0 text-yellow-700">
            The installer automatically looks for credentials in <code>~/.synadia/</code>. 
            Any file matching <code>NGS-*.creds</code> will be detected.
          </p>
        </div>

        <h2>Post-Installation</h2>

        <h3>Verify Installation</h3>
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm space-y-2">
          <div># Check if Homix is running</div>
          <div>docker ps | grep homix-edge</div>
          <div></div>
          <div># View logs</div>
          <div>cd ~/.homix && docker compose logs -f</div>
        </div>

        <h3>Access Dashboards</h3>
        <ul>
          <li><strong>Local:</strong> <a href="http://localhost:8080">http://localhost:8080</a></li>
          <li><strong>Cloud:</strong> <a href="https://app.homix.dev">https://app.homix.dev</a> (with credentials)</li>
        </ul>

        <h3>Management Commands</h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div>
            <h4 className="font-medium">View Logs</h4>
            <div className="bg-gray-900 text-gray-100 rounded p-2 font-mono text-sm mt-2">
              cd ~/.homix && docker compose logs -f
            </div>
          </div>

          <div>
            <h4 className="font-medium">Stop Homix</h4>
            <div className="bg-gray-900 text-gray-100 rounded p-2 font-mono text-sm mt-2">
              cd ~/.homix && docker compose down
            </div>
          </div>

          <div>
            <h4 className="font-medium">Update Homix</h4>
            <div className="bg-gray-900 text-gray-100 rounded p-2 font-mono text-sm mt-2">
              cd ~/.homix && docker compose pull && docker compose up -d
            </div>
          </div>

          <div>
            <h4 className="font-medium">Uninstall</h4>
            <div className="bg-gray-900 text-gray-100 rounded p-2 font-mono text-sm mt-2">
              cd ~/.homix && docker compose down && cd .. && rm -rf .homix
            </div>
          </div>
        </div>

        <h2>Troubleshooting</h2>
        <p>
          Common installation issues and solutions:
        </p>

        <div className="space-y-4">
          <div className="border-l-4 border-red-400 bg-red-50 p-4">
            <h4 className="font-semibold text-red-800">Docker not found</h4>
            <p className="text-red-700">
              Make sure Docker is installed and running. On Linux, ensure your user is in the docker group.
            </p>
          </div>

          <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
            <h4 className="font-semibold text-yellow-800">Permission denied</h4>
            <p className="text-yellow-700">
              On Linux, add your user to the docker group: <code>sudo usermod -aG docker $USER</code>
            </p>
          </div>

          <div className="border-l-4 border-blue-400 bg-blue-50 p-4">
            <h4 className="font-semibold text-blue-800">Port conflicts</h4>
            <p className="text-blue-700">
              If port 8080 is in use, edit <code>~/.homix/docker-compose.yml</code> to change ports.
            </p>
          </div>
        </div>

        <p>
          For more help, see the <Link href="/docs/guides/troubleshooting">troubleshooting guide</Link> or 
          join our community (Discord coming soon).
        </p>
      </div>
    </DocsLayout>
  )
}