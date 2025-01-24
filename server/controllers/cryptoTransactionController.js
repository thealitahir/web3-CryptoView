require('dotenv').config();
const axios = require('axios');
const CryptoTransactionSchema = require("../models/cryptoTransactions");

const fetchTransactions = async (req, res) => {
    const { address, startDate, endDate } = req.body;

    try {
        // Validate Ethereum address
        if (!address) {
            return res.status(400).json({ error: 'Invalid Ethereum address' });
        }

        // Convert dates to UNIX timestamps for Etherscan
        let startTimestamp = 0;
        let endTimestamp = Math.floor(Date.now() / 1000);

        if (startDate) {
            const startDateTime = new Date(startDate);
            if (isNaN(startDateTime.getTime())) {
                return res.status(400).json({ error: 'Invalid start date format' });
            }
            startTimestamp = Math.floor(startDateTime.getTime() / 1000);
        }

        if (endDate) {
            const endDateTime = new Date(endDate);
            if (isNaN(endDateTime.getTime())) {
                return res.status(400).json({ error: 'Invalid end date format' });
            }
            endTimestamp = Math.floor(endDateTime.getTime() / 1000);
        }

        // Fetch transactions from Etherscan
        const response = await axios.get(process.env.ETHERSCAN_API_URL, {
            params: {
                module: 'account',
                action: 'txlist',
                address: address,
                startblock: 0,
                endblock: 99999999,
                page: 1,
                offset: 5,
                sort: 'desc',
                apikey: process.env.ETHERSCAN_API_KEY,
                starttime: startTimestamp,
                endtime: endTimestamp
            }
        });

        if (response.data.status !== '1') {
            throw new Error(response.data.message || 'Failed to fetch transactions');
        }

        // Process and store transactions
        const transactions = response.data.result.map(tx => ({
            address: address.toLowerCase(),
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: tx.value,
            timestamp: new Date(tx.timeStamp * 1000),
            blockNumber: parseInt(tx.blockNumber)
        }));

        // Store in MongoDB using insertMany
        await CryptoTransactionSchema.insertMany(transactions, { ordered: false });

        res.json({
            message: 'Transactions retrieved and stored successfully',
            data: {
                address,
                dateRange: {
                    start: startDate || 'not specified',
                    end: endDate || 'not specified'
                },
                transactionCount: transactions.length,
                transactions
            }
        });

    } catch (error) {
        console.error('Transaction Fetch Error:', error);
        res.status(500).json({
            error: 'Failed to retrieve transactions',
            message: error.message
        });
    }
}

module.exports = { fetchTransactions };