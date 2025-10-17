#!/usr/bin/env bash
# Check if the development environment is properly set up

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SUCCESS="${GREEN}✓${NC}"
FAIL="${RED}✗${NC}"
WARN="${YELLOW}⚠${NC}"

echo -e "${BLUE}=== Checking Development Environment ===${NC}\n"

# Check for foundry
echo -n "Checking for foundry (forge)... "
if command -v forge &> /dev/null; then
    VERSION=$(forge --version | head -n 1)
    echo -e "${SUCCESS} Found: $VERSION"
else
    echo -e "${FAIL} Not found"
    echo "  Install from: https://book.getfoundry.sh/getting-started/installation"
    exit 1
fi

# Check for just
echo -n "Checking for just... "
if command -v just &> /dev/null; then
    VERSION=$(just --version)
    echo -e "${SUCCESS} Found: $VERSION"
else
    echo -e "${FAIL} Not found"
    echo "  Install from: https://github.com/casey/just#installation"
    exit 1
fi

# Check for git
echo -n "Checking for git... "
if command -v git &> /dev/null; then
    VERSION=$(git --version)
    echo -e "${SUCCESS} Found: $VERSION"
else
    echo -e "${FAIL} Not found"
    exit 1
fi

# Check if git is initialized
echo -n "Checking if git is initialized... "
if [ -d .git ]; then
    echo -e "${SUCCESS} Yes"
else
    echo -e "${WARN} No"
    echo "  Run: git init"
fi

# Check for kernel submodule
echo -n "Checking for kernel submodule... "
if [ -d contracts/kernel/.git ] || [ -f contracts/kernel/.git ]; then
    echo -e "${SUCCESS} Found"
    
    # Check if it's on the correct branch/tag
    cd contracts/kernel
    BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "detached")
    if [ "$BRANCH" = "release/v3.1" ] || git describe --tags 2>/dev/null | grep -q "v3.1"; then
        echo -e "  ${SUCCESS} On release/v3.1 branch"
    else
        echo -e "  ${WARN} Current branch/tag: $BRANCH (expected: release/v3.1)"
    fi
    cd ../..
else
    echo -e "${FAIL} Not found"
    echo "  Run: just setup"
    exit 1
fi

# Check if submodule dependencies are initialized
echo -n "Checking submodule dependencies... "
if [ -d contracts/kernel/lib/solady ] && [ "$(ls -A contracts/kernel/lib/solady)" ]; then
    echo -e "${SUCCESS} Initialized"
else
    echo -e "${FAIL} Not initialized"
    echo "  Run: cd contracts/kernel && forge install"
    exit 1
fi

# Check if contracts are built
echo -n "Checking if contracts are built... "
if [ -d contracts/kernel/out/Kernel.sol ] && [ "$(ls -A contracts/kernel/out/Kernel.sol)" ]; then
    echo -e "${SUCCESS} Yes"
else
    echo -e "${WARN} No"
    echo "  Run: just build"
fi

# Check for .env file
echo -n "Checking for .env file... "
if [ -f .env ]; then
    echo -e "${SUCCESS} Found"
    
    # Check if required variables are set
    source .env
    
    echo -n "  Checking PRIVATE_KEY... "
    if [ -n "$PRIVATE_KEY" ] && [ "$PRIVATE_KEY" != "0xYOUR_PRIVATE_KEY_HERE" ]; then
        echo -e "${SUCCESS}"
    else
        echo -e "${FAIL} Not configured"
    fi
    
    echo -n "  Checking ETHERSCAN_API_KEY... "
    if [ -n "$ETHERSCAN_API_KEY" ] && [ "$ETHERSCAN_API_KEY" != "YOUR_ETHERSCAN_API_KEY" ]; then
        echo -e "${SUCCESS}"
    else
        echo -e "${WARN} Not configured (optional, for verification)"
    fi
    
else
    echo -e "${FAIL} Not found"
    echo "  Run: cp .env.example .env"
    echo "  Then edit .env with your PRIVATE_KEY"
fi

# Check for networks.toml
echo -n "Checking for networks.toml... "
if [ -f networks.toml ]; then
    echo -e "${SUCCESS} Found"
    
    # Count configured networks
    NETWORK_COUNT=$(grep -c "^\[networks\." networks.toml || echo "0")
    echo "  ${SUCCESS} $NETWORK_COUNT network(s) configured"
    
    # List configured networks
    if [ "$NETWORK_COUNT" -gt 0 ]; then
        echo "  Networks:"
        grep "^\[networks\." networks.toml | sed 's/\[networks\./    - /' | sed 's/\]//'
    fi
else
    echo -e "${WARN} Not found"
    echo "  Networks are configured in networks.toml"
    echo "  See docs/MULTI_CHAIN_DEPLOYMENT.md for setup guide"
fi

# Check optional tools
echo -n "\nChecking optional tools:"
echo -n "\n  cast (foundry)... "
if command -v cast &> /dev/null; then
    echo -e "${SUCCESS}"
else
    echo -e "${WARN} Not found (comes with foundry)"
fi

echo -n "  jq (JSON processor)... "
if command -v jq &> /dev/null; then
    echo -e "${SUCCESS}"
else
    echo -e "${WARN} Not found (useful for parsing deployment output)"
fi

echo -e "\n${BLUE}=== Setup Check Complete ===${NC}\n"
echo "Next steps:"
echo "  1. Configure .env with PRIVATE_KEY (if not done)"
echo "  2. Configure networks in networks.toml"
echo "  3. Build contracts: just build"
echo "  4. List networks: just list-networks"
echo "  5. Deploy: just deploy-network <network-name>"
echo "  6. View deployments: just show-deployments"
echo ""
echo "See README.md and docs/ for detailed instructions."
