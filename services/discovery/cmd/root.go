package cmd

import (
	"context"

	"github.com/calmera/nats-home-automation/services/discovery/internal/config"
	"github.com/calmera/nats-home-automation/services/discovery/internal/service"
	"github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var (
	cfgFile string
	log     = logrus.New()
)

var rootCmd = &cobra.Command{
	Use:   "discovery",
	Short: "NATS Home Automation Device Discovery Service",
	Long: `The Discovery Service manages device registration and discovery
for the NATS-based home automation system. It maintains a registry
of all devices, their capabilities, and connection status.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx := cmd.Context()
		
		// Load configuration
		cfg, err := config.Load()
		if err != nil {
			return err
		}

		// Configure logging
		if cfg.Debug {
			log.SetLevel(logrus.DebugLevel)
		}

		// Create and run service
		svc, err := service.New(cfg, log)
		if err != nil {
			return err
		}

		return svc.Run(ctx)
	},
}

func Execute(ctx context.Context) error {
	return rootCmd.ExecuteContext(ctx)
}

func init() {
	cobra.OnInitialize(initConfig)

	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is discovery.yaml)")
	rootCmd.PersistentFlags().String("nats-url", "nats://localhost:4222", "NATS server URL")
	rootCmd.PersistentFlags().String("nats-user", "", "NATS username")
	rootCmd.PersistentFlags().String("nats-password", "", "NATS password")
	rootCmd.PersistentFlags().String("nats-creds", "", "NATS credentials file")
	rootCmd.PersistentFlags().Bool("debug", false, "Enable debug logging")

	viper.BindPFlag("nats.url", rootCmd.PersistentFlags().Lookup("nats-url"))
	viper.BindPFlag("nats.user", rootCmd.PersistentFlags().Lookup("nats-user"))
	viper.BindPFlag("nats.password", rootCmd.PersistentFlags().Lookup("nats-password"))
	viper.BindPFlag("nats.credentials", rootCmd.PersistentFlags().Lookup("nats-creds"))
	viper.BindPFlag("debug", rootCmd.PersistentFlags().Lookup("debug"))
}

func initConfig() {
	if cfgFile != "" {
		viper.SetConfigFile(cfgFile)
	} else {
		viper.AddConfigPath(".")
		viper.AddConfigPath("/etc/nats-discovery/")
		viper.SetConfigName("discovery")
		viper.SetConfigType("yaml")
	}

	viper.SetEnvPrefix("DISCOVERY")
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err == nil {
		log.Infof("Using config file: %s", viper.ConfigFileUsed())
	}
}