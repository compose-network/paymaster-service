#!/usr/bin/env bash
# Save deployment addresses to deployments.json
# Usage: ./save-deployment.sh <network> <kernel_addr> <factory_addr> <validator_addr> <chain_id>

set -euo pipefail

NETWORK=$1
KERNEL_ADDR=$2
FACTORY_ADDR=$3
VALIDATOR_ADDR=$4
CHAIN_ID=${5:-"unknown"}

DEPLOYMENTS_FILE="deployments.json"

# Create file with empty object if it doesn't exist
if [ ! -f "$DEPLOYMENTS_FILE" ]; then
    echo "{}" > "$DEPLOYMENTS_FILE"
fi

# Create temporary file with updated data
jq --arg network "$NETWORK" \
   --arg kernel "$KERNEL_ADDR" \
   --arg factory "$FACTORY_ADDR" \
   --arg validator "$VALIDATOR_ADDR" \
   --arg chain_id "$CHAIN_ID" \
   '.[$network] = {
     "chain_id": $chain_id,
     "Kernel": $kernel,
     "KernelFactory": $factory,
     "MultiChainValidator": $validator,
     "deployed_at": (now | strftime("%Y-%m-%d %H:%M:%S UTC"))
   }' "$DEPLOYMENTS_FILE" > "${DEPLOYMENTS_FILE}.tmp"

# Replace original file
mv "${DEPLOYMENTS_FILE}.tmp" "$DEPLOYMENTS_FILE"

echo "✓ Saved deployment addresses to $DEPLOYMENTS_FILE"
