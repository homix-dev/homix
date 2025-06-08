package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/calmera/nats-home-automation/services/discovery/cmd"
	"github.com/sirupsen/logrus"
)

func main() {
	// Setup logging
	log := logrus.New()
	log.SetFormatter(&logrus.TextFormatter{
		FullTimestamp: true,
	})

	// Setup signal handling
	ctx, cancel := context.WithCancel(context.Background())
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-sigChan
		log.Info("Shutdown signal received")
		cancel()
	}()

	// Execute command
	if err := cmd.Execute(ctx); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}