#include "nats_binary_sensor.h"
#include "esphome/core/log.h"
#include <ArduinoJson.h>

namespace esphome {
namespace nats {

static const char *const TAG = "nats_binary_sensor";

void NATSBinarySensor::setup() {
  if (!this->sensor_) {
    ESP_LOGE(TAG, "Binary sensor not set!");
    this->mark_failed();
    return;
  }

  // Subscribe to sensor updates
  this->sensor_->add_on_state_callback([this](bool state) {
    this->publish_state(state);
    
    // Publish immediately on state change
    if (state != this->last_state_ || !this->has_published_initial_) {
      this->publish_state_();
      this->last_state_ = state;
      this->has_published_initial_ = true;
    }
  });

  // Publish initial state if configured and sensor has state
  if (this->publish_initial_state_ && this->sensor_->has_state()) {
    this->last_state_ = this->sensor_->state;
    this->publish_state_();
    this->has_published_initial_ = true;
  }
}

void NATSBinarySensor::dump_config() {
  ESP_LOGCONFIG(TAG, "NATS Binary Sensor:");
  ESP_LOGCONFIG(TAG, "  Subject suffix: %s", this->subject_suffix_.c_str());
  ESP_LOGCONFIG(TAG, "  Publish initial state: %s", YESNO(this->publish_initial_state_));
}

void NATSBinarySensor::loop() {
  if (!global_nats_client || !global_nats_client->is_connected()) {
    return;
  }

  // Publish state periodically to ensure it's not missed
  if (millis() - this->last_publish_ > this->publish_interval_) {
    if (this->sensor_->has_state()) {
      this->publish_state_();
    }
    this->last_publish_ = millis();
  }
}

void NATSBinarySensor::publish_state_() {
  if (!global_nats_client || !global_nats_client->is_connected()) {
    return;
  }

  if (!this->sensor_->has_state()) {
    return;
  }

  bool state = this->sensor_->state;
  
  // Create state message
  DynamicJsonDocument doc(512);
  doc["timestamp"] = millis() / 1000;
  doc["device_id"] = global_nats_client->device_id_;
  
  JsonObject state_obj = doc.createNestedObject("state");
  state_obj[this->subject_suffix_] = state;
  
  // Add attributes
  JsonObject attributes = doc.createNestedObject("attributes");
  
  if (!this->get_device_class().empty()) {
    attributes["device_class"] = this->get_device_class();
  }
  
  if (!this->get_icon().empty()) {
    attributes["icon"] = this->get_icon();
  }

  // Add any custom attributes based on device class
  if (this->get_device_class() == "motion") {
    attributes["last_motion"] = state ? (millis() / 1000) : 0;
  } else if (this->get_device_class() == "door" || this->get_device_class() == "window") {
    attributes["open"] = state;
  } else if (this->get_device_class() == "presence") {
    attributes["present"] = state;
  }

  // Publish to state subject
  std::string subject = global_nats_client->get_subject("state");
  global_nats_client->publish_json(subject, doc);
  
  // Also publish a simple event for state changes
  if (state != this->last_state_ && this->has_published_initial_) {
    DynamicJsonDocument event_doc(256);
    event_doc["timestamp"] = millis() / 1000;
    event_doc["device_id"] = global_nats_client->device_id_;
    event_doc["sensor"] = this->subject_suffix_;
    event_doc["state"] = state;
    event_doc["previous_state"] = this->last_state_;
    
    std::string event_subject = global_nats_client->get_subject("event." + this->subject_suffix_);
    global_nats_client->publish_json(event_subject, event_doc);
    
    ESP_LOGD(TAG, "Published %s event: %s -> %s", 
             this->subject_suffix_.c_str(), 
             ONOFF(this->last_state_), 
             ONOFF(state));
  }
  
  ESP_LOGD(TAG, "Published %s state: %s", this->subject_suffix_.c_str(), ONOFF(state));
}

}  // namespace nats
}  // namespace esphome