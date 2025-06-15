package cmd

import (
	"context"

	"github.com/nats-home-automation/services/health-monitor/internal/monitor"
	"github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var (
	cfgFile string
	rootCmd = &cobra.Command{
		Use:   "health-monitor",
		Short: "Device health monitoring dashboard for NATS Home Automation",
		Long: `A real-time health monitoring dashboard that tracks the status of all devices
in the NATS Home Automation system.

Features:
- Real-time device status monitoring
- Battery level tracking
- Connectivity monitoring
- Alert generation for offline devices
- Historical metrics
- Web-based dashboard with live updates`,
		RunE: run,
	}
)

func init() {
	cobra.OnInitialize(initConfig)

	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is ./config.yaml)")

	// NATS flags
	rootCmd.Flags().String("nats-url", "nats://localhost:4222", "NATS server URL")
	rootCmd.Flags().String("nats-creds", "", "NATS credentials file")

	// HTTP server flags
	rootCmd.Flags().String("http-addr", ":8080", "HTTP server address")
	rootCmd.Flags().String("http-static", "./static", "Static files directory")

	// Monitoring flags
	rootCmd.Flags().Duration("device-timeout", 300, "Device offline timeout in seconds")
	rootCmd.Flags().Duration("update-interval", 30, "Dashboard update interval in seconds")

	// Bind flags to viper
	viper.BindPFlag("nats.url", rootCmd.Flags().Lookup("nats-url"))
	viper.BindPFlag("nats.creds", rootCmd.Flags().Lookup("nats-creds"))
	viper.BindPFlag("http.addr", rootCmd.Flags().Lookup("http-addr"))
	viper.BindPFlag("http.static", rootCmd.Flags().Lookup("http-static"))
	viper.BindPFlag("monitor.device_timeout", rootCmd.Flags().Lookup("device-timeout"))
	viper.BindPFlag("monitor.update_interval", rootCmd.Flags().Lookup("update-interval"))

	// Debug flag
	rootCmd.Flags().Bool("debug", false, "Enable debug logging")
	viper.BindPFlag("debug", rootCmd.Flags().Lookup("debug"))
}

func initConfig() {
	if cfgFile != "" {
		viper.SetConfigFile(cfgFile)
	} else {
		viper.SetConfigName("config")
		viper.SetConfigType("yaml")
		viper.AddConfigPath(".")
		viper.AddConfigPath("/etc/health-monitor/")
		viper.AddConfigPath("$HOME/.health-monitor")
	}

	viper.SetEnvPrefix("HEALTH_MONITOR")
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err == nil {
		logrus.Info("Using config file:", viper.ConfigFileUsed())
	}

	if viper.GetBool("debug") {
		logrus.SetLevel(logrus.DebugLevel)
	}
}

func run(cmd *cobra.Command, args []string) error {
	ctx := cmd.Context()

	config := &monitor.Config{
		NATS: monitor.NATSConfig{
			URL:         viper.GetString("nats.url"),
			Credentials: viper.GetString("nats.creds"),
		},
		HTTP: monitor.HTTPConfig{
			Addr:   viper.GetString("http.addr"),
			Static: viper.GetString("http.static"),
		},
		Monitor: monitor.MonitorConfig{
			DeviceTimeout:   viper.GetDuration("monitor.device_timeout"),
			UpdateInterval:  viper.GetDuration("monitor.update_interval"),
		},
	}

	m, err := monitor.New(config)
	if err != nil {
		return err
	}

	return m.Start(ctx)
}

func Execute() error {
	return rootCmd.Execute()
}

func ExecuteContext(ctx context.Context) error {
	return rootCmd.ExecuteContext(ctx)
}