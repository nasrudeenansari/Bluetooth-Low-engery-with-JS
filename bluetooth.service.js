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

                // console.log(peripheral, '');
                if (this.actionType == 'read' && peripheral.state === 'connected') {
                    // Discover services
                    this.readResponse = await this.readCharacteristic(peripheral)
                    return null
                } else if (this.actionType == 'write' && peripheral.state === 'connected') {
                    this.writeResponse = await this.writeCharacteristic(peripheral)
                    return null
                } else if (this.actionType == 'subscribe' && peripheral.state === 'connected') {
                    this.subscribeResponse = await this.subscribeToCharacteristic(peripheral)
                    return null
                }

                if (this.targetPeripheralUUID == peripheral.uuid) {
                    if (peripheral.state === 'connected') {
                        peripheral.disconnect(() => { })
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

    connectToDevice(error) {
        return new Promise((resolve, reject) => {
            if (!!error) {
                console.error('Connection error:', error);
                reject(`'Connection error:' ${error}`)
            } else {
                console.log('Connected to the target device:');
                resolve('')
                // Now you can perform operations with the connected device
                // (e.g., read/write characteristics, subscribe to notifications)
            }

        })
    }

    readCharacteristic(peripheral, serviceUUID, characteristicUUID) {
        return new Promise((resolve,) => {
            peripheral.discoverServices([], (error, services) => {
                if (error) {
                    console.error('Error discovering services:', error);
                    return;
                }

                // Loop through discovered services
                services.forEach(service => {
                    console.log('Service UUID:', service.uuid);

                    // Discover characteristics for each service
                    service.discoverCharacteristics([], (error, characteristics) => {
                        if (error) {
                            console.error('Error discovering characteristics:', error);
                            return;
                        }

                        // Loop through discovered characteristics
                        characteristics.forEach(characteristic => {
                            console.log('Characteristic UUID:', characteristic.uuid);
                        });
                    });
                });
            });

            // Check if services property exists and is not null
            if (peripheral.services && Array.isArray(peripheral.services)) {
                // Find the service with the specified UUID
                const service = peripheral.services.find((s) => s.uuid === serviceUUID);


                if (service) {
                    // Check if characteristics property exists and is not null
                    if (service.characteristics && Array.isArray(service.characteristics)) {
                        // Find the characteristic with the specified UUID
                        const characteristic = service.characteristics.find((c) => c.uuid === characteristicUUID);
                        if (characteristic) {
                            // Read the characteristic
                            characteristic.read((error, data) => {
                                if (error) {
                                    resolve('Read Characteristic Failed');
                                } else {
                                    resolve(data);
                                }
                            });
                        } else {
                            resolve('Characteristic not found');
                        }
                    } else {
                        resolve('Service characteristics not available');
                    }
                } else {
                    resolve('Service not found');
                }
            } else {
                resolve('Services not available');
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
