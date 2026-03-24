#!/bin/bash
set -e

DOMAIN="aegis.dctcompany.kr"
EMAIL="khai@dctcompany.kr"
FRONTEND_DEST="/var/www/aegis"
NGINX_CONF="/etc/nginx/conf.d/aegis.conf"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "======================================"
echo "  AEGIS 배포 스크립트"
echo "  도메인: $DOMAIN"
echo "======================================"

# ── 1단계: 프론트엔드 빌드 ──
echo ""
echo "[1/5] 프론트엔드 빌드 중..."
cd "$SCRIPT_DIR/frontend"
npm install
chmod -R +x node_modules/.bin/
npm run build
echo "      빌드 완료."

# ── 2단계: 정적 파일 배포 ──
echo ""
echo "[2/5] 정적 파일 배포 중... ($FRONTEND_DEST)"
sudo mkdir -p "$FRONTEND_DEST"
sudo rsync -a --delete "$SCRIPT_DIR/frontend/dist/" "$FRONTEND_DEST/"
echo "      완료."

# ── 3단계: 백엔드 Docker 실행 ──
echo ""
echo "[3/5] 백엔드 Docker 실행 중..."
cd "$SCRIPT_DIR"
docker compose -f docker-compose.prod.yml up -d --build
echo "      완료."

# ── 4단계: SSL 인증서 발급 (최초 1회) ──
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo ""
    echo "[4/5] SSL 인증서 발급 중... ($DOMAIN)"
    sudo certbot certonly --nginx \
      --email "$EMAIL" \
      --agree-tos \
      --no-eff-email \
      -d "$DOMAIN"
    echo "      인증서 발급 완료."
else
    echo ""
    echo "[4/5] SSL 인증서 이미 존재, 건너뜀."
fi

# ── 5단계: nginx 설정 적용 ──
echo ""
echo "[5/5] nginx 설정 적용 중..."
sudo cp "$SCRIPT_DIR/nginx/aegis.conf" "$NGINX_CONF"
sudo nginx -t && sudo systemctl reload nginx
echo "      nginx 리로드 완료."

echo ""
echo "======================================"
echo "  배포 완료!"
echo "  앱 주소: https://$DOMAIN"
echo "  백엔드 로그: docker compose -f docker-compose.prod.yml logs -f"
echo "======================================"
