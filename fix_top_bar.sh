sed -i '' -e 's/background: rgba(248, 250, 252, 0.8);/background: transparent;/g' src/components/Layout.css
sed -i '' -e '/backdrop-filter: blur(12px);/d' src/components/Layout.css
sed -i '' -e '/-webkit-backdrop-filter: blur(12px);/d' src/components/Layout.css
sed -i '' -e '/border-bottom: 1px solid rgba(226, 232, 240, 0.5);/d' src/components/Layout.css

sed -i '' -e 's/className="top-bar glass-panel"/className="top-bar"/g' src/components/Layout.jsx
