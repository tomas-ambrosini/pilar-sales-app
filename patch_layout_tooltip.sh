sed -i '' -e '/{\/\* Tooltip for collapsed state \*\/}/,/< \/div>/d' src/components/Layout.jsx
sed -i '' -e '/<div className="absolute left-14 opacity-0 invisible/d' src/components/Layout.jsx
sed -i '' -e '/{item.label}/d' src/components/Layout.jsx
