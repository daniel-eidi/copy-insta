# Guia de Deploy - Copy Insta

## Arquitetura de Produção

```
┌─────────────────┐     ┌─────────────────┐
│  Vercel         │────▶│  Railway        │
│  (Frontend)     │     │  (Backend)      │
└─────────────────┘     └─────────────────┘
```

O frontend é hospedado no Vercel (grátis para projetos pessoais).
O backend precisa de um servidor que suporte FFmpeg e processamento longo.

---

## 1. Deploy do Backend (Railway)

### Opção A: Railway (Recomendado)

1. Crie uma conta em [railway.app](https://railway.app)

2. Conecte seu repositório GitHub ou faça deploy manual:
   ```bash
   cd backend
   railway login
   railway init
   railway up
   ```

3. Configure as variáveis de ambiente no Railway Dashboard:
   - `OPENAI_API_KEY=sk-...`
   - `UPLOAD_DIR=./uploads`
   - `OUTPUT_DIR=./outputs`
   - `MAX_VIDEO_DURATION_SECONDS=120`

4. Anote a URL gerada (ex: `https://copy-insta-backend.railway.app`)

### Opção B: Render

1. Crie uma conta em [render.com](https://render.com)

2. Crie um novo "Web Service" e conecte seu repositório

3. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Environment**: Python 3.11

4. Adicione variáveis de ambiente no dashboard

### Opção C: Google Cloud Run (Recomendado para escala)

1. Instale o [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)

2. Configure o projeto:
   ```bash
   gcloud auth login
   gcloud config set project SEU_PROJECT_ID
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com
   ```

3. Configure as variáveis de ambiente (secrets):
   ```bash
   gcloud secrets create openai-api-key --data-file=-
   # Cole sua API key e pressione Ctrl+D
   ```

4. Deploy com Cloud Build:
   ```bash
   cd backend
   gcloud builds submit --config cloudbuild.yaml
   ```

5. Ou deploy direto:
   ```bash
   gcloud run deploy copy-insta-backend \
     --source . \
     --region us-central1 \
     --allow-unauthenticated \
     --memory 2Gi \
     --cpu 2 \
     --timeout 900 \
     --set-env-vars "OPENAI_API_KEY=sua-key"
   ```

**Custo estimado**: $0-5/mês (tier gratuito cobre uso leve)

### Opção D: VPS (DigitalOcean, AWS EC2, etc.)

```bash
# No servidor
git clone <seu-repo>
cd Copy-Insta/backend

# Instalar dependências
apt-get update && apt-get install -y python3-pip ffmpeg
pip install -r requirements.txt

# Rodar com PM2 ou systemd
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## 2. Deploy do Frontend (Vercel)

1. Crie uma conta em [vercel.com](https://vercel.com)

2. Importe o projeto do GitHub ou faça deploy manual:
   ```bash
   cd frontend
   npm install -g vercel
   vercel login
   vercel
   ```

3. Configure as variáveis de ambiente no Vercel Dashboard:
   - `VITE_API_URL=https://your-backend-url.railway.app`

4. Atualize o `vercel.json` com a URL real do backend:
   ```json
   {
     "rewrites": [
       {
         "source": "/api/:path*",
         "destination": "https://your-backend-url.railway.app/api/:path*"
       }
     ]
   }
   ```

5. Faça redeploy após as mudanças

---

## 3. Configurar CORS no Backend

Atualize o `main.py` para aceitar a URL do Vercel:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://seu-projeto.vercel.app",
        "https://seu-dominio-customizado.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Custos Estimados

| Serviço | Plano Gratuito | Plano Pago |
|---------|----------------|------------|
| Vercel (Frontend) | Sim, ilimitado para projetos pessoais | $20/mês para times |
| Railway (Backend) | $5 créditos/mês | $0.000231/min CPU |
| Render (Backend) | 750h/mês grátis | $7/mês starter |
| **Google Cloud Run** | 2M requests + 360k vCPU-seg/mês | ~$0.00002400/vCPU-seg |
| OpenAI API | Pay-as-you-go | ~$0.006/min áudio |

### Estimativa Google Cloud Run (100 vídeos/mês)

| Item | Cálculo | Custo |
|------|---------|-------|
| CPU | 2 vCPU × 60s × 100 jobs = 12.000 vCPU-seg | $0.29 |
| Memória | 2 GiB × 60s × 100 jobs = 12.000 GiB-seg | $0.03 |
| **Total** | Coberto pelo tier gratuito | **$0.00** |

Para 500+ vídeos/mês: ~$2-5/mês

---

## Limitações

1. **Tempo de processamento**: Videos longos podem demorar. Configure timeout adequado.

2. **Armazenamento**: Railway/Render têm armazenamento efêmero. Para produção real, considere:
   - AWS S3 / Cloudflare R2 para armazenar vídeos
   - Redis para gerenciamento de jobs

3. **Concorrência**: O sistema atual usa armazenamento em memória. Para múltiplos usuários, use Redis ou banco de dados.

---

## Checklist de Deploy

- [ ] Backend deployado e funcionando
- [ ] Variáveis de ambiente configuradas no backend
- [ ] Frontend deployado no Vercel
- [ ] VITE_API_URL configurado no Vercel
- [ ] CORS atualizado com URLs de produção
- [ ] Testar fluxo completo em produção
