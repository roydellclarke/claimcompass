#!/bin/bash

# =============================================================================
# ClaimCompass Patching System
# Update specific files without rebuilding the entire app
# Usage: ./patch-claimcompass.sh [component] [action]
# =============================================================================

set -e

PROJECT_ROOT="${PROJECT_ROOT:-./claimcompass}"
cd "$PROJECT_ROOT" 2>/dev/null || { echo "❌ Not in claimcompass directory. Run 'cd claimcompass' first."; exit 1; }

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

patch_info() { echo -e "${BLUE}→ $1${NC}"; }
patch_success() { echo -e "${GREEN}✓ $1${NC}"; }
patch_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }

# =============================================================================
# HELPER: Restart containers after patch
# =============================================================================
restart_service() {
    local service=$1
    patch_info "Restarting $service..."
    docker compose restart "$service"
    patch_success "$service restarted"
}

# =============================================================================
# PATCH: Update .env file with new API keys
# =============================================================================
patch_env() {
    patch_info "Updating .env file..."
    
    cat > .env << 'EOF'
# =============================================================================
# ClaimCompass AI Configuration
# =============================================================================

# Yezamo Gateway (Unified API for Chinese LLMs)
YEZAMO_API_KEY=your-yezamo-api-key-here
YEZAMO_API_BASE=https://api.yezamo.ai/v1

# DeepSeek (via Yezamo)
DEEPSEEK_MODEL=openai/deepseek-chat

# Kimi (Moonshot - via Yezamo)
KIMI_MODEL=openai/moonshot-v1-8k

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379

# Application URLs
NEXT_PUBLIC_API_URL=http://localhost:8000
FRONTEND_PORT=3400
BACKEND_PORT=8000
EOF

    patch_warning "Please edit .env file with your actual API keys:"
    patch_warning "  nano .env"
    patch_warning "Then run: docker compose restart backend"
}

# =============================================================================
# PATCH: Update affiliate links in frontend
# =============================================================================
patch_affiliates() {
    patch_info "Updating affiliate links in frontend..."
    
    cat > frontend/src/pages/index.js.patch << 'PY'
from pathlib import Path
import re

p = Path("frontend/src/pages/index.js")
content = p.read_text()

# Replace affiliate links
new_links = {
    "tow": "YOUR_TOW_AFFILIATE_LINK_HERE",
    "repair": "YOUR_REPAIR_AFFILIATE_LINK_HERE", 
    "rental": "YOUR_RENTAL_AFFILIATE_LINK_HERE",
    "legal": "YOUR_LEGAL_AFFILIATE_LINK_HERE"
}

for key, link in new_links.items():
    pattern = rf'(AFFILIATE_LINKS.*?{key}.*?)"https?://[^"]+"'
    replacement = rf'\1"{link}"'
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)

p.write_text(content)
print("✅ Affiliate links updated!")
PY

    python3 frontend/src/pages/index.js.patch
    rm frontend/src/pages/index.js.patch
    
    patch_info "Affiliate links updated. Restart frontend:"
    echo "  docker compose restart frontend"
}

# =============================================================================
# PATCH: Update AI model configuration in backend
# =============================================================================
patch_ai_models() {
    patch_info "Updating AI model configuration..."
    
    cat > backend/main.py.patch << 'PY'
from pathlib import Path

p = Path("backend/main.py")
content = p.read_text()

# Update DeepSeek model
new_deepseek_model = "openai/deepseek-chat"  # Change to your preferred model
content = re.sub(
    r'"model":\s*"[^"]+"\s*# DeepSeek',
    f'"model": "{new_deepseek_model}",  # DeepSeek',
    content
)

# Update Kimi model
new_kimi_model = "openai/moonshot-v1-8k"  # Change to your preferred model
content = re.sub(
    r'"model":\s*"[^"]+"\s*# Kimi',
    f'"model": "{new_kimi_model}",  # Kimi',
    content
)

p.write_text(content)
print("✅ AI models updated!")
PY

    python3 -c "
import re
from pathlib import Path
p = Path('backend/main.py')
c = p.read_text()
c = re.sub(r'model: [\"\\\']openai/[^\"\\\']+', 'model: \"openai/deepseek-chat\"', c)
p.write_text(c)
print('✅ AI models updated!')
"
    
    patch_info "Restart backend to apply changes:"
    echo "  docker compose restart backend"
}

# =============================================================================
# PATCH: Fix port mapping (if Next.js is on wrong port)
# =============================================================================
patch_ports() {
    patch_info "Fixing port mappings..."
    
    # Update docker-compose.yml
    sed -i '' 's/3400:3400/3400:3000/g' docker-compose.yml 2>/dev/null || \
    sed -i 's/3400:3400/3400:3000/g' docker-compose.yml
    
    # Update package.json
    sed -i '' 's/next dev -p 3400/next dev -p 3000/g' frontend/package.json 2>/dev/null || \
    sed -i 's/next dev -p 3400/next dev -p 3000/g' frontend/package.json
    
    patch_info "Ports fixed. Rebuild containers:"
    echo "  docker compose down && docker compose up -d --build"
}

# =============================================================================
# PATCH: Add new API endpoint to backend
# =============================================================================
patch_add_endpoint() {
    local endpoint_name=$1
    local endpoint_code=$2
    
    patch_info "Adding new endpoint: /api/$endpoint_name"
    
    cat >> backend/main.py << EOF

@app.post("/api/$endpoint_name")
async def ${endpoint_name}(data: dict):
    """New endpoint: $endpoint_name"""
    session_id = data.get("session_id")
    # Add your logic here
    return {"status": "success", "endpoint": "$endpoint_name"}
EOF
    
    patch_info "Restart backend to apply changes:"
    echo "  docker compose restart backend"
}

# =============================================================================
# PATCH: Update frontend component
# =============================================================================
patch_frontend_component() {
    local component_file=$1
    local patch_content=$2
    
    patch_info "Patching frontend component: $component_file"
    
    # Apply patch using Python
    python3 -c "
from pathlib import Path
p = Path('$component_file')
content = p.read_text()
# Apply the patch
$patch_content
p.write_text(content)
print('✅ Frontend component patched!')
"
    
    patch_info "Restart frontend: docker compose restart frontend"
}

# =============================================================================
# PATCH: Quick rebuild without cache
# =============================================================================
patch_rebuild() {
    local service=$1
    
    if [ -z "$service" ]; then
        patch_info "Rebuilding all services without cache..."
        docker compose build --no-cache
        docker compose up -d
    else
        patch_info "Rebuilding $service without cache..."
        docker compose build --no-cache "$service"
        docker compose up -d "$service"
    fi
    patch_success "Rebuild complete"
}

# =============================================================================
# PATCH: View current configuration
# =============================================================================
patch_status() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  ClaimCompass Current Status"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    echo ""
    echo "📦 Containers:"
    docker compose ps 2>/dev/null || echo "  No containers running"
    
    echo ""
    echo "🔑 Environment variables (from .env):"
    grep -E "^(YEZAMO_API_KEY|DEEPSEEK|KIMI)" .env 2>/dev/null | sed 's/=.*/=***/' || echo "  .env file not found"
    
    echo ""
    echo "🔗 Affiliate links (from frontend):"
    grep "AFFILIATE_LINKS" frontend/src/pages/index.js 2>/dev/null | head -4 || echo "  Frontend not found"
    
    echo ""
    echo "🌐 Ports:"
    echo "  Frontend: http://localhost:3400"
    echo "  Backend:  http://localhost:8000"
    echo "  Health:   http://localhost:8000/health"
}

# =============================================================================
# HELP
# =============================================================================
show_help() {
    cat << 'EOF'
ClaimCompass Patching System

USAGE:
    ./patch-claimcompass.sh [COMMAND] [OPTIONS]

COMMANDS:
    env                 Update .env file template
    affiliates          Update affiliate links in frontend
    ai-models          Update AI model configuration
    ports              Fix port mappings (3400:3000 issue)
    rebuild [service]  Rebuild containers without cache
    status             Show current configuration
    add-endpoint NAME  Add new API endpoint to backend
    help               Show this help

EXAMPLES:
    # Update API keys
    ./patch-claimcompass.sh env
    nano .env  # Add your keys
    docker compose restart backend

    # Update affiliate links
    ./patch-claimcompass.sh affiliates

    # Fix port mapping if frontend not loading
    ./patch-claimcompass.sh ports
    docker compose up -d --build

    # Rebuild backend only
    ./patch-claimcompass.sh rebuild backend

    # Check status
    ./patch-claimcompass.sh status

QUICK FIX FOR MOST COMMON ISSUES:
    # Frontend not loading (port mismatch)
    cd claimcompass
    docker compose down
    sed -i '' 's/3400:3400/3400:3000/g' docker-compose.yml
    docker compose up -d --build
    open http://localhost:3400

    # Backend AI not working
    cd claimcompass
    nano .env  # Add your YEZAMO_API_KEY
    docker compose restart backend
EOF
}

# =============================================================================
# MAIN
# =============================================================================
case "${1:-help}" in
    env)
        patch_env
        ;;
    affiliates)
        patch_affiliates
        ;;
    ai-models)
        patch_ai_models
        ;;
    ports)
        patch_ports
        ;;
    rebuild)
        patch_rebuild "$2"
        ;;
    status)
        patch_status
        ;;
    add-endpoint)
        patch_add_endpoint "$2" "$3"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "❌ Unknown command: $1"
        show_help
        exit 1
        ;;
esac
EOF

chmod +x patch-claimcompass.sh

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Patching System Created!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "USAGE:"
echo "  cd claimcompass"
echo "  ./patch-claimcompass.sh [command]"
echo ""
echo "QUICK COMMANDS:"
echo "  ./patch-claimcompass.sh status      # Check current configuration"
echo "  ./patch-claimcompass.sh env         # Update .env with API keys"
echo "  ./patch-claimcompass.sh affiliates  # Update affiliate links"
echo "  ./patch-claimcompass.sh ports       # Fix port mapping issue"
echo "  ./patch-claimcompass.sh rebuild     # Rebuild all containers"
echo ""
echo "MOST IMPORTANT - Fix port issue NOW:"
echo "  cd claimcompass"
echo "  sed -i '' 's/3400:3400/3400:3000/g' docker-compose.yml"
echo "  docker compose up -d --build"
echo "  open http://localhost:3400"