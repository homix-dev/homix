#include "nats_switch.h"
#include "esphome/core/log.h"
#include <ArduinoJson.h>

namespace esphome {
namespace nats {

static const char *const TAG = "nats_switch";

void NATSSwitch::setup() {
  ESP_LOGCONFIG(TAG, "Setting up NATS Switch '%s'...", this->get_name().c_str());
  
  // Restore state if configured
  optional<bool> restored_state;
  switch (this->restore_mode_) {
    case switch_::SWITCH_RESTORE_DEFAULT_OFF:
      restored_state = this->get_initial_state_with_restore_mode().value_or(false);
      break;
    case switch_::SWITCH_RESTORE_DEFAULT_ON:
      restored_state = this->get_initial_state_with_restore_mode().value_or(true);
      break;
    case switch_::SWITCH_ALWAYS_OFF:
      restored_state = false;
      break;
    case switch_::SWITCH_ALWAYS_ON:
      restored_state = true;
      break;
    case switch_::SWITCH_RESTORE_INVERTED_DEFAULT_OFF:
      restored_state = !this->get_initial_state_with_restore_mode().value_or(true);
      break;
    case switch_::SWITCH_RESTORE_INVERTED_DEFAULT_ON:
      restored_state = !this->get_initial_state_with_restore_mode().value_or(false);
      break;
  }

  if (restored_state.has_value()) {
    ESP_LOGD(TAG, "Restored state: %s", ONOFF(restored_state.value()));
    this->write_state(restored_state.value());
  }

  // Set up GPIO pin if configured
  if (this->pin_ != nullptr) {
    this->pin_->setup();
    if (restored_state.has_value()) {
      this->pin_->digital_write(restored_state.value());
    }
  }

  // Subscribe to command topics
  this->subscribe_to_commands_();
}

void NATSSwitch::dump_config() {
  ESP_LOGCONFIG(TAG, "NATS Switch:");
  ESP_LOGCONFIG(TAG, "  Subject suffix: %s", this->subject_suffix_.c_str());
  ESP_LOGCONFIG(TAG, "  Optimistic: %s", YESNO(this->optimistic_));
  ESP_LOGCONFIG(TAG, "  Assumed state: %s", YESNO(this->assumed_state_));
  if (this->pin_ != nullptr) {
    LOG_PIN("  GPIO Pin: ", this->pin_);
  }
}

void NATSSwitch::loop() {
  if (!global_nats_client || !global_nats_client->is_connected()) {
    this->subscribed_ = false;
    return;
  }

  // Re-subscribe if connection was lost
  if (!this->subscribed_) {
    this->subscribe_to_commands_();
  }

  // Publish state periodically
  if (millis() - this->last_publish_ > this->publish_interval_) {
    this->publish_state_();
    this->last_publish_ = millis();
  }
}

void NATSSwitch::write_state(bool state) {
  // Update GPIO if configured
  if (this->pin_ != nullptr) {
    this->pin_->digital_write(state);
  }

  // For optimistic mode, assume the state change succeeded
  if (this->optimistic_) {
    this->publish_state(state);
  } else if (this->pin_ != nullptr) {
    // Read back from GPIO to confirm
    bool read_state = this->pin_->digital_read();
    this->publish_state(read_state);
  } else {
    // No GPIO configured, just publish the requested state
    this->publish_state(state);
  }

  // Publish to NATS immediately
  this->publish_state_();
}

void NATSSwitch::subscribe_to_commands_() {
  if (!global_nats_client || !global_nats_client->is_connected()) {
    return;
  }

  // Subscribe to command subject
  std::string command_subject = global_nats_client->get_subject("command." + this->subject_suffix_);
  
  global_nats_client->subscribe(command_subject, [this](const std::string &msg) {
    this->handle_command_(msg);
  });

  this->subscribed_ = true;
  ESP_LOGD(TAG, "Subscribed to command subject: %s", command_subject.c_str());
}

void NATSSwitch::publish_state_() {
  if (!global_nats_client || !global_nats_client->is_connected()) {
    return;
  }

  // Create state message
  DynamicJsonDocument doc(256);
  doc["timestamp"] = millis() / 1000;
  doc["device_id"] = global_nats_client->device_id_;
  
  JsonObject state = doc.createNestedObject("state");
  state[this->subject_suffix_] = this->state;
  
  // Add attributes
  JsonObject attributes = doc.createNestedObject("attributes");
  attributes["optimistic"] = this->optimistic_;
  attributes["assumed_state"] = this->assumed_state_;
  
  if (!this->get_icon().empty()) {
    attributes["icon"] = this->get_icon();
  }

  // Publish to state subject
  std::string subject = global_nats_client->get_subject("state");
  global_nats_client->publish_json(subject, doc);
  
  ESP_LOGD(TAG, "Published %s state: %s", this->subject_suffix_.c_str(), ONOFF(this->state));
}

void NATSSwitch::handle_command_(const std::string &payload) {
  ESP_LOGD(TAG, "Received command: %s", payload.c_str());

  // Parse JSON command
  DynamicJsonDocument doc(256);
  DeserializationError error = deserializeJson(doc, payload);
  
  if (error) {
    ESP_LOGW(TAG, "Failed to parse command JSON: %s", error.c_str());
    return;
  }

  // Handle different command formats
  if (doc.containsKey("state")) {
    // Format: {"state": true/false}
    bool new_state = doc["state"].as<bool>();
    this->turn_on_off(new_state);
  } else if (doc.containsKey("command")) {
    // Format: {"command": "on"/"off"/"toggle"}
    std::string cmd = doc["command"].as<std::string>();
    if (cmd == "on") {
      this->turn_on();
    } else if (cmd == "off") {
      this->turn_off();
    } else if (cmd == "toggle") {
      this->toggle();
    } else {
      ESP_LOGW(TAG, "Unknown command: %s", cmd.c_str());
    }
  } else {
    // Try to parse as simple boolean or string
    if (doc.is<bool>()) {
      this->turn_on_off(doc.as<bool>());
    } else if (doc.is<const char*>()) {
      std::string value = doc.as<std::string>();
      if (value == "on" || value == "ON" || value == "true" || value == "TRUE" || value == "1") {
        this->turn_on();
      } else if (value == "off" || value == "OFF" || value == "false" || value == "FALSE" || value == "0") {
        this->turn_off();
      } else {
        ESP_LOGW(TAG, "Unknown state value: %s", value.c_str());
      }
    }
  }
}

}  // namespace nats
}  // namespace esphome