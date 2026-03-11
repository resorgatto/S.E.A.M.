# ==========================================
# PayloadOps — Makefile
# Developer Experience (DX) shortcuts
# ==========================================

.PHONY: help up down build restart logs shell migrate makemigrations test lint format typecheck seed clean

help: ## Show this help message
	@echo "PayloadOps — Available Commands:"
	@echo "================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# --------------- Docker ---------------

up: ## Start all services (detached)
	docker compose up -d --build

down: ## Stop all services
	docker compose down

build: ## Rebuild all containers
	docker compose build --no-cache

restart: ## Restart all services
	docker compose restart

logs: ## Follow logs from all services
	docker compose logs -f

logs-web: ## Follow logs from web service only
	docker compose logs -f web

logs-worker: ## Follow logs from Celery worker
	docker compose logs -f celery-worker

ps: ## Show running containers
	docker compose ps

# --------------- Django ---------------

shell: ## Open Django shell (IPython)
	docker compose exec web python manage.py shell_plus

migrate: ## Run database migrations
	docker compose exec web python manage.py migrate

makemigrations: ## Create new migrations
	docker compose exec web python manage.py makemigrations

createsuperuser: ## Create a Django superuser
	docker compose exec web python manage.py createsuperuser

seed: ## Seed the database with demo data
	docker compose exec web python manage.py seed_demo

collectstatic: ## Collect static files
	docker compose exec web python manage.py collectstatic --noinput

# --------------- Quality ---------------

test: ## Run all tests with coverage
	docker compose exec web pytest tests/ -v --cov=apps --cov=common --cov-report=term-missing

test-unit: ## Run unit tests only
	docker compose exec web pytest tests/unit/ -v

test-integration: ## Run integration tests only
	docker compose exec web pytest tests/integration/ -v -m integration

lint: ## Run linter (ruff)
	docker compose exec web ruff check src/

format: ## Auto-format code (ruff)
	docker compose exec web ruff format src/

typecheck: ## Run type checker (mypy)
	docker compose exec web mypy src/

quality: lint typecheck test ## Run all quality checks

# --------------- Utilities ---------------

clean: ## Remove all containers, volumes, and cached files
	docker compose down -v --remove-orphans
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
