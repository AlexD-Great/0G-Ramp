// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * OGRampBridge
 * ------------
 * Minimal on-ramp deposit sink for 0G Ramp on the 0G Galileo testnet.
 *
 * Flow:
 *   1. User (or relayer) calls deposit(memo) with native 0G as msg.value.
 *   2. Contract emits Deposit(sender, amount, memo, id).
 *   3. Backend bridgeWatcher scans Deposit events and triggers the
 *      compute -> payout -> storage-receipt pipeline.
 *   4. Owner sweeps balance to the settlement / hot wallet via withdraw.
 */
contract OGRampBridge {
    address public owner;
    bool public paused;
    uint256 public depositCount;
    uint256 public minDeposit;

    event Deposit(
        address indexed from,
        uint256 amount,
        bytes32 indexed memo,
        uint256 indexed id
    );
    event Withdraw(address indexed to, uint256 amount);
    event OwnerChanged(address indexed previous, address indexed next);
    event PausedSet(bool paused);
    event MinDepositSet(uint256 value);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "paused");
        _;
    }

    constructor(uint256 _minDeposit) {
        owner = msg.sender;
        minDeposit = _minDeposit;
    }

    function deposit(bytes32 memo) external payable whenNotPaused {
        require(msg.value >= minDeposit, "below min");
        unchecked { depositCount++; }
        emit Deposit(msg.sender, msg.value, memo, depositCount);
    }

    receive() external payable {
        require(!paused, "paused");
        require(msg.value >= minDeposit, "below min");
        unchecked { depositCount++; }
        emit Deposit(msg.sender, msg.value, bytes32(0), depositCount);
    }

    function withdraw(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "zero to");
        require(amount <= address(this).balance, "insufficient");
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "send failed");
        emit Withdraw(to, amount);
    }

    function setOwner(address next) external onlyOwner {
        require(next != address(0), "zero owner");
        emit OwnerChanged(owner, next);
        owner = next;
    }

    function setPaused(bool v) external onlyOwner {
        paused = v;
        emit PausedSet(v);
    }

    function setMinDeposit(uint256 v) external onlyOwner {
        minDeposit = v;
        emit MinDepositSet(v);
    }
}
