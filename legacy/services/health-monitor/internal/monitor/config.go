package monitor

import "time"

// Config holds the monitor configuration
type Config struct {
	NATS    NATSConfig    `mapstructure:"nats"`
	HTTP    HTTPConfig    `mapstructure:"http"`
	Monitor MonitorConfig `mapstructure:"monitor"`
}

// NATSConfig holds NATS connection configuration
type NATSConfig struct {
	URL         string `mapstructure:"url"`
	Credentials string `mapstructure:"creds"`
}

// HTTPConfig holds HTTP server configuration
type HTTPConfig struct {
	Addr   string `mapstructure:"addr"`
	Static string `mapstructure:"static"`
}

// MonitorConfig holds monitoring configuration
type MonitorConfig struct {
	DeviceTimeout  time.Duration `mapstructure:"device_timeout"`
	UpdateInterval time.Duration `mapstructure:"update_interval"`
}