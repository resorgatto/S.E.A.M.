# 📘 PayloadOps — Tutorial Completo

> **Roteiro passo a passo** para entender e operar a plataforma PayloadOps.
> Cada etapa inclui o comando `curl` equivalente para testar via terminal.

---

## 📑 Índice

1. [Subir o Ambiente](#1--subir-o-ambiente)
2. [Cadastrar um Usuário](#2--cadastrar-um-usuário)
3. [Fazer Login (obter JWT)](#3--fazer-login-obter-jwt)
4. [Criar um Workspace](#4--criar-um-workspace)
5. [Criar um Workflow](#5--criar-um-workflow)
6. [Adicionar Actions ao Workflow](#6--adicionar-actions-ao-workflow)
7. [Ativar o Workflow](#7--ativar-o-workflow)
8. [Disparar o Webhook (testar a ingestão)](#8--disparar-o-webhook-testar-a-ingestão)
9. [Consultar Logs de Execução](#9--consultar-logs-de-execução)
10. [Ver Métricas Agregadas](#10--ver-métricas-agregadas)
11. [Exportar para Planilha (XLSX)](#11--exportar-para-planilha-xlsx)
12. [Criar API Keys](#12--criar-api-keys)
13. [Gerenciar Membros do Workspace](#13--gerenciar-membros-do-workspace)
14. [Armazenar Credenciais (criptografadas)](#14--armazenar-credenciais-criptografadas)
15. [Painel Admin (Django Admin)](#15--painel-admin-django-admin)
16. [Swagger / API Docs](#16--swagger--api-docs)

---

## 1. 🚀 Subir o Ambiente

```bash
# Clone o repositório
git clone https://github.com/SEU_USUARIO/PayloadOps.git
cd PayloadOps

# Copie o arquivo de variáveis de ambiente
cp .env.example .env

# Suba todos os serviços (web, db, redis, celery-worker, celery-beat)
docker compose up -d --build

# (Opcional) Popule com dados de demonstração
docker compose exec web python manage.py seed_demo
```

**O que está rodando:**

| Container | Função |
|-----------|--------|
| `web` | Django + Gunicorn (API REST na porta 8000) |
| `db` | PostgreSQL 16 (banco de dados) |
| `redis` | Redis 7 (fila de mensagens do Celery) |
| `celery-worker` | Processa webhooks em background |
| `celery-beat` | Scheduler de tarefas periódicas |

**Validar:** Acesse http://localhost:8000/api/health/ — deve retornar `{"status": "healthy"}`.

---

## 2. 👤 Cadastrar um Usuário

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dev@payloadops.dev",
    "username": "dev",
    "password": "minha_senha_segura",
    "full_name": "Desenvolvedor"
  }'
```

**Resposta (201):**
```json
{
  "id": "uuid-do-usuario",
  "email": "dev@payloadops.dev",
  "username": "dev",
  "full_name": "Desenvolvedor",
  "is_verified": false
}
```

> 💡 Se você rodou `seed_demo`, já existe o usuário `demo@payloadops.dev` / `demo1234`.

---

## 3. 🔑 Fazer Login (obter JWT)

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dev@payloadops.dev",
    "password": "minha_senha_segura"
  }'
```

**Resposta (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1...",
  "refresh_token": "eyJhbGciOiJIUzI1...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

> 📌 **Guarde o `access_token`** — você vai usar em todos os próximos passos como header:
> `Authorization: Bearer SEU_ACCESS_TOKEN`

**Renovar o token (quando expirar):**
```bash
curl -X POST http://localhost:8000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "SEU_REFRESH_TOKEN"}'
```

---

## 4. 🏢 Criar um Workspace

Um workspace é um **tenant** — isolamento completo de dados entre organizações/projetos diferentes.

```bash
curl -X POST http://localhost:8000/api/workspaces/ \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Meu Projeto",
    "description": "Workspace para integrar formulários com o Slack"
  }'
```

**Resposta (201):**
```json
{
  "id": "uuid-do-workspace",
  "name": "Meu Projeto",
  "slug": "meu-projeto",
  "description": "Workspace para integrar formulários com o Slack",
  "is_active": true
}
```

> 📌 **Guarde o `id` do workspace** — ele será usado no header `X-Workspace-ID` em todas as operações de workflow, logs, etc.

**Listar seus workspaces:**
```bash
curl http://localhost:8000/api/workspaces/ \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"
```

---

## 5. ⚡ Criar um Workflow

Um workflow define **o que acontece** quando um webhook é recebido. Ao criar um workflow, um **Trigger** (URL de webhook) é gerado automaticamente.

```bash
curl -X POST http://localhost:8000/api/workflows/ \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "X-Workspace-ID: uuid-do-workspace" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Formulário → Slack",
    "description": "Envia notificação no Slack quando alguém preenche o formulário"
  }'
```

**Resposta (201):**
```json
{
  "id": "uuid-do-workflow",
  "name": "Formulário → Slack",
  "description": "Envia notificação no Slack quando alguém preenche o formulário",
  "status": "draft",
  "webhook_url": "/hooks/abc123-uuid/",
  "actions_count": 0,
  "trigger": {
    "id": "uuid-do-trigger",
    "webhook_path": "abc123-uuid",
    "webhook_url": "/hooks/abc123-uuid/",
    "is_active": true
  }
}
```

> 📌 **Guarde o `webhook_url`** — é a URL que os sistemas externos vão usar para enviar dados.

---

## 6. 🔧 Adicionar Actions ao Workflow

Actions são as **ações de saída** — requisições HTTP que o PayloadOps faz quando recebe um webhook. Você pode ter múltiplas actions executadas em sequência.

```bash
curl -X POST http://localhost:8000/api/workflows/uuid-do-workflow/actions \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "X-Workspace-ID: uuid-do-workspace" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Notificar no Slack",
    "order": 0,
    "http_method": "POST",
    "url": "https://hooks.slack.com/services/T00/B00/XXXX",
    "headers": {"Content-Type": "application/json"},
    "body_template": {
      "text": "🚀 Novo lead: {{payload.nome}} ({{payload.email}})",
      "channel": "#vendas"
    }
  }'
```

### 💡 Template de Variáveis

O `body_template` suporta **variáveis dinâmicas** usando `{{payload.campo}}`:

| Sintaxe | Descrição |
|---------|-----------|
| `{{payload.nome}}` | Acessa o campo `nome` do JSON recebido |
| `{{payload.dados.empresa}}` | Acessa campos aninhados via ponto |
| `{{payload.valor}}` | Se for o template inteiro, preserva o tipo (int, bool, etc.) |

**Exemplo: Se o webhook receber:**
```json
{"nome": "João", "email": "joao@empresa.com", "dados": {"empresa": "ACME"}}
```

**O template `"🚀 Novo lead: {{payload.nome}} ({{payload.email}})"` vira:**
```
"🚀 Novo lead: João (joao@empresa.com)"
```

---

## 7. ✅ Ativar o Workflow

O workflow é criado com status `draft` por padrão. Para começar a processar webhooks, é preciso **ativar**:

```bash
curl -X PATCH http://localhost:8000/api/workflows/uuid-do-workflow \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "X-Workspace-ID: uuid-do-workspace" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
```

**Status possíveis:** `draft` → `active` → `paused`

---

## 8. 🎯 Disparar o Webhook (testar a ingestão)

Agora o mais legal! Simule o envio de um webhook como se fosse um sistema externo:

```bash
curl -X POST http://localhost:8000/api/workflows/hooks/abc123-uuid \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Maria Silva",
    "email": "maria@empresa.com",
    "telefone": "(11) 99999-1234"
  }'
```

**Resposta (202 Accepted):**
```json
{
  "status": "accepted",
  "execution_id": "uuid-da-execucao",
  "detail": "Webhook payload queued for processing."
}
```

> ⚡ **O que acontece por baixo dos panos:**
> 1. O payload é salvo no banco (ExecutionLog com status `pending`)
> 2. Uma tarefa é enfileirada no **Redis**
> 3. O **Celery Worker** pega a tarefa e executa cada Action do workflow
> 4. Se uma action falha (status 5xx), ele **re-tenta com exponential backoff** (2s, 4s, 8s)
> 5. Após 3 tentativas, move para a **Dead Letter Queue** (DLQ) para revisão manual

---

## 9. 📋 Consultar Logs de Execução

Veja o histórico de tudo que foi processado:

```bash
# Listar todos os logs
curl "http://localhost:8000/api/logs/" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "X-Workspace-ID: uuid-do-workspace"

# Filtrar por status
curl "http://localhost:8000/api/logs/?status=failed" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "X-Workspace-ID: uuid-do-workspace"

# Filtrar por workflow
curl "http://localhost:8000/api/logs/?workflow_id=uuid-do-workflow" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "X-Workspace-ID: uuid-do-workspace"

# Detalhes de um log específico
curl "http://localhost:8000/api/logs/uuid-da-execucao" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "X-Workspace-ID: uuid-do-workspace"
```

**Cada log contém:**
- ✅ Payload recebido (JSON completo)
- ✅ Resposta da API destino (status code + body)
- ✅ Número da tentativa (ex: `2/3`)
- ✅ Duração em milissegundos
- ✅ Mensagem de erro (se falhou)

---

## 10. 📊 Ver Métricas Agregadas

Um dashboard resumido dos seus webhooks:

```bash
curl "http://localhost:8000/api/logs/metrics/summary" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "X-Workspace-ID: uuid-do-workspace"
```

**Resposta:**
```json
{
  "total_executions": 150,
  "successful": 142,
  "failed": 3,
  "pending": 2,
  "retrying": 1,
  "dead_letter": 2,
  "success_rate": 94.67,
  "avg_duration_ms": 234.5
}
```

---

## 11. 📥 Exportar para Planilha (XLSX)

Exporte os últimos 1.000 logs em Excel formatado:

```bash
curl -o payloadops_logs.xlsx \
  "http://localhost:8000/api/logs/export/xlsx" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "X-Workspace-ID: uuid-do-workspace"
```

> O arquivo terá colunas: **Execution ID, Workflow, Status, Attempt, Status Code, Duration (ms), Error, Created At**.

---

## 12. 🗝️ Criar API Keys

Alternativa ao JWT para integrações permanentes (máquina a máquina):

```bash
curl -X POST http://localhost:8000/api/auth/api-keys \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "X-Workspace-ID: uuid-do-workspace" \
  -H "Content-Type: application/json" \
  -d '{"name": "Integração CRM"}'
```

**Resposta (201):**
```json
{
  "id": "uuid",
  "name": "Integração CRM",
  "prefix": "po_live_",
  "key": "po_live_aBcDeFgHiJkLmNoPqRsT...",
  "is_active": true
}
```

> ⚠️ **A key completa só é mostrada UMA VEZ.** Guarde em lugar seguro!
>
> Para usar a API Key no lugar do JWT:
> ```
> Authorization: Bearer po_live_aBcDeFgHiJkLmNoPqRsT...
> ```

---

## 13. 👥 Gerenciar Membros do Workspace

```bash
# Listar membros
curl "http://localhost:8000/api/workspaces/uuid-do-workspace/members" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"

# Convidar um membro (precisa ter cadastro)
curl -X POST "http://localhost:8000/api/workspaces/uuid-do-workspace/members" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "colega@empresa.com", "role": "member"}'

# Remover um membro
curl -X DELETE "http://localhost:8000/api/workspaces/uuid-do-workspace/members/uuid-do-membro" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"
```

**Roles disponíveis:** `owner` | `admin` | `member`

---

## 14. 🔒 Armazenar Credenciais (criptografadas)

Armazene tokens/senhas de APIs externas de forma segura (criptografia Fernet):

```bash
curl -X POST http://localhost:8000/api/workflows/credentials \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "X-Workspace-ID: uuid-do-workspace" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Token do Slack",
    "description": "Webhook token do canal #vendas",
    "value": "xoxb-1234567890-aBcDeFgHiJk"
  }'
```

> O valor é **criptografado no banco** e nunca é exposto na API de listagem.

---

## 15. 🛠️ Painel Admin (Django Admin)

Acesse http://localhost:8000/admin/ para gerenciar via interface visual.

**Criar superusuário:**
```bash
docker compose exec web python manage.py createsuperuser
```

O admin permite:
- Visualizar todos workflows, triggers e actions
- Inspecionar logs de execução com badges coloridos por status
- Gerenciar workspaces e memberships
- Filtrar e buscar em qualquer modelo

---

## 16. 📖 Swagger / API Docs

Acesse http://localhost:8000/api/docs para:
- Ver todos os endpoints organizados por categorias
- Testar chamadas diretamente no navegador
- Baixar a especificação OpenAPI (JSON)

---

## 🧪 Fluxo Completo de Teste (copiar e colar)

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@payloadops.dev","password":"demo1234"}' | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# 2. Listar workspaces
WS_ID=$(curl -s http://localhost:8000/api/workspaces/ \
  -H "Authorization: Bearer $TOKEN" | python -c "import sys,json;print(json.load(sys.stdin)[0]['id'])")

# 3. Criar workflow
WF=$(curl -s -X POST http://localhost:8000/api/workflows/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Workspace-ID: $WS_ID" \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste Tutorial","description":"Workflow de teste"}')
WF_ID=$(echo $WF | python -c "import sys,json;print(json.load(sys.stdin)['id'])")
HOOK=$(echo $WF | python -c "import sys,json;print(json.load(sys.stdin)['trigger']['webhook_path'])")

# 4. Adicionar action
curl -s -X POST "http://localhost:8000/api/workflows/$WF_ID/actions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Workspace-ID: $WS_ID" \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste httpbin","url":"https://httpbin.org/post","http_method":"POST","body_template":{"msg":"Olá {{payload.nome}}"}}'

# 5. Ativar
curl -s -X PATCH "http://localhost:8000/api/workflows/$WF_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Workspace-ID: $WS_ID" \
  -H "Content-Type: application/json" \
  -d '{"status":"active"}'

# 6. Disparar webhook!
curl -X POST "http://localhost:8000/api/workflows/hooks/$HOOK" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Tutorial","email":"test@test.com"}'

# 7. Ver logs
sleep 5
curl -s "http://localhost:8000/api/logs/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Workspace-ID: $WS_ID" | python -m json.tool

# 8. Ver métricas
curl -s "http://localhost:8000/api/logs/metrics/summary" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Workspace-ID: $WS_ID" | python -m json.tool
```

---

## 🗂️ Resumo dos Endpoints

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `POST` | `/api/auth/register` | Cadastrar usuário | ❌ |
| `POST` | `/api/auth/login` | Login (JWT) | ❌ |
| `POST` | `/api/auth/refresh` | Renovar token | ❌ |
| `GET` | `/api/auth/me` | Perfil do usuário | ✅ JWT |
| `POST` | `/api/auth/api-keys` | Criar API Key | ✅ |
| `GET` | `/api/auth/api-keys` | Listar API Keys | ✅ |
| `DELETE` | `/api/auth/api-keys/{id}` | Revogar API Key | ✅ |
| `POST` | `/api/workspaces/` | Criar workspace | ✅ |
| `GET` | `/api/workspaces/` | Listar workspaces | ✅ |
| `GET` | `/api/workspaces/{id}` | Detalhes workspace | ✅ |
| `PATCH` | `/api/workspaces/{id}` | Atualizar workspace | ✅ |
| `GET` | `/api/workspaces/{id}/members` | Listar membros | ✅ |
| `POST` | `/api/workspaces/{id}/members` | Convidar membro | ✅ |
| `DELETE` | `/api/workspaces/{id}/members/{mid}` | Remover membro | ✅ |
| `POST` | `/api/workflows/` | Criar workflow | ✅ + WS |
| `GET` | `/api/workflows/` | Listar workflows | ✅ + WS |
| `GET` | `/api/workflows/{id}` | Detalhes workflow | ✅ + WS |
| `PATCH` | `/api/workflows/{id}` | Atualizar workflow | ✅ + WS |
| `DELETE` | `/api/workflows/{id}` | Deletar workflow | ✅ + WS |
| `POST` | `/api/workflows/{id}/actions` | Adicionar action | ✅ + WS |
| `GET` | `/api/workflows/{id}/actions` | Listar actions | ✅ + WS |
| `PATCH` | `/api/workflows/{wid}/actions/{aid}` | Atualizar action | ✅ + WS |
| `DELETE` | `/api/workflows/{wid}/actions/{aid}` | Deletar action | ✅ + WS |
| `POST` | `/api/workflows/credentials` | Salvar credencial | ✅ + WS |
| `GET` | `/api/workflows/credentials` | Listar credenciais | ✅ + WS |
| `DELETE` | `/api/workflows/credentials/{id}` | Deletar credencial | ✅ + WS |
| `POST` | `/api/workflows/hooks/{uuid}` | **Webhook (público)** | ❌ |
| `GET` | `/api/logs/` | Listar logs | ✅ + WS |
| `GET` | `/api/logs/{id}` | Detalhes do log | ✅ + WS |
| `GET` | `/api/logs/metrics/summary` | Métricas agregadas | ✅ + WS |
| `GET` | `/api/logs/export/xlsx` | Exportar XLSX | ✅ + WS |

> **✅** = Requer `Authorization: Bearer TOKEN` | **WS** = Requer header `X-Workspace-ID`
