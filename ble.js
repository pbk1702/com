// Deobfuscated BLE 2.4

'use strict';
class Ble {
  constructor(serviceUuid = 0xFFF0, characteristicUuid = 0xFFF4) {
    this._device = null;
    this._characteristic = null;
    this._boundHandleDisconnection = this._handleDisconnection.bind(this);
    this._boundHandleCharacteristicValueChanged = this._handleCharacteristicValueChanged.bind(this);
    this.setServiceUuid(serviceUuid);
    this.setCharacteristicUuid(characteristicUuid);
    this.n_chr = 0;
  }
  setServiceUuid(uuid) 
  {
    if (!Number.isInteger(uuid) && !(typeof uuid === "string" || uuid instanceof String)) {
      throw new Error("UUID type is neither a number nor a string");
    }
    if (!uuid) {
      throw new Error("UUID cannot be a null");
    }
    this._serviceUuid = uuid;
  }
  setCharacteristicUuid(uuid) {
    if (!Number.isInteger(uuid) && !(typeof uuid === "string" || uuid instanceof String)) {
      throw new Error("UUID type is neither a number nor a string");
    }
    if (!uuid) {
      throw new Error("UUID cannot be a null");
    }
    this._characteristicUuid = uuid;
  }
  connect() {
    return this._connectToDevice(this._device);
  }
  disconnect() {
    this._disconnectFromDevice(this._device);
    if (this._characteristic) {
      this._characteristic.removeEventListener("characteristicvaluechanged", this._boundHandleCharacteristicValueChanged);
      this._characteristic = null;
    }
    this._device = null;
  }
  getDeviceName() {
    if (!this._device) {
      return "";
    }
    return this._device.name;
  }
  _connectToDevice(device) {
    return (device ? Promise.resolve(device) : this._requestBluetoothDevice()).then((device) => {
      return this._connectDeviceAndCacheCharacteristic(device);
    }).then((device) => {
      return this._startNotifications(device);
    }).catch((device) => {
      console.log(device);
      return Promise.reject(device);
    });
  }
  _disconnectFromDevice(device) {
    if (!device) {
      return;
    }
    console.log("Disconnecting from \"" + device.name + "\" bluetooth device...");
    device.removeEventListener("gattserverdisconnected", this._boundHandleDisconnection);
    if (!device.gatt.connected) {
      console.log('"' + device.name + "\" bluetooth device is already disconnected");
      return;
    }
    device.gatt.disconnect();
    console.log('"' + device.name + "\" bluetooth device disconnected");
  }
  _requestBluetoothDevice() {
    console.log("Requesting bluetooth device...");    
    const options = {
      filters : [ { namePrefix: 'Theta-Meter'} ],
      acceptAllDevices : false,
      optionalServices : [65520]
    }    
    const requestDevicePromise = navigator.bluetooth.requestDevice(options).then((device) => {
      console.log('"' + device.name + "\" bluetooth device selected");
      this._device = device;
      this._device.addEventListener("gattserverdisconnected", this._boundHandleDisconnection);
      return this._device;
    });
    return requestDevicePromise
  }
  _connectDeviceAndCacheCharacteristic(device) {
    if (device.gatt.connected && this._characteristic) {
      return Promise.resolve(this._characteristic);
    }
    console.log("Connecting to GATT server...");
    return device.gatt.connect().then((device) => {
      console.log("GATT server connected", "Getting service...");
      return device.getPrimaryService(this._serviceUuid);
    }).then((device) => {
      console.log("Service found", "Getting characteristic...");
      this.n_chr = 0;
      device.getCharacteristics().then((device) => {
        device.forEach((device) => {
          console.log("Characteristic: " + device.uuid);
          this.n_chr++;
        });
      });
      return device.getCharacteristic(this._characteristicUuid);
    }).then((device) => {
      console.log("Characteristic found");
      this._characteristic = device;
      return this._characteristic;
    });
  }
  _startNotifications(device) {
    console.log("Starting notifications...");
    return device.startNotifications().then(() => {
      console.log("Notifications started");
      device.addEventListener("characteristicvaluechanged", this._boundHandleCharacteristicValueChanged);
    });
  }
  _stopNotifications(device) {
    console.log("Stopping notifications...");
    return device.stopNotifications().then(() => {
      console.log("Notifications stopped");
      device.removeEventListener("characteristicvaluechanged", this._boundHandleCharacteristicValueChanged);
    });
  }
  _handleDisconnection(device) {
    let serviceUuid = device.target;
    console.log('"' + serviceUuid.name + "\" bluetooth device disconnected, trying to reconnect...");
    this._connectDeviceAndCacheCharacteristic(serviceUuid).then((device) => {
      return this._startNotifications(device);
    }).catch((device) => {
      return console.log(device);
    });
  }
  _handleCharacteristicValueChanged(event) {
    function u2r(input) {
      const R0   = 82680  // ohms
      const vMin = 0.0    // volts
      const vMax = 3.205; // volts
      const vDif = vMax - vMin;
      return (input < vDif) ? (input * R0) / (vDif - input) : 999999.9
    }
    const buf = new Uint8Array(event.target.value.buffer);
    const adc = buf[3] + buf[2] * 0x100 + buf[1] * 0x10000;    
    const data = ((this.n_chr >= 5) ? adc * 3.30 / 0x1000000 : (0x800000 - adc) * 3.30 / 0x800000)
    const o = {}
    o.timeStamp = event.timeStamp
    o.url  = 'ble'
    o.data = u2r(data)
    ServerHandler(o);
  }
}
if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
  module.exports = Ble;
}
;