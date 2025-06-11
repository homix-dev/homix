package config

// Config holds the automation engine configuration
type Config struct {
	NATS   NATSConfig   `mapstructure:"nats"`
	Engine EngineConfig `mapstructure:"engine"`
}

// NATSConfig holds NATS connection configuration
type NATSConfig struct {
	URL         string `mapstructure:"url"`
	Credentials string `mapstructure:"creds"`
}

// EngineConfig holds automation engine configuration
type EngineConfig struct {
	UpdateInterval   int  `mapstructure:"update_interval"`
	DebugEvaluation bool `mapstructure:"debug_evaluation"`
}