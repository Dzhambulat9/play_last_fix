import { test, expect, } from '@playwright/test';
import { clientURL, Configuration, hostName, alloyAllPermisions, virtualVendor, ROOT_LOGIN, ROOT_PASSWORD, isCloudTest } from '../global_variables';
import { createRole, setRolePermissions, setObjectPermissions } from '../API/roles';
import { createUser, setUserPassword, assignUserRole } from '../API/users';
import { createGroup, addCameraToGroup, setGroupPermissions } from '../API/groups';
import { createCamera, deleteCameras, addVirtualVideo, changeSingleCameraActiveStatus, changeIPServerCameraActiveStatus, changeSingleCameraID, changeSingleCameraName, changeIPServerCameraID, changeIPServerCameraName} from '../API/cameras';
import { createLayout } from '../API/layouts';
import { getHostName } from '../API/host';
import { Locators } from '../locators/locators';
import { isCameraListOpen, cameraAnnihilator, layoutAnnihilator, groupAnnihilator, configurationCollector, userAnnihilator, roleAnnihilator, authorization, logout, openCameraList, clientNotFall, closeCameraList, compareTwoNumbers } from "../utils/utils.js";
const testUserLogin = "camera_test";
const testUserPassword = "User1234";

test.describe("Camera list. Common block", () => {

    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector();
        await cameraAnnihilator('all');
        await layoutAnnihilator('all');
        await roleAnnihilator('all');
        await userAnnihilator('all');
        await createCamera(4, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "1", "Camera", 0);
        await createCamera(1, virtualVendor, "Virtual IP server", "admin123", "admin", "0.0.0.0", "80", "5", "Camera", 4);
        await createLayout(Configuration.cameras, 2, 2, "Test Layout");
        await createRole("New_Role");
        await setRolePermissions("New_Role");
        await createUser(testUserLogin);
        await assignUserRole("New_Role", testUserLogin);
        await setUserPassword(testUserLogin, testUserPassword);
        console.log(Configuration);
        await addVirtualVideo(Configuration.cameras, "lprusa", "tracker");
        await changeSingleCameraActiveStatus(Configuration.cameras[2].cameraBinding, false);
        await changeIPServerCameraActiveStatus(Configuration.cameras[5].videochannelID, false);
        await changeIPServerCameraActiveStatus(Configuration.cameras[6].videochannelID, false);
        for (let camera of Configuration.cameras) {
            if (camera.isIpServer){
                await changeIPServerCameraName(camera.videochannelID, "Camera");
            }
        }
    });
    
    test.beforeEach(async ({ page }) => {
        const locators = new Locators(page);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        await locators.topMenuButton.click();
        await locators.preferences.click();
        await locators.showOnlyLiveCamerasPreference.uncheck();
        await locators.preferencesAccept.click();
    });
    
    
    test('Camera list without layouts (CLOUD-T113)', async ({ page }) => {
        test.skip(isCloudTest, "Test is skipped for cloud");
        const locators = new Locators(page);

        //Авторизуемся юзером без раскладок
        await logout(page);
        await authorization(page, testUserLogin, testUserPassword);
        //Проверяем что камеры отображаются в списке
        await expect(locators.cameraListItem.getByText('1.Camera', { exact: true })).toBeVisible();
        await expect(locators.cameraListItem.getByText('2.Camera', { exact: true })).toBeVisible();
        await expect(locators.cameraListItem.getByText('3.Camera', { exact: true })).toBeVisible();
        await expect(locators.cameraListItem.getByText('4.Camera', { exact: true })).toBeVisible();
        await expect(locators.cameraListItem.getByText('5.0.Camera', { exact: true })).toBeVisible();
        await expect(locators.cameraListItem.getByText('5.1.Camera', { exact: true })).toBeVisible();
        await expect(locators.cameraListItem.getByText('5.2.Camera', { exact: true })).toBeVisible();
        await expect(locators.cameraListItem.getByText('5.3.Camera', { exact: true })).toBeVisible();
        //Проверяем цвета камер в списке, чтобы включенные камеры были белыми, а выключенные нет
        await expect(locators.cameraListItem.getByText('1.Camera', { exact: true })).toHaveCSS("color", "rgb(250, 250, 250)");
        await expect(locators.cameraListItem.getByText('3.Camera', { exact: true })).not.toHaveCSS("color", "rgb(250, 250, 250)");
        await expect(locators.cameraListItem.getByText('5.0.Camera', { exact: true })).toHaveCSS("color", "rgb(250, 250, 250)");
        await expect(locators.cameraListItem.getByText('5.1.Camera', { exact: true })).not.toHaveCSS("color", "rgb(250, 250, 250)");
        await expect(locators.cameraListItem.getByText('5.2.Camera', { exact: true })).not.toHaveCSS("color", "rgb(250, 250, 250)");
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });
    
    
    test('Camera list with layouts (CLOUD-T121)', async ({ page }) => {
        const locators = new Locators(page);

        await openCameraList(page);
        //Проверяем что камеры на месте
        await expect(locators.cameraListItem.getByText('1.Camera', { exact: true })).toBeVisible();
        await expect(locators.cameraListItem.getByText('2.Camera', { exact: true })).toBeVisible();
        await expect(locators.cameraListItem.getByText('3.Camera', { exact: true })).toBeVisible();
        await expect(locators.cameraListItem.getByText('4.Camera', { exact: true })).toBeVisible();
        await expect(locators.cameraListItem.getByText('5.0.Camera', { exact: true })).toBeVisible();
        await expect(locators.cameraListItem.getByText('5.1.Camera', { exact: true })).toBeVisible();
        await expect(locators.cameraListItem.getByText('5.2.Camera', { exact: true })).toBeVisible();
        await expect(locators.cameraListItem.getByText('5.3.Camera', { exact: true })).toBeVisible();
        //Проверяем цвета камер в списке, чтобы включенные камеры были белыми, а выключенные нет
        await expect(locators.cameraListItem.getByText('1.Camera', { exact: true })).toHaveCSS("color", "rgb(250, 250, 250)");
        await expect(locators.cameraListItem.getByText('3.Camera', { exact: true })).not.toHaveCSS("color", "rgb(250, 250, 250)");
        await expect(locators.cameraListItem.getByText('5.0.Camera', { exact: true })).toHaveCSS("color", "rgb(250, 250, 250)");
        await expect(locators.cameraListItem.getByText('5.1.Camera', { exact: true })).not.toHaveCSS("color", "rgb(250, 250, 250)");
        await expect(locators.cameraListItem.getByText('5.2.Camera', { exact: true })).not.toHaveCSS("color", "rgb(250, 250, 250)");
        //Закрываем панель камер
        await locators.cameraPanelButton.click();
        await expect(locators.cameraListItem.first()).toBeHidden();
        await clientNotFall(page);
    });
    
    
    test('Change camera list width (CLOUD-T122)', async ({ page }) => {
        const locators = new Locators(page);

        await openCameraList(page);
        let panelSize = await locators.cameraListInnerSpace.boundingBox();
        await locators.cameraPanelDragline.hover();
        await page.mouse.down();
        await page.mouse.move(panelSize!.x + 400, 350); //panelSize нужно для облачных тестов, так как там панель не в (0, 0)
        await page.mouse.up();
        await closeCameraList(page);
        await openCameraList(page);
        //Берем размер панели из локалстораджа
        let listWidth = await page.evaluate(() => window.localStorage.getItem('cameraList'));
        //Сравниваем размер панели с тем что мы ранее двигали до 400px
        compareTwoNumbers(Number(listWidth), 400, 1);
        //Сравниваем реальный размер с ожидаемым
        panelSize = await locators.cameraListInnerSpace.boundingBox();
        compareTwoNumbers(Number(panelSize!.width), 400, 1);
        await locators.cameraPanelDragline.hover();
        await page.mouse.down();
        await page.mouse.move(panelSize!.x + 250, 350);
        await page.mouse.up();
        await closeCameraList(page);
        await openCameraList(page);
        listWidth = await page.evaluate(() => window.localStorage.getItem('cameraList'));
        panelSize = await locators.cameraListInnerSpace.boundingBox();
        compareTwoNumbers(Number(listWidth), 250, 1);
        compareTwoNumbers(Number(panelSize!.width), 250, 1);
        await clientNotFall(page);
    });
    
    test('Camera panel width saving after reload (CLOUD-T716)', async ({ page }) => {
        const locators = new Locators(page);

        await openCameraList(page);
        let panelSize = await locators.cameraListInnerSpace.boundingBox();
        await locators.cameraPanelDragline.hover();
        await page.mouse.down();
        await page.mouse.move(panelSize!.x + 400, 350); //panelSize нужно для облачных тестов, так как там панель не в (0, 0)
        await page.mouse.up();
        await closeCameraList(page);
        await page.reload();
        await openCameraList(page);
        //Берем размер панели из локалстораджа
        let listWidth = await page.evaluate(() => window.localStorage.getItem('cameraList'));
        compareTwoNumbers(Number(listWidth), 400, 1);
        //На всякий случай сравниваем реальный размер панели в UI с ожидаемым
        panelSize = await locators.cameraListInnerSpace.boundingBox();
        compareTwoNumbers(Number(panelSize!.width), 400, 1);
        await locators.cameraPanelDragline.hover();
        await page.mouse.down();
        await page.mouse.move(panelSize!.x + 250, 350);
        await page.mouse.up();
        await closeCameraList(page);
        await page.reload();
        await openCameraList(page);
        listWidth = await page.evaluate(() => window.localStorage.getItem('cameraList'));
        panelSize = await locators.cameraListInnerSpace.boundingBox();
        compareTwoNumbers(Number(listWidth), 250, 1);
        compareTwoNumbers(Number(panelSize!.width), 250, 1);
        await clientNotFall(page);
    });

    test('Reltime list update (CLOUD-T123)', async ({ page }) => {
        const locators = new Locators(page);

        await locators.cameraPanelButton.click();
        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "10", "Camera");
        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "11", "Camera");
        await expect(locators.getCameraListItemLocator('10.Camera')).toBeVisible();
        await expect(locators.getCameraListItemLocator('11.Camera')).toBeVisible();
        await deleteCameras([Configuration.cameras[Configuration.cameras.length - 2].cameraBinding, Configuration.cameras[Configuration.cameras.length - 1].cameraBinding]);
        //Ждем пока удаленные камеры не исчезнут из списка
        await locators.getCameraListItemLocator('11.Camera').waitFor({ state: 'detached', timeout: 5000 });
        expect(await locators.getCameraListItemLocator('10.Camera').count()).toEqual(0);
        expect(await locators.getCameraListItemLocator('11.Camera').count()).toEqual(0);
        await clientNotFall(page);
    });
    
    test('Check "Manually open and close" parameter (CLOUD-T124)', async ({ page }) => {
        const locators = new Locators(page);

        await locators.cameraPanelButton.click();
        expect(await isCameraListOpen(page)).toBeTruthy();
        //Кликаем на камеру и смотрим чтобы список не закрылся
        await locators.getCameraListItemLocator('1.Camera').click();
        await expect(locators.gridcell.filter({ hasText: /1\.Camera/ })).toBeVisible();
        expect(await isCameraListOpen(page)).toBeTruthy();
        //Кликаем на панель с раскладками и смотрим чтобы список не закрылся
        await locators.layoutItems.click();
        expect(await isCameraListOpen(page)).toBeTruthy();
        //Отключаем параметр и повторяем предыдущие действия
        await locators.topMenuButton.click();
        await locators.preferences.click();
        await locators.manuallyOpenAndClosePreference.uncheck();
        await locators.preferencesAccept.click();
        await locators.layoutItems.click();
        expect(await isCameraListOpen(page)).not.toBeTruthy();
        await locators.cameraPanelButton.click();
        await locators.getCameraListItemLocator('3.Camera').click();
        await expect(locators.gridcell.filter({ hasText: /3\.Camera/ })).toBeVisible();
        expect(await isCameraListOpen(page)).toBeFalsy();
        await clientNotFall(page);
    });
    
    test('Check camera preview in list (CLOUD-T125)', async ({ page }) => {
        const locators = new Locators(page);

        await locators.cameraPanelButton.click();
        //Таймаут чтобы список успел прогрузится
        await page.waitForTimeout(5000);
        //Слушаем поток запросов 
        let requestPromise = page.waitForRequest(request => request.url().includes(`/live/media/snapshot/${hostName}/DeviceIpint.1/SourceEndpoint.video:0:1`));
        await locators.getCameraListItemLocator('1.Camera').hover();
        await requestPromise;
        await expect(locators.snapshotPreview.locator('img[alt="1.Camera"]')).toHaveAttribute("src", /blob:.*/);
        await locators.getCameraListItemLocator('3.Camera').hover();
        //Снапшоты с заглушкой содержат не img, а svg
        await expect(locators.snapshotPreview.locator('svg')).toBeVisible();
        requestPromise = page.waitForRequest(request => request.url().includes(`/live/media/snapshot/${hostName}/DeviceIpint.5/SourceEndpoint.video:0:1`));
        await locators.getCameraListItemLocator('5.0.Camera').hover();
        await requestPromise;
        await expect(locators.snapshotPreview.locator('img[alt="5.0.Camera"]')).toHaveAttribute("src", /blob:.*/);
        await locators.getCameraListItemLocator('5.1.Camera').hover();
        await expect(locators.snapshotPreview.locator('svg')).toBeVisible();
        await clientNotFall(page);
    });
    
    test('Check "Open selected camera on layout" parameter (CLOUD-T126)', async ({ page }) => {
        const locators = new Locators(page);

        await locators.cameraPanelButton.click();
        await locators.getCameraListItemLocator('1.Camera').click();
        await expect(locators.cellTitle).toHaveCount(1);
        await expect(locators.cellTitle.nth(0)).toHaveText("1.Camera");
    
        await locators.getCameraListItemLocator('5.0.Camera').click();
        await expect(locators.cellTitle).toHaveCount(1);
        await expect(locators.cellTitle.first().nth(0)).toHaveText("5.0.Camera");
    
        await locators.topMenuButton.click();
        await locators.preferences.click();
        await locators.openCameraOnLayoutPreference.check();
        await locators.preferencesAccept.click();
    
        await locators.getCameraListItemLocator('1.Camera').click();
        await expect(locators.cellTitle).toHaveCount(4);
        await expect(locators.cellTitle.nth(0)).toHaveText("1.Camera");
    
        await locators.getCameraListItemLocator('5.0.Camera').click();
        await expect(locators.cellTitle).toHaveCount(1);
        await expect(locators.cellTitle.nth(0)).toHaveText("5.0.Camera");
        await clientNotFall(page);
    });
    
    test('Check "Show only live cameras" parameter (CLOUD-T127)', async ({ page }) => {
        const locators = new Locators(page);

        await locators.topMenuButton.click();
        await locators.preferences.click();
        await locators.showOnlyLiveCamerasPreference.check();
        await locators.preferencesAccept.click();

        await locators.cameraPanelButton.click();
        await locators.getCameraListItemLocator('1.Camera').waitFor({ state: 'attached', timeout: 5000 });
        //Смотрим что выключенных камер нет в списке
        for (let camera of Configuration.cameras) {
            if (camera.isActivated) {
                await expect(locators.getCameraListItemLocator(`${camera.displayId}.${camera.displayName}`)).toHaveCount(1);
            } else {
                await expect(locators.getCameraListItemLocator(`${camera.displayId}.${camera.displayName}`)).toHaveCount(0);
            }
        };
    
        await locators.topMenuButton.click();
        await locators.preferences.click();
        await locators.showOnlyLiveCamerasPreference.uncheck();
        await locators.preferencesAccept.click();

        await locators.getCameraListItemLocator('5.3.Camera').waitFor({ state: 'attached', timeout: 5000 });
        for (let camera of Configuration.cameras) {
            await expect(locators.getCameraListItemLocator(`${camera.displayId}.${camera.displayName}`)).toHaveCount(1);
        };

        await clientNotFall(page);
    });
    
    
    test('Check "Show device IDs" parameter (CLOUD-T128)', async ({ page }) => {
        const locators = new Locators(page);

        await locators.topMenuButton.click();
        await locators.preferences.click();
        await locators.showDeviceIDsPreference.uncheck();
        await locators.preferencesAccept.click();

        await locators.cameraPanelButton.click();
        await locators.getCameraListItemLocator('Camera').first().waitFor({ state: 'attached', timeout: 5000 });
        await expect(locators.getCameraListItemLocator('Camera')).toHaveCount(8);
        await expect(locators.sortByIdButton).toBeHidden();
    
        await locators.topMenuButton.click();
        await locators.preferences.click();
        await locators.showDeviceIDsPreference.check();
        await locators.preferencesAccept.click();

        await locators.getCameraListItemLocator('1.Camera').waitFor({ state: 'attached', timeout: 5000 });
        await expect(locators.getCameraListItemLocator('Camera')).toHaveCount(0);
        await expect(locators.sortByIdButton).toBeVisible();
        await clientNotFall(page);
    });
    
    
    test('Realtime camera status change in list (CLOUD-T129)', async ({ page }) => {
        const locators = new Locators(page);

        // await logout(page);
        // await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        // const WS = await page.waitForEvent("websocket", ws => ws.url().includes("/events?") && !ws.isClosed());
        // console.log(WS.url());

        await locators.cameraPanelButton.click();
    
        await changeSingleCameraActiveStatus(Configuration.cameras[0].cameraBinding, false);
        await changeSingleCameraActiveStatus(Configuration.cameras[1].cameraBinding, false);
        await changeIPServerCameraActiveStatus(Configuration.cameras[4].videochannelID, false);
        await page.waitForTimeout(5000);
        
        // function handler(wsEvent) {
        //     console.log(new Date(), wsEvent.payload);
        // }
        // WS.on('framereceived', handler);
        // page.on("request", async request => {
        //     if (request.url().includes(`batch`)) {
        //         let response = await request.response();
        //         console.log(new Date(), await response!.json());
        //     }
        // });
    
        //Проверяем подсветку выключенных/включенных одиночных и nvr-камер в списке
        for (let camera of Configuration.cameras) {
            if (camera.isActivated) {
                await expect.soft(locators.cameraListItem.getByText(`${camera.displayId}.${camera.displayName}`, { exact: true })).toHaveCSS("color", "rgb(250, 250, 250)");
            } else {
                await expect.soft(locators.cameraListItem.getByText(`${camera.displayId}.${camera.displayName}`, { exact: true })).not.toHaveCSS("color", "rgb(250, 250, 250)");
                //Включаем камеры обратно
                console.log(new Date(), `${camera.displayId}.${camera.displayName} включаем`);
                if (camera.isIpServer) {
                    await changeIPServerCameraActiveStatus(camera.videochannelID, true);
                } else {
                    await changeSingleCameraActiveStatus(camera.cameraBinding, true);
                }
            }
        };

        //Проверяем что все камеры отображаются как включенные
        for (let camera of Configuration.cameras) {
            await expect.soft(locators.cameraListItem.getByText(`${camera.displayId}.${camera.displayName}`, { exact: true })).toHaveCSS("color", "rgb(250, 250, 250)");
        };

        // WS.removeListener('framereceived', handler);

        await clientNotFall(page);
    });
    
    test('Camera ID change (CLOUD-T130)', async ({ page }) => {
        const locators = new Locators(page);
    
        await changeSingleCameraID(Configuration.cameras[0].cameraBinding, "100");
        await changeSingleCameraID(Configuration.cameras[2].cameraBinding, "A");
        await changeIPServerCameraID(Configuration.cameras[4].videochannelID, "11");
        await changeIPServerCameraID(Configuration.cameras[6].videochannelID, "5");
    
        await locators.cameraPanelButton.click();

        await expect(locators.cameraListItem.getByText('100.Camera', { exact: true })).toBeVisible();
        await expect(locators.cameraListItem.getByText('A.Camera', { exact: true })).toBeVisible();
        await expect(locators.cameraListItem.getByText('5.11.Camera', { exact: true })).toBeVisible();
        await expect(locators.cameraListItem.getByText('5.5.Camera', { exact: true })).toBeVisible();
        await clientNotFall(page);
    });
    
    test('Camera name change (CLOUD-T131)', async ({ page }) => {
        const locators = new Locators(page);
    
        await changeSingleCameraName(Configuration.cameras[1].cameraBinding, "Device");
        await changeSingleCameraName(Configuration.cameras[3].cameraBinding, "221B Baker Street");
        await changeIPServerCameraName(Configuration.cameras[5].videochannelID, "Кабинет 1-эт");
        await changeIPServerCameraName(Configuration.cameras[7].videochannelID, "undefined");
    
        await locators.cameraPanelButton.click();
    
        await expect(locators.cameraListItem.getByText('2.Device', { exact: true })).toBeVisible();
        await expect(locators.cameraListItem.getByText('4.221B Baker Street', { exact: true })).toBeVisible();
        await expect(locators.cameraListItem.getByText('5.1.Кабинет 1-эт', { exact: true })).toBeVisible();
        await expect(locators.cameraListItem.getByText('5.3.undefined', { exact: true })).toBeVisible();
        await clientNotFall(page);
    });
       
})



test.describe("Camera list. Searching block", () => {

    const testCameraNames = [
        {
            fullId: "100",
            id: "100",
            name: "Smith & Wesson"
        },
        {
            fullId: "2",
            id: "2",
            name: "Device"
        },
        {
            fullId: "A",
            id: "A",
            name: "Camera"
        },
        {
            fullId: "4",
            id: "4",
            name: "221B Baker Street"
        },
        {
            fullId: "5.11",
            id: "11",
            name: `!@#$%^&*()_+=?<'>""/|\\.,~:;`
        },
        {
            fullId: "5.1",
            id: "1",
            name: `Кабинет 1-эт`
        },
        {
            fullId: "5.5",
            id: "5",
            name: `Площадь`
        },
        {
            fullId: "5.3",
            id: "3",
            name: `undefined`
        },
    ];
    
    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector();
        if (!(await setRolePermissions("New_Role")) || Configuration.cameras.length != 8) {
            await cameraAnnihilator("all");
            await roleAnnihilator("all");
            await createCamera(4, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "1", "Camera", 0);
            await createCamera(1, virtualVendor, "Virtual IP server", "admin123", "admin", "0.0.0.0", "80", "5", "Camera", 4);
            console.log(Configuration);
            await addVirtualVideo(Configuration.cameras, "lprusa", "tracker");
            await createRole("New_Role");
            await setRolePermissions("New_Role");
            await createUser(testUserLogin);
            await assignUserRole("New_Role", testUserLogin);
            await setUserPassword(testUserLogin, testUserPassword);
        }
        //Проверяем текущую конфигурацию камер и меняем их ID/имена если они не совпадают с тестовым списком
        for (let i = 0; i < Configuration.cameras.length; i++) {
            if (Configuration.cameras[i].displayId != testCameraNames[i].fullId) {
                if (Configuration.cameras[i].isIpServer) {
                    await changeIPServerCameraID(Configuration.cameras[i].videochannelID, testCameraNames[i].id);
                } else {
                    await changeSingleCameraID(Configuration.cameras[i].cameraBinding, testCameraNames[i].id);
                }
            }
            if (Configuration.cameras[i].displayName != testCameraNames[i].name) {
                if (Configuration.cameras[i].isIpServer) {
                    await changeIPServerCameraName(Configuration.cameras[i].videochannelID, testCameraNames[i].name);
                } else {
                    await changeSingleCameraName(Configuration.cameras[i].cameraBinding, testCameraNames[i].name);
                }
            }
        }
    });
      
    test.beforeEach(async ({ page }) => {
        const locators = new Locators(page);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        await locators.topMenuButton.click();
        await locators.preferences.click();
        await locators.showOnlyLiveCamerasPreference.uncheck();
        await locators.preferencesAccept.click();
    });

    test('Sort by name (CLOUD-T133) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await openCameraList(page);
        await locators.sortByNameButton.click();
        
        await expect(locators.cameraListItem.nth(0)).toHaveText('5.5.Площадь', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(1)).toHaveText('5.1.Кабинет 1-эт', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(2)).toHaveText('5.3.undefined', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(3)).toHaveText('100.Smith & Wesson', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(4)).toHaveText('2.Device', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(5)).toHaveText('A.Camera', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(6)).toHaveText('4.221B Baker Street', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(7)).toHaveText(`5.11.!@#$%^&*()_+=?<'>""/|\\.,~:;`, { ignoreCase: false });
    
        await locators.sortByNameButton.click();
    
        await expect(locators.cameraListItem.nth(0)).toHaveText(`5.11.!@#$%^&*()_+=?<'>""/|\\.,~:;`, { ignoreCase: false });
        await expect(locators.cameraListItem.nth(1)).toHaveText('4.221B Baker Street', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(2)).toHaveText('A.Camera', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(3)).toHaveText('2.Device', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(4)).toHaveText('100.Smith & Wesson', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(5)).toHaveText('5.3.undefined', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(6)).toHaveText('5.1.Кабинет 1-эт', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(7)).toHaveText('5.5.Площадь', { ignoreCase: false });
        await clientNotFall(page);
    });
    
    test('Sort by ID (CLOUD-T134) #smoke', async ({ page }) => {
        const locators = new Locators(page);
    
        await openCameraList(page);
        
        await expect(locators.cameraListItem.nth(0)).toHaveText('2.Device', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(1)).toHaveText('4.221B Baker Street', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(2)).toHaveText('5.1.Кабинет 1-эт', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(3)).toHaveText('5.3.undefined', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(4)).toHaveText('5.5.Площадь', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(5)).toHaveText(`5.11.!@#$%^&*()_+=?<'>""/|\\.,~:;`, { ignoreCase: false });
        await expect(locators.cameraListItem.nth(6)).toHaveText('100.Smith & Wesson', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(7)).toHaveText('A.Camera', { ignoreCase: false });
    
        await locators.sortByIdButton.click();
    
        await expect(locators.cameraListItem.nth(0)).toHaveText('A.Camera', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(1)).toHaveText('100.Smith & Wesson', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(2)).toHaveText(`5.11.!@#$%^&*()_+=?<'>""/|\\.,~:;`, { ignoreCase: false });
        await expect(locators.cameraListItem.nth(3)).toHaveText('5.5.Площадь', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(4)).toHaveText('5.3.undefined', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(5)).toHaveText('5.1.Кабинет 1-эт', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(6)).toHaveText('4.221B Baker Street', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(7)).toHaveText('2.Device', { ignoreCase: false });
        await clientNotFall(page);
    });
    
    test('Sort by favorite (CLOUD-T132)', async ({ page }) => {
        const locators = new Locators(page);

        await openCameraList(page);

        //Делаем камеры 2.Device, 5.3.undefined, A.Camera избранными
        await locators.cameraListItem.nth(0).hover();
        await locators.cameraCheckBox.nth(0).click();
        await locators.cameraListItem.nth(3).hover();
        await locators.cameraCheckBox.nth(1).click();
        await locators.cameraListItem.nth(7).hover();
        await locators.cameraCheckBox.nth(2).click();

        await locators.sortByFavoriteButton.click();

        await expect(locators.cameraListItem.nth(0)).toHaveText('2.Device', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(1)).toHaveText('5.3.undefined', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(2)).toHaveText('A.Camera', { ignoreCase: false });

        await locators.cameraCheckBox.nth(1).click();
        await expect(locators.cameraListItem.nth(0)).toHaveText('2.Device', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(1)).toHaveText('A.Camera', { ignoreCase: false });

        await locators.cameraCheckBox.nth(0).click();
        await expect(locators.cameraListItem.nth(0)).toHaveText('A.Camera', { ignoreCase: false });

        await locators.sortByFavoriteButton.click();
        await expect(locators.cameraListItem.nth(7)).toHaveText('A.Camera', { ignoreCase: false });
        await clientNotFall(page);
    });
    
    test('Sort by imported list (CLOUD-T135)', async ({ page }) => {
        const locators = new Locators(page);

        await openCameraList(page);
    
        //Загружаем xlsx файл
        await locators.importCamerasListButton.setInputFiles('./test_data/example.xlsx');
        await expect(locators.cameraListItem.nth(0)).toHaveText('4.221B Baker Street', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(1)).toHaveText('5.1.Кабинет 1-эт', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(2)).toHaveText('5.3.undefined', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(3)).toHaveText(`5.11.!@#$%^&*()_+=?<'>""/|\\.,~:;`, { ignoreCase: false });
        await expect(locators.cameraListItem.nth(4)).toHaveText('100.Smith & Wesson', { ignoreCase: false });
        //Проверяем, что чекбоксы камер в списке активны
        for (let item of await locators.cameraCheckBox.all()) {
            expect(item.isChecked());
        }
        //Убираем сорировку и проверяем название последней камеры
        await locators.sortByFavoriteButton.click();
        await expect(locators.cameraListItem.nth(7)).toHaveText('A.Camera', { ignoreCase: false });
        await clientNotFall(page);
    });
    
    test('Search by partial match (CLOUD-T136) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const searchList = ["1B", "e", "Street", "DEV", "ка"];
    
        await openCameraList(page);
        await locators.cameraListItem.first().waitFor({ state: 'attached' });
    
        for (let input of searchList) {
            await locators.search.fill(input);
            await locators.progressbar.waitFor({ state: 'attached', timeout: 5000 });
            await locators.progressbar.waitFor({ state: 'detached', timeout: 5000 });
            let camerasCount = await locators.cameraListItem.count();
            if (input === "e") {
                expect(camerasCount).toEqual(5);
            } else {
                expect(camerasCount).toEqual(1);
            }   
        }
        await clientNotFall(page);
    });
    
    test('Search by single ID (CLOUD-T137) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const searchList = ["4", "100", "100.", "5"];
    
        await openCameraList(page);
        await locators.cameraListItem.first().waitFor({ state: 'attached' });
    
        for (let input of searchList) {
            await locators.search.fill(input);
            await locators.progressbar.waitFor({ state: 'attached', timeout: 5000 });
            await locators.progressbar.waitFor({ state: 'detached', timeout: 5000 });
            let camerasCount = await locators.cameraListItem.count();
            if (input === "5") {
                expect(camerasCount).toEqual(4);
            } else {
                expect(camerasCount).toEqual(1);
            }   
        }
        await clientNotFall(page);
    });
    
    test('Search by double ID (CLOUD-T764) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const searchList = ["5.1", "5.3", "5.5.", "5.11."];
    
        await openCameraList(page);
        await locators.cameraListItem.first().waitFor({ state: 'attached' });
    
        for (let input of searchList) {
            await locators.search.fill(input);
            await locators.progressbar.waitFor({ state: 'attached', timeout: 5000 });
            await locators.progressbar.waitFor({ state: 'detached', timeout: 5000 });
            let camerasCount = await locators.cameraListItem.count();
            if (input === "5.1") {
                expect(camerasCount).toEqual(2);
            } else {
                expect(camerasCount).toEqual(1);
            }   
        }
        await clientNotFall(page);
    });
    
    test('Search by fullname, case sensitive (CLOUD-T762)', async ({ page }) => {
        const locators = new Locators(page);
        const searchList = ["221B Baker Street", "Device", "Кабинет 1-эт", "undefined"];
    
        await openCameraList(page);
        await locators.cameraListItem.first().waitFor({ state: 'attached' });
    
        for (let input of searchList) {
            await locators.search.fill(input);
            await locators.progressbar.waitFor({ state: 'attached', timeout: 5000 });
            await locators.progressbar.waitFor({ state: 'detached', timeout: 5000 });
            let camerasCount = await locators.cameraListItem.count();
            expect(camerasCount).toEqual(1);
        }
        await clientNotFall(page);
    });
    
    test('Search by fullname, case insensitive (CLOUD-T763)', async ({ page }) => {
        const locators = new Locators(page);
        const searchList = ["221b baker street", "DEVICE", "camera"];
    
        await openCameraList(page);
        await locators.cameraListItem.first().waitFor({ state: 'attached' });
    
        for (let input of searchList) {
            await locators.search.fill(input);
            await locators.progressbar.waitFor({ state: 'attached', timeout: 5000 });
            await locators.progressbar.waitFor({ state: 'detached', timeout: 5000 });
            let camerasCount = await locators.cameraListItem.count();
            expect(camerasCount).toEqual(1);
        }
        await clientNotFall(page);
    });

    test('Search by ID.NAME template (CLOUD-T757)', async ({ page }) => {
        const locators = new Locators(page);
        const searchList = ["4.221", "4.221B Baker Street", "5.5.Площадь", "5.3.unde", "A.Cam"];
    
        await openCameraList(page);
        await locators.cameraListItem.first().waitFor({ state: 'attached' });
    
        for (let input of searchList) {
            await locators.search.fill(input);
            await locators.progressbar.waitFor({ state: 'attached', timeout: 5000 });
            await locators.progressbar.waitFor({ state: 'detached', timeout: 5000 });
            let camerasCount = await locators.cameraListItem.count();
            expect(camerasCount).toEqual(1);
        }
        await clientNotFall(page);
    });
    
    test('Search by nonexistent camera (CLOUD-T139)', async ({ page }) => {
        const locators = new Locators(page);
        const searchList = ["200", "null", "nihill"];
    
        await openCameraList(page);
        await locators.cameraListItem.first().waitFor({ state: 'attached' });
    
        for (let input of searchList) {
            await locators.search.fill(input);
            await locators.progressbar.waitFor({ state: 'attached', timeout: 5000 });
            await locators.progressbar.waitFor({ state: 'detached', timeout: 5000 });
            let camerasCount = await locators.cameraListItem.count();
            expect(camerasCount).toEqual(0);
        }
        await clientNotFall(page);
    });
    
    test('Search by special symbols (CLOUD-T138)', async ({ page }) => {
        const locators = new Locators(page);
        const searchList = ["!", "@", "$", "%", "*", "^", "(", ")", "-", "_", "=", "?", "<", "'", ">", '"', "/", "|", "\\", ".", ",", "~", ":", ";", " ", "#", "+", "&"];
    
        await openCameraList(page);
        await locators.cameraListItem.first().waitFor({ state: 'attached' });
    
        for (let input of searchList) {
            await locators.search.fill(input);
            await locators.progressbar.waitFor({ state: 'attached', timeout: 5000 });
            await locators.progressbar.waitFor({ state: 'detached', timeout: 5000 });
            let camerasCount = await locators.cameraListItem.count();
            switch(input) {
                case "&":
                    expect(camerasCount).toEqual(2);
                    break;
                case " ":
                    expect(camerasCount).toEqual(3);
                    break;
                case ".":
                    expect(camerasCount).toEqual(8);
                    break;
                default:
                    expect(camerasCount).toEqual(1);
            }
        }
        await clientNotFall(page);
    });
    
    test('Camera list with gruops (CLOUD-T140) #smoke', async ({ page }) => {
        const locators = new Locators(page);
    
        await groupAnnihilator("all");
        const first = await createGroup("First");
        const second = await createGroup("Second");
        const subfirst = await createGroup("Subfirst", first);
    
        await addCameraToGroup(first, [Configuration.cameras[0], Configuration.cameras[3], Configuration.cameras[7], Configuration.cameras[5]]);
        await addCameraToGroup(subfirst, [Configuration.cameras[0], Configuration.cameras[5], Configuration.cameras[6]]);
        await addCameraToGroup(second, [Configuration.cameras[1], Configuration.cameras[2], Configuration.cameras[4]]);
    
        const responsePromise = page.waitForResponse(request => request.url().includes('/group'));
        await page.reload();
        await responsePromise;
    
        await openCameraList(page);
        await expect(locators.groupList).toHaveText('Default', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(0)).toHaveText('2.Device', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(7)).toHaveText('A.Camera', { ignoreCase: false });
        await expect(locators.cameraListItem).toHaveCount(8);
        
        await locators.groupList.click();
        await locators.groupList.getByRole('button', { name: "First", exact: true }).click();
        await expect(locators.groupList).toHaveText('First', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(0)).toHaveText('4.221B Baker Street', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(3)).toHaveText('100.Smith & Wesson', { ignoreCase: false });
        await expect(locators.cameraListItem).toHaveCount(4);
    
        await locators.groupList.click();
        await locators.groupList.getByRole('button', { name: "Second", exact: true }).click();
        await expect(locators.groupList).toHaveText('Second', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(0)).toHaveText('2.Device', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(2)).toHaveText('A.Camera', { ignoreCase: false });
        await expect(locators.cameraListItem).toHaveCount(3);
    
        await locators.groupList.click();
        await locators.groupList.getByRole('button', { name: "First > Subfirst", exact: true }).click();
        await expect(locators.groupList).toHaveText('Subfirst', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(0)).toHaveText('5.1.Кабинет 1-эт', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(2)).toHaveText('100.Smith & Wesson', { ignoreCase: false });
        await expect(locators.cameraListItem).toHaveCount(3);
    
        await locators.groupList.click();
        await locators.groupList.getByRole('button', { name: "Default", exact: true }).click();
        await expect(locators.groupList).toHaveText('Default', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(0)).toHaveText('2.Device', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(7)).toHaveText('A.Camera', { ignoreCase: false });
        await expect(locators.cameraListItem).toHaveCount(8);
        await clientNotFall(page);
    });

    test('Multiple check of camera group panel (CLOUD-T926)', async ({ page }) => {
        const locators = new Locators(page);

        if (Configuration.groups.length != 4) {
            await groupAnnihilator("all");
            const first = await createGroup("First");
            const second = await createGroup("Second");
            const subfirst = await createGroup("Subfirst", first);
            await addCameraToGroup(first, [Configuration.cameras[0], Configuration.cameras[3], Configuration.cameras[7], Configuration.cameras[5]]);
            await addCameraToGroup(subfirst, [Configuration.cameras[0], Configuration.cameras[5], Configuration.cameras[6]]);
            await addCameraToGroup(second, [Configuration.cameras[1], Configuration.cameras[2], Configuration.cameras[4]]);
        }

        for (let i = 1; i <= 20; i++ ) {
            const responsePromise = page.waitForResponse(request => request.url().includes('/group'));
            await page.reload();
            await responsePromise;
            await expect(locators.groupList).toHaveText('Default', { ignoreCase: false });
            await locators.groupList.click();
            await expect(locators.groupList.getByRole('button', { name: "First", exact: true })).toBeVisible();
            await expect(locators.groupList.getByRole('button', { name: "Second", exact: true })).toBeVisible();
            await expect(locators.groupList.getByRole('button', { name: "First > Subfirst", exact: true })).toBeVisible();
            // console.log(`Прогон #${i}`);
        }
        await clientNotFall(page);
    });

    test('Presentation of empty group (CLOUD-T1090)', async ({ page }) => {
        const locators = new Locators(page);

        if (Configuration.groups.length != 4) {
            await groupAnnihilator("all");
            const first = await createGroup("First");
            const second = await createGroup("Second");
            const subfirst = await createGroup("Subfirst", first);
            await addCameraToGroup(first, [Configuration.cameras[0], Configuration.cameras[3], Configuration.cameras[7], Configuration.cameras[5]]);
            await addCameraToGroup(subfirst, [Configuration.cameras[0], Configuration.cameras[5], Configuration.cameras[6]]);
            await addCameraToGroup(second, [Configuration.cameras[1], Configuration.cameras[2], Configuration.cameras[4]]);
        }

        await createGroup("Empty");
        const responsePromise = page.waitForResponse(request => request.url().includes('/group'));
        await page.reload();
        await responsePromise;
        await openCameraList(page);
        await expect(locators.groupList).toHaveText('Default', { ignoreCase: false });
        await expect(locators.cameraListItem).toHaveCount(8);
        await locators.groupList.click();
        let defaultGroupColor = await locators.groupList.evaluate((elem) => {
            let defaultGroupBlock = elem.querySelector('[role="button"]:nth-child(1)');
            return getComputedStyle(defaultGroupBlock!).color;
        })
        console.log('Default group color is:', defaultGroupColor);
        await expect(locators.groupList.getByRole('button', { name: "First", exact: true })).toHaveCSS('color', defaultGroupColor);
        await expect(locators.groupList.getByRole('button', { name: "Empty", exact: true })).not.toHaveCSS('color', defaultGroupColor);
        await locators.groupList.getByRole('button', { name: "First", exact: true }).click();
        await expect(locators.cameraListItem).toHaveCount(4);
        await locators.groupList.click();
        await locators.groupList.getByRole('button', { name: "Empty", exact: true }).click();
        await expect(locators.cameraListItem).toHaveCount(0);
        await locators.groupList.click();
        await locators.groupList.getByRole('button', { name: "Default", exact: true }).click();
        await expect(locators.cameraListItem).toHaveCount(8);

        await clientNotFall(page);
    });

    test('Access to groups panel check (CLOUD-T503)', async ({ page }) => {
        test.skip(isCloudTest, "Test is skipped for cloud");
        const locators = new Locators(page);
        const userWithoutGroupPanel = { feature_access: alloyAllPermisions.feature_access.filter(permission => permission != "FEATURE_ACCESS_GROUP_PANEL") };
      
        const extra = await createGroup("Extra");
        await addCameraToGroup(extra, [Configuration.cameras[0], Configuration.cameras[3]]);
        await setRolePermissions("New_Role", userWithoutGroupPanel);
        
        await logout(page);
        await authorization(page, testUserLogin, testUserPassword);
    
        await expect(locators.groupList).toBeHidden();
        await expect(locators.cameraListItem.nth(0)).toHaveText('2.Device', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(7)).toHaveText('A.Camera', { ignoreCase: false });
        await expect(locators.cameraListItem).toHaveCount(8);
        await clientNotFall(page);
    });

    test('Access to group check (CLOUD-T1091)', async ({ page }) => {
        test.skip(isCloudTest, "Test is skipped for cloud");
        const locators = new Locators(page);
      
        const blockedGroup = await createGroup("Forbidden");
        await setRolePermissions("New_Role");
        await addCameraToGroup(blockedGroup, [Configuration.cameras[0]]);
        await setGroupPermissions(blockedGroup, "New_Role", 'CAMERA_ACCESS_FORBID');
        
        await logout(page);
        const responsePromise = page.waitForResponse(request => request.url().includes('/group'));
        await authorization(page, testUserLogin, testUserPassword);
        await responsePromise;
        await locators.groupList.click();
        await expect(locators.groupList.getByRole('button', { name: "Default", exact: true })).toBeVisible();
        await expect(locators.groupList.getByRole('button', { name: "Forbidden", exact: true })).toBeHidden();

        await clientNotFall(page);
    });
    
    test('Access to cameras (CLOUD-T141)', async ({ page }) => {
        test.skip(isCloudTest, "Test is skipped for cloud");
        const locators = new Locators(page);

        await setObjectPermissions("New_Role", [Configuration.cameras[0].accessPoint, Configuration.cameras[1].accessPoint, Configuration.cameras[6].accessPoint, Configuration.cameras[7].accessPoint], "CAMERA_ACCESS_FORBID");
        
        await logout(page);
        await authorization(page, testUserLogin, testUserPassword);
        
        await expect(locators.cameraListItem.nth(0)).toHaveText('4.221B Baker Street', { ignoreCase: false });
        await expect(locators.cameraListItem.nth(3)).toHaveText('A.Camera', { ignoreCase: false });
        await expect(locators.cameraListItem).toHaveCount(4);
        await clientNotFall(page);
    });

    test('Access to cameras when rights setup forbidden (CLOUD-T978)', async ({ page }) => {
        test.skip(isCloudTest, "Test is skipped for cloud");
        const locators = new Locators(page);
        const rightsSetupForbid = { user_rights_setup_access: "USER_RIGHTS_SETUP_ACCESS_NO" };
        const camerasEnpoints = Configuration.cameras.map(item => { return item.accessPoint });

        await setObjectPermissions("New_Role", camerasEnpoints, "CAMERA_ACCESS_FORBID");
        await setRolePermissions("New_Role", rightsSetupForbid);

        await logout(page);
        await authorization(page, testUserLogin, testUserPassword);

        const cameraListRequest = page.waitForResponse(response => response.url().includes('/camera/list') && response.ok());
        await openCameraList(page);
        await cameraListRequest;
        await expect(locators.cameraListItem).toHaveCount(0);
        await clientNotFall(page);
    });

    test('Search by hebrew (CLOUD-T753)', async ({ page }) => {
        const locators = new Locators(page);
        const searchList = ["ה", "י", "סה", "נת", "פינת ישיבה", "כניסה"];
        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "פינת ישיבה", -1);
        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "כניסה", -1);

        await page.reload();
        await openCameraList(page);
        await locators.cameraListItem.first().waitFor({ state: 'attached' });
    
        for (let input of searchList) {
            await locators.search.fill(input);
            await locators.progressbar.waitFor({ state: 'attached', timeout: 5000 });
            await locators.progressbar.waitFor({ state: 'detached', timeout: 5000 });
            let camerasCount = await locators.cameraListItem.count();
            if (input === "ה" || input === "י") {
                expect.soft(camerasCount).toEqual(2);
            } else {
                expect.soft(camerasCount).toEqual(1);
            }   
        }
        await cameraAnnihilator(Configuration.cameras.slice(-2));
        await clientNotFall(page);
    });
    
});

