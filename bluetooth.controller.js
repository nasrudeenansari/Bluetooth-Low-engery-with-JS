// bluetooth.controller.js
const express = require('express');
const BluetoothService = require('./bluetooth.service');

const app = express();
const bluetoothService = new BluetoothService();

app.use(express.json());

app.get('/bluetooth/scan', async (req, res) => {
    try {

        console.log('Bluetooth Capability:', bluetoothService.checkBluetoothCapability());
        let response = await bluetoothService.scanForDevices(10); // Scanning for 5 seconds

        res.json({ devices: response });
    } catch (error) {
        console.log(error, 'hello');
        res.status(500).json({ error: error });
    }
});

app.get('/bluetooth/connect', async (req, res) => {
    const deviceId = req.query.deviceID;
    console.log('Bluetooth Capability:', bluetoothService.checkBluetoothCapability());
    try {
        await bluetoothService.scanForDevices(5, deviceId); // Scanning for 5 seconds
        const peripheral = await bluetoothService.connectToDevice(deviceId);
        res.json({ message: 'Connection successful', peripheralId: peripheral });
    } catch (error) {

        console.log(req.query, 'det', error);
        res.status(500).json({ error: error });
    }
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


