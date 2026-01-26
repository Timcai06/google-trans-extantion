#!/bin/bash

# 修复所有直接使用 module.exports 的文件

files=(
  "components/base/input.js"
  "components/layouts/content.js"
  "components/layouts/header.js"
  "components/base/card.js"
  "components/base/toast.js"
  "components/base/button.js"
  "components/base/dialog.js"
  "components/content/utils/ContentComponent.js"
  "components/content/complex/TextSelection.js"
  "components/content/complex/TranslationHighlight.js"
  "components/content/complex/TranslationFloatingPopup.js"
  "components/content/complex/TranslationRequest.js"
  "components/content/complex/ContextMenu.js"
  "components/business/translation-popup.js"
  "components/background/utils/BackgroundComponent.js"
  "components/complex/word-card.js"
  "components/background/complex/BackgroundScheduler.js"
  "components/background/complex/BackgroundAPIRequest.js"
  "components/background/complex/BackgroundMessage.js"
  "components/background/complex/BackgroundStateManager.js"
  "components/background/complex/BackgroundDataSync.js"
  "components/complex/settings-panel.js"
  "components/complex/learning-panel.js"
  "components/complex/search-bar.js"
  "components/complex/stat-card.js"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing $file..."
    # 使用 sed 替换 module.exports = 为条件导出
    sed -i.bak 's/^module\.exports = \(.*\);$/if (typeof module !== '\''undefined'\'' \&\& module.exports) {\n  module.exports = \1;\n}/' "$file"
  fi
done

echo "Done!"
