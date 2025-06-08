.PHONY: build run-cli run-tui test clean install

# Binary name
BINARY=nats-ha
VERSION=1.0.0

# Build flags
LDFLAGS=-ldflags "-X main.Version=${VERSION}"

# Build the binary
build:
	go build ${LDFLAGS} -o ${BINARY} .

# Run CLI
run-cli: build
	./${BINARY} --help

# Run TUI
run-tui: build
	./${BINARY} tui

# Install locally
install: build
	go install ${LDFLAGS}

# Run tests
test:
	go test -v ./...

# Clean build artifacts
clean:
	rm -f ${BINARY}
	go clean

# Build for multiple platforms
build-all:
	GOOS=linux GOARCH=amd64 go build ${LDFLAGS} -o ${BINARY}-linux-amd64
	GOOS=darwin GOARCH=amd64 go build ${LDFLAGS} -o ${BINARY}-darwin-amd64
	GOOS=darwin GOARCH=arm64 go build ${LDFLAGS} -o ${BINARY}-darwin-arm64
	GOOS=windows GOARCH=amd64 go build ${LDFLAGS} -o ${BINARY}-windows-amd64.exe

# Dependencies
deps:
	go mod download
	go mod tidy

# Format code
fmt:
	go fmt ./...

# Lint code
lint:
	golangci-lint run

# Run go vet
vet:
	go vet ./...