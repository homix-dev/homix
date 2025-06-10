package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/nats-home-automation/services/management-ui/cmd"
	"github.com/sirupsen/logrus"
)

func main() {
	// Setup logging
	logrus.SetFormatter(&logrus.TextFormatter{
		FullTimestamp: true,
	})

	// Create context with cancellation
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Setup signal handling
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Run command in goroutine
	errChan := make(chan error, 1)
	go func() {
		if err := cmd.ExecuteContext(ctx); err != nil {
			errChan <- err
		}
	}()

	// Wait for signal or error
	select {
	case <-sigChan:
		logrus.Info("Received shutdown signal")
		cancel()
	case err := <-errChan:
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}