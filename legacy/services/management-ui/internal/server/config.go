package server

import "time"

// Config holds the server configuration
type Config struct {
	NATS    NATSConfig    `mapstructure:"nats"`
	HTTP    HTTPConfig    `mapstructure:"http"`
	API     APIConfig     `mapstructure:"api"`
	Session SessionConfig `mapstructure:"session"`
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

// APIConfig holds API configuration
type APIConfig struct {
	Prefix     string `mapstructure:"prefix"`
	EnableCORS bool   `mapstructure:"enable_cors"`
}

// SessionConfig holds session configuration
type SessionConfig struct {
	Secret  string        `mapstructure:"secret"`
	Timeout time.Duration `mapstructure:"timeout"`
}