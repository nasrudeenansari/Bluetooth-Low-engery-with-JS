// bluetooth.service.js
const { EventEmitter } = require('events');
const noble = require('@abandonware/noble');
const discoveredDevices = [];

// noble.on('stateChange', (state) => {
//     this.isBluetoothEnabled = state === 'poweredOn';
// });

// noble.on('warning', (message) => {
//     console.warn('Bluetooth Warning:', message);
// });

// noble.on('error', (error) => {
//     console.error('Bluetooth Error:', error);
// });

class BluetoothService extends EventEmitter {
    constructor() {
        super();
        this.isBluetoothEnabled = false;
        this.initBluetooth();
        this.deviceId = '';
        noble.on('stateChange', (state) => {
            this.isBluetoothEnabled = state === 'poweredOn';
        });
    }


    initBluetooth() {
        noble.on('stateChange', (state) => {
            this.isBluetoothEnabled = state === 'poweredOn';
        });

        noble.on('warning', (message) => {
            console.warn('Bluetooth Warning:', message);
        });

        noble.on('error', (error) => {
            console.error('Bluetooth Error:', error);
        });


        noble.on('discover', (peripheral) => {
            try {
                // Collect basic information
                const deviceInfo = {
                    name: peripheral.advertisement.localName || 'Unknown',
                    address: peripheral.address, // MAC address
                    data: peripheral.advertisement.manufacturerData,
                };


                if (this.deviceId == peripheral.address) {
                    console.log(`${deviceInfo.address} (${deviceInfo.name}): ${deviceInfo.data}`, 'new');
                    peripheral.once('connect', this.connectToDevice);
                }


                // Collect devices in an array
                let find = discoveredDevices.findIndex(device => device.address == deviceInfo.address);

                if (find == -1) {
                    discoveredDevices.push(deviceInfo);
                }

            } catch (error) {
                console.error(`${peripheral.address}: Error - ${error}`);
            }
        });

    }

    checkBluetoothCapability() {
        return this.isBluetoothEnabled;
    }


    scanForDevices(durationInSeconds, deviceId) {
        return new Promise((resolve, reject) => {
            if (!!deviceId) {
                this.deviceId = deviceId
            }
            noble.startScanning([], true, (error) => {
                if (error) {
                    reject('Bluetooth Scan Failed');
                }

                setTimeout(() => {
                    noble.stopScanning();
                    resolve(discoveredDevices);
                }, durationInSeconds * 1000);
            });
        });
    }

    connectToDevice(res) {
        return new Promise((resolve, reject) => {
            resolve(res)
        })
    }

    readCharacteristic(peripheral, serviceUUID, characteristicUUID) {
        return new Promise((resolve, reject) => {
            const service = peripheral.services.find((s) => s.uuid === serviceUUID);
            const characteristic = service.characteristics.find((c) => c.uuid === characteristicUUID);

            if (characteristic) {
                characteristic.read((error, data) => {
                    if (error) {
                        reject('Read Characteristic Failed');
                    } else {
                        resolve(data);
                    }
                });
            } else {
                reject('Characteristic not found');
            }
        });
    }

    writeCharacteristic(peripheral, serviceUUID, characteristicUUID, data) {
        return new Promise((resolve, reject) => {
            const service = peripheral.services.find((s) => s.uuid === serviceUUID);
            const characteristic = service.characteristics.find((c) => c.uuid === characteristicUUID);

            if (characteristic) {
                characteristic.write(data, false, (error) => {
                    if (error) {
                        reject('Write Characteristic Failed');
                    } else {
                        resolve();
                    }
                });
            } else {
                reject('Characteristic not found');
            }
        });
    }

    subscribeToCharacteristic(peripheral, serviceUUID, characteristicUUID) {
        return new Promise((resolve, reject) => {
            const service = peripheral.services.find((s) => s.uuid === serviceUUID);
            const characteristic = service.characteristics.find((c) => c.uuid === characteristicUUID);

            if (characteristic) {
                characteristic.subscribe((error) => {
                    if (error) {
                        reject('Subscribe to Characteristic Failed');
                    }
                });

                characteristic.on('data', (data) => {
                    resolve(data);
                });
            } else {
                reject('Characteristic not found');
            }
        });
    }
}

module.exports = BluetoothService;
