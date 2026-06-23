from playwright.sync_api import sync_playwright
import os

def capture_screens(page, output_dir, viewport):
    page.set_viewport_size(viewport)
    width = viewport["width"]
    height = viewport["height"]
    suffix = f"{width}x{height}"

    print(f"Capturing viewport: {suffix}")

    # 1. Onboarding
    page.goto("http://localhost:8080")
    page.wait_for_timeout(2000)

    # Click "Get started"
    get_started = page.get_by_role("button", name="Get started")
    if get_started.is_visible():
        page.screenshot(path=f"{output_dir}/onboarding_start_{suffix}.png")
        print("Clicking Get started")
        get_started.click()
        page.wait_for_timeout(1000)

        # Now we are in the onboarding flow.
        for i in range(15):
            # Try various button names that might appear
            next_btn = page.locator("button:has-text('Continue'), button:has-text('Next'), button:has-text('Complete'), button:has-text('Start Training'), button:has-text('Enter FitCore')")
            if next_btn.first.is_visible():
                print(f"Clicking onboarding button: {next_btn.first.inner_text()}")
                next_btn.first.click()
                page.wait_for_timeout(1000)
            else:
                break

    # 2. Home
    print("Capturing Home")
    page.wait_for_timeout(2000)
    page.screenshot(path=f"{output_dir}/home_{suffix}.png")

    # 3. Training
    print("Navigating to Training")
    page.get_by_label("Train").click()
    page.wait_for_timeout(1000)
    page.screenshot(path=f"{output_dir}/training_{suffix}.png")

    # 4. Active Workout (Start a workout)
    start_workout = page.get_by_role("button", name="Start Workout").first
    if start_workout.is_visible():
        print("Starting Workout")
        start_workout.click()
        page.wait_for_timeout(1000)
        page.screenshot(path=f"{output_dir}/active_workout_{suffix}.png")
        # Discard workout to return to normal
        page.get_by_role("button", name="Discard").first.click()
        page.wait_for_timeout(500)
        page.get_by_role("button", name="Yes, Discard").first.click()
        page.wait_for_timeout(1000)

    # 5. Nutrition
    print("Navigating to Nutrition")
    page.get_by_label("Fuel").click()
    page.wait_for_timeout(1000)
    page.screenshot(path=f"{output_dir}/nutrition_{suffix}.png")

    # 6. Quick-log sheet
    add_meal = page.get_by_role("button", name="Log Meal").first
    if add_meal.is_visible():
        print("Opening Log Meal sheet")
        add_meal.click()
        page.wait_for_timeout(1000)
        page.screenshot(path=f"{output_dir}/quick_log_nutrition_{suffix}.png")
        page.keyboard.press("Escape")
        page.wait_for_timeout(500)

    # 7. Recovery
    print("Navigating to Recovery")
    page.get_by_label("Recover").click()
    page.wait_for_timeout(1000)
    page.screenshot(path=f"{output_dir}/recovery_{suffix}.png")

    # 8. Progress
    print("Navigating to Progress")
    page.get_by_label("Stats").click()
    page.wait_for_timeout(1000)
    page.screenshot(path=f"{output_dir}/progress_{suffix}.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir="verification/videos/main")
        page = context.new_page()

        viewports = [
            {"width": 360, "height": 800},
            {"width": 390, "height": 844}
        ]

        for vp in viewports:
            capture_screens(page, "verification/screenshots/main", vp)

        context.close()
        browser.close()

if __name__ == "__main__":
    main()
