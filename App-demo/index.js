// bluetooth.controller.js
const express = require('express');
const BluetoothService = require('./bluetooth.service');

const app = express();
const bluetoothService = new BluetoothService();

app.use(express.json());

app.get('/bluetooth/scan', async (req, res) => {
    try {

        console.log('Bluetooth Capability:', bluetoothService.checkBluetoothCapability());
        let response = await bluetoothService.scanForDevices(5); // Scanning for 5 seconds

        res.json({ devices: response });
    } catch (error) {
        console.log(error, 'hello');
        res.status(500).json({ error: error });
    }
});

app.get('/bluetooth/connect', async (req, res) => {
    const peripheralId = req.query.deviceID;
    console.log('Bluetooth Capability:', bluetoothService.checkBluetoothCapability());
    try {
        let name = await bluetoothService.scanForDevices(5, peripheralId, 'connect'); // Scanning for 5 seconds
        res.json({ message: `Connection successful to:${name}`, peripheralId });

    } catch (error) {
        console.log(req.query, 'det', error);
        res.status(500).json({ error: error });
    }
});

app.get('/bluetooth/readCharacteristic/:peripheralId', async (req, res) => {
    const { peripheralId, } = req.params;
    try {
        const response = await bluetoothService.scanForDevices(5, peripheralId, 'read');
        res.json({ data: response });
    } catch (error) {
        res.status(500).json({ error: error });
    }
});

app.post('/bluetooth/writeCharacteristic/:peripheralId', async (req, res) => {
    const { peripheralId } = req.params;
    const { data } = req.body;

    try {
        const peripheral = await bluetoothService.scanForDevices(5, peripheralId, 'write');
        const bufferData = Buffer.from(data, 'hex'); // Assuming data is provided in hex format
        await bluetoothService.writeCharacteristic(peripheral, bufferData);
        res.json({ message: 'Write operation successful' });
    } catch (error) {
        res.status(500).json({ error: error });
    }
});

app.get('/bluetooth/subscribeCharacteristic/:peripheralId', async (req, res) => {
    const { peripheralId, } = req.params;

    try {
        const peripheral = await bluetoothService.scanForDevices(5, peripheralId, 'subscribe');
        res.json({ message: peripheral });
    } catch (error) {
        res.status(500).json({ error: error });
    }
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


