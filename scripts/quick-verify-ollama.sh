#!/bin/bash

# Ollama Integration Quick Verification Script
# This script quickly checks if Ollama is available

echo "🔍 Ollama Integration Quick Verification"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check Ollama availability
echo -e "${BLUE}Step 1: Checking Ollama Service${NC}"
echo "=================================================="

OLLAMA_URLS=(
  "http://localhost:11434"
  "http://127.0.0.1:11434"
  "http://ollama:11434"
)

FOUND=0
WORKING_URL=""

for url in "${OLLAMA_URLS[@]}"; do
  echo -e "ℹ️  Trying $url..."
  
  # Use curl with timeout
  if curl -s --max-time 2 "$url/api/tags" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Ollama is available at $url${NC}"
    FOUND=1
    WORKING_URL=$url
    break
  else
    echo -e "${YELLOW}⚠️  Not available at $url${NC}"
  fi
done

if [ $FOUND -eq 0 ]; then
  echo -e "${RED}❌ Ollama service not found${NC}"
  echo -e "${BLUE}ℹ️  Please ensure Ollama is running: ollama serve${NC}"
  exit 1
fi

# Check available models
echo ""
echo -e "${BLUE}Step 2: Checking Available Models${NC}"
echo "=================================================="

MODELS=$(curl -s "$WORKING_URL/api/tags" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)

if [ -z "$MODELS" ]; then
  echo -e "${YELLOW}⚠️  No models found${NC}"
  echo -e "${BLUE}ℹ️  Download a model: ollama pull mistral${NC}"
else
  echo -e "${GREEN}✅ Found models:${NC}"
  echo "$MODELS" | while read -r model; do
    echo -e "  • $model"
  done
fi

# Configuration summary
echo ""
echo -e "${BLUE}Step 3: Configuration Summary${NC}"
echo "=================================================="
echo -e "${GREEN}✅ Ollama Configuration:${NC}"
echo -e "  Base URL: $WORKING_URL"
echo -e "  API Endpoint: $WORKING_URL/api/generate"

# Extension configuration
echo ""
echo -e "${BLUE}Step 4: Extension Configuration${NC}"
echo "=================================================="
echo -e "${GREEN}✅ To use Ollama with the extension:${NC}"
echo "  1. Open extension settings"
echo "  2. Enable AI service"
echo "  3. Set API URL to: $WORKING_URL/api/generate"
echo "  4. Set API Key to: ollama"
echo "  5. Set Model to: mistral (or your preferred model)"
echo "  6. Click 'Test Connection'"

# Final status
echo ""
echo -e "${BLUE}Verification Complete${NC}"
echo "=================================================="
echo -e "${GREEN}✨ Ollama is properly configured and ready to use!${NC}"

exit 0
