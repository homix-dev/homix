#include "nats_client.h"
#include "esphome/core/log.h"
#include "esphome/core/application.h"
#include "esphome/core/util.h"
#include "esphome/components/network/util.h"

namespace esphome {
namespace nats {

static const char *const TAG = "nats_client";

NATSClient *global_nats_client = nullptr;

void NATSClient::setup() {
  ESP_LOGCONFIG(TAG, "Setting up NATS client...");
  global_nats_client = this;
}

void NATSClient::loop() {
  // Check connection
  if (!this->connected_) {
    if (!this->connecting_ && (millis() - this->last_connect_attempt_) > this->reconnect_interval_) {
      this->connect_();
    }
    return;
  }

  // Handle incoming messages
  while (this->client_.available()) {
    this->handle_message_();
  }

  // Send ping if needed (every 30 seconds)
  if ((millis() - this->last_ping_) > 30000) {
    this->send_ping_();
    this->last_ping_ = millis();
  }

  // Publish status periodically
  if ((millis() - this->last_status_) > this->status_interval_) {
    this->publish_status_();
    this->last_status_ = millis();
  }

  // Process publish queue
  while (!this->publish_queue_.empty() && this->connected_) {
    auto &item = this->publish_queue_.front();
    this->send_command_("PUB " + item.first + " " + std::to_string(item.second.length()) + "\r\n" + item.second + "\r\n");
    this->publish_queue_.pop();
  }

  // Check for request timeouts
  auto now = millis();
  for (auto it = this->pending_requests_.begin(); it != this->pending_requests_.end();) {
    if (now > it->second.second) {
      ESP_LOGW(TAG, "Request timeout for %s", it->first.c_str());
      it = this->pending_requests_.erase(it);
    } else {
      ++it;
    }
  }
}

void NATSClient::dump_config() {
  ESP_LOGCONFIG(TAG, "NATS Client:");
  ESP_LOGCONFIG(TAG, "  Server: %s:%d", this->server_.c_str(), this->port_);
  ESP_LOGCONFIG(TAG, "  Device ID: %s", this->device_id_.c_str());
  ESP_LOGCONFIG(TAG, "  Device Type: %s", this->device_type_.c_str());
  ESP_LOGCONFIG(TAG, "  Connected: %s", YESNO(this->connected_));
}

void NATSClient::connect_() {
  if (this->connecting_) return;
  
  ESP_LOGD(TAG, "Connecting to NATS server %s:%d", this->server_.c_str(), this->port_);
  this->connecting_ = true;
  this->last_connect_attempt_ = millis();

  // Resolve hostname
  IPAddress ip = network::resolve_ip_address(this->server_);
  if (ip == IPAddress(0, 0, 0, 0)) {
    ESP_LOGW(TAG, "Failed to resolve %s", this->server_.c_str());
    this->connecting_ = false;
    return;
  }

  // Connect
  if (!this->client_.connect(ip, this->port_)) {
    ESP_LOGW(TAG, "Failed to connect to NATS server");
    this->connecting_ = false;
    return;
  }

  ESP_LOGD(TAG, "Connected to NATS server");
  this->connected_ = true;
  this->connecting_ = false;
  this->read_buffer_.clear();
}

void NATSClient::disconnect_() {
  if (this->connected_) {
    ESP_LOGD(TAG, "Disconnecting from NATS server");
    this->client_.stop();
    this->connected_ = false;
    this->subscriptions_.clear();
    this->pending_requests_.clear();
  }
}

void NATSClient::handle_message_() {
  char c = this->client_.read();
  this->read_buffer_ += c;

  // Check for complete message (ends with \r\n)
  size_t pos = this->read_buffer_.find("\r\n");
  if (pos == std::string::npos) return;

  std::string line = this->read_buffer_.substr(0, pos);
  this->read_buffer_.erase(0, pos + 2);

  // Parse message
  if (line.substr(0, 4) == "INFO") {
    this->process_info_(line.substr(5));
    this->send_connect_();
  } else if (line.substr(0, 4) == "PING") {
    this->send_pong_();
  } else if (line.substr(0, 3) == "MSG") {
    // Parse MSG subject sid [reply-to] #bytes
    std::vector<std::string> parts;
    size_t start = 4;  // Skip "MSG "
    while (start < line.length()) {
      size_t space = line.find(' ', start);
      if (space == std::string::npos) {
        parts.push_back(line.substr(start));
        break;
      }
      parts.push_back(line.substr(start, space - start));
      start = space + 1;
    }

    if (parts.size() >= 3) {
      std::string subject = parts[0];
      int payload_size = std::stoi(parts[parts.size() - 1]);
      
      // Read payload
      std::string payload;
      for (int i = 0; i < payload_size; i++) {
        if (this->client_.available()) {
          payload += (char)this->client_.read();
        }
      }
      
      // Skip trailing \r\n
      if (this->client_.available()) this->client_.read();
      if (this->client_.available()) this->client_.read();

      // Handle callback
      auto it = this->callbacks_.find(subject);
      if (it != this->callbacks_.end()) {
        it->second(payload);
      }

      // Check for request response
      if (parts.size() >= 4) {  // Has reply-to
        std::string reply_to = parts[2];
        auto req_it = this->pending_requests_.find(reply_to);
        if (req_it != this->pending_requests_.end()) {
          req_it->second.first(payload);
          this->pending_requests_.erase(req_it);
        }
      }
    }
  } else if (line.substr(0, 4) == "+OK") {
    // Success response
  } else if (line.substr(0, 4) == "-ERR") {
    ESP_LOGW(TAG, "NATS error: %s", line.c_str());
    if (line.find("Authorization") != std::string::npos) {
      this->disconnect_();
    }
  }
}

void NATSClient::send_connect_() {
  DynamicJsonDocument doc(512);
  doc["verbose"] = false;
  doc["pedantic"] = false;
  doc["name"] = this->device_id_;
  doc["lang"] = "esp-cpp";
  doc["version"] = "1.0.0";
  doc["protocol"] = 1;

  if (!this->username_.empty()) {
    doc["user"] = this->username_;
    doc["pass"] = this->password_;
  }

  std::string json;
  serializeJson(doc, json);
  this->send_command_("CONNECT " + json + "\r\n");

  // Subscribe to command subject
  std::string cmd_subject = this->get_subject("command");
  this->subscribe(cmd_subject, [this](const std::string &payload) {
    ESP_LOGD(TAG, "Received command: %s", payload.c_str());
    // Commands will be handled by switch components
  });

  // Announce device
  this->announce_device_();
}

void NATSClient::announce_device_() {
  DynamicJsonDocument doc(1024);
  doc["device_id"] = this->device_id_;
  doc["device_type"] = this->device_type_;
  doc["name"] = this->device_name_;
  doc["manufacturer"] = this->manufacturer_;
  doc["model"] = this->model_;
  
  JsonObject capabilities = doc.createNestedObject("capabilities");
  JsonArray sensors = capabilities.createNestedArray("sensors");
  // Sensors will be added by components
  
  JsonObject topics = doc.createNestedObject("topics");
  topics["state"] = this->get_subject("state");
  topics["status"] = this->get_subject("status");
  topics["command"] = this->get_subject("command");

  std::string subject = this->discovery_prefix_ + ".discovery.announce";
  this->publish_json(subject, doc);
  
  ESP_LOGI(TAG, "Device announced: %s", this->device_id_.c_str());
}

void NATSClient::publish_status_() {
  DynamicJsonDocument doc(512);
  doc["online"] = true;
  doc["timestamp"] = millis() / 1000;
  
  JsonObject diagnostics = doc.createNestedObject("diagnostics");
  diagnostics["uptime"] = millis() / 1000;
  diagnostics["free_heap"] = ESP.getFreeHeap();
  diagnostics["rssi"] = WiFi.RSSI();

  std::string subject = this->get_subject("status");
  this->publish_json(subject, doc);
}

void NATSClient::publish(const std::string &subject, const std::string &payload) {
  if (!this->connected_) {
    this->publish_queue_.push({subject, payload});
    return;
  }
  
  this->send_command_("PUB " + subject + " " + std::to_string(payload.length()) + "\r\n" + payload + "\r\n");
}

void NATSClient::publish_json(const std::string &subject, JsonDocument &doc) {
  std::string payload;
  serializeJson(doc, payload);
  this->publish(subject, payload);
}

void NATSClient::subscribe(const std::string &subject, std::function<void(const std::string &)> callback) {
  if (!this->connected_) {
    ESP_LOGW(TAG, "Cannot subscribe when not connected");
    return;
  }

  uint64_t sid = this->next_sid_++;
  this->subscriptions_[subject] = sid;
  this->callbacks_[subject] = callback;
  
  this->send_command_("SUB " + subject + " " + std::to_string(sid) + "\r\n");
  ESP_LOGD(TAG, "Subscribed to %s with sid %llu", subject.c_str(), sid);
}

void NATSClient::request(const std::string &subject, const std::string &payload,
                        std::function<void(const std::string &)> callback, uint32_t timeout_ms) {
  if (!this->connected_) {
    ESP_LOGW(TAG, "Cannot request when not connected");
    return;
  }

  std::string inbox = this->generate_inbox_();
  uint64_t sid = this->next_sid_++;
  
  // Subscribe to inbox
  this->subscriptions_[inbox] = sid;
  this->callbacks_[inbox] = callback;
  this->pending_requests_[inbox] = {callback, millis() + timeout_ms};
  
  this->send_command_("SUB " + inbox + " " + std::to_string(sid) + "\r\n");
  
  // Publish request with reply-to
  this->send_command_("PUB " + subject + " " + inbox + " " + std::to_string(payload.length()) + "\r\n" + payload + "\r\n");
}

void NATSClient::send_command_(const std::string &command) {
  if (this->client_.connected()) {
    this->client_.print(command.c_str());
    ESP_LOGVV(TAG, ">> %s", command.c_str());
  }
}

void NATSClient::send_ping_() {
  this->send_command_("PING\r\n");
}

void NATSClient::send_pong_() {
  this->send_command_("PONG\r\n");
}

void NATSClient::process_info_(const std::string &info) {
  // Parse JSON info
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, info);
  if (error) {
    ESP_LOGW(TAG, "Failed to parse INFO: %s", error.c_str());
    return;
  }

  this->server_id_ = doc["server_id"] | "";
  this->auth_required_ = doc["auth_required"] | false;
  
  ESP_LOGD(TAG, "Server ID: %s, Auth required: %s", 
           this->server_id_.c_str(), YESNO(this->auth_required_));
}

std::string NATSClient::generate_inbox_() {
  static uint32_t counter = 0;
  return "_INBOX." + this->device_id_ + "." + std::to_string(millis()) + "." + std::to_string(counter++);
}

}  // namespace nats
}  // namespace esphome