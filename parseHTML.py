import re
with open("src/pages/Customers.jsx") as f:
    text = f.read()

body = text[text.find('return ('):text.find('}\n\nfunction PropertyDetailsCard')]
open_tags = []
for tag in re.findall(r'<\/?([a-zA-Z0-9]+)[^>]*>', body):
    if tag.startswith('/'):
        if len(open_tags) == 0:
             print("Closing tag with empty stack", tag)
             continue
        if open_tags[-1] == tag[1:]:
             open_tags.pop()
        else:
             print("Mismatched tag:", tag, "expected closing for", open_tags[-1])
    elif not tag.endswith('/') and tag not in ['input', 'br', 'hr', 'img', 'meta']:
        open_tags.append(tag)

print("Unclosed tags:", open_tags)
