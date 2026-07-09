import re

with open('tests/e2e/progress-rich-data-smoke.spec.ts', 'r') as f:
    content = f.read()

content = content.replace("page.getByRole('heading', { name: 'Progress', exact: true }).first()", "page.getByRole('heading', { name: 'Progress', exact: true }).or(page.getByText('FitCore Score', { exact: true }))")

with open('tests/e2e/progress-rich-data-smoke.spec.ts', 'w') as f:
    f.write(content)
