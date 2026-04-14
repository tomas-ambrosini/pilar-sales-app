sed -i '' -e '1i\
import { createPortal } from "react-dom";' src/components/Modal.jsx

sed -i '' -e 's/return (/return createPortal(/g' src/components/Modal.jsx

sed -i '' -e 's/    <\/AnimatePresence>/    <\/AnimatePresence>,\n    document.body/g' src/components/Modal.jsx

sed -i '' -e 's/z-50/z-[100]/g' src/components/Modal.jsx
