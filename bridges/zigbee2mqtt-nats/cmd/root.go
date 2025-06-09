package cmd

import (
	"github.com/nats-home-automation/bridges/zigbee2mqtt-nats/internal/bridge"
	"github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var (
	cfgFile string
	rootCmd = &cobra.Command{
		Use:   "zigbee2mqtt-nats",
		Short: "Bridge between Zigbee2MQTT and NATS",
		Long: `A bridge that connects Zigbee2MQTT to NATS for home automation.
		
This bridge:
- Subscribes to Zigbee2MQTT topics via MQTT
- Converts Zigbee device messages to NATS format
- Publishes device states to NATS
- Handles commands from NATS to control Zigbee devices`,
		RunE: run,
	}
)

func init() {
	cobra.OnInitialize(initConfig)

	// Configuration file
	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is ./config.yaml)")

	// MQTT flags
	rootCmd.Flags().String("mqtt-broker", "tcp://localhost:1883", "MQTT broker URL")
	rootCmd.Flags().String("mqtt-client-id", "zigbee2mqtt-nats-bridge", "MQTT client ID")
	rootCmd.Flags().String("mqtt-username", "", "MQTT username")
	rootCmd.Flags().String("mqtt-password", "", "MQTT password")
	rootCmd.Flags().String("mqtt-base-topic", "zigbee2mqtt", "Zigbee2MQTT base topic")

	// NATS flags
	rootCmd.Flags().String("nats-url", "nats://localhost:4222", "NATS server URL")
	rootCmd.Flags().String("nats-creds", "", "NATS credentials file")
	rootCmd.Flags().String("nats-base-subject", "home.devices.zigbee", "Base NATS subject for Zigbee devices")

	// Bind flags to viper
	viper.BindPFlag("mqtt.broker", rootCmd.Flags().Lookup("mqtt-broker"))
	viper.BindPFlag("mqtt.client_id", rootCmd.Flags().Lookup("mqtt-client-id"))
	viper.BindPFlag("mqtt.username", rootCmd.Flags().Lookup("mqtt-username"))
	viper.BindPFlag("mqtt.password", rootCmd.Flags().Lookup("mqtt-password"))
	viper.BindPFlag("mqtt.base_topic", rootCmd.Flags().Lookup("mqtt-base-topic"))
	viper.BindPFlag("nats.url", rootCmd.Flags().Lookup("nats-url"))
	viper.BindPFlag("nats.creds", rootCmd.Flags().Lookup("nats-creds"))
	viper.BindPFlag("nats.base_subject", rootCmd.Flags().Lookup("nats-base-subject"))

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
		viper.AddConfigPath("/etc/zigbee2mqtt-nats/")
		viper.AddConfigPath("$HOME/.zigbee2mqtt-nats")
	}

	viper.SetEnvPrefix("Z2M_NATS")
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err == nil {
		logrus.Info("Using config file:", viper.ConfigFileUsed())
	}

	// Set log level
	if viper.GetBool("debug") {
		logrus.SetLevel(logrus.DebugLevel)
	}
}

func run(cmd *cobra.Command, args []string) error {
	config := &bridge.Config{
		MQTT: bridge.MQTTConfig{
			Broker:    viper.GetString("mqtt.broker"),
			ClientID:  viper.GetString("mqtt.client_id"),
			Username:  viper.GetString("mqtt.username"),
			Password:  viper.GetString("mqtt.password"),
			BaseTopic: viper.GetString("mqtt.base_topic"),
		},
		NATS: bridge.NATSConfig{
			URL:         viper.GetString("nats.url"),
			Credentials: viper.GetString("nats.creds"),
			BaseSubject: viper.GetString("nats.base_subject"),
		},
	}

	b, err := bridge.New(config)
	if err != nil {
		return err
	}

	return b.Start()
}

func Execute() error {
	return rootCmd.Execute()
}