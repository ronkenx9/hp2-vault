// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./HP2Arbitrator.sol";

/**
 * @title HP2Vault
 * @notice Yield-bearing merchant escrow protocol for HashKey PayFi.
 * @dev Hardened with access control, token whitelist, and stale-read protection.
 * @custom:security-contact security@hp2vault.xyz
 */
contract HP2Vault is ReentrancyGuard, Ownable2Step, Pausable {
    using SafeERC20 for IERC20;

    // ─── Types ───────────────────────────────────────────────────

    struct Vault {
        string cartId;
        string paymentRef;
        address merchant;
        address buyer;
        address token;
        uint256 principal;
        uint256 startBlock;
        uint256 expiryBlock;
        uint256 verdictSlaId;
        bool exists;
    }

    // ─── State ───────────────────────────────────────────────────

    HP2Arbitrator public immutable arbitrator;
    
    uint256 public baseYieldRate;                      // basis points (500 = 5%)
    uint256 public constant MAX_YIELD_RATE = 2000;     // 20% cap
    uint256 public constant SECONDS_PER_YEAR = 31536000;
    uint256 public constant BLOCK_TIME = 2;
    uint256 public constant MIN_AMOUNT = 1e6;          // 1 USDC/USDT (6 decimals)
    uint256 public constant MIN_DURATION = 100;        // ~200 seconds
    uint256 public constant MAX_DURATION = 5_184_000;  // ~120 days

    mapping(string => Vault) private _vaults;          // cartId -> Vault
    mapping(address => bool) public allowedTokens;     // C-3 FIX: whitelist

    // ─── Events ──────────────────────────────────────────────────

    event VaultInitialized(string indexed cartId, address indexed merchant, address indexed token, uint256 amount);
    event SettlementTriggered(string indexed cartId, address indexed merchant, uint256 principal, uint256 yield);
    event RefundTriggered(string indexed cartId, address indexed buyer, uint256 amount);
    event TokenWhitelisted(address indexed token, bool allowed);
    event YieldRateUpdated(uint256 oldRate, uint256 newRate);

    // ─── Errors ──────────────────────────────────────────────────

    error VaultAlreadyExists();
    error VaultNotFound();
    error TokenNotWhitelisted(address token);
    error ZeroAddress();
    error AmountTooLow();
    error InvalidDuration();
    error NotMerchant();
    error NotBuyer();
    error NotReadyForRelease();
    error NotSlashed();
    error YieldRateTooHigh();

    // ─── Constructor ─────────────────────────────────────────────

    constructor(
        address _arbitrator,
        uint256 _initialYieldRate
    ) Ownable(msg.sender) {
        if (_arbitrator == address(0)) revert ZeroAddress();
        if (_initialYieldRate > MAX_YIELD_RATE) revert YieldRateTooHigh();
        
        arbitrator = VerdictCore(_arbitrator);
        baseYieldRate = _initialYieldRate;
    }

    // ─── Modifiers ───────────────────────────────────────────────

    modifier onlyMerchant(string calldata cartId) {
        if (_vaults[cartId].merchant != msg.sender) revert NotMerchant();
        _;
    }

    modifier onlyBuyer(string calldata cartId) {
        if (_vaults[cartId].buyer != msg.sender) revert NotBuyer();
        _;
    }

    modifier vaultExists(string calldata cartId) {
        if (!_vaults[cartId].exists) revert VaultNotFound();
        _;
    }

    // ─── Core Functions ──────────────────────────────────────────

    /**
     * @notice Initialize a new escrow vault anchored to an HP2 Cart Mandate.
     */
    function initializeVault(
        string calldata cartId,
        string calldata paymentRef,
        address buyer,
        address token,
        uint256 amount,
        uint256 durationBlocks
    ) external nonReentrant whenNotPaused {
        // M-1 FIX: Input validation
        if (_vaults[cartId].exists) revert VaultAlreadyExists();
        if (buyer == address(0)) revert ZeroAddress();
        if (!allowedTokens[token]) revert TokenNotWhitelisted(token);
        if (amount < MIN_AMOUNT) revert AmountTooLow();
        if (durationBlocks < MIN_DURATION || durationBlocks > MAX_DURATION) revert InvalidDuration();

        // 1. Pull tokens from merchant to this contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // 2. Approve Arbitrator to pull from this contract
        IERC20(token).approve(address(arbitrator), amount);

        // 3. Register in Arbitrator
        uint256 slaId = arbitrator.register(buyer, amount, durationBlocks);

        _vaults[cartId] = Vault({
            cartId: cartId,
            paymentRef: paymentRef,
            merchant: msg.sender,
            buyer: buyer,
            token: token,
            principal: amount,
            startBlock: block.number,
            expiryBlock: block.number + durationBlocks,
            verdictSlaId: slaId,
            exists: true
        });

        emit VaultInitialized(cartId, msg.sender, token, amount);
    }

    /**
     * @notice Calculate accrued yield based on time elapsed.
     */
    function getAccruedYield(string calldata cartId) public view returns (uint256) {
        Vault storage vault = _vaults[cartId];
        if (!vault.exists) return 0;
        
        uint256 elapsedBlocks = block.number - vault.startBlock;
        uint256 elapsedSeconds = elapsedBlocks * BLOCK_TIME;
        
        return (vault.principal * baseYieldRate * elapsedSeconds) / (10000 * SECONDS_PER_YEAR);
    }

    /**
     * @notice Standard release: Principal + Yield to Merchant.
     * @dev C-1 FIX: Only the vault's merchant can call.
     *      C-2 FIX: Values cached before delete.
     */
    function release(string calldata cartId) 
        external 
        nonReentrant 
        whenNotPaused
        vaultExists(cartId)
        onlyMerchant(cartId) 
    {
        Vault storage vault = _vaults[cartId];
        
        HP2Arbitrator.VerdictStatus status = arbitrator.getVerdict(vault.verdictSlaId);
        bool windowExpired = block.number >= vault.expiryBlock;
        bool juryApproved = (status == HP2Arbitrator.VerdictStatus.RESOLVED_STANDARD);

        if (!windowExpired && !juryApproved) revert NotReadyForRelease();

        // C-2 FIX: Cache before delete
        uint256 principal = vault.principal;
        uint256 yieldAmount = getAccruedYield(cartId);

        delete _vaults[cartId];

        emit SettlementTriggered(cartId, msg.sender, principal, yieldAmount);
    }

    /**
     * @notice Refund buyer if Jury slashes merchant.
     * @dev C-1 FIX: Only the vault's buyer can call.
     *      C-2 FIX: Values cached before delete.
     */
    function refund(string calldata cartId) 
        external 
        nonReentrant 
        whenNotPaused
        vaultExists(cartId)
        onlyBuyer(cartId) 
    {
        Vault storage vault = _vaults[cartId];
        
        HP2Arbitrator.VerdictStatus status = arbitrator.getVerdict(vault.verdictSlaId);
        if (status != HP2Arbitrator.VerdictStatus.RESOLVED_SLASHED) revert NotSlashed();

        // C-2 FIX: Cache before delete
        uint256 principal = vault.principal;

        delete _vaults[cartId];

        emit RefundTriggered(cartId, msg.sender, principal);
    }

    // ─── Admin ───────────────────────────────────────────────────

    /// @notice C-3 FIX: Whitelist approved tokens
    function setTokenAllowed(address token, bool allowed) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        allowedTokens[token] = allowed;
        emit TokenWhitelisted(token, allowed);
    }

    /// @notice H-2 FIX: Bounded yield rate update
    function setYieldRate(uint256 newRate) external onlyOwner {
        if (newRate > MAX_YIELD_RATE) revert YieldRateTooHigh();
        uint256 oldRate = baseYieldRate;
        baseYieldRate = newRate;
        emit YieldRateUpdated(oldRate, newRate);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ─── View ────────────────────────────────────────────────────

    function getVault(string calldata cartId) external view returns (Vault memory) {
        return _vaults[cartId];
    }
}
