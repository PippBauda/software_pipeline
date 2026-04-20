# Software Development Pipeline v4.1 — Developer Convenience Makefile
#
# All dev tooling lives in .tooling/. This Makefile provides a single
# entry point from the root directory so contributors don't need to
# remember to cd into .tooling/ for common tasks.
#
# Usage:
#   make           — show help
#   make install   — install dependencies
#   make test      — run all tests with coverage
#   make lint      — run ESLint + markdownlint
#   make format    — format all files with Prettier
#   make typecheck — JSDoc type-check via TypeScript compiler
#   make check     — full pre-merge check suite (lint + typecheck + test)

.DEFAULT_GOAL := help
TOOLING       := .tooling

.PHONY: help install test lint lint-md format format-check typecheck check check-version sync-check

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies (npm ci)
	cd $(TOOLING) && npm ci

test: ## Run all tests with coverage
	cd $(TOOLING) && npm test

lint: ## Run ESLint on JS files
	cd $(TOOLING) && npm run lint

lint-md: ## Run markdownlint on all .md files
	cd $(TOOLING) && npm run lint:md

format: ## Format all files with Prettier
	cd $(TOOLING) && npm run format

format-check: ## Check formatting without writing (for CI)
	cd $(TOOLING) && npm run format:check

typecheck: ## Type-check JSDoc annotations (tsc --noEmit)
	cd $(TOOLING) && npm run typecheck

check-version: ## Verify version consistency across files
	cd $(TOOLING) && node scripts/check-version.js

sync-check: ## Check OpenCode ↔ Copilot agent drift
	cd $(TOOLING) && node scripts/sync-check-agents.js --verbose

check: lint lint-md format-check typecheck check-version sync-check test ## Full pre-merge check suite
	@echo ""
	@echo "All checks passed."
