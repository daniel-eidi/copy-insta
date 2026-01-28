import React from 'react'
import { Loader2, CheckCircle, XCircle, Download, FileAudio, MessageSquare, Users, Film } from 'lucide-react'

const STATUS_CONFIG = {
  pending: { icon: Loader2, color: 'text-gray-400', label: 'Aguardando...' },
  downloading: { icon: Download, color: 'text-blue-400', label: 'Baixando video...' },
  extracting_audio: { icon: FileAudio, color: 'text-purple-400', label: 'Extraindo audio...' },
  transcribing: { icon: MessageSquare, color: 'text-pink-400', label: 'Transcrevendo com Whisper...' },
  detecting_speakers: { icon: Users, color: 'text-teal-400', label: 'Detectando falantes...' },
  generating_video: { icon: Film, color: 'text-orange-400', label: 'Gerando video karaoke...' },
  completed: { icon: CheckCircle, color: 'text-green-400', label: 'Concluido!' },
  failed: { icon: XCircle, color: 'text-red-400', label: 'Falhou' },
}

function ProcessingStatus({ status }) {
  const config = STATUS_CONFIG[status.status] || STATUS_CONFIG.pending
  const Icon = config.icon
  const isLoading = !['completed', 'failed'].includes(status.status)

  return (
    <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-gray-800">
      <div className="flex flex-col items-center text-center space-y-6">
        {/* Icon */}
        <div className={`p-4 rounded-full ${config.color} bg-current/10`}>
          <Icon className={`w-12 h-12 ${config.color} ${isLoading ? 'animate-spin' : ''}`} />
        </div>

        {/* Status Text */}
        <div>
          <h2 className={`text-xl font-semibold ${config.color}`}>
            {config.label}
          </h2>
          {status.message && (
            <p className="text-gray-400 mt-1">{status.message}</p>
          )}
        </div>

        {/* Progress Bar */}
        {isLoading && (
          <div className="w-full max-w-md">
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${status.progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {Math.round(status.progress)}% concluido
            </p>
          </div>
        )}

        {/* Steps Progress */}
        <div className="w-full max-w-md">
          <div className="flex justify-between items-center">
            {Object.entries(STATUS_CONFIG)
              .filter(([key]) => !['pending', 'completed', 'failed'].includes(key))
              .map(([key, conf], index) => {
                const StatusIcon = conf.icon
                const isActive = status.status === key
                const isPast = getStepOrder(status.status) > getStepOrder(key)

                return (
                  <div key={key} className="flex flex-col items-center">
                    <div
                      className={`p-2 rounded-full transition-colors ${
                        isPast
                          ? 'bg-green-500/20 text-green-400'
                          : isActive
                          ? `${conf.color} bg-current/10 animate-pulse-glow`
                          : 'bg-gray-800 text-gray-600'
                      }`}
                    >
                      <StatusIcon className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-gray-500 mt-1 hidden sm:block">
                      {index + 1}
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      </div>
    </div>
  )
}

function getStepOrder(status) {
  const order = {
    pending: 0,
    downloading: 1,
    extracting_audio: 2,
    transcribing: 3,
    detecting_speakers: 4,
    generating_video: 5,
    completed: 6,
    failed: -1,
  }
  return order[status] || 0
}

export default ProcessingStatus
