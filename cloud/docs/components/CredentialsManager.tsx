import { useState, useCallback } from 'react'

interface CredentialsManagerProps {
  onCredentialsLoaded: (creds: string) => void
}

export default function CredentialsManager({ onCredentialsLoaded }: CredentialsManagerProps) {
  const [showPaste, setShowPaste] = useState(false)
  const [credentials, setCredentials] = useState('')
  const [error, setError] = useState('')

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      validateAndLoad(content)
    }
    reader.readAsText(file)
  }, [])

  const handlePaste = useCallback(() => {
    validateAndLoad(credentials)
  }, [credentials])

  const validateAndLoad = (creds: string) => {
    // Basic validation
    if (!creds.includes('-----BEGIN NATS USER JWT-----')) {
      setError('Invalid credentials file. Please upload a valid NATS .creds file.')
      return
    }

    // Store in localStorage for persistence
    localStorage.setItem('homix_creds', creds)
    
    // Notify parent
    onCredentialsLoaded(creds)
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Connect to Synadia Cloud</h2>
        
        <p className="text-gray-600 text-sm mb-6">
          Upload your NATS credentials file to connect to your homes.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* File Upload */}
          <div>
            <label className="block">
              <span className="sr-only">Choose credentials file</span>
              <input
                type="file"
                accept=".creds"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </label>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Paste Option */}
          {!showPaste ? (
            <button
              onClick={() => setShowPaste(true)}
              className="w-full text-blue-600 hover:text-blue-700 text-sm"
            >
              Paste credentials manually
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                value={credentials}
                onChange={(e) => setCredentials(e.target.value)}
                placeholder="Paste your credentials here..."
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
              />
              <button
                onClick={handlePaste}
                disabled={!credentials}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Connect
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 text-xs text-gray-500">
          <p>Don't have credentials yet?</p>
          <a href="https://app.ngs.global" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Sign up for Synadia Cloud →
          </a>
        </div>
      </div>
    </div>
  )
}