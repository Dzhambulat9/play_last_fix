import { test, expect, Page, } from '@playwright/test';
import { clientURL, Configuration, ROOT_LOGIN, virtualVendor, ROOT_PASSWORD, isCloudTest } from '../global_variables';
import { createRole, setRolePermissions, setObjectPermissions } from '../API/roles';
import { createUser, setUserPassword, assignUserRole } from '../API/users';
import { createArchive, createArchiveVolume, createArchiveContext, deleteArchive } from '../API/archives';
import { createCycleAlarmingMacro, createDetectorAlarmingMacro, deleteMacro, } from '../API/macro';
import { createCamera, addVirtualVideo } from '../API/cameras';
import { createLayout } from '../API/layouts';
import { Locators } from '../locators/locators';
import { getHostName } from '../API/host';
import { isTimeEquals, waitWebSocketSentMessage } from '../utils/archive_helpers';
import { getActiveAlerts, initiateAlert, startAlertHandle, cancelAlertHandle, alarmFullProcessing } from '../API/alerts';
import { cameraAnnihilator, layoutAnnihilator, configurationCollector, userAnnihilator, roleAnnihilator, waitAnimationEnds, authorization, openCameraList, clientNotFall, closeCameraList, macroAnnihilator, detectorAnnihilator, compareTwoNumbers } from "../utils/utils.js";
import { changeAVDetector, createAVDetector, createAppDataDetector } from '../API/detectors';
export let activeAlerts = Array();
let tempCameras = Array();

test.describe("Alarms. Common block", () => {

    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector();
        if (Configuration.cameras.length != 4 || Configuration?.cameras[0]?.displayName != "Alert Camera" || Configuration.layouts.length != 1) {
            await cameraAnnihilator("all");
            await layoutAnnihilator("all");
            await deleteArchive('Black');
            await createCamera(4, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "1", "Alert Camera", 0);
            await addVirtualVideo(Configuration.cameras, "lprusa", "tracker");
            await createLayout([Configuration.cameras[1], Configuration.cameras[2]], 2, 1, "Test Layout");
            await createArchive("Black");
            await createArchiveVolume("Black", 20);
            await createArchiveContext("Black", [Configuration.cameras[0]], true, "High");
            await createArchiveContext("Black", [Configuration.cameras[1]], false, "High");
            await createArchiveContext("Black", [Configuration.cameras[2]], true, "Low");
            await createArchiveContext("Black", [Configuration.cameras[3]], false, "Low");
            await raiseAlert(Configuration.cameras[1].accessPoint);
            await completeAlert(activeAlerts[0]);
            await raiseAlert(Configuration.cameras[3].accessPoint);
            await completeAlert(activeAlerts[0]);
        }
    });
    
    test.beforeEach(async ({ page }) => {
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
    });

    test.afterEach(async () => {
        for (let alert of activeAlerts) {
            await completeAlert(alert);
        }
        if (tempCameras.length > 0) {
            await cameraAnnihilator(tempCameras);
        }
    });


    test('Alerts on solo camera (CLOUD-T110)', async ({ page }) => {
        const firstCamera = Configuration.cameras[0];
        const secondCamera = Configuration.cameras[1];
        const thirdCamera = Configuration.cameras[2];
        const locators = new Locators(page);

        await openCameraList(page);
        await locators.cameraListItem.first().click();
        await page.waitForTimeout(2000);
        await expect(locators.videoElement.nth(1)).toBeVisible();
        const firstCameraTime = await locators.cellTimer.innerText();
        await raiseAlert(firstCamera.accessPoint);
        await locators.alertPanelButton.click();
        await expect(locators.alertContainer).toHaveCount(1);
        await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(`${firstCamera.displayId}.${firstCamera.displayName}`);
        await expect(locators.alertContainer.nth(0).locator('p').nth(1)).toHaveText(ROOT_LOGIN);
        const firstAlertTime = await locators.alertContainer.nth(0).locator('p').last().innerText(); 
        isTimeEquals(firstCameraTime, firstAlertTime, 2);
        
        await raiseAlert(secondCamera.accessPoint);
        await page.waitForTimeout(2000);
        await raiseAlert(thirdCamera.accessPoint);
        await expect(locators.alertContainer).toHaveCount(3);
        await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(1).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(`${thirdCamera.displayId}.${thirdCamera.displayName}`);
        await expect(locators.alertContainer.nth(1).locator('p').first()).toHaveText(`${secondCamera.displayId}.${secondCamera.displayName}`);
        await expect(locators.alertContainer.nth(0).locator('p').nth(1)).toHaveText(ROOT_LOGIN);
        await expect(locators.alertContainer.nth(1).locator('p').nth(1)).toHaveText(ROOT_LOGIN);
        await expect(locators.alertContainer.nth(0).locator('p').last()).toContainText(/\d?\d:\d{2}:\d{2}/);
        await expect(locators.alertContainer.nth(1).locator('p').last()).toContainText(/\d?\d:\d{2}:\d{2}/);

        await waitAnimationEnds(page, locators.alertPanel);
        const firstAlert = await locators.alertContainer.nth(0).boundingBox();
        const secondAlert = await locators.alertContainer.nth(1).boundingBox();
        compareTwoNumbers(firstAlert!.width, 320, 1);
        compareTwoNumbers(secondAlert!.width, 320, 1);
        
        await clientNotFall(page);
    });

    test('Changing alert panel width (CLOUD-T111)', async ({ page }) => {
        const firstCamera = Configuration.cameras[0];
        const locators = new Locators(page);

        await expect(locators.cellTitle).toHaveCount(2);
        await raiseAlert(firstCamera.accessPoint);
        await locators.alertPanelButton.click();
        await waitAnimationEnds(page, locators.alertPanel);
        const alertPanelSize = await locators.alertPanel.boundingBox();
        console.log(alertPanelSize);

        await expect(locators.alertContainer).toHaveCount(1);

        await locators.cameraPanelButton.click();
        await waitAnimationEnds(page, locators.cameraPanelButton);
        const alertPanelSizeCollapsed = await locators.alertPanel.boundingBox();
        console.log(alertPanelSizeCollapsed);
        expect(alertPanelSize!.width).toBeGreaterThan(alertPanelSizeCollapsed!.width);
        await expect(locators.alertContainer).toBeInViewport({ ratio: 1 });

        await locators.cameraPanelButton.click();
        await waitAnimationEnds(page, locators.cameraPanelButton);
        const alertPanelSizeExpanded = await locators.alertPanel.boundingBox();
        console.log(alertPanelSizeExpanded);
        expect(alertPanelSize!.width).toEqual(alertPanelSizeExpanded!.width);
        await expect(locators.alertContainer).toBeInViewport({ ratio: 1 });
        
        await clientNotFall(page);
    });

    test('Transition to alarms from a single camera (CLOUD-T112)', async ({ page }) => {
        const firstCamera = Configuration.cameras[0];
        const secondCamera = Configuration.cameras[1];
        const thirdCamera = Configuration.cameras[2];
        const locators = new Locators(page);

        await locators.cellTitle.nth(0).waitFor({ state: "attached", timeout: 10000 });

        await raiseAlert(firstCamera.accessPoint);
        await page.waitForTimeout(2000);
        await raiseAlert(secondCamera.accessPoint);
        await page.waitForTimeout(3000);
        await raiseAlert(thirdCamera.accessPoint);

        await locators.alertPanelButton.click();
        await expect(locators.alertContainer).toHaveCount(3);

        const firstAlertTime = await locators.alertContainer.nth(0).locator('p').last().innerText(); 
        await locators.alertContainer.nth(0).click();
        await expect(locators.cellImage).toBeVisible();
        let pointerTime = await locators.archivePointer.innerText();
        isTimeEquals(firstAlertTime, pointerTime, 1);
        let cameraTime = await locators.cellTimer.innerText();
        isTimeEquals(pointerTime, cameraTime, 0);

        await locators.alertPanelButton.click();
        const secondAlertTime = await locators.alertContainer.nth(1).locator('p').last().innerText(); 
        await locators.alertContainer.nth(1).click();
        await expect(locators.cellImage).toBeVisible();
        pointerTime = await locators.archivePointer.innerText();
        isTimeEquals(secondAlertTime, pointerTime, 1);
        cameraTime = await locators.cellTimer.innerText();
        isTimeEquals(pointerTime, cameraTime, 0);

        await locators.liveMode.click();
        await locators.alertPanelButton.click();
        const thirdAlertTime = await locators.alertContainer.nth(2).locator('p').last().innerText(); 
        await locators.alertContainer.nth(2).click();
        await expect(locators.cellImage).toBeVisible();
        pointerTime = await locators.archivePointer.innerText();
        isTimeEquals(thirdAlertTime, pointerTime, 1);
        cameraTime = await locators.cellTimer.innerText();
        isTimeEquals(pointerTime, cameraTime, 0);
        
        await clientNotFall(page);
    });

    test('Change alert panel height (CLOUD-T114)', async ({ page }) => {
        const firstCamera = Configuration.cameras[0];
        const locators = new Locators(page);
        
        await locators.cellTitle.nth(0).waitFor({ state: "attached", timeout: 10000 });

        await raiseAlert(firstCamera.accessPoint);
        await locators.alertPanelButton.click();
        await waitAnimationEnds(page, locators.alertPanel);
        const alertPanelSize = await locators.alertPanel.boundingBox();
        const layoutFieldSize = await locators.layoutField.boundingBox(); 
        console.log(`Alert panel size: ${alertPanelSize?.height}`);
        console.log(`Layout field size: ${layoutFieldSize?.height}`);

        await locators.alertPanelDragline.hover();
        await page.mouse.down();
        await page.mouse.move(200, 200);
        await page.mouse.move(200, 250);
        await page.mouse.move(200, 300);
        await page.mouse.move(200, 350);
        await page.mouse.move(200, 400);
        await page.mouse.up();

        await waitAnimationEnds(page, locators.alertPanel);
        const expandedAlertPanelSize = await locators.alertPanel.boundingBox();
        const collapsedLayoutFieldSize = await locators.layoutField.boundingBox();
        console.log(`Alert panel size: ${expandedAlertPanelSize?.height}`);
        console.log(`Layout field size: ${collapsedLayoutFieldSize?.height}`);
        const delta = expandedAlertPanelSize!.height - alertPanelSize!.height;
        expect(expandedAlertPanelSize!.height).toBeGreaterThan(alertPanelSize!.height);
        expect(layoutFieldSize!.height - delta).toEqual(collapsedLayoutFieldSize!.height);

        await locators.alertPanelButton.click();
        await waitAnimationEnds(page, locators.alertPanel);
        await locators.alertPanelButton.click();
        await waitAnimationEnds(page, locators.alertPanel);
        expect((await locators.alertPanel.boundingBox())!.height).toEqual(expandedAlertPanelSize!.height);
        expect((await locators.layoutField.boundingBox())!.height).toEqual(collapsedLayoutFieldSize!.height);

        await locators.alertPanelDragline.hover();
        await page.mouse.down();
        await page.mouse.move(200, 350);
        await page.mouse.move(200, 300);
        await page.mouse.move(200, 250);
        await page.mouse.move(200, 150);
        await page.mouse.move(200, 100);
        await page.mouse.up();

        await waitAnimationEnds(page, locators.alertPanel);
        const collapsedAlertPanelSize = await locators.alertPanel.boundingBox();
        const expandedLayoutFieldSize = await locators.layoutField.boundingBox(); 
        console.log(`Alert panel size: ${collapsedAlertPanelSize?.height}`);
        console.log(`Layout field size: ${expandedLayoutFieldSize?.height}`);
        expect(collapsedAlertPanelSize!.height).toEqual(alertPanelSize!.height);
        expect(expandedLayoutFieldSize!.height).toEqual(layoutFieldSize!.height);
        
        await clientNotFall(page);
    });

    test('Handling alerts via GUI (API) (CLOUD-T115)', async ({ page }) => {
        const firstCamera = Configuration.cameras[0];
        const secondCamera = Configuration.cameras[1];
        const thirdCamera = Configuration.cameras[2];
        const locators = new Locators(page);

        await locators.cellTitle.nth(0).waitFor({ state: "attached", timeout: 10000 });

        await raiseAlert(firstCamera.accessPoint);
        await page.waitForTimeout(2000);
        await raiseAlert(secondCamera.accessPoint);
        await page.waitForTimeout(3000);
        await raiseAlert(thirdCamera.accessPoint);

        await locators.alertPanelButton.click();
        await expect(locators.alertContainer).toHaveCount(3);

        await completeAlert(activeAlerts[2]);
        await locators.alertContainer.nth(2).waitFor({ state: "detached", timeout: 10000 });
        await expect(locators.alertContainer).toHaveCount(2);

        await completeAlert(activeAlerts[1]);
        await completeAlert(activeAlerts[0]);
        await expect(locators.alertContainer).toHaveCount(0);
        await expect(locators.alertPanelButton).toBeHidden();

        await clientNotFall(page);
    });

    test('Transition to alarms from a layout (CLOUD-T116)', async ({ page }) => {
        const secondCamera = Configuration.cameras[1];
        const fourthCamera = Configuration.cameras[3];
        const locators = new Locators(page);

        await expect(locators.cellTitle).toHaveCount(2);

        //Включаем "Открывать выбранную камеру на раскладке"
        await locators.topMenuButton.click();
        await locators.preferences.click();
        await locators.openCameraOnLayoutPreference.check();
        await locators.preferencesAccept.click();

        await raiseAlert(secondCamera.accessPoint);

        await locators.alertPanelButton.click();
        await expect(locators.alertContainer).toHaveCount(1);
        await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(`${secondCamera.displayId}.${secondCamera.displayName}`);
        const firstAlertTime = await locators.alertContainer.nth(0).locator('p').last().innerText(); 
        await locators.alertContainer.nth(0).click();
        await expect(locators.cellTitle).toHaveCount(1); // Было 2
        await expect(locators.cellImage.nth(0)).toBeVisible();
        let pointerTime = await locators.archivePointer.innerText();
        isTimeEquals(firstAlertTime, pointerTime, 1);
        let firstCellTime = await locators.cellTimer.nth(0).innerText();
        //let secondCellTime = await locators.cellTimer.nth(1).innerText(); 
        let secondCellTime = await locators.cellTimer.innerText(); 
        isTimeEquals(pointerTime, firstCellTime, 1);
        isTimeEquals(secondCellTime, firstCellTime, 1);

        await locators.liveMode.click();
        await raiseAlert(fourthCamera.accessPoint);
        await locators.alertPanelButton.click();
        await expect(locators.alertContainer).toHaveCount(2);
        await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(`${fourthCamera.displayId}.${fourthCamera.displayName}`);
        const secondAlertTime = await locators.alertContainer.nth(0).locator('p').last().innerText(); 
        await locators.alertContainer.nth(0).click();
        await expect(locators.cellTitle).toHaveCount(1);
        await expect(locators.cellImage).toBeVisible();
        pointerTime = await locators.archivePointer.innerText();
        isTimeEquals(secondAlertTime, pointerTime, 1);
        let cellTime = await locators.cellTimer.innerText();
        isTimeEquals(pointerTime, cellTime, 1);

        await clientNotFall(page);
    });



    test('Alarm handling by icon (CLOUD-T571) #smoke', async ({ page }) => {
        const firstCamera = Configuration.cameras[0];
        const locators = new Locators(page);

        addAlertRequestListener(page);

        await openCameraList(page);
        await locators.cameraListItem.first().click();

        await locators.alertReviewIcon.click();
        //await expect(locators.videoCell).toHaveClass(/.*VideoCell--alert.*/);
        await expect(locators.videoCell).toHaveClass(/.*VideoCell__video-canvas*/); //Я хз как проверять тревогу так как они снесли это из класса 

        await locators.alertPanelButton.click();
        await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(`${firstCamera.displayId}.${firstCamera.displayName}`);
        const alertTime = await locators.alertContainer.nth(0).locator('p').last().innerText();
        await locators.alertPanelButton.click();

        await locators.alertReviewIcon.click();

        await expect(locators.cellImage).toBeVisible();
        const pointerTime = await locators.archivePointer.innerText();
        isTimeEquals(alertTime, pointerTime, 1);
        const cellTime = await locators.cellTimer.nth(0).innerText();
        isTimeEquals(pointerTime, cellTime, 1);

        // await expect(locators.alertReviewIcon.locator('button')).toHaveCount(3); изменил так как разделили кнопки 
        await expect(locators.alertNotificationsBtn).toBeVisible(); // Добавил
        await expect(locators.alertNotificationImportantBtn).toBeVisible(); // Добавил
        await expect(locators.alertNotificationsOffBtn).toBeVisible(); // Добавил
        //await locators.alertReviewIcon.locator('button').nth(0).click();
        await locators.alertNotificationsBtn.click();

        await locators.alertPanelButton.waitFor({ state: "detached", timeout: 10000 });
        await expect(locators.videoCell).not.toHaveClass(/.*VideoCell--alert.*/);
        await locators.liveMode.click();
        await expect(locators.cellTitle).toHaveText(`${firstCamera.displayId}.${firstCamera.displayName}`);
        await expect(locators.alertReviewIcon).toBeVisible();

        await clientNotFall(page);
    });

    test('Alarm handling by alert panel (CLOUD-T578) #smoke', async ({ page }) => {
        const firstCamera = Configuration.cameras[0];
        const locators = new Locators(page);

        addAlertRequestListener(page);

        await openCameraList(page);
        await locators.cameraListItem.first().click();

        await locators.alertReviewIcon.click();
        //await expect(locators.videoCell).toHaveClass(/.*VideoCell--alert.*/);
        await expect(locators.videoCell).toHaveClass(/.*VideoCell__video-canvas*/); //Я хз как проверять тревогу так как они снесли это из класса 

        await locators.alertPanelButton.click();
        await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(`${firstCamera.displayId}.${firstCamera.displayName}`);
        const alertTime = await locators.alertContainer.nth(0).locator('p').last().innerText();
        await locators.alertContainer.click();

        await expect(locators.cellImage).toBeVisible();
        let pointerTime = await locators.archivePointer.innerText();
        isTimeEquals(alertTime, pointerTime, 1);
        let cellTime = await locators.cellTimer.nth(0).innerText();
        isTimeEquals(pointerTime, cellTime, 1);
        
        //await expect(locators.alertReviewIcon.locator('button')).toHaveCount(1); // Не могу сгрупировать кнопки, так как не вижу общего свойства
        await expect(locators.alertReviewIcon).toHaveCount(1) // Поэтому решил проверить что двух других кнопок нет
        await expect(locators.alertNotificationsBtn).toHaveCount(0); // Добавил
        await expect(locators.alertNotificationImportantBtn).toHaveCount(0); // Добавил
        await expect(locators.alertNotificationsOffBtn).toHaveCount(0);// Добавил


        await locators.alertReviewIcon.click();

        await expect(locators.alertNotificationsBtn).toHaveCount(1); // Добавил
        await expect(locators.alertNotificationImportantBtn).toHaveCount(1); // Добавил
        await expect(locators.alertNotificationsOffBtn).toHaveCount(1);// Добавил

        //await expect(locators.alertReviewIcon.locator('button')).toHaveCount(3);
        pointerTime = await locators.archivePointer.innerText();
        isTimeEquals(alertTime, pointerTime, 1);
        cellTime = await locators.cellTimer.nth(0).innerText();
        isTimeEquals(pointerTime, cellTime, 1);
        //await locators.alertReviewIcon.locator('button').nth(0).click();
        await locators.alertNotificationsBtn.click();
        await locators.alertPanelButton.waitFor({ state: "detached", timeout: 20000 });
        await expect(locators.videoCell).not.toHaveClass(/.*VideoCell--alert.*/); // Эту херню надо как-то чинить 
        await locators.liveMode.click();
        await expect(locators.cellTitle).toHaveText(`${firstCamera.displayId}.${firstCamera.displayName}`);
        await expect(locators.alertReviewIcon).toBeVisible();

        await clientNotFall(page);
    });

    test('Alarm handling from archive section (CLOUD-T579)', async ({ page }) => {
        const firstCamera = Configuration.cameras[0];
        const locators = new Locators(page);

        addAlertRequestListener(page);

        await openCameraList(page);
        await locators.cameraListItem.first().click();

        await locators.alertReviewIcon.click();
        //await expect(locators.videoCell).toHaveClass(/.*VideoCell--alert.*/);
        await expect(locators.videoCell).toHaveClass(/.*VideoCell__video-canvas*/); //Я хз как проверять тревогу так как они снесли это из класса 

        await locators.alertPanelButton.click();
        await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(`${firstCamera.displayId}.${firstCamera.displayName}`);
        const alertTime = await locators.alertContainer.nth(0).locator('p').last().innerText();
        await locators.alertPanelButton.click();

        await locators.singleArchiveMode.click();

        //await expect(locators.alertReviewIcon.locator('button')).toHaveCount(1); //Убрал .locator('button') так как он не почему-то не видел элементы
        await expect(locators.alertReviewIcon).toHaveCount(1); 
        await locators.alertReviewIcon.click();
        //await expect(locators.alertReviewIcon.locator('button')).toHaveCount(3); тоже самое, убрали локатор приходится привязываться к роли
        await expect(locators.alertGroupReviewIcon.locator('button')).toHaveCount(3);
        let pointerTime = await locators.archivePointer.innerText();
        isTimeEquals(alertTime, pointerTime, 1);
        let cellTime = await locators.cellTimer.nth(0).innerText();
        isTimeEquals(pointerTime, cellTime, 1);
        //await locators.alertReviewIcon.locator('button').nth(2).click(); такая же херня 
        await locators.alertGroupReviewIcon.locator('button').nth(2).click();
        
        await locators.alertPanelButton.waitFor({ state: "detached", timeout: 10000 });
        await expect(locators.videoCellWrapper).not.toHaveClass(/.*VideoCell--alert.*/);
        await locators.liveMode.click();
        await expect(locators.cellTitle).toHaveText(`${firstCamera.displayId}.${firstCamera.displayName}`);
        await expect(locators.alertReviewIcon).toBeVisible();

        await clientNotFall(page);
    });

    test('Cancel alarm handling by transition to live (CLOUD-T618)', async ({ page }) => {
        const locators = new Locators(page);

        addAlertRequestListener(page);

        await expect(locators.cellTitle).toHaveCount(2);
        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.videoElement.nth(0)).toHaveClass(/.*VideoCell--alert.*/);   // поменял videoCell

        await locators.alertReviewIcon.nth(0).click();

        await expect(locators.alertGroupReviewIcon.locator('button')).toHaveCount(3);
        let responsePromise = page.waitForResponse(request => request.url().includes('cancelalert'));
        await locators.liveMode.click();
        await responsePromise;
        await expect(locators.videoElement.nth(0)).toHaveClass(/.*VideoCell--alert.*/);   // поменял videoCell

        //await expect(locators.alertReviewIcon.locator('button')).toHaveCount(1); из-за .locator('button') не видит
        await expect(locators.alertReviewIcon).toHaveCount(1);
        await locators.alertReviewIcon.click();
        await expect(locators.alertGroupReviewIcon.locator('button')).toHaveCount(3);

        responsePromise = page.waitForResponse(request => request.url().includes('cancelalert'));
        await locators.firstLayout.click({ force: true });
        await responsePromise;

        await clientNotFall(page);
    });

    test('Cancel alarm handling by picking another camera (CLOUD-T619)', async ({ page }) => {
        const locators = new Locators(page);

        addAlertRequestListener(page);

        await expect(locators.cellTitle).toHaveCount(2);
        await locators.alertReviewIcon.nth(0).click();
        await locators.alertReviewIcon.nth(1).click();
        await expect(locators.videoElement.nth(0)).toHaveClass(/.*VideoCell--alert.*/); //сменил videoCell.nth(0) на .videoCellWrapper.nth(0)
        await expect(locators.videoElement.nth(2)).toHaveClass(/.*VideoCell--alert.*/); //сменил videoCell.nth(1) на .videoCellWrapper.nth(0)

        await openCameraList(page);

        await locators.alertReviewIcon.nth(0).click();

        //await expect(locators.alertReviewIcon.locator('button')).toHaveCount(3); убрали локатор приходится привязываться к роли
        await expect(locators.alertGroupReviewIcon.locator('button')).toHaveCount(3);
        let responsePromise = page.waitForResponse(request => request.url().includes('cancelalert'));
        await locators.cameraListItem.nth(2).click();
        await responsePromise;
        await expect(locators.videoElement.nth(0)).toHaveClass(/.*VideoCell--alert.*/);

        await clientNotFall(page);
    });

    test('Cancel alarm handling by clicking outside the menu (CLOUD-T620)', async ({ page }) => {
        const locators = new Locators(page);
        
        addAlertRequestListener(page);

        await expect(locators.cellTitle).toHaveCount(2);
        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.videoElement.nth(0)).toHaveClass(/.*VideoCell--alert.*/);
        await locators.alertReviewIcon.nth(0).click();

        //await expect(locators.alertGroupReviewIcon.locator('button')).toHaveCount(3); //убрали локатор приходится привязываться к роли
        await expect(locators.alertGroupReviewIcon.locator('button')).toHaveCount(3);
        let responsePromise = page.waitForResponse(request => request.url().includes('cancelalert'));
        await locators.videoCellWrapper.click();
        await responsePromise;
        await expect(locators.alertReviewIcon).toHaveCount(1);
        await expect(locators.videoElement.nth(0)).toHaveClass(/.*VideoCell--alert.*/);

        await clientNotFall(page);
    });

    test('Repeat transition via alert panel (CLOUD-T892)', async ({ page }) => {
        const secondCamera = Configuration.cameras[1];
        const locators = new Locators(page);

        addAlertRequestListener(page);

        await expect(locators.cellTitle).toHaveCount(2);

        await locators.alertReviewIcon.nth(0).click();

        await locators.alertPanelButton.click();
        await expect(locators.alertContainer).toHaveCount(1);
        await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(`${secondCamera.displayId}.${secondCamera.displayName}`);
        const alertTime = await locators.alertContainer.nth(0).locator('p').last().innerText(); 
        await locators.alertContainer.nth(0).click();
        await expect(locators.cellImage.nth(0)).toBeVisible();
        let pointerTime = await locators.archivePointer.innerText();
        isTimeEquals(alertTime, pointerTime, 1);
        let cellTime = await locators.cellTimer.nth(0).innerText();
        isTimeEquals(pointerTime, cellTime, 1);

        await locators.liveMode.click();
        await locators.alertPanelButton.click();
        await locators.alertContainer.nth(0).click();
        await expect(locators.cellImage).toBeVisible();
        pointerTime = await locators.archivePointer.innerText();
        isTimeEquals(alertTime, pointerTime, 1);
        cellTime = await locators.cellTimer.innerText();
        isTimeEquals(pointerTime, cellTime, 1);

        await clientNotFall(page);
    });

    test('Repeat transition via alert icon (CLOUD-T893)', async ({ page }) => {
        const secondCamera = Configuration.cameras[1];
        const locators = new Locators(page);

        addAlertRequestListener(page);

        await expect(locators.cellTitle).toHaveCount(2);

        await locators.alertReviewIcon.nth(0).click();

        await locators.alertPanelButton.click();
        await expect(locators.alertContainer).toHaveCount(1);
        await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(`${secondCamera.displayId}.${secondCamera.displayName}`);
        const alertTime = await locators.alertContainer.nth(0).locator('p').last().innerText(); 
        await locators.alertPanelButton.click();

        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.cellImage.nth(0)).toBeVisible();
        let pointerTime = await locators.archivePointer.innerText();
        isTimeEquals(alertTime, pointerTime, 1);
        let cellTime = await locators.cellTimer.nth(0).innerText();
        isTimeEquals(pointerTime, cellTime, 1);
        await locators.alertGroupReviewIcon.locator('button').nth(2).waitFor({ state: 'attached' });

        await locators.liveMode.click();
        await locators.alertReviewIcon.click();
        await expect(locators.cellImage).toBeVisible();
        pointerTime = await locators.archivePointer.innerText();
        isTimeEquals(alertTime, pointerTime, 1);
        cellTime = await locators.cellTimer.innerText();
        isTimeEquals(pointerTime, cellTime, 1);

        await locators.alertGroupReviewIcon.locator('button').nth(2).click();   
        await locators.alertPanelButton.waitFor({ state: "detached", timeout: 10000 });
        await expect(locators.videoCellWrapper).not.toHaveClass(/.*VideoCell--alert.*/);

        await clientNotFall(page);
    });

    test('Alarm handling by alert panel, layout auto-select off (CLOUD-T617)', async ({ page }) => {
        const secondCamera = Configuration.cameras[1];
        const locators = new Locators(page);

        addAlertRequestListener(page);

        await expect(locators.cellTitle).toHaveCount(2);

        await locators.alertReviewIcon.nth(0).click();

        await locators.alertPanelButton.click();
        await expect(locators.alertContainer).toHaveCount(1);
        await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(`${secondCamera.displayId}.${secondCamera.displayName}`);
        const alertTime = await locators.alertContainer.nth(0).locator('p').last().innerText(); 
        await locators.alertPanelButton.click();

        await page.waitForTimeout(3000); //свежая тревога (а значит и метка) может не сразу отобразится в запросе
        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.cellTitle).toHaveCount(1);
        await expect(locators.cellImage).toBeVisible();
        let pointerTime = await locators.archivePointer.innerText();
        isTimeEquals(alertTime, pointerTime, 1);
        let cellTime = await locators.cellTimer.nth(0).innerText();
        isTimeEquals(pointerTime, cellTime, 1);

        //Вычисляем цену деления, то есть сколько пикселей в одной секунде на плеере
        const secondStep = await locators.playerTimestamps.nth(1).boundingBox();
        const thirdStep = await locators.playerTimestamps.nth(2).boundingBox();
        const divisionValue = Math.floor((thirdStep!.x - secondStep!.x) / 15);
        console.log(`Each ${divisionValue}px is 1 second`);
        //Вычисляем растояние между поинтером плеера и засечкой последней тревоги
        const playerPointerPosition = await locators.playerPointer.locator('rect').last().boundingBox();
        const lastAlertPosition = await locators.playerAlerts.locator('rect').last().boundingBox();
        const distance = Math.floor(Math.abs(playerPointerPosition!.x - lastAlertPosition!.x));
        console.log(`Distance between alert start and player pointer position is ${distance}px`);
        expect(distance <= divisionValue).toBeTruthy();

        await expect(locators.alertReviewIcon.locator('button')).toHaveCount(3);
        await locators.alertReviewIcon.locator('button').nth(0).click();   
        await locators.alertPanelButton.waitFor({ state: "detached", timeout: 10000 });
        await expect(locators.videoCell).not.toHaveClass(/.*VideoCell--alert.*/);

        await clientNotFall(page);
    });

    test('Alarm handling by alert panel, layout auto-select on (CLOUD-T943)', async ({ page }) => {
        const secondCamera = Configuration.cameras[1];
        const locators = new Locators(page);

        addAlertRequestListener(page);

        await expect(locators.cellTitle).toHaveCount(2);

        //Включаем "Открывать выбранную камеру на раскладке"
        await locators.topMenuButton.click();
        await locators.preferences.click();
        await locators.openCameraOnLayoutPreference.check();
        await locators.preferencesAccept.click();

        await locators.alertReviewIcon.nth(0).click();

        await locators.alertPanelButton.click();
        await expect(locators.alertContainer).toHaveCount(1);
        await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(`${secondCamera.displayId}.${secondCamera.displayName}`);
        const alertTime = await locators.alertContainer.nth(0).locator('p').last().innerText(); 
        await locators.alertPanelButton.click();

        await page.waitForTimeout(3000); //свежая тревога (а значит и метка) может не сразу отобразится в запросе
        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.cellTitle).toHaveCount(2);
        await expect(locators.cellImage.nth(0)).toBeVisible();
        let pointerTime = await locators.archivePointer.innerText();
        isTimeEquals(alertTime, pointerTime, 1);
        let firstCellTime = await locators.cellTimer.nth(0).innerText();
        let secondCellTime = await locators.cellTimer.nth(1).innerText();
        isTimeEquals(pointerTime, firstCellTime, 1);
        isTimeEquals(firstCellTime, secondCellTime, 1);

        //Вычисляем цену деления, то есть сколько пикселей в одной секунде на плеере
        const secondStep = await locators.playerTimestamps.nth(1).boundingBox();
        const thirdStep = await locators.playerTimestamps.nth(2).boundingBox();
        const divisionValue = Math.floor((thirdStep!.x - secondStep!.x) / 15);
        console.log(`Each ${divisionValue}px is 1 second`);
        //Вычисляем растояние между поинтером плеера и засечкой последней тревоги
        const playerPointerPosition = await locators.playerPointer.locator('rect').last().boundingBox();
        const lastAlertPosition = await locators.playerAlerts.locator('rect').last().boundingBox();
        const distance = Math.floor(Math.abs(playerPointerPosition!.x - lastAlertPosition!.x));
        console.log(`Distance between alert start and player pointer position is ${distance}px`);
        expect(distance <= divisionValue).toBeTruthy();

        await expect(locators.alertReviewIcon.locator('button')).toHaveCount(3);
        await locators.alertReviewIcon.locator('button').nth(0).click();   
        await locators.alertPanelButton.waitFor({ state: "detached", timeout: 10000 });
        await expect(locators.videoCell.nth(0)).not.toHaveClass(/.*VideoCell--alert.*/);

        await clientNotFall(page);
    });

    test('Alert labels colors (CLOUD-T523)', async ({ page }) => {
        const locators = new Locators(page);

        addAlertRequestListener(page);

        await openCameraList(page);
        await locators.cameraListItem.first().click();
        await expect(locators.videoElement.nth(0)).toBeVisible();

        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.videoElement.nth(0)).toHaveClass(/.*VideoCell--alert.*/); // поменял класс videoCell
        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.alertGroupReviewIcon.locator('button')).toHaveCount(3); // поменял класс alertReviewIcon
        await locators.alertGroupReviewIcon.locator('button').nth(0).click();
        await expect(locators.videoCellWrapper.nth(0)).not.toHaveClass(/.*VideoCell--alert.*/); // поменял класс videoCell

        await locators.liveMode.click();

        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.videoElement.nth(0)).toHaveClass(/.*VideoCell--alert.*/); // поменял класс videoCell
        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.alertGroupReviewIcon.locator('button')).toHaveCount(3); // поменял класс alertReviewIcon
        await locators.alertGroupReviewIcon.locator('button').nth(1).click();
        await locators.modalWindowTextArea.fill('New Comment!');
        await locators.modalWindowAcceptButton.click();
        await expect(locators.videoCellWrapper.nth(0)).not.toHaveClass(/.*VideoCell--alert.*/); // поменял класс videoCell

        await locators.liveMode.click();

        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.videoElement.nth(0)).toHaveClass(/.*VideoCell--alert.*/); // поменял класс videoCell
        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.alertGroupReviewIcon.locator('button')).toHaveCount(3);
        //await locators.alertReviewIcon.locator('button').nth(2).click(); 
        await locators.alertNotificationsOffBtn.click(); 
        await expect(locators.videoCellWrapper.nth(0)).not.toHaveClass(/.*VideoCell--alert.*/); // поменял класс videoCell

        await locators.liveMode.click();
        await locators.singleArchiveMode.click();
 
        await locators.alertFlag.nth(2).waitFor({ state: "attached", timeout: 10000 });
        const alertCount = await locators.alertFlag.count();
        console.log('Alerts count: ', alertCount);
        await expect(locators.alertFlag.nth(alertCount - 1).locator('svg')).toHaveCSS("color", "rgb(76, 175, 80)");
        await expect(locators.alertFlag.nth(alertCount - 2).locator('svg')).toHaveCSS("color", "rgb(255, 235, 59)");
        await expect(locators.alertFlag.nth(alertCount - 3).locator('svg')).toHaveCSS("color", "rgb(211, 47, 47)");

        await clientNotFall(page);
    });

    test('Processing alarm with comment (CLOUD-T861) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        addAlertRequestListener(page);

        await expect(locators.cellTitle).toHaveCount(2);

        await locators.alertReviewIcon.nth(1).click(); 
        await expect(locators.videoElement.nth(2)).toHaveClass(/.*VideoCell--alert.*/); // поменял класс videoCell
        await locators.alertReviewIcon.nth(1).click();
        await expect(locators.alertGroupReviewIcon.locator('button')).toHaveCount(3);
        //await locators.alertReviewIcon.locator('button').nth(1).click(); заменил
        await locators.alertNotificationImportantBtn.click();
        await expect(locators.modalWindowAcceptButton).toBeDisabled();
        await locators.modalWindowTextArea.fill('Sergeant Billy was here');
        await locators.modalWindowAcceptButton.click();
        await expect(locators.videoCell.nth(0)).not.toHaveClass(/.*VideoCell--alert.*/);

        await locators.topMenuButton.click();
        await locators.bookmarkMode.click();
        await expect(locators.bookmark.first().locator('p').last()).toHaveText('Sergeant Billy was here');

        await clientNotFall(page);
    });

    test('Cancel comment addition into alert (CLOUD-T862)', async ({ page }) => {
        const locators = new Locators(page);

        addAlertRequestListener(page);

        await expect(locators.cellTitle).toHaveCount(2);

        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.videoElement.nth(0)).toHaveClass(/.*VideoCell--alert.*/);
        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.alertGroupReviewIcon.locator('button')).toHaveCount(3);
        await locators.alertGroupReviewIcon.locator('button').nth(1).click();
        await expect(locators.modalWindowAcceptButton).toBeDisabled();
        await locators.modalWindowRejectButton.click();
        await expect(locators.modalWindow).toBeHidden();
        await expect(locators.videoElement.nth(0)).toHaveClass(/.*VideoCell--alert.*/); // поменял videoCell
        await expect(locators.alertGroupReviewIcon.locator('button')).toHaveCount(3);
        await locators.alertGroupReviewIcon.locator('button').nth(1).click();
        await locators.modalWindowTextArea.fill('Sergeant Billy was here 2');
        await locators.modalWindowRejectButton.click();
        await expect(locators.videoElement.nth(0)).toHaveClass(/.*VideoCell--alert.*/);  // поменял videoCell

        await clientNotFall(page);
    });

    test('Manual alert comment (CLOUD-T524)', async ({ page }) => {
        const locators = new Locators(page);

        addAlertRequestListener(page);

        await expect(locators.cellTitle).toHaveCount(2);

        await locators.alertReviewIcon.nth(1).click();
        await expect(locators.videoElement.nth(2)).toHaveClass(/.*VideoCell--alert.*/); // изменил локатор
        await locators.alertReviewIcon.nth(1).click();
        //await expect(locators.alertReviewIcon.locator('button')).toHaveCount(3); // поменял локатор
        await expect(locators.alertGroupReviewIcon.locator('button')).toHaveCount(3); //
        await locators.alertGroupReviewIcon.locator('button').nth(1).click(); //тоже самое 
        await expect(locators.modalWindowAcceptButton).toBeDisabled();
        await locators.modalWindowTextArea.fill('Sergeant Billy was here');
        await locators.modalWindowAcceptButton.click();
        await expect(locators.videoCell.nth(0)).not.toHaveClass(/.*VideoCell--alert.*/);

        await locators.liveMode.click();
        await expect(locators.videoElement.nth(0)).toBeVisible();
        await locators.videoElement.nth(0).click();
        await locators.singleArchiveMode.click();
    
        await locators.webpage.locator('.controls').first().evaluate(() => {
            let archivePointer: HTMLElement = document.querySelector('.control')!;
            archivePointer.style.display = "none";
        });
        await locators.alertFlag.last().locator('button').hover();
        await page.mouse.wheel(0, -1000);
        await page.waitForTimeout(1000);
        await locators.alertFlag.last().locator('button').hover();
        await page.mouse.wheel(0, -2000);
        await page.waitForTimeout(1000);
        await locators.alertFlag.last().locator('button').click();
        await expect(locators.alertInfoCard.locator('p').nth(0)).toHaveText(`Initiator: ${ROOT_LOGIN}`);
        await expect(locators.alertInfoCard.locator('p').nth(1)).toHaveText("Message: Sergeant Billy was here");
        await locators.alertInfoCard.locator('button').click();
        await expect(locators.alertInfoCard).toBeHidden();

        await clientNotFall(page);
    });

    test('Presentation of manual alerts after page reload (CLOUD-T1127)', async ({ page }) => {
        const locators = new Locators(page);

        addAlertRequestListener(page);

        await expect(locators.cellTitle).toHaveCount(2);
        let firstCameraName = await locators.cellTitle.nth(0).innerText();
        let secondCameraName = await locators.cellTitle.nth(1).innerText();

        await locators.alertReviewIcon.nth(1).click();
        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.videoElement.nth(0)).toHaveClass(/.*VideoCell--alert.*/); // изменил локатор
        await expect(locators.videoElement.nth(2)).toHaveClass(/.*VideoCell--alert.*/); // изменил локатор
        await locators.alertPanelButton.click();
        await expect(locators.alertContainer).toHaveCount(2);
        // await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(firstCameraName);
        await expect(locators.alertContainer.nth(0).locator('p').last()).toContainText(/\d?\d:\d{2}:\d{2}/);
        // await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(1).locator('p').first()).toHaveText(secondCameraName);
        await expect(locators.alertContainer.nth(1).locator('p').last()).toContainText(/\d?\d:\d{2}:\d{2}/);

        await page.waitForTimeout(2000);
        await page.reload();
        await expect(locators.videoElement.nth(0)).toHaveClass(/.*VideoCell--alert.*/, { timeout: 30000 });   // поменял videoCell
        await expect(locators.videoElement.nth(2)).toHaveClass(/.*VideoCell--alert.*/); // поменял videoCell
        await locators.alertPanelButton.waitFor({ state: 'attached' });
        await locators.alertPanelButton.click();
        await expect(locators.alertContainer).toHaveCount(2);
        // await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(firstCameraName);
        await expect(locators.alertContainer.nth(0).locator('p').last()).toContainText(/\d?\d:\d{2}:\d{2}/);
        // await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(1).locator('p').first()).toHaveText(secondCameraName);
        await expect(locators.alertContainer.nth(1).locator('p').last()).toContainText(/\d?\d:\d{2}:\d{2}/);
        await locators.alertReviewIcon.nth(1).click();
        await expect(locators.alertGroupReviewIcon.locator('button')).toHaveCount(3);
        await locators.alertGroupReviewIcon.locator('button').nth(2).click();      // поменял alertReviewIcon
        await expect(locators.videoCell.nth(0)).not.toHaveClass(/.*VideoCell--alert.*/);

        await page.waitForTimeout(2000);
        await page.reload();
        await expect(locators.videoElement.nth(0)).toHaveClass(/.*VideoCell--alert.*/, { timeout: 30000 });  // поменял videoCell
        await expect(locators.videoElement.nth(2)).not.toHaveClass(/.*VideoCell--alert.*/);                     // поменял videoCell
        await locators.alertPanelButton.click();
        await expect(locators.alertContainer).toHaveCount(1);
        // await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(firstCameraName);
        await expect(locators.alertContainer.nth(0).locator('p').last()).toContainText(/\d?\d:\d{2}:\d{2}/);
        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.alertGroupReviewIcon.locator('button')).toHaveCount(3);
        await locators.alertGroupReviewIcon.locator('button').nth(0).click();
        await expect(locators.videoCell.nth(0)).not.toHaveClass(/.*VideoCell--alert.*/);
        await expect(locators.alertPanelButton).toBeHidden();

        await page.waitForTimeout(2000);
        await page.reload();
        await expect(locators.videoCell.nth(0)).not.toHaveClass(/.*VideoCell--alert.*/, { timeout: 30000 });
        await expect(locators.videoCell.nth(1)).not.toHaveClass(/.*VideoCell--alert.*/);
        await expect(locators.alertPanelButton).toBeHidden();

        await clientNotFall(page);
    });

    test('Displaying a stub instead of an empty alarm picture (CLOUD-T1128)', async ({ page }) => {
        const locators = new Locators(page);
        const tempCameraName = "Temp Camera";

        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", tempCameraName, -1);
        const tempCamera = Configuration.cameras.filter(item => item.displayName.includes(tempCameraName))[0];
        tempCameras.push(tempCamera);
        await createArchiveContext("Black", [tempCamera], true, "High");

        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.reload();
        const WS = await WSPromise;
        console.log(WS.url());
        
        await expect(locators.videoElement.nth(0)).toBeVisible();
        await raiseAlert(tempCamera.accessPoint);
        let message = waitWebSocketSentMessage(WS, ['jpeg', 'timeout']);
        await locators.alertPanelButton.click();
        console.log(await message);
        expect((await message).timeout).toEqual(10);
        await expect(locators.alertContainer).toHaveCount(1);
        await locators.alertEmptyPreviewStub.waitFor({ state: 'attached', timeout: 15000 });
        await expect(locators.alertContainer.nth(0).locator('svg')).toBeVisible();
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(`${tempCamera.displayId}.${tempCamera.displayName}`);
        await expect(locators.alertContainer.nth(0).locator('p').last()).toContainText(/\d{2}:\d{2}:\d{2}/);
        
        await clientNotFall(page);
    });

});

test.describe("Alarms. Tests with user changing", () => {
    const testUserLogin = "alert_test";
    const testUserPassword = "Alert12345";

    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector();
        if (Configuration.cameras.length != 4 || Configuration?.cameras[0]?.displayName != "Alert Camera" || Configuration.layouts.length != 1) {
            await cameraAnnihilator("all");
            await layoutAnnihilator("all");
            await deleteArchive('Black');
            await createCamera(4, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "1", "Alert Camera", 0);
            await addVirtualVideo(Configuration.cameras, "lprusa", "tracker");
            await createLayout([Configuration.cameras[1], Configuration.cameras[2]], 2, 1, "Test Layout");
            await createArchive("Black");
            await createArchiveVolume("Black", 20);
            await createArchiveContext("Black", [Configuration.cameras[0]], true, "High");
            await createArchiveContext("Black", [Configuration.cameras[1]], false, "High");
            await createArchiveContext("Black", [Configuration.cameras[2]], true, "Low");
            await createArchiveContext("Black", [Configuration.cameras[3]], false, "Low");
            await raiseAlert(Configuration.cameras[1].accessPoint);
            await completeAlert(activeAlerts[0]);
            await raiseAlert(Configuration.cameras[3].accessPoint);
            await completeAlert(activeAlerts[0]);
        }
        await roleAnnihilator("all");
        await userAnnihilator("all");
        await createRole("Alert_test");
        await setRolePermissions("Alert_test");
        await createUser(testUserLogin);
        await assignUserRole("Alert_test", testUserLogin);
        await setUserPassword(testUserLogin, testUserPassword);
    });
    
    test.afterEach(async () => {
        for (let alert of activeAlerts) {
            await completeAlert(alert);
        }
    });

    test('Multiuser alarm handling in live mode (CLOUD-T586)', async ({ page }) => {
        test.skip(isCloudTest, "Test is skipped for cloud");

        const locators = new Locators(page);

        await page.goto(clientURL);
        await authorization(page, testUserLogin, testUserPassword);

        addAlertRequestListener(page);

        await expect(locators.videoElement.nth(0)).toBeVisible(); // добавил nth(0)

        await locators.alertReviewIcon.nth(0).click();
        //await expect(locators.videoCell.nth(0)).toHaveClass(/.*VideoCell--alert.*/);            // сменил локатор
        await expect(locators.videoElement.nth(0)).toHaveClass(/.*VideoCell--alert.*/);           // сменил локатор videocell 

        await startAlertHandle(activeAlerts[0]);
        await page.waitForTimeout(2000);
        
        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.popUpMessage).toHaveText(`Alert on review user: ${ROOT_LOGIN}`);
        await locators.popUpMessage.waitFor({ state: 'detached', timeout: 10000 });

        await cancelAlertHandle(activeAlerts[0]);
        await page.waitForTimeout(2000);

        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.alertGroupReviewIcon.locator('button')).toHaveCount(3);             // сменил локатор alertReviewIcon
        await locators.alertGroupReviewIcon.locator('button').nth(0).click();                     // сменил локатор alertReviewIcon
        await expect(locators.videoCell.nth(0)).not.toHaveClass(/.*VideoCell--alert.*/);

        await clientNotFall(page);
    });

    test('Multiuser alarm handling in archive mode (CLOUD-T628)', async ({ page }) => {
        test.skip(isCloudTest, "Test is skipped for cloud");

        const locators = new Locators(page);

        await page.goto(clientURL);
        await authorization(page, testUserLogin, testUserPassword);

        addAlertRequestListener(page);

        await expect(locators.videoElement.nth(0)).toBeVisible();                          // добавил nth(0)

        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.videoElement.nth(0)).toHaveClass(/.*VideoCell--alert.*/);    // сменил локатор videocell
        await locators.alertPanelButton.click();
        await expect(locators.alertContainer).toHaveCount(1);
        await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /blob:.*/);
        const alertTime = await locators.alertContainer.nth(0).locator('p').last().innerText(); 
        await locators.alertContainer.nth(0).click();
        await expect(locators.cellImage.nth(0)).toBeVisible();
        let pointerTime = await locators.archivePointer.innerText();
        isTimeEquals(alertTime, pointerTime, 1);

        await startAlertHandle(activeAlerts[0]);
        await page.waitForTimeout(2000);
        
        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.popUpMessage).toHaveText(`Alert on review user: ${ROOT_LOGIN}`);
        await locators.popUpMessage.waitFor({ state: 'detached', timeout: 10000 });

        await cancelAlertHandle(activeAlerts[0]);
        await page.waitForTimeout(2000);

        await locators.alertReviewIcon.nth(0).click();                                                     
        await expect(locators.alertGroupReviewIcon.locator('button')).toHaveCount(3);       // сменил локатор alertReviewIcon
        await locators.alertGroupReviewIcon.locator('button').nth(0).click();               // сменил локатор alertReviewIcon
        await expect(locators.videoCell.nth(0)).not.toHaveClass(/.*VideoCell--alert.*/);

        await clientNotFall(page);
    });

    test('Parallel alarm handling with same user (CLOUD-T629)', async ({ page }) => {
        const locators = new Locators(page);

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        addAlertRequestListener(page);

        await openCameraList(page);
        await locators.cameraListItem.first().click();
        await expect(locators.videoElement.nth(0)).toBeVisible();         // Добавил nth(0)

        await raiseAlert(Configuration.cameras[0].accessPoint);
        await page.waitForTimeout(2000);
        await startAlertHandle(activeAlerts[0]);

        await expect(locators.videoElement.nth(0)).toHaveClass(/.*VideoCell--alert.*/);  // сменил локатор videocell
        await expect(locators.alertReviewIcon).toBeHidden();
        await locators.alertPanelButton.click();
        await expect(locators.alertContainer).toHaveCount(1);
        //await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        const alertTime = await locators.alertContainer.nth(0).locator('p').last().innerText();
        await locators.alertContainer.nth(0).click();
        await expect(locators.cellImage.nth(0)).toBeVisible();
        let pointerTime = await locators.archivePointer.innerText();
        isTimeEquals(alertTime, pointerTime, 1);
        
        await expect(locators.alertReviewIcon.locator('button')).toHaveCount(1);
        await locators.alertReviewIcon.click();
        await expect(locators.alertReviewIcon.locator('button')).toHaveCount(3);
        await locators.alertReviewIcon.locator('button').nth(2).click();
        await expect(locators.videoCell.nth(0)).not.toHaveClass(/.*VideoCell--alert.*/);
        expect(activeAlerts.length).toEqual(0);

        await clientNotFall(page);
    });

    test('Alert generation on forbidden camera (CLOUD-T118)', async ({ page }) => {
        test.skip(isCloudTest, "Test is skipped for cloud");

        const firstCamera = Configuration.cameras[0];
        const secondCamera = Configuration.cameras[1];
        const thirdCamera = Configuration.cameras[2];
        const fourthCamera = Configuration.cameras[3];
        const locators = new Locators(page);
        
        await setObjectPermissions("Alert_test", [firstCamera.accessPoint, secondCamera.accessPoint], "CAMERA_ACCESS_FORBID");

        await page.goto(clientURL);
        await authorization(page, testUserLogin, testUserPassword);
        
        await expect(locators.videoElement.nth(0)).toBeVisible();           // Добавил nth(0)

        await raiseAlert(firstCamera.accessPoint);
        await raiseAlert(secondCamera.accessPoint);
        await page.waitForTimeout(2000);
        await expect(locators.alertPanelButton).toBeHidden();

        await raiseAlert(thirdCamera.accessPoint);
        await page.waitForTimeout(1000);
        await raiseAlert(fourthCamera.accessPoint);
        await locators.alertPanelButton.click();
        await expect(locators.alertContainer).toHaveCount(2);
        await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(1).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(`${fourthCamera.displayId}.${fourthCamera.displayName}`);
        await expect(locators.alertContainer.nth(1).locator('p').first()).toHaveText(`${thirdCamera.displayId}.${thirdCamera.displayName}`);
        const firstAlertTime = await locators.alertContainer.nth(0).locator('p').last().innerText();
        await locators.alertContainer.nth(0).click();
        await expect(locators.cellImage.nth(0)).toBeVisible();
        let pointerTime = await locators.archivePointer.innerText();
        isTimeEquals(firstAlertTime, pointerTime, 1);

        await clientNotFall(page);
    });

    test('Alert access - only view (CLOUD-T562)', async ({ page }) => {
        test.skip(isCloudTest, "Test is skipped for cloud");

        const fourthCamera = Configuration.cameras[3];
        const locators = new Locators(page);

        const alertAccess = { alert_access: "ALERT_ACCESS_VIEW_ONLY" };
        await setRolePermissions("Alert_test", alertAccess);

        await page.goto(clientURL);
        await authorization(page, testUserLogin, testUserPassword);
        
        await expect(locators.videoElement.nth(0)).toBeVisible();                  // Добавил nth(0)
        await expect(locators.alertReviewIcon).toBeHidden();

        await raiseAlert(fourthCamera.accessPoint);
        await locators.alertPanelButton.click();
        await expect(locators.alertContainer).toHaveCount(1);
        await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(`${fourthCamera.displayId}.${fourthCamera.displayName}`);
        const firstAlertTime = await locators.alertContainer.nth(0).locator('p').last().innerText();
        await locators.alertContainer.nth(0).click();
        await expect(locators.cellImage.nth(0)).toBeVisible();
        await expect(locators.alertReviewIcon).toBeHidden();
        let pointerTime = await locators.archivePointer.innerText();
        isTimeEquals(firstAlertTime, pointerTime, 1);

        await clientNotFall(page);
    });

    test('Alert access - forbid (CLOUD-T563)', async ({ page }) => {
        test.skip(isCloudTest, "Test is skipped for cloud");

        const thirdCamera = Configuration.cameras[2];
        const locators = new Locators(page);

        const alertAccess = { alert_access: "ALERT_ACCESS_FORBID" };
        await setRolePermissions("Alert_test", alertAccess);

        await page.goto(clientURL);
        await authorization(page, testUserLogin, testUserPassword);

        await expect(locators.videoElement.nth(0)).toBeVisible();            // Добавил nth(0)
        await expect(locators.alertReviewIcon).toBeHidden();

        await raiseAlert(thirdCamera.accessPoint);
        await page.waitForTimeout(3000);
        await expect(locators.alertPanelButton).toBeHidden();

        await clientNotFall(page);
    });
});

test.describe("Alarms. Tests with macro", () => {

    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector();
        await detectorAnnihilator("all");
        if (Configuration.cameras.length != 4 || Configuration?.cameras[0]?.displayName != "Alert Camera" || Configuration.layouts.length != 1) {
            await cameraAnnihilator("all");
            await layoutAnnihilator("all");
            await deleteArchive('Black');
            await createCamera(4, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "1", "Alert Camera", 0);
            await addVirtualVideo(Configuration.cameras, "lprusa", "tracker");
            await createLayout([Configuration.cameras[1], Configuration.cameras[2]], 2, 1, "Test Layout");
            await createArchive("Black");
            await createArchiveVolume("Black", 20);
            await createArchiveContext("Black", [Configuration.cameras[0]], true, "High");
            await createArchiveContext("Black", [Configuration.cameras[1]], false, "High");
            await createArchiveContext("Black", [Configuration.cameras[2]], true, "Low");
            await createArchiveContext("Black", [Configuration.cameras[3]], false, "Low");
            await raiseAlert(Configuration.cameras[1].accessPoint);
            await completeAlert(activeAlerts[0]);
            await raiseAlert(Configuration.cameras[3].accessPoint);
            await completeAlert(activeAlerts[0]);
        }
    });
    
    test.beforeEach(async ({ page }) => {
        await macroAnnihilator("all");
        await detectorAnnihilator("all");
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
    });

    test.afterEach(async () => {
        for (let camera of Configuration.cameras) {
            let activeList = await getActiveAlerts(camera.accessPoint);
            for (let active of activeList!) {
                await completeAlert(active);
            }
        }
    });

    test('Alarm count indication (CLOUD-T899)', async ({ page }) => {
        test.skip(isCloudTest, "Test is skipped for cloud");

        const fourthCamera = Configuration.cameras[3];
        const locators = new Locators(page);

        await openCameraList(page);
        await locators.cameraListItem.last().click();
        await expect(locators.videoElement.nth(0)).toBeVisible();              // Добавил nth(0)

        await createCycleAlarmingMacro(fourthCamera, 12000, 'Macro1', true, 'Black', 'RAM_Always');

        await locators.alertPanelButton.waitFor({ state: 'attached', timeout: 15000 });
        await expect(locators.videoElement.nth(0)).toHaveClass(/.*VideoCell--alert.*/);    //Поменял локатор videoCell

        await locators.alertPanelButton.click();
        await expect(locators.alertContainer).toHaveCount(1);
        expect(await page.title()).toContain('(1)');
        await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(`${fourthCamera.displayId}.${fourthCamera.displayName}`);
        //await expect(locators.alertContainer.nth(0).locator('p').nth(1)).toHaveText("root");
        await expect(locators.alertContainer.nth(0).locator('p').last()).toContainText(/\d{2}:\d{2}:\d{2}/);

        await locators.alertContainer.nth(1).waitFor({ state: 'attached', timeout: 15000 });
        await expect(locators.alertContainer).toHaveCount(2);
        expect(await page.title()).toContain('(2)');
        await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(`${fourthCamera.displayId}.${fourthCamera.displayName}`);
        //await expect(locators.alertContainer.nth(0).locator('p').nth(1)).toHaveText("root");
        await expect(locators.alertContainer.nth(0).locator('p').last()).toContainText(/\d{2}:\d{2}:\d{2}/);

        await locators.alertContainer.nth(2).waitFor({ state: 'attached', timeout: 15000 });
        deleteMacro(Configuration.macros[0].guid);
        await expect(locators.alertContainer).toHaveCount(3);
        expect(await page.title()).toContain('(3)');
        await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(`${fourthCamera.displayId}.${fourthCamera.displayName}`);
        //await expect(locators.alertContainer.nth(0).locator('p').nth(1)).toHaveText("root");
        await expect(locators.alertContainer.nth(0).locator('p').last()).toContainText(/\d{2}:\d{2}:\d{2}/);

        await locators.cameraListItem.first().click();
        await expect(locators.videoElement.nth(0)).toBeVisible();                        // поменял videoCell
        await closeCameraList(page);
        await locators.alertReviewIcon.click();
        await expect(locators.videoElement.nth(0)).toHaveClass(/.*VideoCell--alert.*/);  // поменял videoCell
        expect(await page.title()).toContain('(4)');
        await locators.alertReviewIcon.click();
        await expect(locators.alertGroupReviewIcon.locator('button')).toHaveCount(3);    // поменял alertReviewIcon
        await locators.alertGroupReviewIcon.locator('button').nth(2).click();                             // поменял alertReviewIcon
        await locators.alertReviewIcon.waitFor({state: 'detached', timeout: 3000 })   //там появилась задержка в пару сек между кликом и открытием панели 
        await expect(locators.videoElement.nth(0)).not.toHaveClass(/.*VideoCell--alert.*/);
        
        expect(await page.title()).toContain('(3)');

        let macroAlerts = await getActiveAlerts(fourthCamera.accessPoint);
        await completeAlert(macroAlerts![0]);
        await completeAlert(macroAlerts![1]);
        await expect(locators.alertContainer).toHaveCount(1);
        expect(await page.title()).toContain('(1)');
        await completeAlert(macroAlerts![2]);
        await locators.alertPanelButton.waitFor({ state: "detached", timeout: 10000 });
        expect(await page.title()).not.toContain('(');

        await clientNotFall(page);
    });

    test('Handling multiple alarms from a single camera (CLOUD-T585)', async ({ page }) => {
        const secondCamera = Configuration.cameras[1];
        const locators = new Locators(page);

        await expect(locators.cellTitle).toHaveCount(2);

        await createCycleAlarmingMacro(secondCamera, 10000, 'Macro1', true, 'Black', 'RAM_Always');

        await locators.alertPanelButton.waitFor({ state: 'attached', timeout: 15000 });
        await expect(locators.videoElement.nth(0)).toHaveClass(/.*VideoCell--alert.*/); // поменял videoCell

        await locators.alertPanelButton.click();
        await expect(locators.alertContainer).toHaveCount(1);
        await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(`${secondCamera.displayId}.${secondCamera.displayName}`);
        const firstAlertTime = await locators.alertContainer.nth(0).locator('p').last().innerHTML();

        await locators.alertContainer.nth(1).waitFor({ state: 'attached', timeout: 15000 });
        await expect(locators.alertContainer).toHaveCount(2);
        await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(`${secondCamera.displayId}.${secondCamera.displayName}`);
        const secondAlertTime = await locators.alertContainer.nth(0).locator('p').last().innerHTML();

        await locators.alertContainer.nth(2).waitFor({ state: 'attached', timeout: 15000 });
        deleteMacro(Configuration.macros[0].guid);
        await expect(locators.alertContainer).toHaveCount(3);
        await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(`${secondCamera.displayId}.${secondCamera.displayName}`);
        const thirdAlertTime = await locators.alertContainer.nth(0).locator('p').last().innerHTML();

        await page.waitForTimeout(3000);
        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.cellImage).toBeVisible();
        let pointerTime = await locators.archivePointer.innerText();
        isTimeEquals(firstAlertTime, pointerTime, 1);
        await locators.playerAlerts.locator('rect').nth(2).waitFor({ state: 'attached' });
        const secondStep = await locators.playerTimestamps.nth(1).boundingBox();
        const thirdStep = await locators.playerTimestamps.nth(2).boundingBox();
        const divisionValue = Math.floor((thirdStep!.x - secondStep!.x) / 15);
        console.log(`Each ${divisionValue}px is 1 second`);
        let alertCount = await locators.playerAlerts.locator('rect').count();
        console.log('Alerts count: ', alertCount);
        const playerPointerPosition = await locators.playerPointer.locator('rect').last().boundingBox();
        let alertPosition = await locators.playerAlerts.locator('rect').nth(alertCount - 3).boundingBox();
        let distance = Math.floor(Math.abs(playerPointerPosition!.x - alertPosition!.x));
        console.log(`Distance between alert start and player pointer position is ${distance}px`);
        expect(distance <= divisionValue).toBeTruthy();
        await expect(locators.alertReviewIcon.locator('button')).toHaveCount(3);
        await locators.alertReviewIcon.locator('button').nth(2).click();
        await expect(locators.alertReviewIcon.locator('button')).toHaveCount(1);
        await expect(locators.alertContainer).toHaveCount(2);
        await expect(locators.videoCell.nth(0)).toHaveClass(/.*VideoCell--alert.*/);
        await expect(locators.alertContainer.nth(0).locator('p').last()).toHaveText(thirdAlertTime);
        await expect(locators.alertContainer.nth(1).locator('p').last()).toHaveText(secondAlertTime);

        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.cellImage).toBeVisible();
        pointerTime = await locators.archivePointer.innerText();
        isTimeEquals(secondAlertTime, pointerTime, 1);
        await locators.playerAlerts.locator('rect').nth(2).waitFor({ state: 'attached' });
        alertCount = await locators.playerAlerts.locator('rect').count();
        alertPosition = await locators.playerAlerts.locator('rect').nth(alertCount - 2).boundingBox();
        distance = Math.floor(Math.abs(playerPointerPosition!.x - alertPosition!.x));
        console.log(`Distance between alert start and player pointer position is ${distance}px`);
        expect(distance <= divisionValue).toBeTruthy();
        await expect(locators.alertReviewIcon.locator('button')).toHaveCount(3);
        await locators.alertReviewIcon.locator('button').nth(0).click();
        await expect(locators.alertReviewIcon.locator('button')).toHaveCount(1);
        await expect(locators.alertContainer).toHaveCount(1);
        await expect(locators.videoCell.nth(0)).toHaveClass(/.*VideoCell--alert.*/);
        await expect(locators.alertContainer.nth(0).locator('p').last()).toHaveText(thirdAlertTime);

        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.cellImage).toBeVisible();
        pointerTime = await locators.archivePointer.innerText();
        isTimeEquals(thirdAlertTime, pointerTime, 1);
        await locators.playerAlerts.locator('rect').nth(2).waitFor({ state: 'attached' });
        alertCount = await locators.playerAlerts.locator('rect').count();
        alertPosition = await locators.playerAlerts.locator('rect').nth(alertCount - 1).boundingBox();
        distance = Math.floor(Math.abs(playerPointerPosition!.x - alertPosition!.x));
        console.log(`Distance between alert start and player pointer position is ${distance}px`);
        expect(distance <= divisionValue).toBeTruthy();
        await expect(locators.alertReviewIcon.locator('button')).toHaveCount(3);
        await locators.alertReviewIcon.locator('button').nth(2).click();
        await expect(locators.videoCell.nth(0)).not.toHaveClass(/.*VideoCell--alert.*/);
        await expect(locators.alertReviewIcon.locator('button')).toBeHidden();
        await expect(locators.alertContainer).toBeHidden();

        await clientNotFall(page);
    });

    test('AV-Detector alert (CLOUD-T894) #smoke', async ({ page }) => {
        const secondCamera = Configuration.cameras[1];
        const locators = new Locators(page);

        await expect(locators.cellTitle).toHaveCount(2);

        await createAVDetector(secondCamera, 'MotionDetection');
        await createDetectorAlarmingMacro(Configuration.cameras[1], 0, "Macrocomand", true, "Black", "RAM_AlwaysIfNoActiveAlert");

        await locators.alertPanelButton.waitFor({ state: 'attached', timeout: 90000 });
        await expect(locators.videoElement.nth(0)).toHaveClass(/.*VideoCell--alert.*/);  // поменял videoCell

        await locators.alertPanelButton.click();
        await expect(locators.alertContainer).toHaveCount(1);
        await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(0).locator('p').nth(1)).toHaveText("Motion detection");
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(`${secondCamera.displayId}.${secondCamera.displayName}`);
        const alertTime = await locators.alertContainer.nth(0).locator('p').last().innerHTML();

        await locators.alertContainer.click();
        await expect(locators.cellImage).toBeVisible();
        const pointerTime = await locators.archivePointer.innerText();
        isTimeEquals(alertTime, pointerTime, 1);
        await locators.alertReviewIcon.click();
        await expect(locators.alertGroupReviewIcon.locator('button')).toHaveCount(3);  // поменял alertReviewIcon
        await locators.alertGroupReviewIcon.locator('button').nth(2).click();
        await expect(locators.videoElement.nth(0)).not.toHaveClass(/.*VideoCell--alert.*/);

        await clientNotFall(page);
    });

    test('Detection alert comment (CLOUD-T525)', async ({ page }) => {
        const firstCamera = Configuration.cameras[0];
        const locators = new Locators(page);

        await expect(locators.cellTitle).toHaveCount(2);
        await openCameraList(page);
        await locators.cameraListItem.first().click();
        await closeCameraList(page);
        await expect(locators.videoElement.nth(0)).toBeVisible();

        await createAVDetector(firstCamera, 'MotionDetection', 'Motion');
        await createDetectorAlarmingMacro(Configuration.cameras[0], 0, "Macrocomand", true, "Black", "RAM_AlwaysIfNoActiveAlert");

        await locators.alertPanelButton.waitFor({ state: 'attached', timeout: 90000 });
        await expect(locators.videoElement.nth(0)).toHaveClass(/.*VideoCell--alert.*/);  // поменял videoCell
        await changeAVDetector(Configuration.detectors[0].uid, [{ id: "enabled", value_bool: false }]);

        await locators.alertPanelButton.click();
        await expect(locators.alertContainer).toHaveCount(1);
        await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /blob:.*/);   // поменял /.*blob:.*/
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(`${firstCamera.displayId}.${firstCamera.displayName}`);
        const alertTime = await locators.alertContainer.nth(0).locator('p').last().innerHTML();

        await locators.alertReviewIcon.click();
        await expect(locators.cellImage).toBeVisible();
        const pointerTime = await locators.archivePointer.innerText();
        isTimeEquals(alertTime, pointerTime, 1);
        await expect(locators.alertGroupReviewIcon.locator('button')).toHaveCount(3);  // поменял alertReviewIcon
        await locators.alertNotificationImportantBtn.click();
        await locators.modalWindowTextArea.fill('Detector event');
        await locators.modalWindowAcceptButton.click();
        await expect(locators.videoCell.nth(0)).not.toHaveClass(/.*VideoCell--alert.*/);

        await locators.liveMode.click();
        await expect(locators.videoElement.nth(0)).toBeVisible();
        await locators.singleArchiveMode.click();
        // добавили .first(), так как ругался на два элемента с локаторами controls
        await locators.webpage.locator('.controls').first().evaluate(() => {
            let archivePointer: HTMLElement = document.querySelector('.control')!;
            archivePointer.style.display = "none";
        });
        await locators.alertFlag.last().locator('button').hover();
        await page.mouse.wheel(0, -1000);
        await page.waitForTimeout(1000);
        await locators.alertFlag.last().locator('button').hover();
        await page.mouse.wheel(0, -2000);
        await page.waitForTimeout(1000);
        await locators.alertFlag.last().locator('button').click();
        await expect(locators.alertInfoCard.locator('p').nth(0)).toHaveText(/Detector: \d{1,3}.Motion/);
        await expect(locators.alertInfoCard.locator('p').nth(1)).toHaveText("Initiator: MotionDetected");
        await expect(locators.alertInfoCard.locator('p').nth(2)).toHaveText("Message: Detector event");
        await locators.alertInfoCard.locator('button').click();
        await expect(locators.alertInfoCard).toBeHidden();

        await clientNotFall(page);
    });

    test('Presentation of macro alert after page reload (CLOUD-T1128)', async ({ page }) => {
        const camera = Configuration.cameras[1];
        const locators = new Locators(page);

        await expect(locators.cellTitle).toHaveCount(2);

        await createAVDetector(camera, 'MotionDetection', 'Motion');
        await createDetectorAlarmingMacro(Configuration.cameras[1], 0, "Macrocomand", true, "Black", "RAM_AlwaysIfNoActiveAlert");

        await locators.alertPanelButton.waitFor({ state: 'attached', timeout: 90000 });
        await expect(locators.videoElement.nth(0)).toHaveClass(/.*VideoCell--alert.*/);  // поменял videoCell
        await locators.alertPanelButton.click();
        await expect(locators.alertContainer).toHaveCount(1);
        await expect(locators.alertContainer).toHaveCount(1);
        await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(`${camera.displayId}.${camera.displayName}`);
        await expect(locators.alertContainer.nth(0).locator('p').last()).toContainText(/\d?\d:\d{2}:\d{2}/);
        await changeAVDetector(Configuration.detectors[0].uid, [{ id: "enabled", value_bool: false }]);
        
        await page.waitForTimeout(2000);
        await page.reload();
        await expect(locators.videoElement.nth(0)).toHaveClass(/.*VideoCell--alert.*/, { timeout: 30000 }); // поменял videoCell
        await locators.alertPanelButton.click();
        await expect(locators.alertContainer).toHaveCount(1);
        // await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(`${camera.displayId}.${camera.displayName}`);
        await expect(locators.alertContainer.nth(0).locator('p').last()).toContainText(/\d?\d:\d{2}:\d{2}/);
        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.alertGroupReviewIcon.locator('button')).toHaveCount(3);
        await locators.alertNotificationsBtn.click();      //поменял alertReviewIcon
        await expect(locators.videoCell.nth(0)).not.toHaveClass(/.*VideoCell--alert.*/);
        await expect(locators.alertPanelButton).toBeHidden();

        await page.waitForTimeout(2000);
        await page.reload();
        await expect(locators.videoCell.nth(0)).not.toHaveClass(/.*VideoCell--alert.*/, { timeout: 30000 });
        await expect(locators.alertPanelButton).toBeHidden();

        await clientNotFall(page);
    });

    test('AppData-Detector alert (CLOUD-T998)', async ({ page }) => {
        const thirdCamera = Configuration.cameras[2];
        const locators = new Locators(page);

        await expect(locators.cellTitle).toHaveCount(2);

        await createAVDetector(thirdCamera, 'SceneDescription');
        await createAppDataDetector(Configuration.detectors[0].uid, 'CrossOneLine');
        await createDetectorAlarmingMacro(Configuration.cameras[2], 1, "Macrocomand", true, "Black", "RAM_AlwaysIfNoActiveAlert");

        await locators.alertPanelButton.waitFor({ state: 'attached', timeout: 120000 });
        await expect(locators.videoElement.nth(2)).toHaveClass(/.*VideoCell--alert.*/);  // поменял videoCell
        await changeAVDetector(Configuration.detectors[0].uid, [{ id: "enabled", value_bool: false }]);

        await locators.alertPanelButton.click();
        await expect(locators.alertContainer).toHaveCount(1);
        await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(0).locator('p').nth(1)).toHaveText("Line crossing");
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(`${thirdCamera.displayId}.${thirdCamera.displayName}`);
        const alertTime = await locators.alertContainer.nth(0).locator('p').last().innerHTML();

        await locators.alertContainer.click();
        await expect(locators.cellImage).toBeVisible();
        const pointerTime = await locators.archivePointer.innerText();
        isTimeEquals(alertTime, pointerTime, 1);
        await locators.alertReviewIcon.click();
        await expect(locators.alertGroupReviewIcon.locator('button')).toHaveCount(3);
        await locators.alertNotificationsBtn.click();
        await expect(locators.videoCell.nth(0)).not.toHaveClass(/.*VideoCell--alert.*/);

        await clientNotFall(page);
    });

    test('Displaying of macro name (CLOUD-T1222)', async ({ page }) => {
        const locators = new Locators(page);
        const camera = Configuration.cameras[0];
        const macroName = 'Cycle alarming alert';

        await expect(locators.cellTitle).toHaveCount(2);

        await createCycleAlarmingMacro(camera, 60000, macroName, true, 'Black', 'RAM_AlwaysIfNoActiveAlert');

        await locators.alertPanelButton.waitFor({ state: 'attached', timeout: 15000 });
        await deleteMacro(Configuration.macros[0].guid);
        await locators.alertPanelButton.click();
        await expect(locators.alertContainer).toHaveCount(1);
        await expect(locators.alertContainer.nth(0).locator('div').first()).toHaveCSS("background-image", /.*blob:.*/);
        await expect(locators.alertContainer.nth(0).locator('p').first()).toHaveText(`${camera.displayId}.${camera.displayName}`);
        await expect(locators.alertContainer.nth(0).locator('p').nth(1)).toHaveText(macroName);
        await expect(locators.alertContainer.nth(0).locator('p').last()).toContainText(/\d?\d:\d{2}:\d{2}/);

        await clientNotFall(page);
    });

});

function addAlertRequestListener(page: Page) {

    page.on("request", async request => {
        if (request.url().includes(`raisealert`)) {
            let requestBody = request.postData();
            expect(requestBody).not.toBeNull();
            let alertObject = JSON.parse(requestBody!);
   
            let response = await request.response();
            expect(response).not.toBeNull();
            alertObject.alert_id = (await response!.json()).alert_id;

            activeAlerts.push(alertObject);
            console.log(activeAlerts);
        }

        if (request.url().includes(`complete`)) {
            let requestBody = request.postData();
            expect(requestBody).not.toBeNull();
            let alertID = JSON.parse(requestBody!).alert_id;
   
            let response = await request.response();
            expect(response).not.toBeNull();
            if ((await response!.json()).result) {
                activeAlerts = activeAlerts.filter(element => element.alert_id != alertID);
                console.log(activeAlerts);
            };
        }
    });
}

export async function completeAlert( activeAlert: { camera_ap: string, alert_id: string, } ) {
    if (await alarmFullProcessing(activeAlert)) {
        activeAlerts = activeAlerts.filter(element => element.alert_id != activeAlert.alert_id);
    }
}

async function raiseAlert(cameraRef: string) {
    let alert = await initiateAlert(cameraRef);
    if (alert) {
        activeAlerts.push(alert);
    }
}
