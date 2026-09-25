#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Önce Node.js kurman gerekiyor. İndirme sayfası açılıyor..."
  open https://nodejs.org
  read -p "Kurduktan sonra bu dosyaya tekrar çift tıkla. Kapatmak için Enter'a bas."
  exit 0
fi
node scripts/dene.mjs
