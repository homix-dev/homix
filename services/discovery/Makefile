.PHONY: build run test clean docker-build docker-run lint

# Binary name
BINARY=discovery
DOCKER_IMAGE=nats-discovery:latest

# Build the binary
build:
	go build -o $(BINARY) .

# Run locally
run: build
	./$(BINARY)

# Run with debug
debug: build
	./$(BINARY) --debug

# Run tests
test:
	go test -v ./...

# Run linter
lint:
	golangci-lint run

# Clean build artifacts
clean:
	rm -f $(BINARY)
	go clean

# Build Docker image
docker-build:
	docker build -t $(DOCKER_IMAGE) .

# Run in Docker
docker-run: docker-build
	docker run --rm \
		--name discovery-service \
		--network host \
		-v $(PWD)/discovery.yaml:/root/discovery.yaml \
		$(DOCKER_IMAGE)

# Install dependencies
deps:
	go mod download
	go mod tidy

# Format code
fmt:
	go fmt ./...

# Run go vet
vet:
	go vet ./...

# All checks
check: fmt vet lint test