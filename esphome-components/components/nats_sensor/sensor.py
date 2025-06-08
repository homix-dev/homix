import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import sensor
from esphome.const import (
    CONF_ID,
    CONF_SENSOR,
    CONF_NAME,
    CONF_UNIT_OF_MEASUREMENT,
    CONF_ICON,
    CONF_ACCURACY_DECIMALS,
    CONF_DEVICE_CLASS,
    CONF_STATE_CLASS,
    CONF_ENTITY_CATEGORY,
)
from ..nats_client import nats_ns, NATSClient

DEPENDENCIES = ["nats_client"]

CONF_SUBJECT_SUFFIX = "subject_suffix"
CONF_SENSOR_ID = "sensor_id"
CONF_PUBLISH_INTERVAL = "publish_interval"
CONF_FORCE_UPDATE = "force_update"
CONF_EXPIRE_AFTER = "expire_after"

NATSSensor = nats_ns.class_("NATSSensor", sensor.Sensor, cg.Component)

CONFIG_SCHEMA = (
    sensor.sensor_schema(
        NATSSensor,
        unit_of_measurement=cv.string_strict,
        accuracy_decimals=2,
    )
    .extend(
        {
            cv.Required(CONF_SENSOR_ID): cv.use_id(sensor.Sensor),
            cv.Optional(CONF_SUBJECT_SUFFIX): cv.string,
            cv.Optional(CONF_PUBLISH_INTERVAL, default="60s"): cv.positive_time_period_milliseconds,
            cv.Optional(CONF_FORCE_UPDATE, default=False): cv.boolean,
            cv.Optional(CONF_EXPIRE_AFTER): cv.positive_time_period_seconds,
        }
    )
    .extend(cv.COMPONENT_SCHEMA)
)


async def to_code(config):
    var = cg.new_Pvariable(config[CONF_ID])
    await cg.register_component(var, config)
    await sensor.register_sensor(var, config)

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

    cg.add(var.set_publish_interval(config[CONF_PUBLISH_INTERVAL]))
    cg.add(var.set_force_update(config[CONF_FORCE_UPDATE]))
    
    if CONF_EXPIRE_AFTER in config:
        cg.add(var.set_expire_after(config[CONF_EXPIRE_AFTER]))