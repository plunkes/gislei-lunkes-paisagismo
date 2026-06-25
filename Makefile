# Makefile — atalhos para o stack Docker (db + app + adminer).
#
#   make up        sobe tudo em background (build se preciso)
#   make logs      acompanha os logs do app
#   make down      derruba os containers
#   make help      lista todos os alvos
#
# O app (Express + frontend + backoffice) fica em http://localhost:3000

COMPOSE := docker compose

.DEFAULT_GOAL := help
.PHONY: help up up-fg build rebuild down stop restart logs logs-app ps \
        sh db-shell db-sync db-seed adminer clean dev install

help: ## Lista os alvos disponíveis
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

up: ## Sobe o stack em background (build se necessário)
	$(COMPOSE) up -d --build

up-fg: ## Sobe o stack em primeiro plano (logs no terminal)
	$(COMPOSE) up --build

build: ## Builda as imagens
	$(COMPOSE) build

rebuild: ## Rebuilda sem cache
	$(COMPOSE) build --no-cache

down: ## Derruba os containers (mantém o volume do banco)
	$(COMPOSE) down

stop: ## Para os containers sem removê-los
	$(COMPOSE) stop

restart: ## Reinicia o serviço app
	$(COMPOSE) restart app

logs: ## Logs de todos os serviços (segue)
	$(COMPOSE) logs -f

logs-app: ## Logs apenas do app (segue)
	$(COMPOSE) logs -f app

ps: ## Status dos containers
	$(COMPOSE) ps

sh: ## Shell dentro do container app
	$(COMPOSE) exec app sh

db-shell: ## psql dentro do container db
	$(COMPOSE) exec db psql -U $${DB_USER:-postgres} -d $${DB_NAME:-gislei_lunkes}

db-sync: ## Cria/atualiza as tabelas (sequelize sync) no container app
	$(COMPOSE) exec app npm run db:sync

db-seed: ## Popula dados iniciais no container app
	$(COMPOSE) exec app npm run db:seed

adminer: ## Abre o Adminer no navegador (http://localhost:8080)
	@echo "Adminer: http://localhost:8080  (server=db, user=postgres)"

clean: ## Derruba tudo + remove volumes (APAGA o banco)
	$(COMPOSE) down -v

# --- Desenvolvimento local (sem Docker) ----------------------------------
install: ## Instala dependências do backend localmente
	cd backend && npm install

dev: ## Roda o backend local em modo watch (http://localhost:3000)
	cd backend && npm run dev
