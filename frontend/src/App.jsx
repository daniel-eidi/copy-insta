import React, { useState, useEffect } from 'react'
import InputForm from './components/InputForm'
import AudioCapture from './components/AudioCapture'
import ProcessingStatus from './components/ProcessingStatus'
import SpeakerEditor from './components/SpeakerEditor'
import VideoPreview from './components/VideoPreview'
import TranscriptionResult from './components/TranscriptionResult'

const API_BASE = import.meta.env.VITE_API_URL || ''

function App() {
  const [jobId, setJobId] = useState(null)
  const [status, setStatus] = useState(null)
  const [transcription, setTranscription] = useState(null)
  const [speakers, setSpeakers] = useState([])
  const [videoUrl, setVideoUrl] = useState(null)
  const [error, setError] = useState(null)
  const [step, setStep] = useState('input') // input, processing, editing, generating, complete
  const [isAudioOnly, setIsAudioOnly] = useState(false)

  // Poll job status
  useEffect(() => {
    if (!jobId) return
    if (step === 'complete') return

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/status/${jobId}`)
        const data = await response.json()

        setStatus(data)

        if (data.status === 'failed') {
          setError(data.message)
          setStep('input')
          clearInterval(interval)
        } else if (data.status === 'completed' && data.transcription && step === 'processing') {
          setTranscription(data.transcription)
          // Fetch speakers
          const speakersResponse = await fetch(`${API_BASE}/api/speakers/${jobId}`)
          const speakersData = await speakersResponse.json()
          setSpeakers(speakersData.speakers)
          setStep('editing')
          clearInterval(interval)
        } else if (data.status === 'completed' && data.result_url && step === 'generating') {
          setVideoUrl(data.result_url)
          setStep('complete')
          clearInterval(interval)
        }
      } catch (err) {
        console.error('Error polling status:', err)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [jobId, step])

  const handleUpload = async (file) => {
    setError(null)
    setStep('processing')
    setIsAudioOnly(false)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Upload failed')
      }

      const data = await response.json()
      setJobId(data.job_id)
    } catch (err) {
      setError(err.message)
      setStep('input')
    }
  }

  const handleAudioCapture = async (audioBlob, duration) => {
    setError(null)
    setStep('processing')
    setIsAudioOnly(true)

    const formData = new FormData()
    formData.append('file', audioBlob, `capture_${Date.now()}.webm`)

    try {
      const response = await fetch(`${API_BASE}/api/upload-audio`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Audio upload failed')
      }

      const data = await response.json()
      setJobId(data.job_id)
    } catch (err) {
      setError(err.message)
      setStep('input')
    }
  }

  const handleUrlSubmit = async (url) => {
    setError(null)
    setStep('processing')
    setIsAudioOnly(false)

    try {
      const response = await fetch(`${API_BASE}/api/download-reel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Download failed')
      }

      const data = await response.json()
      setJobId(data.job_id)
    } catch (err) {
      setError(err.message)
      setStep('input')
    }
  }

  const handleGenerateVideo = async (speakerConfigs, backgroundColor, highlightColor) => {
    setStep('generating')
    setError(null)

    try {
      const response = await fetch(`${API_BASE}/api/generate-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: jobId,
          speaker_configs: speakerConfigs,
          background_color: backgroundColor,
          highlight_color: highlightColor,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Video generation failed')
      }
    } catch (err) {
      setError(err.message)
      setStep('editing')
    }
  }

  const handleReset = () => {
    setJobId(null)
    setStatus(null)
    setTranscription(null)
    setSpeakers([])
    setVideoUrl(null)
    setError(null)
    setStep('input')
    setIsAudioOnly(false)
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
            Copy Insta
          </h1>
          <p className="text-gray-400 mt-2">
            Transforme Reels em videos estilo karaoke
          </p>
        </header>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
            <p className="font-medium">Erro</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Step: Input */}
        {step === 'input' && (
          <div className="space-y-6">
            <AudioCapture onAudioCaptured={handleAudioCapture} />

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-800"></div>
              <span className="text-gray-500 text-sm">ou use os metodos tradicionais</span>
              <div className="flex-1 h-px bg-gray-800"></div>
            </div>

            <InputForm onUpload={handleUpload} onUrlSubmit={handleUrlSubmit} />
          </div>
        )}

        {/* Step: Processing */}
        {(step === 'processing' || step === 'generating') && status && (
          <ProcessingStatus status={status} />
        )}

        {/* Step: Editing */}
        {step === 'editing' && transcription && (
          isAudioOnly ? (
            <TranscriptionResult
              transcription={transcription}
              speakers={speakers}
              jobId={jobId}
              onBack={handleReset}
              onVideoGenerated={() => setStep('generating')}
            />
          ) : (
            <SpeakerEditor
              transcription={transcription}
              speakers={speakers}
              onGenerate={handleGenerateVideo}
              onBack={handleReset}
            />
          )
        )}

        {/* Step: Complete */}
        {step === 'complete' && videoUrl && (
          <VideoPreview
            videoUrl={videoUrl}
            jobId={jobId}
            onReset={handleReset}
          />
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>Powered by OpenAI Whisper + MoviePy</p>
        </footer>
      </div>
    </div>
  )
}

export default App
