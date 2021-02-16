'use strict';

const crypto = require('crypto');
const iotHubTransport = require('azure-iot-device-mqtt').Mqtt;
const Client = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;
const ProvisioningTransport = require('azure-iot-provisioning-device-mqtt').Mqtt;
const SymmetricKeySecurityClient = require('azure-iot-security-symmetric-key').SymmetricKeySecurityClient;
const ProvisioningDeviceClient = require('azure-iot-provisioning-device').ProvisioningDeviceClient;

const chance = new require('chance')();

//
// For the public clouds the address of the provisioning host is global.azure-devices-provisioning.net, this will be different in private and soverign clouds
//
const provisioningHost = "global.azure-devices-provisioning.net";

// These values need to be filled in from your Azure IoT Central application
//
const scopeId = "<IoT Central Scope Id value>";
const groupSasKey = "<IoT Central Group SAS key>";
//
/////////////////////////////////////////////////////////////////////////////

const deviceId = "computeDevice";
const modelId = "dtmi:computeModel:compute;1";


// calculate the device key from the deviceId and group SAS key
function getDeviceKey(deviceId, groupSasKey) {
  return crypto.createHmac('SHA256', Buffer.from(groupSasKey, 'base64'))
      .update(deviceId)
      .digest()
      .toString('base64');
} 

const deviceKey = getDeviceKey(deviceId, groupSasKey);
const provisioningSecurityClient = new SymmetricKeySecurityClient(deviceId, deviceKey);
const provisioningClient = ProvisioningDeviceClient.create(provisioningHost, scopeId, new ProvisioningTransport(), provisioningSecurityClient);
provisioningClient.setProvisioningPayload(`{ "iotcModelId": "${modelId}" }`);

// Register the device
provisioningClient.register(function(err, result) {
  if (err) {
    console.log("error registering device: " + err);
  } else {
    console.log('registration succeeded');
    console.log('assigned hub=' + result.assignedHub);
    console.log('deviceId=' + result.deviceId);
    var connectionString = 'HostName=' + result.assignedHub + ';DeviceId=' + result.deviceId + ';SharedAccessKey=' + deviceKey;
    var hubClient = Client.fromConnectionString(connectionString, iotHubTransport);

    hubClient.open(function(err) {
      if (err) {
        console.error('Could not connect: ' + err.message);
      } else {
        console.log('Client connected');

        let telemetryInterval = setInterval(() => {
          // send in the CSV data to IoT Central application
          var message = new Message(`{"data":"${chance.floating({min: -20, max: 50, fixed: 2})}, ${chance.floating({min: 0, max: 100, fixed: 2})}, ${chance.latitude({fixed: 4})}, ${chance.longitude({fixed: 4})}"}`);
          hubClient.sendEvent(message, function(err, res) {
            if (err) console.log('send error: ' + err.toString());
            if (res) console.log('send status: ' + res.constructor.name + ' [' + message.data + ']');
          });
        }, 5000);
      }
    });
  }
});