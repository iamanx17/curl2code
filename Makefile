.PHONY: help build run up down restart logs backend-logs redis redis-logs ps test
.DEFAULT_GOAL := help

help:
	@echo "make build         Build the Next.js image"
	@echo "make run           Build and start app + Redis"
	@echo "make down          Stop app + Redis"
	@echo "make restart       Restart the app"
	@echo "make backend-logs  Follow Next.js/backend logs"
	@echo "make redis         Open redis-cli"
	@echo "make redis-logs    Follow Redis logs"
	@echo "make ps            Show service status"
	@echo "make test          Run local Playwright tests"

build:
	docker compose build app

run up:
	docker compose up -d --build

down:
	docker compose down

restart:
	docker compose restart app

logs backend-logs:
	@trap 'kill $$pid 2>/dev/null; wait $$pid 2>/dev/null; exit 0' INT TERM; docker compose logs --tail=100 -f app & pid=$$!; wait $$pid; status=$$?; [ $$status -eq 130 ] && exit 0; exit $$status

redis:
	docker compose exec redis redis-cli

redis-logs:
	@trap 'kill $$pid 2>/dev/null; wait $$pid 2>/dev/null; exit 0' INT TERM; docker compose logs --tail=100 -f redis & pid=$$!; wait $$pid; status=$$?; [ $$status -eq 130 ] && exit 0; exit $$status

ps:
	docker compose ps

test:
	npm test
