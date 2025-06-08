package cmd

import (
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var (
	cfgFile  string
	natsURL  string
	natsUser string
	natsPass string
)

var rootCmd = &cobra.Command{
	Use:   "nats-ha",
	Short: "NATS Home Automation CLI",
	Long: `A command-line interface for managing NATS-based home automation system.
	
This tool provides easy access to device management, configuration,
and monitoring capabilities of your home automation system.`,
}

func Execute() error {
	return rootCmd.Execute()
}

func init() {
	cobra.OnInitialize(initConfig)

	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is $HOME/.nats-ha.yaml)")
	rootCmd.PersistentFlags().StringVar(&natsURL, "server", "nats://localhost:4222", "NATS server URL")
	rootCmd.PersistentFlags().StringVar(&natsUser, "user", "", "NATS username")
	rootCmd.PersistentFlags().StringVar(&natsPass, "password", "", "NATS password")

	viper.BindPFlag("nats.url", rootCmd.PersistentFlags().Lookup("server"))
	viper.BindPFlag("nats.user", rootCmd.PersistentFlags().Lookup("user"))
	viper.BindPFlag("nats.password", rootCmd.PersistentFlags().Lookup("password"))
}

func initConfig() {
	if cfgFile != "" {
		viper.SetConfigFile(cfgFile)
	} else {
		home, err := os.UserHomeDir()
		cobra.CheckErr(err)

		viper.AddConfigPath(home)
		viper.SetConfigName(".nats-ha")
	}

	viper.SetEnvPrefix("NATS_HA")
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err == nil {
		// Config file found
	}
}