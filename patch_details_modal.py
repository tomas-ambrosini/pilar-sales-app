import re

with open("src/components/ProposalDetailsModal.jsx", "r") as f:
    text = f.read()

# We need to make sure we pass width and bodyClassName safely.
# Originally: width="w-[95vw] max-w-6xl"
# But we need to pass bodyClassName="p-0 overflow-hidden" because our modal already implements its own internal flex structure and padding.

modal_tag_regex = r'<Modal \s*isOpen=\{!!proposal\} \s*onClose=\{onClose\} \s*title=\{`Proposal Details: \$\{formatQuoteId\(proposal\)\}`\} \s*width="w-\[95vw\] max-w-6xl" \s*>'
new_modal_tag = '<Modal isOpen={!!proposal} onClose={onClose} title={`Proposal Details: ${formatQuoteId(proposal)}`} width="w-[95vw] max-w-6xl" bodyClassName="p-0 flex flex-col h-[85vh] overflow-hidden bg-slate-50">'

text = re.sub(r'<Modal[^>]*>', new_modal_tag, text)

# Remove the internal `div className="flex flex-col h-[85vh] overflow-hidden bg-slate-50"` since `Modal` bodyClassName will render it.
# Wait, actually `Modal.jsx` renders `<div className={bodyClassName}>{children}</div>`.
# So keeping the internal `div` inside `Modal` is FINE, but we must set `bodyClassName="p-0"` so that `Modal` doesn't double-pad and double-clip.

new_modal_tag_optimal = '<Modal isOpen={!!proposal} onClose={onClose} title={`Proposal Details: ${formatQuoteId(proposal)}`} width="w-[95vw] max-w-7xl" bodyClassName="p-0">'
text = re.sub(r'<Modal[^>]+>', new_modal_tag_optimal, text)

with open("src/components/ProposalDetailsModal.jsx", "w") as f:
    f.write(text)

print("Modal patched")
