import React from 'react'
import { Download, RefreshCw, CheckCircle } from 'lucide-react'

function VideoPreview({ videoUrl, jobId, onReset }) {
  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = `/api/download/${jobId}`
    link.download = `karaoke_${jobId}.mp4`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 flex items-center gap-4">
        <div className="p-3 bg-green-500/20 rounded-full">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-green-400">
            Video Gerado com Sucesso!
          </h2>
          <p className="text-gray-400">
            Seu video karaoke esta pronto para download
          </p>
        </div>
      </div>

      {/* Video Player */}
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-gray-800">
        <div className="aspect-[9/16] max-h-[600px] mx-auto bg-black rounded-xl overflow-hidden">
          <video
            src={videoUrl}
            controls
            autoPlay
            muted
            className="w-full h-full object-contain"
          >
            Seu navegador nao suporta video HTML5.
          </video>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleDownload}
          className="flex-1 py-4 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-3"
        >
          <Download className="w-6 h-6" />
          Baixar Video
        </button>

        <button
          onClick={onReset}
          className="px-6 py-4 bg-[#252525] rounded-xl font-semibold hover:bg-[#303030] transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-5 h-5" />
          Novo Video
        </button>
      </div>
    </div>
  )
}

export default VideoPreview
