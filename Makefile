# fast-ftp Makefile
# Convenient commands for development, testing, and building

.PHONY: all help dev build test vet fmt typecheck check clean

all: check build

help: ## Display this help message
	@echo "fast-ftp Development Tasks"
	@echo "-------------------------"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

dev: ## Start live development environment (Wails dev server)
	wails dev

build: ## Build production binary package
	wails build -clean

test: ## Run backend unit tests
	go test -v ./...

vet: ## Run Go static analysis
	go vet ./...

fmt: ## Format Go source code
	go fmt ./...

typecheck: ## Typecheck frontend TypeScript code
	cd frontend && bun run typecheck

check: vet test typecheck ## Run all validation checks (vet, test, typecheck)

clean: ## Remove compiled binaries and build cache
	rm -rf build/bin/ frontend/dist/

