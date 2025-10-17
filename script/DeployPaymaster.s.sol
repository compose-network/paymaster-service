// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../contracts/SignatureVerifyingPaymasterV07.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployPaymasterScript is Script {
    function run() external {
        // Load environment variables
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address entryPointAddress = vm.envAddress("ENTRY_POINT_V07_ADDRESS");
        address trustedSigner = vm.envAddress("TRUSTED_SIGNER");

        bytes32 saltImpl = keccak256("SIG_VER_PAYMASTER_IMPL_V1");
        bytes32 saltProxy = keccak256("SIG_VER_PAYMASTER_PROXY_V1");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy implementation
        address implementation = _deployCreate2(
            saltImpl,
            abi.encodePacked(
                type(SignatureVerifyingPaymasterV07).creationCode,
                abi.encode(IEntryPoint(entryPointAddress))
            )
        );
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            SignatureVerifyingPaymasterV07.initialize.selector,
            trustedSigner,
            vm.addr(deployerPrivateKey)
        );
        
        // Deploy proxy
        address proxy = _deployCreate2(
            saltProxy,
            abi.encodePacked(
                type(ERC1967Proxy).creationCode,
                abi.encode(implementation, initData)
            )
        );
        
        // Log addresses
        console.log("Implementation deployed at:", address(implementation));
        console.log("Proxy deployed at:", address(proxy));
        
        vm.stopBroadcast();
    }

    function _deployCreate2(bytes32 salt, bytes memory code) internal returns (address addr) {
        assembly {
            addr := create2(0, add(code, 0x20), mload(code), salt)
            if iszero(extcodesize(addr)) { revert(0, 0) }
        }
    }
}