# Copy Insta

Transforme Instagram Reels em videos estilo karaoke com texto sincronizado palavra por palavra.

## Features

- Download direto de Instagram Reels via URL
- Upload manual de videos (MP4, MOV, WEBM)
- Transcricao automatica com timestamps precisos (OpenAI Whisper)
- Deteccao automatica de falantes
- Cores personalizaveis por falante
- Preview da transcricao em tempo real
- Video karaoke vertical (9:16) pronto para redes sociais

## Requisitos

- Python 3.10+
- Node.js 18+
- FFmpeg instalado no sistema
- Chave da API OpenAI

## Instalacao

### 1. Clone o repositorio
```bash
cd "Copy Insta"
```

### 2. Configure o Backend
```bash
cd backend
pip install -r requirements.txt

# Configure variaveis de ambiente
cp .env.example .env
# Edite .env e adicione sua OPENAI_API_KEY
```

### 3. Configure o Frontend
```bash
cd frontend
npm install
```

## Executando

### Terminal 1 - Backend
```bash
cd backend
python main.py
```
Backend rodando em http://localhost:8000

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```
Frontend rodando em http://localhost:5173

## Uso

1. Acesse http://localhost:5173
2. Cole uma URL de Instagram Reel ou faca upload de um video
3. Aguarde a transcricao
4. Personalize as cores dos falantes
5. Clique em "Gerar Video Karaoke"
6. Baixe seu video!

## Stack Tecnologico

- **Frontend**: React 18 + Vite + TailwindCSS
- **Backend**: Python FastAPI
- **Transcricao**: OpenAI Whisper API
- **Video**: MoviePy + PIL
- **Download**: yt-dlp

## Limitacoes

- Videos de ate 120 segundos
- Alguns Reels privados podem requerer cookies de login
- A deteccao de falantes e baseada em pausas (pode nao ser 100% precisa)

## Licenca

MIT
