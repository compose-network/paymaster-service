#!/usr/bin/env bash
# ============================================================================
# Save Deployment to deployments.json
# ============================================================================
# Usage: ./save-deployment.sh <network> <kernel_addr> <factory_addr> <validator_addr> <chain_id> <block_number>
# ============================================================================

set -euo pipefail

if [ $# -lt 4 ]; then
    echo "Error: Missing required arguments"
    echo "Usage: ./save-deployment.sh <network> <kernel_addr> <factory_addr> <validator_addr> <chain_id> <block_number>"
    exit 1
fi

NETWORK=$1
KERNEL_ADDR=$2
FACTORY_ADDR=$3
VALIDATOR_ADDR=$4
CHAIN_ID=${5:-0}
BLOCK_NUMBER=${6:-0}

DEPLOYMENTS_FILE="deployments.json"

# Create file with empty object if it doesn't exist
if [ ! -f "$DEPLOYMENTS_FILE" ]; then
    echo "{}" > "$DEPLOYMENTS_FILE"
fi

# Generate timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Update deployments.json using jq with proper numeric types
jq --arg network "$NETWORK" \
   --argjson chain_id "$CHAIN_ID" \
   --argjson deployment_block "$BLOCK_NUMBER" \
   --arg timestamp "$TIMESTAMP" \
   --arg kernel "$KERNEL_ADDR" \
   --arg factory "$FACTORY_ADDR" \
   --arg validator "$VALIDATOR_ADDR" \
   '.[$network] = {
     "chain_id": $chain_id,
     "deployment_block": $deployment_block,
     "timestamp": $timestamp,
     "contracts": {
       "Kernel": $kernel,
       "KernelFactory": $factory,
       "MultiChainValidator": $validator
     }
   }' "$DEPLOYMENTS_FILE" > "${DEPLOYMENTS_FILE}.tmp"

# Replace original file
mv "${DEPLOYMENTS_FILE}.tmp" "$DEPLOYMENTS_FILE"

echo "✓ Saved deployment addresses to $DEPLOYMENTS_FILE"
