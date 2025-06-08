#include "nats_sensor.h"
#include "esphome/core/log.h"
#include <ArduinoJson.h>

namespace esphome {
namespace nats {

static const char *const TAG = "nats_sensor";

void NATSSensor::setup() {
  if (!this->sensor_) {
    ESP_LOGE(TAG, "Sensor not set!");
    this->mark_failed();
    return;
  }

  // Subscribe to sensor updates
  this->sensor_->add_on_state_callback([this](float state) {
    this->publish_raw_state(state);
    
    // Publish immediately on change if force_update is true
    if (this->force_update_ || std::abs(state - this->last_value_) > 0.001) {
      this->publish_state_();
      this->last_value_ = state;
    }
  });
}

void NATSSensor::dump_config() {
  ESP_LOGCONFIG(TAG, "NATS Sensor:");
  ESP_LOGCONFIG(TAG, "  Subject suffix: %s", this->subject_suffix_.c_str());
  ESP_LOGCONFIG(TAG, "  Publish interval: %ums", this->publish_interval_);
  ESP_LOGCONFIG(TAG, "  Force update: %s", YESNO(this->force_update_));
  if (this->expire_after_ > 0) {
    ESP_LOGCONFIG(TAG, "  Expire after: %us", this->expire_after_);
  }
}

void NATSSensor::loop() {
  if (!global_nats_client || !global_nats_client->is_connected()) {
    return;
  }

  // Publish periodically
  if (millis() - this->last_publish_ > this->publish_interval_) {
    this->publish_state_();
    this->last_publish_ = millis();
  }
}

void NATSSensor::publish_state_() {
  if (!global_nats_client || !global_nats_client->is_connected()) {
    return;
  }

  if (!this->sensor_->has_state()) {
    return;
  }

  float value = this->sensor_->state;
  
  // Create state message
  DynamicJsonDocument doc(512);
  doc["timestamp"] = millis() / 1000;
  doc["device_id"] = global_nats_client->device_id_;
  
  JsonObject state = doc.createNestedObject("state");
  state[this->subject_suffix_] = value;
  
  if (!this->get_unit_of_measurement().empty()) {
    state["unit"] = this->get_unit_of_measurement();
  }

  // Add attributes
  JsonObject attributes = doc.createNestedObject("attributes");
  attributes["accuracy_decimals"] = this->get_accuracy_decimals();
  
  if (!this->get_device_class().empty()) {
    attributes["device_class"] = this->get_device_class();
  }
  
  if (!this->get_state_class().empty()) {
    attributes["state_class"] = this->get_state_class();
  }

  if (this->expire_after_ > 0) {
    attributes["expire_after"] = this->expire_after_;
  }

  // Publish to state subject
  std::string subject = global_nats_client->get_subject("state");
  global_nats_client->publish_json(subject, doc);
  
  ESP_LOGD(TAG, "Published %s: %.2f %s", this->subject_suffix_.c_str(), value, this->get_unit_of_measurement().c_str());
}

}  // namespace nats
}  // namespace esphome