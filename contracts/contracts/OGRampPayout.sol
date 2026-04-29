// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * OGRampPayout
 * ------------
 * Owner-only treasury that disburses native 0G to users completing an on-ramp.
 *
 * Flow:
 *   1. Treasury (deployer) pre-funds the contract with native 0G via receive().
 *   2. Off-ramp/on-ramp backend (hot wallet = owner) calls payout(to, amount, memo)
 *      after a user's fiat payment is confirmed. The contract sends `amount`
 *      from its own balance to the user and emits Payout(to, amount, memo, id).
 *   3. The Payout event is the on-chain audit trail linking the on-ramp ramp tx
 *      (memo = first 31 chars of the off-chain UUID, hyphen-stripped) to the
 *      treasury disbursement.
 *
 * Why a contract instead of a raw send?
 *   - Structured event so explorer + watchers can index payouts.
 *   - Treasury isolation: payout funds live separate from the hot wallet's
 *     gas balance (and from the OGRampBridge deposit float).
 *   - Owner-controlled withdraw lets you sweep float back when needed.
 */
contract OGRampPayout {
    address public owner;
    bool public paused;
    uint256 public payoutCount;

    event Payout(
        address indexed to,
        uint256 amount,
        bytes32 indexed memo,
        uint256 indexed id
    );
    event Funded(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event OwnerChanged(address indexed previous, address indexed next);
    event PausedSet(bool paused);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function payout(address to, uint256 amount, bytes32 memo) external onlyOwner {
        require(!paused, "paused");
        require(to != address(0), "zero to");
        require(amount > 0, "zero amount");
        require(amount <= address(this).balance, "insufficient treasury");
        unchecked { payoutCount++; }
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "send failed");
        emit Payout(to, amount, memo, payoutCount);
    }

    receive() external payable {
        emit Funded(msg.sender, msg.value);
    }

    function withdraw(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "zero to");
        require(amount <= address(this).balance, "insufficient");
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "send failed");
        emit Withdrawn(to, amount);
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
}
