import re

with open('src/components/app/views/progress.tsx', 'r') as f:
    content = f.read()

# Replace Card with button for Deep Dives
content = content.replace(
    '<Card onClick={() => setSheet("bodyweight")} className="flex items-center justify-between group">',
    '<button aria-label="Body" onClick={() => setSheet("bodyweight")} className="w-full premium-card p-4 card-elev press transition-all flex items-center justify-between group text-left">'
)
content = content.replace(
    '<Card onClick={() => setSheet("analytics")} className="flex items-center justify-between group">',
    '<button aria-label="Analytics" onClick={() => setSheet("analytics")} className="w-full premium-card p-4 card-elev press transition-all flex items-center justify-between group text-left">'
)
content = content.replace(
    '<Card onClick={() => setSheet("photos")} className="flex items-center justify-between group">',
    '<button aria-label="Photos" onClick={() => setSheet("photos")} className="w-full premium-card p-4 card-elev press transition-all flex items-center justify-between group text-left">'
)
content = content.replace(
    '<Card onClick={() => setSheet("goals")} className="flex items-center justify-between group">',
    '<button aria-label="Goals" onClick={() => setSheet("goals")} className="w-full premium-card p-4 card-elev press transition-all flex items-center justify-between group text-left">'
)

# Fix closing tags
content = re.sub(
    r'(<button aria-label="Body".*?>\s*<div.*?>.*?<h3.*?>)Bodyweight(</h3>.*?</div>\s*<ChevronRight.*?>\s*)</Card>',
    r'\1Body\2</button>',
    content,
    flags=re.DOTALL
)
content = re.sub(
    r'(<button aria-label="Analytics".*?>\s*<div.*?>.*?<h3.*?>Analytics</h3>.*?</div>\s*<ChevronRight.*?>\s*)</Card>',
    r'\1</button>',
    content,
    flags=re.DOTALL
)
content = re.sub(
    r'(<button aria-label="Photos".*?>\s*<div.*?>.*?<h3.*?>Photos</h3>.*?</div>\s*<ChevronRight.*?>\s*)</Card>',
    r'\1</button>',
    content,
    flags=re.DOTALL
)
content = re.sub(
    r'(<button aria-label="Goals".*?>\s*<div.*?>.*?<h3.*?>Goals</h3>.*?</div>\s*<ChevronRight.*?>\s*)</Card>',
    r'\1</button>',
    content,
    flags=re.DOTALL
)

with open('src/components/app/views/progress.tsx', 'w') as f:
    f.write(content)
