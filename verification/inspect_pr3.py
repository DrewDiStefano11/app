from playwright.sync_api import sync_playwright

def inspect_app(page):
    page.goto("http://localhost:8080")
    page.wait_for_timeout(2000)

    # Check body background color
    bg_color = page.evaluate("window.getComputedStyle(document.body).backgroundColor")
    print(f"Body background color: {bg_color}")

    # Check if .phone-shell has the expected styles
    shell = page.locator(".phone-shell")
    if shell.count() > 0:
        shell_bg = shell.evaluate("el => window.getComputedStyle(el).background")
        print(f"Phone shell background: {shell_bg[:100]}...")

    # Complete onboarding to see the dashboard
    get_started = page.get_by_role("button", name="Get started")
    if get_started.is_visible():
        get_started.click()
        page.wait_for_timeout(500)
        for _ in range(10):
            next_btn = page.locator("button:has-text('Continue'), button:has-text('Next'), button:has-text('Enter FitCore')")
            if next_btn.first.is_visible():
                next_btn.first.click()
                page.wait_for_timeout(500)
            else:
                break

    page.wait_for_timeout(1000)

    # Check Bottom Nav (.nav-shell)
    nav_shell = page.locator(".nav-shell")
    print(f"Nav shell count: {nav_shell.count()}")
    if nav_shell.count() > 0:
        nav_bg = nav_shell.evaluate("el => window.getComputedStyle(el).backgroundColor")
        print(f"Nav shell background color: {nav_bg}")
        nav_backdrop = nav_shell.evaluate("el => window.getComputedStyle(el).backdropFilter")
        print(f"Nav shell backdrop filter: {nav_backdrop}")

    # Check for any .card-elev or .tile
    tiles = page.locator(".tile")
    print(f"Tiles count: {tiles.count()}")
    if tiles.count() > 0:
        tile_bg = tiles.first.evaluate("el => window.getComputedStyle(el).background")
        print(f"First tile background: {tile_bg[:100]}...")

    # Check for .premium-card (e.g. Loading state or if used elsewhere)
    # The Loading state in ui.tsx uses .premium-card

    # Screenshot the dashboard
    page.screenshot(path="verification/screenshots/pr3/dashboard_inspect.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 390, "height": 844})
        try:
            inspect_app(page)
        finally:
            browser.close()

if __name__ == "__main__":
    main()
