package cmd

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/nats-home-automation/automation-engine/internal/config"
	"github.com/nats-home-automation/automation-engine/internal/engine"
	"github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var (
	cfgFile string
	logger  *logrus.Logger
)

var rootCmd = &cobra.Command{
	Use:   "automation-engine",
	Short: "NATS Home Automation Engine",
	Long:  `Automation engine that monitors device states and executes automation rules`,
	Run: func(cmd *cobra.Command, args []string) {
		runEngine()
	},
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}

func init() {
	cobra.OnInitialize(initConfig)
	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is ./config.yaml)")
	
	// Initialize logger
	logger = logrus.New()
	logger.SetFormatter(&logrus.TextFormatter{
		FullTimestamp: true,
	})
}

func initConfig() {
	if cfgFile != "" {
		viper.SetConfigFile(cfgFile)
	} else {
		viper.AddConfigPath(".")
		viper.SetConfigName("config")
		viper.SetConfigType("yaml")
	}

	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err == nil {
		logger.Infof("Using config file: %s", viper.ConfigFileUsed())
	}

	// Set log level
	if viper.GetBool("debug") {
		logger.SetLevel(logrus.DebugLevel)
	}
}

func runEngine() {
	// Load configuration
	cfg := &config.Config{
		NATS: config.NATSConfig{
			URL:         viper.GetString("nats.url"),
			Credentials: viper.GetString("nats.creds"),
		},
		Engine: config.EngineConfig{
			UpdateInterval:   viper.GetInt("engine.update_interval"),
			DebugEvaluation: viper.GetBool("engine.debug_evaluation"),
		},
	}

	// Set default values
	if cfg.Engine.UpdateInterval == 0 {
		cfg.Engine.UpdateInterval = 30
	}

	// Create engine
	eng, err := engine.New(cfg, logger)
	if err != nil {
		logger.Fatalf("Failed to create automation engine: %v", err)
	}

	// Create context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle shutdown signals
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-sigChan
		logger.Info("Shutdown signal received")
		cancel()
	}()

	// Start engine
	if err := eng.Start(ctx); err != nil {
		logger.Fatalf("Failed to start automation engine: %v", err)
	}
}