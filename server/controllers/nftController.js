require('dotenv').config();
const { Web3, HttpProvider } = require('web3');
const axios = require('axios');
const Joi = require('joi');

const NFTSchema = require("../models/nftModel");

const web3 = new Web3(new HttpProvider(process.env.INFURA_URL));

const minimalNFTABI = [
    {
        "inputs": [{"name": "tokenId", "type": "uint256"}],
        "name": "tokenURI",
        "outputs": [{"name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
    }
];

const validateInput = (data) => {
    const schema = Joi.object({
        contractAddress: Joi.string().required().regex(/^0x[a-fA-F0-9]{40}$/).message('Invalid Ethereum address'),
        tokenId: Joi.string().required().regex(/^\d+$/).message('Invalid Token ID')
    });
    return schema.validate(data);
};

const resolveIPFS = (url) => {
    if (url.startsWith('ipfs://')) {
        const ipfsHash = url.replace('ipfs://', '');
        return `${process.env.IPFS_GATEWAY}${ipfsHash}`;
    }
    return url;
};

const fetchMetadata = async (req, res) => {
    const { contractAddress, tokenId } = req.body;

    if (!contractAddress || !tokenId) {
        return res.status(400).json({ error: 'contractAddress and tokenId are required' });
    }

    // Validate input
    const { error } = validateInput({ contractAddress, tokenId });
    if (error) return res.status(400).json({ error: error.message });

    try {
        // Connect to the NFT smart contract
        const contract = new web3.eth.Contract(minimalNFTABI, contractAddress);

         // Check if metadata already exists and is recent
         const existingMetadata = await NFTSchema.findOne({
            contractAddress,
            tokenId,
        });

        if (existingMetadata) {
            return res.json({message: 'Metadata retrieved and stored successfully', existingMetadata});
        }

        // Call tokenURI function
        const tokenURI = await contract.methods.tokenURI(tokenId).call();

        const resolvedURI = resolveIPFS(tokenURI);

        // Fetch metadata from the tokenURI using Axios
        const response = await axios.get(resolvedURI);
        const metadata = response.data
        metadata.image = resolveIPFS(metadata.image);
        
        const { name, description, image } = metadata;

        if (response.status !== 200) {
            throw new Error(`Failed to fetch metadata. Status code: ${response.status}`);
        }

        //Store metadata in MongoDB
        const nft = new NFTSchema({ contractAddress, tokenId, name, description, image });
        await nft.save();

        res.json({ message: 'Metadata retrieved and stored successfully', metadata });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: `Failed to retrieve NFT metadata: ${err.message}` });
    }
}


module.exports = { fetchMetadata };