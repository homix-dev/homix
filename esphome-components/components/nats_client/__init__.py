import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.const import (
    CONF_ID,
    CONF_PORT,
    CONF_USERNAME,
    CONF_PASSWORD,
)

CONF_SERVER = "server"
CONF_DEVICE_ID = "device_id"
CONF_DEVICE_NAME = "device_name"
CONF_DEVICE_TYPE = "device_type"
CONF_MANUFACTURER = "manufacturer"
CONF_MODEL = "model"
CONF_RECONNECT_INTERVAL = "reconnect_interval"
CONF_STATUS_INTERVAL = "status_interval"
CONF_DISCOVERY_PREFIX = "discovery_prefix"
CONF_USE_SSL = "use_ssl"

nats_ns = cg.esphome_ns.namespace("nats")
NATSClient = nats_ns.class_("NATSClient", cg.Component)

CONFIG_SCHEMA = cv.Schema(
    {
        cv.GenerateID(): cv.declare_id(NATSClient),
        cv.Required(CONF_SERVER): cv.string,
        cv.Optional(CONF_PORT, default=4222): cv.port,
        cv.Optional(CONF_USERNAME): cv.string,
        cv.Optional(CONF_PASSWORD): cv.string,
        cv.Required(CONF_DEVICE_ID): cv.string,
        cv.Required(CONF_DEVICE_NAME): cv.string,
        cv.Required(CONF_DEVICE_TYPE): cv.string,
        cv.Optional(CONF_MANUFACTURER, default="ESPHome"): cv.string,
        cv.Optional(CONF_MODEL, default="ESP32"): cv.string,
        cv.Optional(CONF_RECONNECT_INTERVAL, default="30s"): cv.positive_time_period_milliseconds,
        cv.Optional(CONF_STATUS_INTERVAL, default="60s"): cv.positive_time_period_milliseconds,
        cv.Optional(CONF_DISCOVERY_PREFIX, default="home"): cv.string,
        cv.Optional(CONF_USE_SSL, default=False): cv.boolean,
    }
).extend(cv.COMPONENT_SCHEMA)


async def to_code(config):
    var = cg.new_Pvariable(config[CONF_ID])
    await cg.register_component(var, config)

    cg.add(var.set_server(config[CONF_SERVER]))
    cg.add(var.set_port(config[CONF_PORT]))
    
    if CONF_USERNAME in config:
        cg.add(var.set_username(config[CONF_USERNAME]))
    if CONF_PASSWORD in config:
        cg.add(var.set_password(config[CONF_PASSWORD]))
    
    cg.add(var.set_device_id(config[CONF_DEVICE_ID]))
    cg.add(var.set_device_name(config[CONF_DEVICE_NAME]))
    cg.add(var.set_device_type(config[CONF_DEVICE_TYPE]))
    cg.add(var.set_manufacturer(config[CONF_MANUFACTURER]))
    cg.add(var.set_model(config[CONF_MODEL]))
    cg.add(var.set_reconnect_interval(config[CONF_RECONNECT_INTERVAL]))
    cg.add(var.set_status_interval(config[CONF_STATUS_INTERVAL]))
    cg.add(var.set_discovery_prefix(config[CONF_DISCOVERY_PREFIX]))
    cg.add(var.set_use_ssl(config[CONF_USE_SSL]))

    # Make the NATS client globally available
    cg.add_define("USE_NATS")
    cg.add_global(nats_ns.using)