import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import switch
from esphome.const import (
    CONF_ID,
    CONF_NAME,
    CONF_ICON,
    CONF_ENTITY_CATEGORY,
    CONF_DEVICE_CLASS,
    CONF_RESTORE_MODE,
)
from esphome import pins
from ..nats_client import nats_ns, NATSClient

DEPENDENCIES = ["nats_client"]

CONF_SUBJECT_SUFFIX = "subject_suffix"
CONF_GPIO_PIN = "gpio_pin"
CONF_OPTIMISTIC = "optimistic"
CONF_ASSUMED_STATE = "assumed_state"

NATSSwitch = nats_ns.class_("NATSSwitch", switch.Switch, cg.Component)

CONFIG_SCHEMA = (
    switch.switch_schema(
        NATSSwitch,
        icon="mdi:toggle-switch",
    )
    .extend(
        {
            cv.Optional(CONF_SUBJECT_SUFFIX): cv.string,
            cv.Optional(CONF_GPIO_PIN): pins.gpio_output_pin_schema,
            cv.Optional(CONF_OPTIMISTIC, default=False): cv.boolean,
            cv.Optional(CONF_ASSUMED_STATE, default=False): cv.boolean,
            cv.Optional(CONF_RESTORE_MODE, default="RESTORE_DEFAULT_OFF"): cv.enum(
                switch.RESTORE_MODES, upper=True
            ),
        }
    )
    .extend(cv.COMPONENT_SCHEMA)
)


async def to_code(config):
    var = cg.new_Pvariable(config[CONF_ID])
    await cg.register_component(var, config)
    await switch.register_switch(var, config)

    # Set subject suffix (default to switch name)
    if CONF_SUBJECT_SUFFIX in config:
        cg.add(var.set_subject_suffix(config[CONF_SUBJECT_SUFFIX]))
    else:
        # Use sanitized name as suffix
        suffix = config[CONF_NAME].lower().replace(" ", "_")
        cg.add(var.set_subject_suffix(suffix))

    # Configure GPIO if specified
    if CONF_GPIO_PIN in config:
        pin = await cg.gpio_pin_expression(config[CONF_GPIO_PIN])
        cg.add(var.set_gpio_pin(pin))

    cg.add(var.set_optimistic(config[CONF_OPTIMISTIC]))
    cg.add(var.set_assumed_state(config[CONF_ASSUMED_STATE]))

    # Handle restore mode
    cg.add(var.set_restore_mode(config[CONF_RESTORE_MODE]))