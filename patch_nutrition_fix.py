import re

with open("src/components/app/views/nutrition.tsx", "r") as f:
    content = f.read()

# Fix Ring color issue - remove it, relying on --section being set on the parent
content = content.replace('size={96} label="kcal" color="rgb(239 68 68)"', 'size={96} label="kcal"')

# Fix m.source === "ai" type error
content = content.replace('m.source === "ai"', 'm.source === "camera"')

with open("src/components/app/views/nutrition.tsx", "w") as f:
    f.write(content)
