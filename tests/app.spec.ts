import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.goto('https://pywebide.com');
});

test.describe('Python Web IDE', () => {
    test('should have the correct title', async ({ page }) => {
        await expect(page).toHaveTitle(/Python Web IDE/);
    });

    test('should exist main.py at the start', async ({ page }) => {
        await expect(page.locator('.tab.active span')).toHaveText('main.py');
    });

    test('should allow creating a new file', async ({ page }) => {
        await page.click('button[title="New File (Ctrl+N)"]');
        const newFileName = 'test.py';
        page.on('dialog', async dialog => {
            await dialog.accept(newFileName);
            await expect(page.locator('.tab.active span')).toHaveText(newFileName);
        });
    });
});

