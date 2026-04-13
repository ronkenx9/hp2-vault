export const HP2_VAULT_ABI = [
    "function initializeVault(string cartId, string paymentRef, address buyer, address token, uint256 amount, uint256 durationBlocks) external",
    "function getAccruedYield(string cartId) public view returns (uint256)",
    "function release(string cartId) external",
    "function refund(string cartId) external",
    "function getVault(string cartId) external view returns (tuple(string cartId, string paymentRef, address merchant, address buyer, address token, uint256 principal, uint256 startBlock, uint256 expiryBlock, uint256 verdictSlaId, bool exists))",
    "function baseYieldRate() public view returns (uint256)",
    "function allowedTokens(address) public view returns (bool)",
    "event VaultInitialized(string indexed cartId, address indexed merchant, address indexed token, uint256 amount)",
    "event SettlementTriggered(string indexed cartId, address indexed merchant, uint256 principal, uint256 yield)",
    "event RefundTriggered(string indexed cartId, address indexed buyer, uint256 amount)"
];

export const HP2_ARBITRATOR_ABI = [
    "function register(address agentB, uint256 amount, uint256 windowInBlocks) external returns (uint256)",
    "function triggerDispute(uint256 slaId) external",
    "function executeVerdict(uint256 slaId, uint8 decision, bytes[] signatures) external",
    "function getVerdict(uint256 slaId) external view returns (uint8)",
    "function getJurors() external view returns (address[])",
    "event DisputeTriggered(uint256 indexed slaId, address indexed triggeredBy)",
    "event VerdictExecuted(uint256 indexed slaId, uint8 status, address recipient)"
];
