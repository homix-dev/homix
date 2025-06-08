#pragma once

#include "esphome/core/component.h"
#include "esphome/components/switch/switch.h"
#include "esphome/core/gpio.h"
#include "../nats_client/nats_client.h"

namespace esphome {
namespace nats {

class NATSSwitch : public switch_::Switch, public Component {
 public:
  void setup() override;
  void dump_config() override;
  void loop() override;
  float get_setup_priority() const override { return setup_priority::DATA; }

  void set_subject_suffix(const std::string &suffix) { this->subject_suffix_ = suffix; }
  void set_gpio_pin(GPIOPin *pin) { this->pin_ = pin; }
  void set_optimistic(bool optimistic) { this->optimistic_ = optimistic; }
  void set_assumed_state(bool assumed_state) { this->assumed_state_ = assumed_state; }
  void set_restore_mode(switch_::SwitchRestoreMode restore_mode) { this->restore_mode_ = restore_mode; }

 protected:
  void write_state(bool state) override;
  void subscribe_to_commands_();
  void publish_state_();
  void handle_command_(const std::string &payload);

  std::string subject_suffix_;
  GPIOPin *pin_{nullptr};
  bool optimistic_{false};
  bool assumed_state_{false};
  switch_::SwitchRestoreMode restore_mode_{switch_::SWITCH_RESTORE_DEFAULT_OFF};
  
  uint32_t last_publish_{0};
  uint32_t publish_interval_{1000};  // 1 second
  bool subscribed_{false};
};

}  // namespace nats
}  // namespace esphome