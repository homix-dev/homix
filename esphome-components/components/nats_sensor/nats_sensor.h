#pragma once

#include "esphome/core/component.h"
#include "esphome/components/sensor/sensor.h"
#include "../nats_client/nats_client.h"

namespace esphome {
namespace nats {

class NATSSensor : public sensor::Sensor, public Component {
 public:
  void setup() override;
  void dump_config() override;
  void loop() override;
  float get_setup_priority() const override { return setup_priority::DATA; }

  void set_sensor(sensor::Sensor *sensor) { this->sensor_ = sensor; }
  void set_subject_suffix(const std::string &suffix) { this->subject_suffix_ = suffix; }
  void set_publish_interval(uint32_t interval) { this->publish_interval_ = interval; }
  void set_force_update(bool force) { this->force_update_ = force; }
  void set_expire_after(uint32_t expire_after) { this->expire_after_ = expire_after; }

 protected:
  void publish_state_();

  sensor::Sensor *sensor_{nullptr};
  std::string subject_suffix_;
  uint32_t publish_interval_{60000};  // 60 seconds
  uint32_t last_publish_{0};
  float last_value_{NAN};
  bool force_update_{false};
  uint32_t expire_after_{0};
};

}  // namespace nats
}  // namespace esphome