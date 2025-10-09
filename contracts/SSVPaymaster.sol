// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "github.com/OpenZeppelin/openzeppelin-community-contracts/contracts/account/paymaster/PaymasterSigner.sol";
import {SignerECDSA} from "@openzeppelin/contracts/utils/cryptography/signers/SignerECDSA.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev Concrete implementation of PaymasterSigner using ECDSA signature validation
 * Compatible with paymaster-service backend
 */
contract MyPaymasterSigner is PaymasterSigner, SignerECDSA, Ownable {
    uint256 public maxAllowedGasCost;

    error GasCostTooHigh(uint256 requested, uint256 maxAllowed);

    constructor(address signerAddr)
    EIP712("PaymasterSigner", "1")  // Must match backend domain
    SignerECDSA(signerAddr)
    Ownable(msg.sender)
    {
        maxAllowedGasCost = 0.01 ether; // Default limit
    }

    /**
     * @dev Override to add gas cost validation
     */
    function _validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) internal virtual override returns (bytes memory context, uint256 validationData) {
        // Add gas cost check from paymaster-service
        if (maxCost > maxAllowedGasCost) {
            revert GasCostTooHigh(maxCost, maxAllowedGasCost);
        }

        // Call parent validation
        return super._validatePaymasterUserOp(userOp, userOpHash, maxCost);
    }

    /**
     * @dev Required by PaymasterCore for withdrawal authorization
     */
    function _authorizeWithdraw() internal override onlyOwner {}

    /**
     * @dev Owner can update max gas cost
     */
    function setMaxAllowedGasCost(uint256 _maxAllowedGasCost) external onlyOwner {
        require(_maxAllowedGasCost > 0, "Gas cost limit cannot be zero");
        require(_maxAllowedGasCost <= 1 ether, "Gas cost limit too high");
        maxAllowedGasCost = _maxAllowedGasCost;
    }
}
