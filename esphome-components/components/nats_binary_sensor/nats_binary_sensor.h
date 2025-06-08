#pragma once

#include "esphome/core/component.h"
#include "esphome/components/binary_sensor/binary_sensor.h"
#include "../nats_client/nats_client.h"

namespace esphome {
namespace nats {

class NATSBinarySensor : public binary_sensor::BinarySensor, public Component {
 public:
  void setup() override;
  void dump_config() override;
  void loop() override;
  float get_setup_priority() const override { return setup_priority::DATA; }

  void set_sensor(binary_sensor::BinarySensor *sensor) { this->sensor_ = sensor; }
  void set_subject_suffix(const std::string &suffix) { this->subject_suffix_ = suffix; }
  void set_publish_initial_state(bool publish) { this->publish_initial_state_ = publish; }

 protected:
  void publish_state_();

  binary_sensor::BinarySensor *sensor_{nullptr};
  std::string subject_suffix_;
  bool publish_initial_state_{true};
  uint32_t last_publish_{0};
  uint32_t publish_interval_{1000};  // 1 second
  bool last_state_{false};
  bool has_published_initial_{false};
};

}  // namespace nats
}  // namespace esphome