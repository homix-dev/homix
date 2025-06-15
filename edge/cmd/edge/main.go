package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/spf13/viper"
)

func main() {
	log.Println("NATS Home Edge Server starting...")

	// Load configuration
	if err := loadConfig(); err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Create context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start local NATS server (for device connections)
	localServer, err := startLocalNATSServer()
	if err != nil {
		log.Fatalf("Failed to start local NATS server: %v", err)
	}
	defer localServer.Shutdown()

	// Connect to Synadia Cloud as a leaf node
	cloudConn, err := connectToCloud()
	if err != nil {
		log.Fatalf("Failed to connect to Synadia Cloud: %v", err)
	}
	defer cloudConn.Close()

	// Start the edge services
	if err := startEdgeServices(ctx, cloudConn); err != nil {
		log.Fatalf("Failed to start edge services: %v", err)
	}

	// Wait for shutdown signal
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
	<-sigCh

	log.Println("Shutting down gracefully...")
	cancel()
	time.Sleep(2 * time.Second)
}

func loadConfig() error {
	viper.SetConfigName("edge")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("/config")
	viper.AddConfigPath("./config")
	viper.AddConfigPath(".")

	// Environment variables override config file
	viper.SetEnvPrefix("EDGE")
	viper.AutomaticEnv()

	// Set defaults
	viper.SetDefault("cloud.url", "tls://connect.ngs.global")
	viper.SetDefault("cloud.reconnect_wait", "2s")
	viper.SetDefault("home.name", "My Home")
	viper.SetDefault("local.port", 4222)
	viper.SetDefault("logging.level", "info")

	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return err
		}
		log.Println("No config file found, using environment variables")
	}

	// Generate home ID if not set
	if viper.GetString("home.id") == "" {
		viper.Set("home.id", generateHomeID())
	}

	return nil
}

func startLocalNATSServer() (*server.Server, error) {
	opts := &server.Options{
		Port:     viper.GetInt("local.port"),
		HTTPPort: 8222, // For monitoring
	}

	// Configure as a leaf node hub
	opts.LeafNode.Port = 7422
	opts.LeafNode.Host = "0.0.0.0"

	// Enable JetStream for local state
	opts.JetStream = true
	opts.StoreDir = "/data/jetstream"

	// Create and start the server
	ns, err := server.NewServer(opts)
	if err != nil {
		return nil, fmt.Errorf("failed to create NATS server: %w", err)
	}

	ns.Start()

	// Wait for server to be ready
	if !ns.ReadyForConnections(10 * time.Second) {
		return nil, fmt.Errorf("NATS server failed to start")
	}

	log.Printf("Local NATS server started on port %d", opts.Port)
	return ns, nil
}

func connectToCloud() (*nats.Conn, error) {
	cloudURL := viper.GetString("cloud.url")
	credsFile := viper.GetString("cloud.credentials")

	// Expand environment variables in creds path
	credsFile = os.ExpandEnv(credsFile)

	opts := []nats.Option{
		nats.Name(fmt.Sprintf("edge-%s", viper.GetString("home.id"))),
		nats.UserCredentials(credsFile),
		nats.MaxReconnects(-1),
		nats.ReconnectWait(viper.GetDuration("cloud.reconnect_wait")),
		nats.ReconnectHandler(func(nc *nats.Conn) {
			log.Println("Reconnected to Synadia Cloud")
		}),
		nats.DisconnectErrHandler(func(nc *nats.Conn, err error) {
			log.Printf("Disconnected from cloud: %v", err)
		}),
		nats.ErrorHandler(func(nc *nats.Conn, sub *nats.Subscription, err error) {
			log.Printf("NATS error: %v", err)
		}),
	}

	nc, err := nats.Connect(cloudURL, opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to cloud: %w", err)
	}

	log.Printf("Connected to Synadia Cloud at %s", cloudURL)

	// Announce this home to the cloud
	homeInfo := map[string]interface{}{
		"id":        viper.GetString("home.id"),
		"name":      viper.GetString("home.name"),
		"version":   "2.0.0",
		"edge_type": "docker",
		"connected": time.Now().UTC(),
	}

	data, err := json.Marshal(homeInfo)
	if err != nil {
		log.Printf("Failed to marshal home info: %v", err)
	} else if err := nc.Publish("home.edge.announce", data); err != nil {
		log.Printf("Failed to announce home: %v", err)
	}

	return nc, nil
}

func startEdgeServices(ctx context.Context, cloud *nats.Conn) error {
	// Connect to local NATS
	local, err := nats.Connect(fmt.Sprintf("nats://localhost:%d", viper.GetInt("local.port")))
	if err != nil {
		return fmt.Errorf("failed to connect to local NATS: %w", err)
	}
	defer local.Close()

	// Start device gateway (handles device discovery and protocol translation)
	log.Println("Starting device gateway...")
	// TODO: Implement device gateway

	// Start automation engine (executes automations locally)
	log.Println("Starting automation engine...")
	// TODO: Implement automation engine

	// Bridge important subjects between local and cloud
	if err := setupBridging(local, cloud); err != nil {
		return fmt.Errorf("failed to setup bridging: %w", err)
	}

	// Monitor for context cancellation
	<-ctx.Done()
	return nil
}

func setupBridging(local, cloud *nats.Conn) error {
	homeID := viper.GetString("home.id")

	// Bridge device announcements to cloud
	local.Subscribe("home.devices.*.announce", func(msg *nats.Msg) {
		// Add home ID to subject
		cloudSubject := fmt.Sprintf("cloud.homes.%s.devices.announce", homeID)
		cloud.Publish(cloudSubject, msg.Data)
	})

	// Bridge device states to cloud
	local.Subscribe("home.devices.*.state", func(msg *nats.Msg) {
		cloudSubject := fmt.Sprintf("cloud.homes.%s.devices.state", homeID)
		cloud.Publish(cloudSubject, msg.Data)
	})

	// Bridge commands from cloud to local devices
	cloud.Subscribe(fmt.Sprintf("cloud.homes.%s.devices.*.command", homeID), func(msg *nats.Msg) {
		// Extract device ID and forward locally
		// TODO: Parse subject properly
		local.Publish("home.devices.light.command", msg.Data)
	})

	// Subscribe to automation updates from cloud
	cloud.Subscribe(fmt.Sprintf("cloud.homes.%s.automations.update", homeID), func(msg *nats.Msg) {
		log.Println("Received automation update from cloud")
		// TODO: Update local automation engine
	})

	log.Println("Cloud-local bridging established")
	return nil
}

func generateHomeID() string {
	// Simple ID generation - in production use UUID
	return fmt.Sprintf("home-%d", time.Now().Unix())
}