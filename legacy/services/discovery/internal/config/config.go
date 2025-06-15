package config

import (
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	Debug bool   `mapstructure:"debug"`
	NATS  NATS   `mapstructure:"nats"`
	Store Store  `mapstructure:"store"`
}

type NATS struct {
	URL         string        `mapstructure:"url"`
	User        string        `mapstructure:"user"`
	Password    string        `mapstructure:"password"`
	Credentials string        `mapstructure:"credentials"`
	Timeout     time.Duration `mapstructure:"timeout"`
}

type Store struct {
	Bucket       string        `mapstructure:"bucket"`
	TTL          time.Duration `mapstructure:"ttl"`
	MaxDevices   int           `mapstructure:"max_devices"`
}

func Load() (*Config, error) {
	// Set defaults
	viper.SetDefault("debug", false)
	viper.SetDefault("nats.url", "nats://localhost:4222")
	viper.SetDefault("nats.timeout", 5*time.Second)
	viper.SetDefault("store.bucket", "device_registry")
	viper.SetDefault("store.ttl", 24*time.Hour)
	viper.SetDefault("store.max_devices", 1000)

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, err
	}

	return &config, nil
}