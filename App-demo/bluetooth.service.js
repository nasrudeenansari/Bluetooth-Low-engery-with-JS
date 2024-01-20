// bluetooth.service.js
const { EventEmitter } = require('events');
const noble = require('@abandonware/noble');
const discoveredDevices = [];

class BluetoothService extends EventEmitter {
    constructor() {
        super();
        this.isBluetoothEnabled = false;
        this.initBluetooth();
        this.targetPeripheralUUID = '';
        this.actionType = 'search';
        this.readResponse = '';
        this.writeResponse = '';
        this.subscribeResponse = '';
        this.isConnected = '',
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


        noble.on('discover', async (peripheral) => {
            try {
                const { _peripherals: _peripherals, uuid: peripheralUUID, address, advertisement } = peripheral;
                // Collect basic information
                const deviceInfo = {
                    name: peripheral.advertisement.localName || 'Unknown',
                    address: peripheral.address, // MAC address
                    data: peripheral.advertisement.manufacturerData,
                };

                if (this.actionType == 'read' && peripheral.state == 'connected' && peripheral.id == this.targetPeripheralUUID) {
                    // Discover services
                    const { serviceUUID, characteristicUUID } = await this.discoverServiceAndCharacteristic(peripheral);

                    if (!serviceUUID || !characteristicUUID) {
                        this.readResponse == 'Faild to read';
                        return null
                    }

                    this.readResponse = await this.readCharacteristic(peripheral, serviceUUID, characteristicUUID)
                    return null

                } else if (this.actionType == 'write' && peripheral.state == 'connected' && peripheral.id == this.targetPeripheralUUID) {
                    // Discover services
                    const { serviceUUID, characteristicUUID } = await this.discoverServiceAndCharacteristic(peripheral);

                    if (!serviceUUID || !characteristicUUID) {
                        this.writeResponse == 'Faild to write';
                        return null
                    }

                    this.writeResponse = await this.writeCharacteristic(peripheral, serviceUUID, characteristicUUID);
                    return null

                } else if (this.actionType == 'subscribe' && peripheral.state == 'connected' && peripheral.id == this.targetPeripheralUUID) {
                    // Discover services
                    const { serviceUUID, characteristicUUID } = await this.discoverServiceAndCharacteristic(peripheral);

                    if (!serviceUUID || !characteristicUUID) {
                        this.subscribeResponse = 'Faild to subscribe';
                        return null
                    }

                    let res = await this.subscribeToCharacteristic(peripheral, serviceUUID, characteristicUUID)
                    this.subscribeResponse = res;
                    return null
                }

                if (this.targetPeripheralUUID == peripheral.uuid) {
                    if (peripheral.state === 'connected') {
                        peripheral.disconnect(() => { })
                        // return null if dont want to call again No need to connect again if already connected

                    }

                    // Attempt to connect to the target device
                    peripheral.connect((error) => {
                        this.isConnected = '';
                        if (error) {
                            console.error('Connection error:', error);
                        } else {
                            this.isConnected = peripheral.advertisement.localName || 'Unknown';
                            console.log('Connected to the target device11:', peripheral);
                            // Now you can perform operations with the connected device
                            // (e.g., read/write characteristics, subscribe to notifications)

                        }
                    });
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
    // Example function for dynamic discovery of service and characteristic
    async discoverServiceAndCharacteristic(peripheral) {
        return new Promise((resolve, reject) => {
            peripheral.discoverServices([], (error, services) => {
                if (error) {
                    console.error('Error discovering services:', error);
                    resolve(error);
                }

                // Iterate through discovered services
                for (const service of services) {
                    console.log('Service UUID:', service.uuid);

                    // Discover characteristics for each service
                    service.discoverCharacteristics([], (error, characteristics) => {
                        if (error) {
                            console.error('Error discovering characteristics:', error);
                            reject(error);

                        }

                        // Iterate through discovered characteristics
                        for (const characteristic of characteristics) {
                            console.log('Characteristic UUID:', characteristic.uuid);
                        }
                    });
                }

                // Assuming the first service and characteristic are used for demonstration purposes
                if (services.length > 0) {
                    const service = services[0];

                    if (service.characteristics && service.characteristics.length > 0) {
                        const characteristic = service.characteristics[0];

                        // Return the discovered service and characteristic UUIDs
                        resolve({
                            serviceUUID: service.uuid,
                            characteristicUUID: characteristic.uuid
                        });
                    } else {
                        resolve('No characteristics found in the selected service');
                    }
                } else {
                    resolve('No services found');
                }
            });
        });
    }


    scanForDevices(durationInSeconds, targetPeripheralUUID, type) {
        return new Promise((resolve, reject) => {
            if (!!targetPeripheralUUID) {
                this.targetPeripheralUUID = targetPeripheralUUID
                this.actionType = type;
            }


            noble.startScanning([], true, (error) => {
                if (error) {
                    reject('Bluetooth Scan Failed');
                }

                setTimeout(() => {
                    noble.stopScanning();

                    if (this.actionType == 'connect') {
                        if (!!this.targetPeripheralUUID) {
                            if (!!this.isConnected) {
                                resolve(this.isConnected);
                            } else {
                                reject('Not connected')
                            }
                        }
                    } else if (this.actionType == 'read') {
                        if (!!this.targetPeripheralUUID) {
                            resolve(this.readResponse)
                        }

                    } else if (this.actionType == 'write') {
                        if (!!this.targetPeripheralUUID) {
                            resolve(this.writeResponse)
                        }
                    }
                    else if (this.actionType == 'subscribe') {
                        console.log(this.subscribeResponse, 'this.actionType');
                        if (!!this.targetPeripheralUUID) {
                            resolve(this.subscribeResponse)
                        }
                    }
                    else {
                        resolve(discoveredDevices);
                    }
                }, durationInSeconds * 1000);
            });
        });
    }


    readCharacteristic(peripheral, serviceUUID, characteristicUUID) {
        return new Promise((resolve, reject) => {
            // Find the service with the specified UUID
            const service = peripheral.services.find((s) => s.uuid === serviceUUID);

            if (!service) {
                return resolve('Service not found');
            }

            // Find the characteristic with the specified UUID
            const characteristic = service.characteristics.find((c) => c.uuid === characteristicUUID);

            if (!characteristic) {
                return resolve('Characteristic not found');
            }

            // Read the characteristic
            characteristic.read((error, data) => {
                if (error) {
                    reject('Read Characteristic Failed');
                } else {
                    return resolve(data);
                }
            });
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
                        return resolve('Subscribe to Characteristic Failed');
                    }
                });

                characteristic.on('data', (data) => {
                    return resolve(data);
                });
            } else {
                return resolve('Characteristic not found');
            }
        });
    }
}

module.exports = BluetoothService;
