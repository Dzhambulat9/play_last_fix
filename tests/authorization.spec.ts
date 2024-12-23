import { test, expect, } from '@playwright/test';
import { clientURL, Configuration, isLocalMachine, alloyAllPermisions, virtualVendor, ROOT_LOGIN, ROOT_PASSWORD, isCloudTest } from '../global_variables';
import { createRole, setRolePermissions } from '../API/roles';
import { createUser, setUserPassword, assignUserRole, changeUserProperties} from '../API/users';
import { createCamera, addVirtualVideo} from '../API/cameras';
import { exchangeIndexCredentials } from '../utils/fs.mjs';
import { getHostName } from '../API/host';
import { Locators } from '../locators/locators';
import { configurationCollector, roleAnnihilator, userAnnihilator, clientNotFall, logout, authorization } from "../utils/utils.js";
import { timeToISO } from '../utils/archive_helpers.js';
const role = "Role";
const user = "User_test";
const userPassword = "Admin123"
const userWithoutWEB = { feature_access: alloyAllPermisions.feature_access.filter(permission => permission != "FEATURE_ACCESS_WEB_UI_LOGIN") };


test.describe("Authorization. Common block", () => {
    test.skip(isCloudTest, "Test is skipped for cloud");

    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector();
        await roleAnnihilator("all");
        await userAnnihilator("all");
        await createCamera(2, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "100");
        await addVirtualVideo(Configuration.cameras, "lprusa", "tracker");
        await createRole(role);
        await setRolePermissions(role);
        await createUser(user);
        await assignUserRole(role, user);
        await setUserPassword(user, userPassword);
        console.log(Configuration.users);
        console.log(Configuration.roles);
    });

    test.afterAll(async () => {
        if (isLocalMachine) exchangeIndexCredentials("", "");
    });

    test('Authorization attempt with an empty fields (CLOUD-T153)', async ({ page }) => {
        const locators = new Locators(page);

        await page.goto(clientURL);
        await locators.loginField.fill('');
        await locators.passwordField.fill('');
        await expect(locators.logInButton).toBeDisabled();
    });

    test('Authorization attempt with an empty password (CLOUD-T154) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await page.goto(clientURL);
        await locators.loginField.fill(ROOT_LOGIN);
        await locators.logInButton.click();
        await expect(locators.errorMessage).toHaveText("Invalid username or password");
        await expect(locators.loginField).toBeEmpty();
    });

    test('Authorization with default server URL (CLOUD-T417) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await page.goto(clientURL);
        await locators.loginField.fill(ROOT_LOGIN);
        await locators.passwordField.fill(ROOT_PASSWORD);
        await locators.passwordField.press('Enter');
        await expect(locators.splash).toBeHidden();
        await expect(locators.cellTitle.nth(0)).toBeVisible();
        await locators.topMenuButton.click();
        await expect(page.getByText('root', { exact: true })).toBeVisible(); 
        await locators.changeUser.click();
        await locators.loginField.fill(user);
        await locators.passwordField.fill(userPassword);
        await locators.passwordField.press('Enter');
        await locators.topMenuButton.click();
        await expect(page.getByText(user, { exact: true })).toBeVisible(); 
    });

    test('CloseSession call (CLOUD-T895)', async ({ page }) => {
        const locators = new Locators(page);

        await page.goto(clientURL);
        await locators.loginField.fill(ROOT_LOGIN);
        await locators.passwordField.fill(ROOT_PASSWORD);
        await locators.passwordField.press('Enter');
        await locators.topMenuButton.click();
        await expect(page.getByText('root', { exact: true })).toBeVisible(); 
        let closeSessionPromise = page.waitForResponse(response => response.url().includes('v1/authentication/close') && response.ok());
        await locators.changeUser.click();
        await closeSessionPromise;
        await locators.loginField.fill(user);
        await locators.passwordField.fill(userPassword);
        await locators.passwordField.press('Enter');
        await locators.topMenuButton.click();
        await expect(page.getByText(user, { exact: true })).toBeVisible();
        closeSessionPromise = page.waitForResponse(response => response.url().includes('v1/authentication/close') && response.ok());
        await locators.changeUser.click();
        await closeSessionPromise;
    });

    test('Authorization via index.html file (CLOUD-T633)', async ({ page }) => {
        test.skip(!isLocalMachine, "This test can be execute only if server stands on local machine");

        const locators = new Locators(page);
        
        exchangeIndexCredentials(user, userPassword);
        await page.goto(clientURL);
        await locators.topMenuButton.click();
        await expect(page.getByText(user, { exact: true })).toBeVisible();
        await locators.changeUser.click();
        await locators.topMenuButton.click();
        await expect(page.getByText(user, { exact: true })).toBeVisible();
        exchangeIndexCredentials("", "");
        await locators.changeUser.click();
        await locators.loginField.fill(ROOT_LOGIN);
        await locators.passwordField.fill(ROOT_PASSWORD);
        await locators.passwordField.press('Enter');
        await locators.topMenuButton.click();
        await expect(page.getByText('root', { exact: true })).toBeVisible(); 
    });

    test('Authorization attempt without access to WEBUI (CLOUD-T157)', async ({ page }) => {
        const locators = new Locators(page);
        
        await setRolePermissions(role, userWithoutWEB);
        await page.goto(clientURL);
        await locators.loginField.fill(user);
        await locators.passwordField.fill(userPassword);
        await locators.logInButton.click();
        await expect.soft(locators.errorMessage).toHaveText("Access forbidden");
        await expect.soft(locators.loginField).toBeEmpty();
        await expect.soft(locators.passwordField).toBeEmpty();
        await expect.soft(locators.splash).toBeVisible();
        await setRolePermissions(role);
    });

    test('Cancel password changing (CLOUD-T971)', async ({ page }) => {
        const locators = new Locators(page);

        await page.goto(clientURL);
        await locators.loginField.fill(user);
        await locators.passwordField.fill(userPassword);
        await locators.passwordField.press('Enter');
        await locators.topMenuButton.click();
        await expect(page.getByText(user, { exact: true })).toBeVisible();

        await locators.changePassword.click();
        await locators.newPassword.fill('Qwerty');
        await locators.newPasswordConfirm.fill('Qwerty');
        page.on("request", request => {
            if (request.url().includes(`password`)) {
                expect(false, "The password change request should not been sent").toBeTruthy();
            }
        });
        await locators.cancelPasswordChange.click();
        await page.waitForTimeout(2000);
        await clientNotFall(page);
    });

    test('Check the password reveal (CLOUD-T972)', async ({ page }) => {
        const locators = new Locators(page);

        await page.goto(clientURL);
        await locators.loginField.fill(user);
        await locators.passwordField.fill(userPassword);
        await locators.passwordField.press('Enter');
        await locators.topMenuButton.click();
        await expect(page.getByText(user, { exact: true })).toBeVisible();

        await locators.changePassword.click();
        await locators.newPassword.click();
        await page.keyboard.type("Qwerty");
        await locators.newPassword.fill('Qwerty');
        await expect(locators.newPassword).toHaveAttribute('type', 'password');
        await locators.passwordEye.click();
        await expect(locators.newPassword).toHaveAttribute('type', 'text');
        await expect(locators.newPassword).toHaveValue('Qwerty');
        await locators.newPassword.click();
        await page.keyboard.type("123");
        await expect(locators.newPassword).toHaveAttribute('type', 'text');
        await expect(locators.newPassword).toHaveValue('Qwerty123');
        await locators.passwordEye.click();
        await expect(locators.newPassword).toHaveAttribute('type', 'password');
        await clientNotFall(page);
    });

    test('Password changing (CLOUD-T970)', async ({ page }) => {
        const locators = new Locators(page);

        await page.goto(clientURL);
        await locators.loginField.fill(user);
        await locators.passwordField.fill(userPassword);
        await locators.passwordField.press('Enter');
        await locators.topMenuButton.click();
        await expect(page.getByText(user, { exact: true })).toBeVisible();

        await locators.changePassword.click();
        await expect(locators.acceptPasswordChange).toBeDisabled();
        await locators.newPassword.fill('Qwerty123');
        await locators.newPasswordConfirm.fill('Qwerty');
        await expect(locators.passwordChangeErrorMessage).toHaveText("Password not match");
        await expect(locators.acceptPasswordChange).toBeDisabled();
        await locators.newPasswordConfirm.fill('Qwerty123');
        await expect(locators.passwordChangeErrorMessage).toBeHidden();
        const passwordChangePromise = page.waitForResponse(response => response.url().includes('v1/security/password:change') && response.ok());
        await locators.acceptPasswordChange.click();
        await locators.dialogProgressbar.waitFor({ state: 'attached', timeout: 15000 });
        await locators.dialogProgressbar.waitFor({ state: 'detached', timeout: 15000 });
        await passwordChangePromise;

        await logout(page);
        await authorization(page, user, 'Qwerty123');
        await locators.topMenuButton.click();
        await expect(page.getByText(user, { exact: true })).toBeVisible();
        await clientNotFall(page);
    });

    test('Authorization attempt with blocked user (CLOUD-T1011)', async ({ page }) => {
        const locators = new Locators(page);
        
        await setRolePermissions(role);
        await setUserPassword(user, userPassword);
        await changeUserProperties(user, false);
        await page.goto(clientURL);
        await locators.loginField.fill(user);
        await locators.passwordField.fill(userPassword);
        await locators.logInButton.click();
        await expect.soft(locators.errorMessage).toHaveText("User account is locked");
        await expect.soft(locators.loginField).toBeEmpty();
        await expect.soft(locators.passwordField).toBeEmpty();
    });

    test('Authorization token refresh failure (CLOUD-T1130)', async ({ page }) => {
        const locators = new Locators(page);

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        //Меняем время истечения токена в локалсторадже
        await expect(locators.videoElement.first()).toBeVisible();
        let currentTime = new Date();
        currentTime.setSeconds(currentTime.getSeconds() + 20);
        const expiresAt = (timeToISO(currentTime)).replace(/\.\d{3}/, '');
        await page.evaluate((expiresAt) => {
            localStorage.expires_at = `"${expiresAt}"`;
        }, expiresAt);

        await page.reload();

        await page.route('**/v1/authentication/renew**', async route => {
            route.fulfill({ status: 500 });
        });

        await page.waitForResponse(request => request.url().includes('v1/authentication/renew') && request.status() == 500, { timeout: 20000 });
        await expect(locators.authorizationForm).toBeVisible();
        const authRequest = page.waitForResponse(response => response.url().includes('v1/authentication/authenticate_ex2') && response.ok());
        await locators.loginField.fill(ROOT_LOGIN);
        await locators.passwordField.fill(ROOT_PASSWORD);
        await locators.logInButton.click();
        const authResponseBody = await (await authRequest).json();
        console.log(authResponseBody);
        await expect(locators.authorizationForm).toBeHidden();
        await page.reload();
        await expect(locators.authorizationForm).toBeHidden();
        await expect(locators.videoElement.first()).toBeVisible();
        const expiresDate = await page.evaluate(() => window.localStorage.getItem('expires_at'));
        expect(expiresDate).toEqual(`"${authResponseBody?.expires_at}"`);

        await clientNotFall(page);
    });

    // test('Authorization with an empty password (CLOUD-T633)', async ({ page }) => {
    //     const locators = new Locators(page);

    //     await setUserPassword(user, '');
    //     await page.goto(clientURL);
    //     await locators.loginField.fill('user');
    //     await locators.loginField.press('Enter');
    //     await expect(locators.splash).toBeHidden();
    //     await expect(locators.cellTitle.nth(0)).toBeVisible();
    // });
});