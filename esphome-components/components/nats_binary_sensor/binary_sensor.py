import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import binary_sensor
from esphome.const import (
    CONF_ID,
    CONF_NAME,
    CONF_DEVICE_CLASS,
    CONF_ENTITY_CATEGORY,
    CONF_ICON,
)
from ..nats_client import nats_ns, NATSClient

DEPENDENCIES = ["nats_client"]

CONF_SUBJECT_SUFFIX = "subject_suffix"
CONF_SENSOR_ID = "sensor_id"
CONF_PUBLISH_INITIAL_STATE = "publish_initial_state"

NATSBinarySensor = nats_ns.class_("NATSBinarySensor", binary_sensor.BinarySensor, cg.Component)

CONFIG_SCHEMA = (
    binary_sensor.binary_sensor_schema(
        NATSBinarySensor,
    )
    .extend(
        {
            cv.Optional(CONF_SUBJECT_SUFFIX): cv.string,
            cv.Required(CONF_SENSOR_ID): cv.use_id(binary_sensor.BinarySensor),
            cv.Optional(CONF_PUBLISH_INITIAL_STATE, default=True): cv.boolean,
        }
    )
    .extend(cv.COMPONENT_SCHEMA)
)


async def to_code(config):
    var = cg.new_Pvariable(config[CONF_ID])
    await cg.register_component(var, config)
    await binary_sensor.register_binary_sensor(var, config)

    # Get the sensor to monitor
    sens = await cg.get_variable(config[CONF_SENSOR_ID])
    cg.add(var.set_sensor(sens))

    # Set subject suffix (default to sensor name)
    if CONF_SUBJECT_SUFFIX in config:
        cg.add(var.set_subject_suffix(config[CONF_SUBJECT_SUFFIX]))
    else:
        # Use sanitized name as suffix
        suffix = config[CONF_NAME].lower().replace(" ", "_")
        cg.add(var.set_subject_suffix(suffix))

    cg.add(var.set_publish_initial_state(config[CONF_PUBLISH_INITIAL_STATE]))