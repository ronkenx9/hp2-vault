// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title HP2Arbitrator
 * @notice Multi-sig resolution engine for HP2-Vault.
 * @dev 3/5 whitelisted AI Jury with chain-bound signatures.
 * @custom:security-contact security@hp2vault.xyz
 */
contract HP2Arbitrator is ReentrancyGuard, Ownable2Step, Pausable {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    // ─── Types ───────────────────────────────────────────────────

    enum VerdictStatus { 
        PENDING,
        IN_DISPUTE,
        RESOLVED_STANDARD,
        RESOLVED_SLASHED
    }

    struct SLA {
        address agentA;
        address agentB;
        uint256 collateral;
        uint256 targetBlock;
        VerdictStatus verdict;
        bool resolved;
    }

    // ─── State ───────────────────────────────────────────────────

    IERC20 public immutable settlementToken;
    uint256 public slaCount;

    mapping(uint256 => SLA) public slas;
    mapping(address => bool) public isJuror;
    address[] public jurors;

    uint256 public constant MAX_JURORS = 5;
    uint256 public constant QUORUM = 3;
    uint256 public constant MAX_WINDOW_BLOCKS = 5_184_000; // ~120 days at 2s blocks

    // ─── Events ──────────────────────────────────────────────────

    event SLARegistered(uint256 indexed slaId, address indexed agentA, address indexed agentB, uint256 collateral, uint256 expiry);
    event DisputeTriggered(uint256 indexed slaId, address indexed triggeredBy);
    event VerdictExecuted(uint256 indexed slaId, VerdictStatus status, address recipient);
    event JurorRotated(address indexed removed, address indexed added);

    // ─── Errors ──────────────────────────────────────────────────

    error ZeroAddress();
    error ZeroAmount();
    error InvalidWindow();
    error InvalidState();
    error AlreadyResolved();
    error InsufficientQuorum();
    error InvalidDecision();
    error InvalidJuror(address signer);
    error DuplicateSignature(address signer);
    error OnlyBuyer();

    // ─── Constructor ─────────────────────────────────────────────

    constructor(
        address _token, 
        address[] memory _initialJurors
    ) Ownable(msg.sender) {
        if (_token == address(0)) revert ZeroAddress();
        require(_initialJurors.length == MAX_JURORS, "VerdictCore: exactly 5 jurors");
        
        settlementToken = IERC20(_token);
        for (uint256 i = 0; i < MAX_JURORS; i++) {
            if (_initialJurors[i] == address(0)) revert ZeroAddress();
            isJuror[_initialJurors[i]] = true;
            jurors.push(_initialJurors[i]);
        }
    }

    // ─── Core Functions ──────────────────────────────────────────

    function register(
        address agentB, 
        uint256 amount, 
        uint256 windowInBlocks
    ) external whenNotPaused returns (uint256 slaId) {
        if (agentB == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (windowInBlocks == 0 || windowInBlocks > MAX_WINDOW_BLOCKS) revert InvalidWindow();

        slaId = ++slaCount;
        slas[slaId] = SLA({
            agentA: msg.sender,
            agentB: agentB,
            collateral: amount,
            targetBlock: block.number + windowInBlocks,
            verdict: VerdictStatus.PENDING,
            resolved: false
        });

        settlementToken.safeTransferFrom(msg.sender, address(this), amount);
        emit SLARegistered(slaId, msg.sender, agentB, amount, slas[slaId].targetBlock);
    }

    function triggerDispute(uint256 slaId) external whenNotPaused {
        SLA storage sla = slas[slaId];
        if (msg.sender != sla.agentB) revert OnlyBuyer();
        if (sla.verdict != VerdictStatus.PENDING) revert InvalidState();
        if (block.number >= sla.targetBlock) revert InvalidWindow();

        sla.verdict = VerdictStatus.IN_DISPUTE;
        emit DisputeTriggered(slaId, msg.sender);
    }

    /**
     * @notice Resolves a dispute via 3/5 AI Jury consensus.
     * @dev Signatures are bound to (chainId, contract, slaId, decision).
     */
    function executeVerdict(
        uint256 slaId,
        VerdictStatus decision,
        bytes[] calldata signatures
    ) external nonReentrant whenNotPaused {
        SLA storage sla = slas[slaId];
        if (sla.verdict != VerdictStatus.IN_DISPUTE) revert InvalidState();
        if (sla.resolved) revert AlreadyResolved();
        if (signatures.length < QUORUM) revert InsufficientQuorum();
        if (decision != VerdictStatus.RESOLVED_STANDARD && decision != VerdictStatus.RESOLVED_SLASHED) 
            revert InvalidDecision();

        // C-4 FIX: chain-bound message hash
        bytes32 messageHash = MessageHashUtils.toEthSignedMessageHash(
            keccak256(abi.encodePacked(
                block.chainid,
                address(this),
                slaId, 
                uint8(decision)
            ))
        );

        address[] memory uniqueSigners = new address[](signatures.length);
        for (uint256 i = 0; i < signatures.length; i++) {
            address signer = messageHash.recover(signatures[i]);
            if (!isJuror[signer]) revert InvalidJuror(signer);
            
            for (uint256 j = 0; j < i; j++) {
                if (uniqueSigners[j] == signer) revert DuplicateSignature(signer);
            }
            uniqueSigners[i] = signer;
        }

        sla.verdict = decision;
        sla.resolved = true;

        address recipient = (decision == VerdictStatus.RESOLVED_STANDARD) ? sla.agentA : sla.agentB;
        settlementToken.safeTransfer(recipient, sla.collateral);

        emit VerdictExecuted(slaId, decision, recipient);
    }

    // ─── Admin ───────────────────────────────────────────────────

    function rotateJuror(address oldJuror, address newJuror) external onlyOwner {
        if (newJuror == address(0)) revert ZeroAddress();
        require(isJuror[oldJuror], "VerdictCore: not a juror");
        require(!isJuror[newJuror], "VerdictCore: already a juror");

        isJuror[oldJuror] = false;
        isJuror[newJuror] = true;

        for (uint256 i = 0; i < jurors.length; i++) {
            if (jurors[i] == oldJuror) {
                jurors[i] = newJuror;
                break;
            }
        }
        emit JurorRotated(oldJuror, newJuror);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ─── View ────────────────────────────────────────────────────

    function getVerdict(uint256 slaId) external view returns (VerdictStatus) {
        return slas[slaId].verdict;
    }

    function getJurors() external view returns (address[] memory) {
        return jurors;
    }
}
