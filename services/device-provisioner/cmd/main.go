package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"

	"github.com/calmera/nats-home-automation/services/device-provisioner/internal/provisioner"
	"github.com/nats-io/nats.go"
	"github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
)

var (
	natsURL     string
	natsUser    string
	natsPass    string
	natsCreds   string
	signingKey  string
	accountPub  string
	kvBucket    string
	debug       bool
	log         = logrus.New()
)

var rootCmd = &cobra.Command{
	Use:   "device-provisioner",
	Short: "NATS Home Automation Device Provisioning Service",
	Long: `The Device Provisioning Service manages JWT credential generation
for devices in the NATS-based home automation system.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		// Configure logging
		if debug {
			log.SetLevel(logrus.DebugLevel)
		}
		log.SetFormatter(&logrus.TextFormatter{
			FullTimestamp: true,
		})

		// Get signing key from env if not provided
		if signingKey == "" {
			signingKey = os.Getenv("SIGNING_KEY")
		}
		if signingKey == "" {
			return fmt.Errorf("signing key is required (--signing-key or SIGNING_KEY env)")
		}

		// Get account public key from env if not provided
		if accountPub == "" {
			accountPub = os.Getenv("ACCOUNT_PUB")
		}
		if accountPub == "" {
			return fmt.Errorf("account public key is required (--account-pub or ACCOUNT_PUB env)")
		}

		// Connect to NATS
		opts := []nats.Option{
			nats.Name("device-provisioner"),
			nats.MaxReconnects(-1),
			nats.ErrorHandler(func(nc *nats.Conn, sub *nats.Subscription, err error) {
				log.Errorf("NATS error: %v", err)
			}),
			nats.DisconnectErrHandler(func(nc *nats.Conn, err error) {
				log.Warnf("Disconnected from NATS: %v", err)
			}),
			nats.ReconnectHandler(func(nc *nats.Conn) {
				log.Info("Reconnected to NATS")
			}),
		}

		// Add authentication
		if natsCreds != "" {
			opts = append(opts, nats.UserCredentials(natsCreds))
		} else if natsUser != "" && natsPass != "" {
			opts = append(opts, nats.UserInfo(natsUser, natsPass))
		}

		nc, err := nats.Connect(natsURL, opts...)
		if err != nil {
			return fmt.Errorf("failed to connect to NATS: %w", err)
		}
		defer nc.Close()

		log.Info("Connected to NATS")

		// Create provisioner
		cfg := provisioner.Config{
			NATS:       nc,
			Logger:     log,
			SigningKey: signingKey,
			AccountPub: accountPub,
			IssuerName: "device-provisioner",
			KVBucket:   kvBucket,
		}

		prov, err := provisioner.New(cfg)
		if err != nil {
			return fmt.Errorf("failed to create provisioner: %w", err)
		}

		// Create context for graceful shutdown
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		// Handle signals
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, os.Interrupt)

		go func() {
			<-sigCh
			log.Info("Shutting down...")
			cancel()
		}()

		// Run provisioner
		log.Info("Device provisioner started")
		return prov.Run(ctx)
	},
}

func init() {
	rootCmd.PersistentFlags().StringVar(&natsURL, "nats-url", "nats://localhost:4222", "NATS server URL")
	rootCmd.PersistentFlags().StringVar(&natsUser, "nats-user", "", "NATS username")
	rootCmd.PersistentFlags().StringVar(&natsPass, "nats-password", "", "NATS password")
	rootCmd.PersistentFlags().StringVar(&natsCreds, "creds", "", "NATS credentials file")
	rootCmd.PersistentFlags().StringVar(&signingKey, "signing-key", "", "Account signing key seed")
	rootCmd.PersistentFlags().StringVar(&accountPub, "account-pub", "", "Account public key")
	rootCmd.PersistentFlags().StringVar(&kvBucket, "kv-bucket", "device-credentials", "KV bucket for device registry")
	rootCmd.PersistentFlags().BoolVar(&debug, "debug", false, "Enable debug logging")
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}