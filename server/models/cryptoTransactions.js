const mongoose = require("mongoose");
const { Schema } = mongoose;


const CryptoTransactionSchema = new Schema({
    address: {
        type: String,
        required: true,
        lowercase: true
    },
    hash: {
        type: String,
        required: true
    },
    from: String,
    to: String,
    value: String,
    timestamp: Date,
    blockNumber: Number
}, { timestamps: true });

CryptoTransactionSchema.index({ address: 1, timestamp: 1 });

module.exports = mongoose.model("CryptoTransaction", CryptoTransactionSchema);