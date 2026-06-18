"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscrowContract = exports.getGiftContractId = exports.stellarClient = void 0;
const stellar_sdk_1 = require("@stellar/stellar-sdk");
const DEFAULT_HORIZON_URL = "https://horizon-testnet.stellar.org";
const DEFAULT_RPC_URL = "https://soroban-testnet.stellar.org";
const DEFAULT_TIMEOUT_SECONDS = 30;
const DEFAULT_POLL_ATTEMPTS = 10;
exports.stellarClient = new stellar_sdk_1.Horizon.Server(process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL || DEFAULT_HORIZON_URL);
const getGiftContractId = () => process.env.STELLAR_CONTRACT_ID ||
    process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID;
exports.getGiftContractId = getGiftContractId;
function fail(message) {
    throw new Error(message);
}
function isRecognizedTransactionHash(hash) {
    return /^[a-fA-F0-9]{64}$/.test(hash);
}
function sanitizeHex(input) {
    return input.startsWith("0x") ? input.slice(2) : input;
}
function validateSender(sender) {
    if (!sender) {
        fail("Sender is required");
    }
    if (!stellar_sdk_1.StrKey.isValidEd25519PublicKey(sender)) {
        fail("Sender must be a valid Stellar public key");
    }
    return sender;
}
function validateRecipientHash(recipientHash) {
    if (!recipientHash) {
        fail("Recipient hash is required");
    }
    const normalizedHash = sanitizeHex(recipientHash.trim());
    if (!/^[a-fA-F0-9]{64}$/.test(normalizedHash)) {
        fail("Recipient hash must be a 32-byte hex string");
    }
    return Buffer.from(normalizedHash, "hex");
}
function parseUnsignedInteger(value, fieldName) {
    if (typeof value === "number") {
        if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
            fail(`${fieldName} must be a non-negative integer`);
        }
        return value.toString();
    }
    const normalizedValue = value.trim();
    if (!/^\d+$/.test(normalizedValue)) {
        fail(`${fieldName} must be a non-negative integer`);
    }
    return normalizedValue.replace(/^0+(?=\d)/, "");
}
function validateAmount(amount) {
    const parsedAmount = parseUnsignedInteger(amount, "Amount");
    if (/^0+$/.test(parsedAmount)) {
        fail("Amount must be greater than zero");
    }
    return parsedAmount;
}
function validateLocktime(locktime) {
    if (locktime instanceof Date) {
        if (Number.isNaN(locktime.getTime())) {
            fail("Locktime must be a valid date or unix timestamp");
        }
        return Math.floor(locktime.getTime() / 1000).toString();
    }
    return parseUnsignedInteger(locktime, "Locktime");
}
function resolveRpcUrl() {
    const rpcUrl = process.env.STELLAR_SOROBAN_RPC_URL ||
        process.env.NEXT_PUBLIC_STELLAR_SOROBAN_RPC_URL ||
        process.env.STELLAR_RPC_URL ||
        process.env.NEXT_PUBLIC_STELLAR_RPC_URL ||
        DEFAULT_RPC_URL;
    try {
        const parsedUrl = new URL(rpcUrl);
        if (!/^https?:$/.test(parsedUrl.protocol)) {
            fail("Stellar RPC URL must use http or https");
        }
    }
    catch {
        fail("Stellar RPC URL is invalid");
    }
    return rpcUrl;
}
function shouldAllowHttp(rpcUrl) {
    const parsedUrl = new URL(rpcUrl);
    if (parsedUrl.protocol !== "http:") {
        return false;
    }
    return ["127.0.0.1", "0.0.0.0", "localhost"].includes(parsedUrl.hostname);
}
function resolveSigner() {
    const secretKey = process.env.STELLAR_SECRET_KEY || process.env.STELLAR_SIGNER_SECRET_KEY;
    if (!secretKey) {
        fail("Stellar secret key is not configured");
    }
    try {
        return stellar_sdk_1.Keypair.fromSecret(secretKey);
    }
    catch {
        fail("Stellar secret key is invalid");
    }
}
function resolveConfig() {
    const contractId = (0, exports.getGiftContractId)();
    if (!contractId) {
        fail("Stellar contract ID is not configured");
    }
    if (!stellar_sdk_1.StrKey.isValidContract(contractId)) {
        fail("Stellar contract ID is invalid");
    }
    const networkPassphrase = process.env.STELLAR_NETWORK_PASSPHRASE ||
        process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ||
        stellar_sdk_1.Networks.TESTNET;
    return {
        contractId,
        networkPassphrase,
        rpcUrl: resolveRpcUrl(),
        signer: resolveSigner(),
    };
}
function createRpcServer(rpcUrl) {
    return new stellar_sdk_1.rpc.Server(rpcUrl, {
        allowHttp: shouldAllowHttp(rpcUrl),
        timeout: 30_000,
    });
}
function encodeCreateGiftArgs(params) {
    return [
        stellar_sdk_1.Address.fromString(params.sender).toScVal(),
        stellar_sdk_1.xdr.ScVal.scvBytes(params.recipientHash),
        (0, stellar_sdk_1.nativeToScVal)(params.amount, { type: "u128" }),
        (0, stellar_sdk_1.nativeToScVal)(params.locktime, { type: "u64" }),
    ];
}
function mapRpcFailure(error, fallbackMessage) {
    if (error instanceof Error) {
        return new Error(`${fallbackMessage}: ${error.message}`);
    }
    return new Error(fallbackMessage);
}
async function createGift({ sender, recipientHash, amount, locktime, }) {
    const validatedSender = validateSender(sender);
    const validatedRecipientHash = validateRecipientHash(recipientHash);
    const validatedAmount = validateAmount(amount);
    const validatedLocktime = validateLocktime(locktime);
    const config = resolveConfig();
    if (validatedSender !== config.signer.publicKey()) {
        fail("Sender must match the configured Stellar signer");
    }
    const server = createRpcServer(config.rpcUrl);
    const contract = new stellar_sdk_1.Contract(config.contractId);
    let sourceAccount;
    try {
        sourceAccount = await server.getAccount(config.signer.publicKey());
    }
    catch (error) {
        throw mapRpcFailure(error, "Failed to load Stellar source account");
    }
    const operation = contract.call("create_gift", ...encodeCreateGiftArgs({
        amount: validatedAmount,
        locktime: validatedLocktime,
        recipientHash: validatedRecipientHash,
        sender: validatedSender,
    }));
    const unsignedTransaction = new stellar_sdk_1.TransactionBuilder(sourceAccount, {
        fee: stellar_sdk_1.BASE_FEE,
        networkPassphrase: config.networkPassphrase,
    })
        .addOperation(operation)
        .setTimeout(DEFAULT_TIMEOUT_SECONDS)
        .build();
    let preparedTransaction;
    try {
        preparedTransaction = await server.prepareTransaction(unsignedTransaction);
    }
    catch (error) {
        throw mapRpcFailure(error, "Transaction simulation failed");
    }
    try {
        preparedTransaction.sign(config.signer);
    }
    catch (error) {
        throw mapRpcFailure(error, "Transaction signing failed");
    }
    let submission;
    try {
        submission = await server.sendTransaction(preparedTransaction);
    }
    catch (error) {
        throw mapRpcFailure(error, "Transaction submission failed");
    }
    if (!isRecognizedTransactionHash(submission.hash)) {
        fail("Transaction submission did not return a valid hash");
    }
    if (submission.status === "ERROR") {
        fail("Transaction submission failed");
    }
    if (submission.status === "TRY_AGAIN_LATER") {
        fail("Transaction submission was throttled, please retry");
    }
    let finalizedTransaction;
    try {
        finalizedTransaction = await server.pollTransaction(submission.hash, {
            attempts: DEFAULT_POLL_ATTEMPTS,
            sleepStrategy: stellar_sdk_1.rpc.LinearSleepStrategy,
        });
    }
    catch (error) {
        throw mapRpcFailure(error, "Transaction finalization failed");
    }
    if (finalizedTransaction.status !== "SUCCESS") {
        fail("Transaction was not confirmed on-chain");
    }
    if (!isRecognizedTransactionHash(finalizedTransaction.txHash)) {
        fail("Transaction finalization did not return a valid hash");
    }
    return finalizedTransaction.txHash;
}
exports.EscrowContract = {
    create_gift: createGift,
};
