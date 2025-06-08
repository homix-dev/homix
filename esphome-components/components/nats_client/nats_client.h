#pragma once

#include "esphome/core/component.h"
#include "esphome/core/automation.h"
#include "esphome/components/network/ip_address.h"
#include <WiFiClient.h>
#include <ArduinoJson.h>
#include <queue>
#include <map>
#include <functional>

namespace esphome {
namespace nats {

class NATSClient : public Component {
 public:
  void setup() override;
  void loop() override;
  void dump_config() override;
  float get_setup_priority() const override { return setup_priority::AFTER_WIFI; }

  // Configuration
  void set_server(const std::string &server) { this->server_ = server; }
  void set_port(uint16_t port) { this->port_ = port; }
  void set_username(const std::string &username) { this->username_ = username; }
  void set_password(const std::string &password) { this->password_ = password; }
  void set_device_id(const std::string &device_id) { this->device_id_ = device_id; }
  void set_device_name(const std::string &device_name) { this->device_name_ = device_name; }
  void set_device_type(const std::string &device_type) { this->device_type_ = device_type; }
  void set_manufacturer(const std::string &manufacturer) { this->manufacturer_ = manufacturer; }
  void set_model(const std::string &model) { this->model_ = model; }
  void set_reconnect_interval(uint32_t interval) { this->reconnect_interval_ = interval; }
  void set_status_interval(uint32_t interval) { this->status_interval_ = interval; }
  void set_discovery_prefix(const std::string &prefix) { this->discovery_prefix_ = prefix; }
  void set_use_ssl(bool use_ssl) { this->use_ssl_ = use_ssl; }

  // Public methods
  bool is_connected() const { return this->connected_; }
  void publish(const std::string &subject, const std::string &payload);
  void publish_json(const std::string &subject, JsonDocument &doc);
  void subscribe(const std::string &subject, std::function<void(const std::string &)> callback);
  void request(const std::string &subject, const std::string &payload, 
               std::function<void(const std::string &)> callback, uint32_t timeout_ms = 5000);

  // Get full subject with prefix
  std::string get_subject(const std::string &suffix) const {
    return this->discovery_prefix_ + ".devices." + this->device_type_ + "." + this->device_id_ + "." + suffix;
  }

 protected:
  void connect_();
  void disconnect_();
  void handle_message_();
  void send_connect_();
  void send_ping_();
  void send_pong_();
  void process_info_(const std::string &info);
  void announce_device_();
  void publish_status_();
  void send_command_(const std::string &command);
  std::string generate_inbox_();

  // Connection state
  WiFiClient client_;
  bool connected_{false};
  bool connecting_{false};
  uint32_t last_connect_attempt_{0};
  uint32_t last_ping_{0};
  uint32_t last_status_{0};
  
  // Configuration
  std::string server_;
  uint16_t port_{4222};
  std::string username_;
  std::string password_;
  std::string device_id_;
  std::string device_name_;
  std::string device_type_;
  std::string manufacturer_{"ESPHome"};
  std::string model_{"ESP32"};
  uint32_t reconnect_interval_{30000};  // 30 seconds
  uint32_t status_interval_{60000};      // 60 seconds
  std::string discovery_prefix_{"home"};
  bool use_ssl_{false};

  // NATS protocol state
  std::string server_id_;
  bool auth_required_{false};
  std::map<std::string, uint64_t> subscriptions_;
  std::map<std::string, std::function<void(const std::string &)>> callbacks_;
  std::map<std::string, std::pair<std::function<void(const std::string &)>, uint32_t>> pending_requests_;
  uint64_t next_sid_{1};

  // Message buffer
  std::string read_buffer_;
  std::queue<std::pair<std::string, std::string>> publish_queue_;
};

// Global NATS client instance
extern NATSClient *global_nats_client;

}  // namespace nats
}  // namespace esphome