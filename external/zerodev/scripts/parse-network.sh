#!/usr/bin/env bash
# Parse network configuration from networks.toml
# Usage: source scripts/parse-network.sh <network-name>

set -euo pipefail

NETWORK_NAME=${1:-}

if [ -z "$NETWORK_NAME" ]; then
    echo "Error: Network name required"
    echo "Usage: source scripts/parse-network.sh <network-name>"
    exit 1
fi

# Check if networks.toml exists
if [ ! -f "networks.toml" ]; then
    echo "Error: networks.toml not found"
    exit 1
fi

# Simple TOML parser using grep and awk
parse_network() {
    local key=$1
    local value=$(grep -A 20 "^\[networks\.$NETWORK_NAME\]" networks.toml | \
        grep "^$key = " | \
        head -n 1 | \
        sed 's/^[^=]*= *//' | \
        sed 's/ *#.*//' | \
        sed 's/^"//' | \
        sed 's/"$//' | \
        sed 's/^[[:space:]]*//' | \
        sed 's/[[:space:]]*$//' | \
        tr -d '\n')
    echo "$value"
}

# Export network variables
export NETWORK_NAME
export NETWORK_RPC_URL=$(parse_network "rpc_url")
export NETWORK_CHAIN_ID=$(parse_network "chain_id")
export NETWORK_EXPLORER_TYPE=$(parse_network "explorer_type")
export NETWORK_EXPLORER_URL=$(parse_network "explorer_url")
export NETWORK_EXPLORER_API_URL=$(parse_network "explorer_api_url")
export NETWORK_ENTRYPOINT=$(parse_network "entrypoint")
export NETWORK_DISPLAY_NAME=$(parse_network "name")

# Validate required fields
if [ -z "$NETWORK_RPC_URL" ] || [ "$NETWORK_RPC_URL" = '""' ]; then
    echo "Error: RPC URL not configured for network '$NETWORK_NAME'"
    exit 1
fi

if [ -z "$NETWORK_ENTRYPOINT" ]; then
    echo "Error: EntryPoint address not configured for network '$NETWORK_NAME'"
    exit 1
fi

# Load private key from .env
if [ -f ".env" ]; then
    export $(grep PRIVATE_KEY .env | xargs)
    export $(grep ETHERSCAN_API_KEY .env | xargs) 2>/dev/null || true
else
    echo "Error: .env file not found. Please create it with your PRIVATE_KEY."
    exit 1
fi

echo "✓ Network configuration loaded: $NETWORK_DISPLAY_NAME"
