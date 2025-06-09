package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/nats-home-automation/bridges/zigbee2mqtt-nats/cmd"
	"github.com/sirupsen/logrus"
)

func main() {
	// Setup signal handling
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Setup logging
	logrus.SetFormatter(&logrus.TextFormatter{
		FullTimestamp: true,
	})

	// Run command
	go func() {
		if err := cmd.Execute(); err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			os.Exit(1)
		}
	}()

	// Wait for signal
	<-sigChan
	logrus.Info("Shutting down...")
}