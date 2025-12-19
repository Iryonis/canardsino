.PHONY: help dev-up dev-down dev-logs dev-restart prod-up prod-down prod-logs prod-restart logs ps clean test

# Display help by default
.DEFAULT_GOAL := help

help:
	@echo "======================================"
	@echo "  Canardsino - Docker commands"
	@echo "======================================"
	@echo ""
	@echo "DEVELOPMENT"
	@echo "  make dev-up          Start in development mode"
	@echo "  make dev-down        Stop development mode"
	@echo "  make dev-logs        View development logs"
	@echo ""
	@echo "PRODUCTION"
	@echo "  make prod-up         Demarrer en mode prod"
	@echo "  make prod-down       Arreter le mode prod"
	@echo "  make prod-logs       Voir les logs prod"
	@echo ""
	@echo "MONITORING"
	@echo "  make logs            Logs en temps reel"
	@echo "  make ps              Statut des conteneurs"
	@echo "  make stats           Stats CPU/RAM"
	@echo ""
	@echo "======================================"

# ==========================================
# DEVELOPPEMENT
# ==========================================

dev-up:
	docker compose -f docker-compose.dev.yml up -d --build
	@echo "-> Dev server started at http://localhost"

dev-down:
	docker compose -f docker-compose.dev.yml down

dev-logs:
	docker compose -f docker-compose.dev.yml logs -f

# ==========================================
# PRODUCTION
# ==========================================

prod-up:
	docker compose up -d
	@echo "-> Prod server started at http://localhost"

prod-down:
	docker compose down

prod-logs:
	docker compose logs -f

# ==========================================
# MONITORING
# ==========================================

logs:
	docker compose logs -f

ps:
	docker ps

stats:
	docker stats
