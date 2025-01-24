const express = require("express");

const {
    fetchTransactions,
} = require("../controllers/cryptoTransactionController");
// const requireAuth = require("../middleware/requireAuth.js");

const router = express.Router();

// router.use(requireAuth);

router.post("/", fetchTransactions);

module.exports = router;	