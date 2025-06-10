package cmd

import (
	"context"

	"github.com/nats-home-automation/services/management-ui/internal/server"
	"github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var (
	cfgFile string
	rootCmd = &cobra.Command{
		Use:   "management-ui",
		Short: "Web-based management UI for NATS Home Automation",
		Long: `A comprehensive web interface for managing your NATS Home Automation system.

Features:
- Device management and control
- Automation rules creation and editing
- Scene management
- Real-time device status monitoring
- System configuration
- Event history and logs
- User management and access control`,
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
	rootCmd.Flags().String("http-addr", ":8090", "HTTP server address")
	rootCmd.Flags().String("http-static", "./static", "Static files directory")

	// API flags
	rootCmd.Flags().String("api-prefix", "/api/v1", "API URL prefix")
	rootCmd.Flags().Bool("api-cors", true, "Enable CORS for API")

	// Session flags
	rootCmd.Flags().String("session-secret", "", "Session secret key (auto-generated if empty)")
	rootCmd.Flags().Duration("session-timeout", 3600, "Session timeout in seconds")

	// Bind flags to viper
	viper.BindPFlag("nats.url", rootCmd.Flags().Lookup("nats-url"))
	viper.BindPFlag("nats.creds", rootCmd.Flags().Lookup("nats-creds"))
	viper.BindPFlag("http.addr", rootCmd.Flags().Lookup("http-addr"))
	viper.BindPFlag("http.static", rootCmd.Flags().Lookup("http-static"))
	viper.BindPFlag("api.prefix", rootCmd.Flags().Lookup("api-prefix"))
	viper.BindPFlag("api.cors", rootCmd.Flags().Lookup("api-cors"))
	viper.BindPFlag("session.secret", rootCmd.Flags().Lookup("session-secret"))
	viper.BindPFlag("session.timeout", rootCmd.Flags().Lookup("session-timeout"))

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
		viper.AddConfigPath("/etc/management-ui/")
		viper.AddConfigPath("$HOME/.management-ui")
	}

	viper.SetEnvPrefix("MGMT_UI")
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

	config := &server.Config{
		NATS: server.NATSConfig{
			URL:         viper.GetString("nats.url"),
			Credentials: viper.GetString("nats.creds"),
		},
		HTTP: server.HTTPConfig{
			Addr:   viper.GetString("http.addr"),
			Static: viper.GetString("http.static"),
		},
		API: server.APIConfig{
			Prefix:     viper.GetString("api.prefix"),
			EnableCORS: viper.GetBool("api.cors"),
		},
		Session: server.SessionConfig{
			Secret:  viper.GetString("session.secret"),
			Timeout: viper.GetDuration("session.timeout"),
		},
	}

	srv, err := server.New(config)
	if err != nil {
		return err
	}

	return srv.Start(ctx)
}

func Execute() error {
	return rootCmd.Execute()
}

func ExecuteContext(ctx context.Context) error {
	return rootCmd.ExecuteContext(ctx)
}