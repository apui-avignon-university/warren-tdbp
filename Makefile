# -- General
SHELL := /bin/bash

# -- Docker
COMPOSE              = bin/compose
COMPOSE_RUN          = $(COMPOSE) run --rm --no-deps
COMPOSE_RUN_API      = $(COMPOSE_RUN) api
COMPOSE_RUN_FRONTEND = $(COMPOSE_RUN) frontend
COMPOSE_RUN_APP      = $(COMPOSE_RUN) app
MANAGE               = $(COMPOSE_RUN_APP) python manage.py

# -- Potsie
POTSIE_RELEASE = 0.6.0

# -- Elasticsearch
ES_PROTOCOL        = http
ES_HOST            = localhost
ES_COMPOSE_SERVICE = elasticsearch
ES_PORT            = 9200
ES_INDEX           = statements
ES_URL             = $(ES_PROTOCOL)://$(ES_HOST):$(ES_PORT)
ES_COMPOSE_URL     = $(ES_PROTOCOL)://$(ES_COMPOSE_SERVICE):$(ES_PORT)

# -- Ralph
RALPH_COMPOSE_SERVICE     = ralph
RALPH_RUNSERVER_PORT     ?= 8200
RALPH_LRS_AUTH_USER_NAME  = ralph
RALPH_LRS_AUTH_USER_PWD   = secret
RALPH_LRS_AUTH_USER_SCOPE = ralph_scope

# -- Postgresql
DB_HOST = postgresql
DB_PORT = 5432

# -- Warren
WARREN_APP_IMAGE_NAME              ?= warren-tdbp
WARREN_APP_IMAGE_TAG               ?= app-development
WARREN_APP_SERVER_PORT             ?= 8090
WARREN_API_IMAGE_NAME              ?= warren-tdbp
WARREN_API_IMAGE_TAG               ?= api-development
WARREN_API_IMAGE_BUILD_TARGET      ?= development
WARREN_API_SERVER_PORT             ?= 8100
WARREN_FRONTEND_IMAGE_NAME         ?= warren-tdbp
WARREN_FRONTEND_IMAGE_TAG          ?= frontend-development
WARREN_FRONTEND_IMAGE_BUILD_TARGET ?= development
WARREN_FRONTEND_IMAGE_BUILD_PATH   ?= app/staticfiles/warren/assets/index.js


# ==============================================================================
# RULES

default: help

.env:
	cp .env.dist .env

.git/hooks/pre-commit:
	ln -sf ../../bin/git-hook-pre-commit .git/hooks/pre-commit

git-hook-pre-commit:  ## Install git pre-commit hook
git-hook-pre-commit: .git/hooks/pre-commit
	@echo "Git pre-commit hook linked"
.PHONY: git-hook-pre-commit

.ralph/auth.json:
	@$(COMPOSE_RUN) ralph ralph \
		auth \
		-u $(RALPH_LRS_AUTH_USER_NAME) \
		-p $(RALPH_LRS_AUTH_USER_PWD) \
		-s $(RALPH_LRS_AUTH_USER_SCOPE) \
		-w

# This file should exist to load fixtures
data/statements.json.gz:
	@echo "Please copy a gzipped statements archive in data/statements.json.gz first."
	@exit 1


# -- Docker/compose
# Pre-boostrap is an alias for the CI as it's widely used
pre-bootstrap: \
  .env \
  .ralph/auth.json
.PHONY: pre-bootstrap

bootstrap: ## bootstrap the project for development
bootstrap: \
  pre-bootstrap \
  data/statements.json.gz \
  build \
  migrate-api \
  migrate-app \
  seed-lrs \
  seed-xi
.PHONY: bootstrap

build: ## build the app containers
build: \
  build-docker-api \
  build-docker-frontend \
  build-docker-app
.PHONY: build

build-docker-api: ## build the api container
build-docker-api: .env
	WARREN_API_IMAGE_BUILD_TARGET=$(WARREN_API_IMAGE_BUILD_TARGET) \
	WARREN_API_IMAGE_NAME=$(WARREN_API_IMAGE_NAME) \
	WARREN_API_IMAGE_TAG=$(WARREN_API_IMAGE_TAG) \
	  $(COMPOSE) build --pull api
.PHONY: build-docker-api

build-docker-app: ## build the app container
build-docker-app: \
  .env \
  build-docker-frontend \
  build-frontend
	WARREN_APP_IMAGE_BUILD_TARGET=$(WARREN_APP_IMAGE_BUILD_TARGET) \
	WARREN_APP_IMAGE_NAME=$(WARREN_APP_IMAGE_NAME) \
	WARREN_APP_IMAGE_TAG=$(WARREN_APP_IMAGE_TAG) \
	  $(COMPOSE) build --pull app
.PHONY: build-docker-app

build-docker-frontend: ## build the frontend container
build-docker-frontend: .env
	WARREN_FRONTEND_IMAGE_BUILD_TARGET=$(WARREN_FRONTEND_IMAGE_BUILD_TARGET) \
	WARREN_FRONTEND_IMAGE_NAME=$(WARREN_FRONTEND_IMAGE_NAME) \
	WARREN_FRONTEND_IMAGE_TAG=$(WARREN_FRONTEND_IMAGE_TAG) \
	  $(COMPOSE) build frontend
	@$(COMPOSE_RUN_FRONTEND) yarn install
.PHONY: build-docker-frontend

build-frontend: ## build the frontend application
	@$(COMPOSE_RUN) frontend yarn build
.PHONY: build-frontend

down: ## stop and remove all containers
	@$(COMPOSE) down
.PHONY: down

logs-api: ## display api logs (follow mode)
	@$(COMPOSE) logs -f api
.PHONY: logs-api

logs-frontend: ## display frontend logs (follow mode)
	@$(COMPOSE) logs -f frontend
.PHONY: logs-frontend

logs: ## display frontend/api logs (follow mode)
	@$(COMPOSE) logs -f app api frontend
.PHONY: logs

run: ## run the whole stack
run: run-app
.PHONY: run

run-app: ## run the app server (development mode)
	@$(COMPOSE) up -d app
	@echo "Waiting for the app to be up and running..."
	@$(COMPOSE_RUN) dockerize -wait tcp://$(DB_HOST):$(DB_PORT) -timeout 60s
	@$(COMPOSE_RUN) dockerize -wait tcp://app:$(WARREN_APP_SERVER_PORT) -timeout 60s
	@$(COMPOSE_RUN) dockerize -wait file:///$(WARREN_FRONTEND_IMAGE_BUILD_PATH) -timeout 60s
.PHONY: run-app

run-api: ## run the api server (development mode)
	@$(COMPOSE) up -d api
	@echo "Waiting for api to be up and running..."
	@$(COMPOSE_RUN) dockerize -wait tcp://$(DB_HOST):$(DB_PORT) -timeout 60s
	@$(COMPOSE_RUN) dockerize -wait http://$(RALPH_COMPOSE_SERVICE):$(RALPH_RUNSERVER_PORT)/__heartbeat__ -timeout 60s
	@$(COMPOSE_RUN) dockerize -wait tcp://api:$(WARREN_API_SERVER_PORT) -timeout 60s
.PHONY: run-api

status: ## an alias for "docker compose ps"
	@$(COMPOSE) ps
.PHONY: status

stop: ## stop all servers
	@$(COMPOSE) stop
.PHONY: stop

migrate-api:  ## run alembic database migrations for the api service
	@echo "Running api service database engine…"
	@$(COMPOSE) up -d postgresql
	@$(COMPOSE_RUN) dockerize -wait tcp://$(DB_HOST):$(DB_PORT) -timeout 60s
	@echo "Create api service database…"
	@$(COMPOSE) exec postgresql bash -c 'psql "postgresql://$${POSTGRES_USER}:$${POSTGRES_PASSWORD}@$(DB_HOST):$(DB_PORT)/postgres" -c "create database \"warren-api\";"' || echo "Duly noted, skiping database creation."
	@echo "Running migrations for api service…"
	@$(COMPOSE_RUN_API) warren upgrade head
.PHONY: migrate-api

migrate-app:  ## run django database migrations for the app service
	@echo "Running app service database engine…"
	@$(COMPOSE) up -d postgresql
	@$(COMPOSE_RUN) dockerize -wait tcp://$(DB_HOST):$(DB_PORT) -timeout 60s
	@echo "Running migrations for app service…"
	@$(MANAGE) migrate
.PHONY: migrate-app

seed-xi: ## seed the experience index
seed-xi: \
  data/statements.json.gz \
  migrate-api
	zcat data/statements.json.gz | \
		$(COMPOSE_RUN_API) python /opt/src/seed_experience_index.py
.PHONY: seed-xi

seed-lrs: ## seed the LRS
seed-lrs: \
  data/statements.json.gz \
  run-api
	curl -X DELETE "$(ES_URL)/$(ES_INDEX)?pretty" || true
	curl -X PUT "$(ES_URL)/$(ES_INDEX)?pretty"
	curl -X PUT $(ES_URL)/$(ES_INDEX)/_settings \
		-H 'Content-Type: application/json' \
		-d '{"index": {"number_of_replicas": 0}}'
	zcat < data/statements.json.gz | \
		$(COMPOSE_RUN) -T ralph ralph push \
	    --backend es \
	    --es-index "$(ES_INDEX)" \
	    --es-hosts "$(ES_COMPOSE_URL)" \
	    --chunk-size 300 \
	    --es-op-type create
.PHONY: seed-lrs

# -- Linters
lint: ## lint api, app and frontend sources
lint: \
  lint-api \
  lint-frontend
.PHONY: lint

### API ###

lint-api: ## lint api python sources
lint-api: \
  lint-api-black \
  lint-api-ruff \
  lint-api-mypy
.PHONY: lint-api

lint-api-black: ## lint api python sources with black
	@echo 'lint-api:black started…'
	@$(COMPOSE_RUN_API) black plugins/tdbp
.PHONY: lint-api-black

lint-api-ruff: ## lint api python sources with ruff
	@echo 'lint-api:ruff started…'
	@$(COMPOSE_RUN_API) ruff plugins/tdbp
.PHONY: lint-api-ruff

lint-api-ruff-fix: ## lint and fix api python sources with ruff
	@echo 'lint-api:ruff-fix started…'
	@$(COMPOSE_RUN_API) ruff plugins/tdbp --fix
.PHONY: lint-api-ruff-fix

lint-api-mypy: ## lint api python sources with mypy
	@echo 'lint-api:mypy started…'
	@$(COMPOSE_RUN_API) mypy plugins/tdbp
.PHONY: lint-api-mypy

### Frontend ###

lint-frontend: ## lint frontend sources
	@echo 'lint-frontend:linter started…'
	@$(COMPOSE_RUN_FRONTEND) yarn lint
.PHONY: lint-frontend

format-frontend: ## use prettier to format frontend sources
	@echo 'format-frontend: started…'
	@$(COMPOSE_RUN_FRONTEND) yarn format
.PHONY: format-frontend

## -- Tests

test: ## run tests
test: \
  test-api
.PHONY: test

test-api: ## run api tests
test-api: run-api
	@$(COMPOSE_RUN_API) pytest
.PHONY: test-api

# -- Misc
help:
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
.PHONY: help
