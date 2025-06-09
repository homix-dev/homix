package bridge

// Config holds the bridge configuration
type Config struct {
	MQTT MQTTConfig `mapstructure:"mqtt"`
	NATS NATSConfig `mapstructure:"nats"`
}

// MQTTConfig holds MQTT connection configuration
type MQTTConfig struct {
	Broker    string `mapstructure:"broker"`
	ClientID  string `mapstructure:"client_id"`
	Username  string `mapstructure:"username"`
	Password  string `mapstructure:"password"`
	BaseTopic string `mapstructure:"base_topic"`
}

// NATSConfig holds NATS connection configuration
type NATSConfig struct {
	URL         string `mapstructure:"url"`
	Credentials string `mapstructure:"creds"`
	BaseSubject string `mapstructure:"base_subject"`
}