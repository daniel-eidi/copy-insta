import React, { useState, useRef } from 'react'
import { Upload, Link, Film, AlertCircle } from 'lucide-react'

function InputForm({ onUpload, onUrlSubmit }) {
  const [url, setUrl] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith('video/')) {
        setSelectedFile(file)
      }
    }
  }

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUrlSubmit = (e) => {
    e.preventDefault()
    if (url.trim()) {
      onUrlSubmit(url.trim())
    }
  }

  const handleUploadSubmit = () => {
    if (selectedFile) {
      onUpload(selectedFile)
    }
  }

  return (
    <div className="space-y-8">
      {/* URL Input */}
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-pink-500/20 rounded-lg">
            <Link className="w-5 h-5 text-pink-500" />
          </div>
          <div>
            <h2 className="font-semibold">Cole o link do Reel</h2>
            <p className="text-sm text-gray-400">Suporta Instagram Reels</p>
          </div>
        </div>

        <form onSubmit={handleUrlSubmit} className="flex gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.instagram.com/reel/..."
            className="flex-1 px-4 py-3 bg-[#252525] rounded-xl border border-gray-700 focus:border-pink-500 focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!url.trim()}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            Baixar
          </button>
        </form>

        <div className="mt-3 flex items-start gap-2 text-amber-400/80 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            Alguns Reels podem requerer cookies de login. Se falhar, use o upload manual.
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-800"></div>
        <span className="text-gray-500 text-sm">ou</span>
        <div className="flex-1 h-px bg-gray-800"></div>
      </div>

      {/* File Upload */}
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Upload className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h2 className="font-semibold">Upload de video</h2>
            <p className="text-sm text-gray-400">MP4, MOV, WEBM (max 120s)</p>
          </div>
        </div>

        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragActive
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-gray-700 hover:border-gray-600'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          {selectedFile ? (
            <div className="space-y-3">
              <Film className="w-12 h-12 mx-auto text-purple-500" />
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-gray-400">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={handleUploadSubmit}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                Processar Video
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-12 h-12 mx-auto text-gray-500" />
              <p className="text-gray-400">
                Arraste um video aqui ou{' '}
                <span className="text-purple-400">clique para selecionar</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default InputForm
