import { test, expect } from '@playwright/test';
import { imageSize } from 'image-size';
import { clientURL, Configuration, ROOT_LOGIN, virtualVendor, ROOT_PASSWORD, alloyAllPermisions, extendedDetectorsTest, isCloudTest } from '../global_variables';
import { createRole, setRolePermissions } from '../API/roles';
import { createUser, setUserPassword, assignUserRole } from '../API/users';
import { createArchive, createArchiveVolume, createArchiveContext, deleteArchive } from '../API/archives';
import { createDetectorAlarmingMacro, deleteMacro, } from '../API/macro';
import { createCamera, addVirtualVideo } from '../API/cameras';
import { createLayout } from '../API/layouts';
import { Locators } from '../locators/locators';
import { getHostName } from '../API/host';
import { getArchiveVisualInterval, isTimeEquals, timeToISO, waitWebSocketSentMessage } from '../utils/archive_helpers';
import { getActiveAlerts, alarmFullProcessing } from '../API/alerts';
import { cameraAnnihilator, layoutAnnihilator, configurationCollector, userAnnihilator, roleAnnihilator, authorization, openCameraList, clientNotFall, closeCameraList, waitForStableState, mapAnnihilator } from "../utils/utils.js";
import { changeAVDetector, changeDetectorsSimpleVisualElement, createAVDetector, createAppDataDetector, getDetectorEvents, getDetectorsVisualElement } from '../API/detectors';
import { VMDASearchParamsCheck, checkCurrentControlsPosition, compareBorderPositions, countEvents, isRequestOk, selectSearchSectors, setSearchArea, useFakeEvents, waitForDetectorEvents } from '../utils/detectors_helpers';
const today = new Date();
const currentDay = today.getDate() < 10 ? '0' + String(today.getDate()) : String(today.getDate());
const currentMonth = today.getMonth() + 1 < 10 ? '0' + String(today.getMonth() + 1) : String(today.getMonth() + 1);
const currentYear = today.getFullYear();
const currentDate = `${currentDay}.${currentMonth}.${currentYear}`;


test.describe("Detectors. Common UI", () => {

    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector();
        await cameraAnnihilator("all");
        await layoutAnnihilator("all");
        await deleteArchive('Black');
        await createCamera(2, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Camera", -1);
        console.log(Configuration.cameras);
        await addVirtualVideo([Configuration.cameras[0]], "faceoffice", "faceoffice");
        await addVirtualVideo([Configuration.cameras[1]], "tracker", "tracker");
        await createArchive("Black");
        await createArchiveVolume("Black", 10);
        await createArchiveContext("Black", Configuration.cameras, true, "High");
        await createAVDetector(Configuration.cameras[0], 'TvaFaceDetector', 'Face');
    });
    
    test.beforeEach(async ({ page }) => {
        await waitForDetectorEvents(page, Configuration.cameras[0]);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
    });
    
    test('Transition into search mode (CLOUD-T214)', async ({ page }) => {
        const locators = new Locators(page);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();

        await expect(locators.setSearchType).toBeVisible();
        await expect(locators.intervalStartInput).toBeVisible();
        await expect(locators.intervalEndInput).toBeVisible();
        await expect(locators.eventsOnArchive.nth(0)).toBeVisible();

        await clientNotFall(page);
    });

    test('Picking search time via calendar (CLOUD-T215) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await expect(locators.intervalStartInput).toHaveValue(`00:00:00 ${currentDate}`);
        await expect(locators.intervalEndInput).toHaveValue(`23:59:59 ${currentDate}`);

        await locators.intervalStartDatapicker.click();
        await locators.timeTab.click();
        await locators.webpage.locator('[aria-label="13 hours"]').waitFor({ state: 'attached' });
        await locators.webpage.locator('[aria-label="13 hours"]').click({ force: true });
        await locators.webpage.locator('[aria-label="30 minutes"]').waitFor({ state: 'attached' });
        await locators.webpage.locator('[aria-label="30 minutes"]').click({ force: true });
        await locators.webpage.locator('[aria-label="15 seconds"]').waitFor({ state: 'attached' });
        await locators.webpage.locator('[aria-label="15 seconds"]').click({ force: true });
        await locators.acceptButtonInDatapicker.click();
        await locators.dialogBackground.waitFor({ state: 'detached' });
        await locators.intervalEndDatapicker.click();
        await locators.timeTab.click();
        await locators.webpage.locator('[aria-label="17 hours"]').waitFor({ state: 'attached' });
        await locators.webpage.locator('[aria-label="17 hours"]').click({ force: true });
        await locators.webpage.locator('[aria-label="45 minutes"]').waitFor({ state: 'attached' });
        await locators.webpage.locator('[aria-label="45 minutes"]').click({ force: true });
        await locators.webpage.locator('[aria-label="00 seconds"]').waitFor({ state: 'attached' });
        await locators.webpage.locator('[aria-label="00 seconds"]').click({ force: true });
        await locators.acceptButtonInDatapicker.click();

        await expect(locators.intervalStartInput).toHaveValue(`13:30:15 ${currentDate}`);
        await expect(locators.intervalEndInput).toHaveValue(`17:45:00 ${currentDate}`);
        await expect(locators.archiveTimestamps.first()).toHaveText('14:00:00');
        await expect(locators.archiveTimestamps.last()).toHaveText('17:30:00');

        await clientNotFall(page);
    });

    test('Picking search time via template values (CLOUD-T216)', async ({ page }) => {
        const locators = new Locators(page);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await closeCameraList(page);

        await expect(locators.intervalStartInput).toHaveValue(`00:00:00 ${currentDate}`);
        await expect(locators.intervalEndInput).toHaveValue(`23:59:59 ${currentDate}`);
        await locators.intervalStartInput.fill(`12:00:00 ${currentDate}`);
        await locators.templateTimePicker.click({ force: true });
        await locators.webpage.getByRole('option', { name: 'Next 5min' }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.templateTimePicker).toHaveValue('5');
        await expect(locators.intervalStartInput).toHaveValue(`12:00:00 ${currentDate}`);
        await expect(locators.intervalEndInput).toHaveValue(`12:05:00 ${currentDate}`);
        await expect(locators.archiveTimestamps.first()).toHaveText('12:00:00');
        await expect(locators.archiveTimestamps.last()).toHaveText('12:05:00');

        await locators.templateTimePicker.click({ force: true });
        await locators.webpage.getByRole('option', { name: 'Next 15min' }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.templateTimePicker).toHaveValue('15');
        await expect(locators.intervalStartInput).toHaveValue(`12:00:00 ${currentDate}`);
        await expect(locators.intervalEndInput).toHaveValue(`12:15:00 ${currentDate}`);
        await expect(locators.archiveTimestamps.first()).toHaveText('12:00:00');
        await expect(locators.archiveTimestamps.last()).toHaveText('12:15:00');

        await locators.templateTimePicker.click({ force: true });
        await locators.webpage.getByRole('option', { name: 'Next 30min' }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.templateTimePicker).toHaveValue('30');
        await expect(locators.intervalStartInput).toHaveValue(`12:00:00 ${currentDate}`);
        await expect(locators.intervalEndInput).toHaveValue(`12:30:00 ${currentDate}`);
        await expect(locators.archiveTimestamps.first()).toHaveText('12:00:00');
        await expect(locators.archiveTimestamps.last()).toHaveText('12:30:00');

        await locators.templateTimePicker.click({ force: true });
        await locators.webpage.getByRole('option', { name: 'Next 1h' }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.templateTimePicker).toHaveValue('60');
        await expect(locators.intervalStartInput).toHaveValue(`12:00:00 ${currentDate}`);
        await expect(locators.intervalEndInput).toHaveValue(`13:00:00 ${currentDate}`);
        await expect(locators.archiveTimestamps.first()).toHaveText('12:00:00');
        await expect(locators.archiveTimestamps.last()).toHaveText('13:00:00');

        await locators.templateTimePicker.click({ force: true });
        await locators.webpage.getByRole('option', { name: 'Next 3h' }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.templateTimePicker).toHaveValue('180');
        await expect(locators.intervalStartInput).toHaveValue(`12:00:00 ${currentDate}`);
        await expect(locators.intervalEndInput).toHaveValue(`15:00:00 ${currentDate}`);
        await expect(locators.archiveTimestamps.first()).toHaveText('12:00:00');
        await expect(locators.archiveTimestamps.last()).toHaveText('15:00:00');

        await clientNotFall(page);
    });

    test('Picking start time later than the end (CLOUD-T217)', async ({ page }) => {
        const locators = new Locators(page);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await closeCameraList(page);

        await locators.intervalEndInput.fill(`12:00:00 ${currentDate}`);
        await locators.intervalStartDatapicker.click();
        await locators.timeTab.click();
        await locators.webpage.locator('[aria-label="12 hours"]').waitFor({ state: 'attached' });
        await locators.webpage.locator('[aria-label="12 hours"]').click({ force: true });
        await locators.webpage.locator('[aria-label="30 minutes"]').waitFor({ state: 'attached' });
        await locators.webpage.locator('[aria-label="30 minutes"]').click({ force: true });
        await locators.webpage.locator('[aria-label="00 seconds"]').waitFor({ state: 'attached' });
        await locators.webpage.locator('[aria-label="00 seconds"]').click({ force: true });
        await locators.acceptButtonInDatapicker.click();
        await expect(locators.intervalStartInput).toHaveValue(`12:30:00 ${currentDate}`);
        await expect(locators.intervalEndInput).toHaveValue(`12:35:00 ${currentDate}`);
        await locators.dialogBackground.waitFor({ state: 'detached' });
        await locators.intervalEndDatapicker.click();
        await locators.timeTab.click();
        await locators.webpage.locator('[aria-label="12 hours"]').waitFor({ state: 'attached' });
        await locators.webpage.locator('[aria-label="12 hours"]').click({ force: true });
        await locators.webpage.locator('[aria-label="00 minutes"]').waitFor({ state: 'attached' });
        await locators.webpage.locator('[aria-label="00 minutes"]').click({ force: true });
        await locators.webpage.locator('[aria-label="00 seconds"]').waitFor({ state: 'attached' });
        await locators.webpage.locator('[aria-label="00 seconds"]').click({ force: true });
        await locators.acceptButtonInDatapicker.click();
        await expect(locators.intervalStartInput).toHaveValue(`11:55:00 ${currentDate}`);
        await expect(locators.intervalEndInput).toHaveValue(`12:00:00 ${currentDate}`);

        await clientNotFall(page);
    });

    test('Picking search time via archive bar (CLOUD-T218) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await closeCameraList(page);

        await expect(locators.intervalStartInput).toHaveValue(`00:00:00 ${currentDate}`);
        await expect(locators.intervalEndInput).toHaveValue(`23:59:59 ${currentDate}`);

        await waitForStableState(locators.archiveScaleTextAnchors);
        let archiveBar = await locators.archiveScaleTextAnchors.boundingBox();
        console.log(archiveBar);
        await page.mouse.move(archiveBar!.x + archiveBar!.width / 2, archiveBar!.y + archiveBar!.height / 2);
        await page.mouse.wheel(0, -500);
        await page.waitForTimeout(3000);
        let visualArchiveInterval = await getArchiveVisualInterval(page);
        let startTime = (await locators.intervalStartInput.inputValue()).slice(0, 8);
        console.log("Input start time: ", startTime);
        let endTime = (await locators.intervalEndInput.inputValue()).slice(0, 8);
        console.log("Input start time: ", endTime);
        isTimeEquals(visualArchiveInterval[0], startTime, 600);
        isTimeEquals(visualArchiveInterval[1], endTime, 600);

        await page.mouse.move(archiveBar!.x + archiveBar!.width / 2, archiveBar!.y + archiveBar!.height / 2);
        await page.mouse.wheel(0, 1000);
        await page.waitForTimeout(3000);
        visualArchiveInterval = await getArchiveVisualInterval(page);
        startTime = (await locators.intervalStartInput.inputValue()).slice(0, 8);
        console.log("Input start time: ", startTime);
        endTime = (await locators.intervalEndInput.inputValue()).slice(0, 8);
        console.log("Input start time: ", endTime);
        isTimeEquals(visualArchiveInterval[0], startTime, 600);
        isTimeEquals(visualArchiveInterval[1], endTime, 600);

        await page.mouse.move(archiveBar!.x + archiveBar!.width / 2, archiveBar!.y + archiveBar!.height / 2);
        await page.mouse.wheel(0, -1500);
        await page.waitForTimeout(5000);
        visualArchiveInterval = await getArchiveVisualInterval(page);
        startTime = (await locators.intervalStartInput.inputValue()).slice(0, 8);
        console.log("Input start time: ", startTime);
        endTime = (await locators.intervalEndInput.inputValue()).slice(0, 8);
        console.log("Input start time: ", endTime);
        isTimeEquals(visualArchiveInterval[0], startTime, 600);
        isTimeEquals(visualArchiveInterval[1], endTime, 600);

        archiveBar = await locators.archiveScaleTextAnchors.boundingBox();
        await page.mouse.move(archiveBar!.x + archiveBar!.width / 2, archiveBar!.y + archiveBar!.height / 2);
        await page.mouse.down();
        await page.mouse.move(archiveBar!.x + archiveBar!.width / 2, archiveBar!.y + archiveBar!.height);
        await page.mouse.up();
        await page.waitForTimeout(1000);
        visualArchiveInterval = await getArchiveVisualInterval(page);
        startTime = (await locators.intervalStartInput.inputValue()).slice(0, 8);
        console.log("Input start time: ", startTime);
        endTime = (await locators.intervalEndInput.inputValue()).slice(0, 8);
        console.log("Input start time: ", endTime);
        isTimeEquals(visualArchiveInterval[0], startTime, 600);
        isTimeEquals(visualArchiveInterval[1], endTime, 600);

        await clientNotFall(page);
    });

    test('Switching between results (CLOUD-T221)', async ({ page }) => {
        const locators = new Locators(page);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await closeCameraList(page);

        await expect(locators.intervalStartInput).toHaveValue(`00:00:00 ${currentDate}`);
        await expect(locators.intervalEndInput).toHaveValue(`23:59:59 ${currentDate}`);
        await locators.setSearchType.click();
        await locators.eventSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.initiatorInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: 'Face' }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.searchButton.click();
        await locators.foundEvent.last().locator('img').waitFor({ state: 'attached' });
        await expect(locators.resultSliderDot).toHaveCount(1);
        const firstSearchEventsCount = await locators.eventsCounter.innerHTML();
        console.log('First search events', firstSearchEventsCount);

        const currentTime = new Date();
        const pastTime = new Date();
        pastTime.setSeconds(currentTime.getSeconds() - 30);
        await locators.intervalStartInput.fill(`${pastTime.getHours()}:${pastTime.getMinutes()}:${pastTime.getSeconds()} ${currentDate}`);
        await locators.intervalEndInput.fill(`${currentTime.getHours()}:${currentTime.getMinutes()}:${currentTime.getSeconds()} ${currentDate}`);
        await locators.searchButton.click();
        await locators.foundEvent.last().locator('img').waitFor({ state: 'attached' });
        await expect(locators.resultSliderDot).toHaveCount(2);
        //await expect(locators.eventsCounter).not.toHaveText(firstSearchEventsCount);
        const secondSearchEventsCount = await locators.eventsCounter.innerHTML();
        console.log('Second search events', secondSearchEventsCount);

        await locators.resultSliderLeftArrow.click();
        await expect(locators.eventsCounter).toHaveText(firstSearchEventsCount);
        await expect(locators.foundEvent.first().locator('img')).toBeVisible();
        await expect(locators.foundEvent.last().locator('img')).toBeVisible();
        await locators.resultSliderRightArrow.click();
        await expect(locators.eventsCounter).toHaveText(secondSearchEventsCount);
        await expect(locators.foundEvent.first().locator('img')).toBeVisible();
        await expect(locators.foundEvent.last().locator('img')).toBeVisible();

        await clientNotFall(page);
    });

    test('Picking snapshots by player buttons (CLOUD-T222)', async ({ page }) => {
        const locators = new Locators(page);
        const firstCamera = Configuration.cameras[0];

        let events = await getDetectorEvents(firstCamera, "future", "past", 0);
        console.log("Events count for all time: ", events.length);

        await useFakeEvents(page, events[0], 10);
        let eventsList = Array();
        page.on("response", async response => {
            if (response.url().includes(`/archive/events/detectors/`)) {
                eventsList = (await response.json()).events;
                console.log("Events list:", eventsList);
            }
        });
        
        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await closeCameraList(page);

        //await locators.videoCellBox.locator('img').waitFor({ state: 'attached' });
        await locators.videoCellHidden.waitFor({ state: 'attached' });
        await locators.setSearchType.click();
        await locators.eventSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.initiatorInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: 'Face' }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.searchButton.click();
        await locators.foundEvent.last().locator('img').waitFor({ state: 'attached' });

        await page.unroute('**/archive/events/detectors/**');

        let eventNumber = 0;
        let blobRequest = page.waitForResponse(request => request.url().includes('blob'));
        await locators.foundEvent.nth(eventNumber).click();
        let blobURL = (await blobRequest).url();
        await expect(locators.foundEvent.nth(eventNumber)).toHaveCSS('border', /.*px solid.*/);
        //await expect(locators.videoCellBox.locator('img')).toBeVisible();
        //await expect(locators.videoCellBox.locator('img')).toHaveAttribute('src', blobURL);
        //await expect(locators.videoCellBox.locator('rect')).toBeVisible();
        await expect(locators.videoCellHidden).toBeVisible();
        await expect(locators.videoCellHidden).toHaveAttribute('src', blobURL);

        blobRequest = page.waitForResponse(request => request.url().includes('blob'));
        await locators.nextIntervalButtonInVideocell.click();
        blobURL = (await blobRequest).url();
        await expect(locators.foundEvent.nth(eventNumber)).toHaveCSS('border', /.*px solid.*/);
        await expect(locators.videoCellBox.locator('img')).toBeVisible();
        await expect(locators.videoCellBox.locator('img')).toHaveAttribute('src', blobURL);
        await expect(locators.videoCellBox.locator('rect')).toBeVisible();
        //await expect(locators.videoCellBox.locator('img')).toBeVisible();
        //await expect(locators.videoCellBox.locator('img')).toHaveAttribute('src', blobURL);
        //await expect(locators.videoCellBox.locator('rect')).toBeVisible();
        eventNumber++;
        await compareBorderPositions(page, eventsList[eventNumber]);

        blobRequest = page.waitForResponse(request => request.url().includes('blob'));
        await locators.nextIntervalButtonInVideocell.click();
        blobURL = (await blobRequest).url();
        await expect(locators.foundEvent.nth(eventNumber)).toHaveCSS('border', /.*px solid.*/);
        await expect(locators.videoCellBox.locator('img')).toBeVisible();
        await expect(locators.videoCellBox.locator('img')).toHaveAttribute('src', blobURL);
        await expect(locators.videoCellBox.locator('rect')).toBeVisible();
        eventNumber++;
        await compareBorderPositions(page, eventsList[eventNumber]);

        blobRequest = page.waitForResponse(request => request.url().includes('blob'));
        await locators.previousIntervalButtonInVideocell.click();
        blobURL = (await blobRequest).url();
        await expect(locators.foundEvent.nth(eventNumber)).toHaveCSS('border', /.*px solid.*/);
        await expect(locators.videoCellBox.locator('img')).toBeVisible();
        await expect(locators.videoCellBox.locator('img')).toHaveAttribute('src', blobURL);
        await expect(locators.videoCellBox.locator('rect')).toBeVisible();
        eventNumber--;
        await compareBorderPositions(page, eventsList[eventNumber]);

        eventNumber = 4;
        blobRequest = page.waitForResponse(request => request.url().includes('blob'));
        await locators.foundEvent.nth(eventNumber).click();
        blobURL = (await blobRequest).url();
        await expect(locators.foundEvent.nth(eventNumber)).toHaveCSS('border', /.*px solid.*/);
        await expect(locators.videoCellBox.locator('img')).toBeVisible();
        await expect(locators.videoCellBox.locator('img')).toHaveAttribute('src', blobURL);
        await expect(locators.videoCellBox.locator('rect')).toBeVisible();

        blobRequest = page.waitForResponse(request => request.url().includes('blob'));
        await locators.nextIntervalButton.click();
        blobURL = (await blobRequest).url();
        await expect(locators.foundEvent.nth(eventNumber)).toHaveCSS('border', /.*px solid.*/);
        await expect(locators.videoCellBox.locator('img')).toBeVisible();
        await expect(locators.videoCellBox.locator('img')).toHaveAttribute('src', blobURL);
        await expect(locators.videoCellBox.locator('rect')).toBeVisible();
        eventNumber++;
        await compareBorderPositions(page, eventsList[eventNumber]);

        blobRequest = page.waitForResponse(request => request.url().includes('blob'));
        await locators.nextIntervalButton.click();
        blobURL = (await blobRequest).url();
        await expect(locators.foundEvent.nth(eventNumber)).toHaveCSS('border', /.*px solid.*/);
        await expect(locators.videoCellBox.locator('img')).toBeVisible();
        await expect(locators.videoCellBox.locator('img')).toHaveAttribute('src', blobURL);
        await expect(locators.videoCellBox.locator('rect')).toBeVisible();
        eventNumber++;
        await compareBorderPositions(page, eventsList[eventNumber]);

        blobRequest = page.waitForResponse(request => request.url().includes('blob'));
        await locators.prevIntervalButton.click();
        blobURL = (await blobRequest).url();
        await expect(locators.foundEvent.nth(eventNumber)).toHaveCSS('border', /.*px solid.*/);
        await expect(locators.videoCellBox.locator('img')).toBeVisible();
        await expect(locators.videoCellBox.locator('img')).toHaveAttribute('src', blobURL);
        await expect(locators.videoCellBox.locator('rect')).toBeVisible();
        eventNumber--;
        await compareBorderPositions(page, eventsList[eventNumber]);

        await clientNotFall(page);
    });

    test('Gradual loading of search results (CLOUD-T219)', async ({ page }) => {
        const locators = new Locators(page);
        const firstCamera = Configuration.cameras[0];

        let events = await getDetectorEvents(firstCamera, "future", "past", 0);
        console.log("Events count for all time: ", events.length);
        await useFakeEvents(page, events[0], 20);
        let eventsList = Array();
        page.on("response", async response => {
            if (response.url().includes(`/archive/events/detectors/`)) {
                eventsList = (await response.json()).events;
                console.log("Events list:", eventsList);
            }
        });

        await page.reload();
        const WS = await page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        console.log(WS.url());

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await closeCameraList(page);

        await locators.setSearchType.click();
        await locators.eventSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.initiatorInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: 'Face' }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        let timestampList = waitWebSocketSentMessage(WS, ['timestampList']);
        await locators.searchButton.click();
        let requestedTimestamps = (await timestampList)?.timestampList;
        console.log("Was requested timestamp list", requestedTimestamps);
        let i = 0;
        for (let timestamp of requestedTimestamps) {
            console.log(timestamp, eventsList[i].timestamp);
            expect(timestamp + '000', `Requested frame for timestamp ${timestamp}, not equals to event timestamp ${eventsList[i].timestamp}`).toEqual(eventsList[i].timestamp);
            i++;
        }

        timestampList = waitWebSocketSentMessage(WS, ['timestampList']);
        await locators.foundEvent.first().hover();
        let eventHeight = (await locators.foundEvent.first().boundingBox())?.height;
        expect(eventHeight).not.toBeUndefined();
        await page.mouse.wheel(0, eventHeight! + 30);
        requestedTimestamps = (await timestampList)?.timestampList;
        console.log("Was requested timestamp list", requestedTimestamps);
        expect(requestedTimestamps.length).toBeLessThanOrEqual(3);
        expect(requestedTimestamps.length).toBeGreaterThan(0);
        for (let timestamp of requestedTimestamps) {
            console.log(timestamp, eventsList[i].timestamp);
            expect(timestamp + '000', `Requested frame for timestamp ${timestamp}, not equals to event timestamp ${eventsList[i].timestamp}`).toEqual(eventsList[i].timestamp);
            i++;
        }
        await expect(locators.scrolledRows).toHaveAttribute('style', /height:\s\d{3,4}px;/);
        await expect(locators.foundEvent.last().locator('img')).toBeVisible();

        timestampList = waitWebSocketSentMessage(WS, ['timestampList']);
        await locators.foundEvent.first().hover();
        await page.mouse.wheel(0, eventHeight! + 30);
        requestedTimestamps = (await timestampList)?.timestampList;
        console.log("Was requested timestamp list", requestedTimestamps);
        expect(requestedTimestamps.length).toBeLessThanOrEqual(3);
        expect(requestedTimestamps.length).toBeGreaterThan(0);
        for (let timestamp of requestedTimestamps) {
            console.log(timestamp, eventsList[i].timestamp);
            expect(timestamp + '000', `Requested frame for timestamp ${timestamp}, not equals to event timestamp ${eventsList[i].timestamp}`).toEqual(eventsList[i].timestamp);
            i++;
        }
        await expect(locators.scrolledRows).toHaveAttribute('style', /height:\s\d{3,4}px;/);
        await expect(locators.foundEvent.last().locator('img')).toBeVisible();

        await clientNotFall(page);
    });

    test('Picking snapshots from events result (CLOUD-T220) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const firstCamera = Configuration.cameras[0];

        let events = await getDetectorEvents(firstCamera, "future", "past", 0);
        console.log("Events count for all time: ", events.length);
        await useFakeEvents(page, events[0], 20);
        let eventsList = Array();
        page.on("response", async response => {
            if (response.url().includes(`/archive/events/detectors/`)) {
                eventsList = (await response.json()).events;
                console.log("Events list:", eventsList);
            }
        });

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await closeCameraList(page);

        await locators.videoCellBox.locator('img').waitFor({ state: 'attached' });
        await locators.setSearchType.click();
        await locators.eventSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.initiatorInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: 'Face' }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.searchButton.click();
        await locators.foundEvent.nth(14).locator('img').waitFor({ state: 'attached' });

        await page.unroute('**/archive/events/detectors/**');

        let eventNumber = 0;
        let blobRequest = page.waitForResponse(request => request.url().includes('blob'));
        await locators.foundEvent.nth(eventNumber).click();
        let blobURL = (await blobRequest).url();
        await expect(locators.foundEvent.nth(eventNumber)).toHaveCSS('border', /.*px solid.*/);
        await expect(locators.videoCellBox.locator('img')).toBeVisible();
        await expect(locators.videoCellBox.locator('img')).toHaveAttribute('src', blobURL);
        await expect(locators.videoCellBox.locator('rect')).toBeVisible();
        await compareBorderPositions(page, eventsList[eventNumber]);

        eventNumber = 4;
        blobRequest = page.waitForResponse(request => request.url().includes('blob'));
        await locators.foundEvent.nth(eventNumber).click();
        blobURL = (await blobRequest).url();
        await expect(locators.foundEvent.nth(eventNumber)).toHaveCSS('border', /.*px solid.*/);
        await expect(locators.videoCellBox.locator('img')).toBeVisible();
        await expect(locators.videoCellBox.locator('img')).toHaveAttribute('src', blobURL);
        await expect(locators.videoCellBox.locator('rect')).toBeVisible();
        await compareBorderPositions(page, eventsList[eventNumber]);

        eventNumber = 8;
        blobRequest = page.waitForResponse(request => request.url().includes('blob'));
        await locators.foundEvent.nth(eventNumber).click();
        blobURL = (await blobRequest).url();
        await expect(locators.foundEvent.nth(eventNumber)).toHaveCSS('border', /.*px solid.*/);
        await expect(locators.videoCellBox.locator('img')).toBeVisible();
        await expect(locators.videoCellBox.locator('img')).toHaveAttribute('src', blobURL);
        await expect(locators.videoCellBox.locator('rect')).toBeVisible();
        await compareBorderPositions(page, eventsList[eventNumber]);

        await clientNotFall(page);
    });

    test('Check "Scroll selected search result to the center" parameter (CLOUD-T223)', async ({ page }) => {
        const locators = new Locators(page);
        const firstCamera = Configuration.cameras[0];

        let events = await getDetectorEvents(firstCamera, "future", "past", 0);
        console.log("Events count for all time: ", events.length);
        await useFakeEvents(page, events[0], 20);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.topMenuButton.click();
        await locators.preferences.click();
        await locators.scrollResultToCenterPreference.check();
        await locators.preferencesAccept.click();
        await locators.searchMode.click();
        await closeCameraList(page);

        await locators.videoCellBox.locator('img').waitFor({ state: 'attached' });
        await locators.setSearchType.click();
        await locators.eventSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.initiatorInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: 'Face' }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.searchButton.click();
        await locators.foundEvent.nth(14).locator('img').waitFor({ state: 'attached' });
        const searchField = await locators.eventsField.boundingBox();
        const searchFieldCenter = searchField!.y + searchField!.height / 2;
        console.log(searchField);

        await page.unroute('**/archive/events/detectors/**');

        let eventNumber = 1;
        let blobRequest = page.waitForResponse(request => request.url().includes('blob'));
        await locators.foundEvent.nth(eventNumber).click();
        let blobURL = (await blobRequest).url();
        await expect(locators.foundEvent.nth(eventNumber)).toHaveCSS('border', /.*px solid.*/);
        await expect(locators.videoCellBox.locator('img')).toBeVisible();
        await expect(locators.videoCellBox.locator('img')).toHaveAttribute('src', blobURL);
        //await page.waitForTimeout(3000);
        await waitForStableState(locators.foundEvent.nth(eventNumber));
        let eventPosition = await locators.activeEvent.boundingBox();
        console.log(`Event #${eventNumber} coordinates:`, eventPosition)
        expect(eventPosition!.y + eventPosition!.height).toBeLessThan(searchFieldCenter);

        eventNumber = 9;
        blobRequest = page.waitForResponse(request => request.url().includes('blob'));
        await locators.foundEvent.nth(eventNumber).click();
        blobURL = (await blobRequest).url();
        await expect(locators.foundEvent.nth(eventNumber)).toHaveCSS('border', /.*px solid.*/);
        await expect(locators.videoCellBox.locator('img')).toBeVisible();
        await expect(locators.videoCellBox.locator('img')).toHaveAttribute('src', blobURL);
        await locators.foundEvent.nth(14).locator('img').waitFor({ state: 'attached' });
        // await page.waitForTimeout(3000);
        await waitForStableState(locators.foundEvent.nth(eventNumber));
        eventPosition = await locators.activeEvent.boundingBox();
        console.log(`Event #${eventNumber} coordinates:`, eventPosition)
        expect(eventPosition!.y < searchFieldCenter && eventPosition!.y + eventPosition!.height > searchFieldCenter).toBeTruthy();

        eventNumber = 7;
        blobRequest = page.waitForResponse(request => request.url().includes('blob'));
        await locators.foundEvent.nth(eventNumber).click();
        blobURL = (await blobRequest).url();
        await expect(locators.foundEvent.nth(eventNumber)).toHaveCSS('border', /.*px solid.*/);
        await expect(locators.videoCellBox.locator('img')).toBeVisible();
        await expect(locators.videoCellBox.locator('img')).toHaveAttribute('src', blobURL);
        await locators.foundEvent.nth(14).locator('img').waitFor({ state: 'attached' });
        //await page.waitForTimeout(3000);
        await waitForStableState(locators.foundEvent.nth(eventNumber));
        eventPosition = await locators.activeEvent.boundingBox();
        console.log(`Event #${eventNumber} coordinates:`, eventPosition)
        expect(eventPosition!.y < searchFieldCenter && eventPosition!.y + eventPosition!.height > searchFieldCenter).toBeTruthy();

        eventNumber = 8;
        blobRequest = page.waitForResponse(request => request.url().includes('blob'));
        await locators.foundEvent.nth(eventNumber).click();
        blobURL = (await blobRequest).url();
        await expect(locators.foundEvent.nth(eventNumber)).toHaveCSS('border', /.*px solid.*/);
        await expect(locators.videoCellBox.locator('img')).toBeVisible();
        await expect(locators.videoCellBox.locator('img')).toHaveAttribute('src', blobURL);
        await locators.foundEvent.nth(14).locator('img').waitFor({ state: 'attached' });
        //await page.waitForTimeout(3000);
        await waitForStableState(locators.foundEvent.nth(eventNumber));
        eventPosition = await locators.activeEvent.boundingBox();
        console.log(`Event #${eventNumber} coordinates:`, eventPosition)
        expect(eventPosition!.y < searchFieldCenter && eventPosition!.y + eventPosition!.height > searchFieldCenter).toBeTruthy();

        await clientNotFall(page);
    });
});


test.describe("Detectors. Event search (base)", () => {
    const dayStart = new Date;
    const dayEnd = new Date;
    dayStart.setHours(0);
    dayStart.setMinutes(0);
    dayStart.setSeconds(0);
    dayEnd.setHours(23);
    dayEnd.setMinutes(59);
    dayEnd.setSeconds(59);

    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector();
        await layoutAnnihilator("all");
        await deleteArchive('Black');
        await createArchive('Black');
        await createArchiveVolume('Black', 10);
    });

    test('Search by manual alert (CLOUD-T244) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await cameraAnnihilator("all");
        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Camera", -1);
        await addVirtualVideo(Configuration.cameras, "tracker", "tracker");
        await createArchiveContext("Black", Configuration.cameras, true, "High");

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.videoCell.nth(0)).toHaveClass(/.*VideoCell--alert.*/);
        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.alertReviewIcon.locator('button')).toHaveCount(3);
        await locators.alertReviewIcon.locator('button').nth(0).click();
        await expect(locators.videoCell.nth(0)).not.toHaveClass(/.*VideoCell--alert.*/);

        await locators.liveMode.click();

        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.videoCell.nth(0)).toHaveClass(/.*VideoCell--alert.*/);
        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.alertReviewIcon.locator('button')).toHaveCount(3);
        await locators.alertReviewIcon.locator('button').nth(1).click();
        await locators.modalWindowTextArea.fill('New Comment!');
        await locators.modalWindowAcceptButton.click();
        await expect(locators.videoCell.nth(0)).not.toHaveClass(/.*VideoCell--alert.*/);

        await locators.liveMode.click();

        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.videoCell.nth(0)).toHaveClass(/.*VideoCell--alert.*/);
        await locators.alertReviewIcon.nth(0).click();
        await expect(locators.alertReviewIcon.locator('button')).toHaveCount(3);
        await locators.alertReviewIcon.locator('button').nth(2).click();
        await expect(locators.videoCell.nth(0)).not.toHaveClass(/.*VideoCell--alert.*/);

        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.eventSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.eventTypeInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: "All alarms" }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.initiatorInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: "All" }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.searchButton.click();
        await locators.foundEvent.nth(0).waitFor({ state: 'attached' });
        for (let foundEvent of await locators.foundEvent.all()) {
            await foundEvent.locator('img').waitFor({ state: 'attached' });
        }
        const eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toEqual(3);

        await clientNotFall(page);
    });

    test('Search by detector alert (CLOUD-T1016)', async ({ page }) => {
        const locators = new Locators(page);
        const detectorName = "Motion";

        await cameraAnnihilator("all");
        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Camera", -1);
        await addVirtualVideo(Configuration.cameras, "tracker", "tracker");
        await createArchiveContext("Black", Configuration.cameras, true, "High");
        await createAVDetector(Configuration.cameras[0], 'MotionDetection', detectorName);
        await changeAVDetector(Configuration.detectors[0].uid, [{ id: "AlarmEndDelay", value_int32: 3 }]);
        await createDetectorAlarmingMacro(Configuration.cameras[0], 0, "Macrocomand", true, "Black", "RAM_AlwaysIfNoActiveAlert");
        for (let i = 0; i < 10; i++) {
            let activeAlerts = await getActiveAlerts(Configuration.cameras[0].accessPoint);
            if (activeAlerts.length == 1) {
                await deleteMacro(Configuration.macros[0].guid);
                await alarmFullProcessing(activeAlerts[0]);
                break;
            }
            await page.waitForTimeout(10000);
        }
        
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.eventSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.eventTypeInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: "All alarms" }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.initiatorInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: "All" }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.searchButton.click();
        await locators.foundEvent.locator('img').nth(0).waitFor({ state: 'attached' });
        let eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toEqual(1);
        await locators.initiatorInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: detectorName }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.searchButton.click();
        await locators.foundEvent.locator('img').nth(0).waitFor({ state: 'attached' });
        eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toEqual(1);

        await clientNotFall(page);
    });

    test('Search by subdetector alert (CLOUD-T1016)', async ({ page }) => {
        const locators = new Locators(page);
        const detectorName = "Line crossing";

        await cameraAnnihilator("all");
        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Camera", -1);
        await addVirtualVideo(Configuration.cameras, "tracker", "tracker");
        await createArchiveContext("Black", Configuration.cameras, true, "High");
        await createAVDetector(Configuration.cameras[0], 'SceneDescription', );
        await changeAVDetector(Configuration.detectors[0].uid, [{ id: "AlarmEndDelay", value_int32: 3 }]);
        await createAppDataDetector(Configuration.detectors[0].uid, 'CrossOneLine', detectorName);
        await createDetectorAlarmingMacro(Configuration.cameras[0], 1, "Macrocomand", true, "Black", "RAM_AlwaysIfNoActiveAlert");
        for (let i = 0; i < 20; i++) {
            let activeAlerts = await getActiveAlerts(Configuration.cameras[0].accessPoint);
            if (activeAlerts.length == 1) {
                await deleteMacro(Configuration.macros[0].guid);
                await alarmFullProcessing(activeAlerts[0]);
                break;
            }
            await page.waitForTimeout(10000);
        }
        
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.eventSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.eventTypeInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: "All alarms" }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.initiatorInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: "All" }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.searchButton.click();
        await locators.foundEvent.locator('img').nth(0).waitFor({ state: 'attached' });
        let eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toEqual(1);
        await locators.initiatorInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: detectorName }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        const alertsRequest = page.waitForResponse(request => request.url().includes('archive/events/alerts'));
        await locators.searchButton.click();
        const alertsList = (await (await alertsRequest).json()).events;
        console.log(alertsList);
        await locators.foundEvent.locator('img').nth(0).waitFor({ state: 'attached' });
        eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toEqual(1);
        let eventNumber = 0;
        await locators.foundEvent.nth(eventNumber).click();
        await expect(locators.foundEvent.nth(eventNumber)).toHaveCSS('border', /.*px solid.*/);
        await expect(locators.videoCellBox.locator('img')).toBeVisible();
        await expect(locators.videoCellBox.locator('rect')).toBeVisible();
        await compareBorderPositions(page, alertsList[eventNumber]);

        await clientNotFall(page);
    });
    
    test('Search by motion detector (CLOUD-T245) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const detectorName = "Motion";

        await cameraAnnihilator("all");
        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Camera", -1);
        await addVirtualVideo(Configuration.cameras, "tracker", "tracker");
        await createArchiveContext("Black", Configuration.cameras, true, "High");
        await createAVDetector(Configuration.cameras[0], 'MotionDetection', detectorName);
        await changeAVDetector(Configuration.detectors[0].uid, [{ id: "AlarmEndDelay", value_int32: 3 }]);

        await waitForDetectorEvents(page, Configuration.cameras[0]);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.eventSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.initiatorInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: detectorName }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        const eventsCount = countEvents(await getDetectorEvents(Configuration.cameras[0], timeToISO(dayEnd), timeToISO(dayStart)));
        console.log("Events count in response:", eventsCount);
        await locators.searchButton.click();
        await locators.foundEvent.nth(0).waitFor({ state: 'attached' });
        for (let foundEvent of await locators.foundEvent.all()) {
            await foundEvent.locator('img').waitFor({ state: 'attached' });
        }
        const eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toBeGreaterThanOrEqual(eventsCount);

        await clientNotFall(page);
    });

    test('Search by face detector (CLOUD-T246) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const detectorName = "Face";

        await cameraAnnihilator("all");
        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Camera", -1);
        await addVirtualVideo(Configuration.cameras, "faceoffice", "faceoffice");
        await createArchiveContext("Black", Configuration.cameras, true, "High");
        await createAVDetector(Configuration.cameras[0], 'TvaFaceDetector', detectorName);

        await waitForDetectorEvents(page, Configuration.cameras[0]);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.eventSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.initiatorInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: detectorName }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        const eventsCount = countEvents(await getDetectorEvents(Configuration.cameras[0], timeToISO(dayEnd), timeToISO(dayStart)));
        console.log("Events count in response:", eventsCount);
        await locators.searchButton.click();
        await locators.foundEvent.nth(0).waitFor({ state: 'attached' });
        for (let foundEvent of await locators.foundEvent.all()) {
            await foundEvent.locator('img').waitFor({ state: 'attached' });
        }
        const eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toBeGreaterThanOrEqual(eventsCount);

        await clientNotFall(page);
    });

    test('Search by LPR (VT) detector (CLOUD-T247) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const detectorName = "LPR (VT)";

        await cameraAnnihilator("all");
        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Camera", -1);
        await addVirtualVideo(Configuration.cameras, "Lpr3", "Lpr3");
        await createArchiveContext("Black", Configuration.cameras, true, "High");
        await createAVDetector(Configuration.cameras[0], 'LprDetector_Vit', detectorName);

        await waitForDetectorEvents(page, Configuration.cameras[0]);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.eventSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.initiatorInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: detectorName }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        const eventsCount = countEvents(await getDetectorEvents(Configuration.cameras[0], timeToISO(dayEnd), timeToISO(dayStart)));
        console.log("Events count in response:", eventsCount);
        await locators.searchButton.click();
        await locators.foundEvent.nth(0).waitFor({ state: 'attached' });
        for (let foundEvent of await locators.foundEvent.all()) {
            await foundEvent.locator('img').waitFor({ state: 'attached' });
        }
        const eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toBeGreaterThanOrEqual(eventsCount);

        await clientNotFall(page);
    });

    test('Search by line crossing detector (CLOUD-T255) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const detectorName = "Line";

        await cameraAnnihilator("all");
        await createCamera(1, virtualVendor, "Virtual", "admin123", "admin", "0.0.0.0", "80", "", "Camera", -1);
        await addVirtualVideo(Configuration.cameras, "tracker");
        await createArchiveContext("Black", Configuration.cameras, true, "High");
        await createAVDetector(Configuration.cameras[0], 'SceneDescription');
        await createAppDataDetector(Configuration.detectors[0].uid, 'CrossOneLine', detectorName);

        await waitForDetectorEvents(page, Configuration.cameras[0], 1, 120, 1);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.eventSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.initiatorInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: detectorName }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        const eventsCount = countEvents(await getDetectorEvents(Configuration.cameras[0], timeToISO(dayEnd), timeToISO(dayStart), 1));
        console.log("Events count in response:", eventsCount);
        await locators.searchButton.click();
        await locators.foundEvent.nth(0).waitFor({ state: 'attached' });
        for (let foundEvent of await locators.foundEvent.all()) {
            await foundEvent.locator('img').waitFor({ state: 'attached' });
        }
        const eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toBeGreaterThanOrEqual(eventsCount);

        await clientNotFall(page);
    });

    test('Search by motion in area detector (CLOUD-T259) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const detectorName = "Move in Zone";

        await cameraAnnihilator("all");
        await createCamera(1, virtualVendor, "Virtual", "admin123", "admin", "0.0.0.0", "80", "", "Camera", -1);
        await addVirtualVideo(Configuration.cameras, "tracker");
        await createArchiveContext("Black", Configuration.cameras, true, "High");
        await createAVDetector(Configuration.cameras[0], 'SceneDescription');
        await createAppDataDetector(Configuration.detectors[0].uid, 'MoveInZone', detectorName);

        await waitForDetectorEvents(page, Configuration.cameras[0], 1, 120, 1);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.eventSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.initiatorInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: detectorName }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        const eventsCount = countEvents(await getDetectorEvents(Configuration.cameras[0], timeToISO(dayEnd), timeToISO(dayStart), 1));
        console.log("Events count in response:", eventsCount);
        await locators.searchButton.click();
        await locators.foundEvent.nth(0).waitFor({ state: 'attached' });
        for (let foundEvent of await locators.foundEvent.all()) {
            await foundEvent.locator('img').waitFor({ state: 'attached' });
        }
        const eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toBeGreaterThanOrEqual(eventsCount);

        await clientNotFall(page);
    });
});

test.describe("Detectors. Event search (extended detectors pool)", () => {
    test.skip(!extendedDetectorsTest, "Flag to testing extended detectors pool is disabled");

    const dayStart = new Date;
    const dayEnd = new Date;
    dayStart.setHours(0);
    dayStart.setMinutes(0);
    dayStart.setSeconds(0);
    dayEnd.setHours(23);
    dayEnd.setMinutes(59);
    dayEnd.setSeconds(59);

    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector();
        await layoutAnnihilator("all");
        await deleteArchive('Black');
        await createArchive('Black');
        await createArchiveVolume('Black', 10);
    });

    test('Search by fire detector (CLOUD-T248)', async ({ page }) => {
        const locators = new Locators(page);
        const detectorName = "Fire";

        await cameraAnnihilator("all");
        await createCamera(1, virtualVendor, "Virtual", "admin123", "admin", "0.0.0.0", "80", "", "Camera", -1);
        await addVirtualVideo(Configuration.cameras, "fire");
        await createArchiveContext("Black", Configuration.cameras, true, "High");
        await createAVDetector(Configuration.cameras[0], 'FireDetector', detectorName);
        await changeAVDetector(Configuration.detectors[0].uid, [{ id: "target_fps", value_double: 1 }]);

        await waitForDetectorEvents(page, Configuration.cameras[0]);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.eventSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.initiatorInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: detectorName }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        const eventsCount = countEvents(await getDetectorEvents(Configuration.cameras[0], timeToISO(dayEnd), timeToISO(dayStart)));
        console.log("Events count in response:", eventsCount);
        await locators.searchButton.click();
        await locators.foundEvent.nth(0).waitFor({ state: 'attached' });
        for (let foundEvent of await locators.foundEvent.all()) {
            await foundEvent.locator('img').waitFor({ state: 'attached' });
        }
        const eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toBeGreaterThanOrEqual(eventsCount);

        await clientNotFall(page);
    });

    test('Search by smoke detector (CLOUD-T249)', async ({ page }) => {
        const locators = new Locators(page);
        const detectorName = "Smoke";

        await cameraAnnihilator("all");
        await createCamera(1, virtualVendor, "Virtual", "admin123", "admin", "0.0.0.0", "80", "", "Camera", -1);
        await addVirtualVideo(Configuration.cameras, "fire");
        await createArchiveContext("Black", Configuration.cameras, true, "High");
        await createAVDetector(Configuration.cameras[0], 'SmokeDetector', detectorName);
        await changeAVDetector(Configuration.detectors[0].uid, [{ id: "target_fps", value_double: 1 }]);

        await waitForDetectorEvents(page, Configuration.cameras[0]);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.eventSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.initiatorInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: detectorName }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        const eventsCount = countEvents(await getDetectorEvents(Configuration.cameras[0], timeToISO(dayEnd), timeToISO(dayStart)));
        console.log("Events count in response:", eventsCount);
        await locators.searchButton.click();
        await locators.foundEvent.nth(0).waitFor({ state: 'attached' });
        for (let foundEvent of await locators.foundEvent.all()) {
            await foundEvent.locator('img').waitFor({ state: 'attached' });
        }
        const eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toBeGreaterThanOrEqual(eventsCount);

        await clientNotFall(page);
    });

    test('Search by queue detector (CLOUD-T251)', async ({ page }) => {
        const locators = new Locators(page);
        const detectorName = "Queue";

        await cameraAnnihilator("all");
        await createCamera(1, virtualVendor, "Virtual", "admin123", "admin", "0.0.0.0", "80", "", "Camera", -1);
        await addVirtualVideo(Configuration.cameras, "queue");
        await createArchiveContext("Black", Configuration.cameras, true, "High");
        await createAVDetector(Configuration.cameras[0], 'QueueDetector', detectorName);
        await changeAVDetector(Configuration.detectors[0].uid, [{ id: "queuesize", value_int32: 2 }]);

        await waitForDetectorEvents(page, Configuration.cameras[0]);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.eventSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.initiatorInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: detectorName }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        const eventsCount = countEvents(await getDetectorEvents(Configuration.cameras[0], timeToISO(dayEnd), timeToISO(dayStart)));
        console.log("Events count in response:", eventsCount);
        await locators.searchButton.click();
        await locators.foundEvent.nth(0).waitFor({ state: 'attached' });
        for (let foundEvent of await locators.foundEvent.all()) {
            await foundEvent.locator('img').waitFor({ state: 'attached' });
        }
        const eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toBeGreaterThanOrEqual(eventsCount);

        await clientNotFall(page);
    });

    test('Search by neurocounter (CLOUD-T254)', async ({ page }) => {
        const locators = new Locators(page);
        const detectorName = "Neurocounter";

        await cameraAnnihilator("all");
        await createCamera(1, virtualVendor, "Virtual", "admin123", "admin", "0.0.0.0", "80", "", "Camera", -1);
        await addVirtualVideo(Configuration.cameras, "faceoffice");
        await createArchiveContext("Black", Configuration.cameras, true, "High");
        await createAVDetector(Configuration.cameras[0], 'NeuroCounter', detectorName);
        await changeAVDetector(Configuration.detectors[0].uid, [{ id: "AlarmObjectCount", value_int32: 2 }]);

        await waitForDetectorEvents(page, Configuration.cameras[0]);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.eventSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.initiatorInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: detectorName }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        const eventsCount = countEvents(await getDetectorEvents(Configuration.cameras[0], timeToISO(dayEnd), timeToISO(dayStart)));
        console.log("Events count in response:", eventsCount);
        await locators.searchButton.click();
        await locators.foundEvent.nth(0).waitFor({ state: 'attached' });
        for (let foundEvent of await locators.foundEvent.all()) {
            await foundEvent.locator('img').waitFor({ state: 'attached' });
        }
        const eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toBeGreaterThanOrEqual(eventsCount);

        await clientNotFall(page);
    });

    test('Search by loitering detector (CLOUD-T256)', async ({ page }) => {
        test.skip();
        const locators = new Locators(page);
        const detectorName = "Loitering";

        await cameraAnnihilator("all");
        await createCamera(1, virtualVendor, "Virtual", "admin123", "admin", "0.0.0.0", "80", "", "Camera", -1);
        await addVirtualVideo(Configuration.cameras, "tracker");
        await createArchiveContext("Black", Configuration.cameras, true, "High");
        let AVDetectorAccessPoint = await createAVDetector(Configuration.cameras[0], 'SceneDescription');
        let AppDataDetectorAccessPoint = await createAppDataDetector(AVDetectorAccessPoint, 'LongInZone', detectorName);
        await changeAVDetector(AppDataDetectorAccessPoint, [{ id: "TimeAlarm", value_int32: 3 }]);

        await waitForDetectorEvents(page, Configuration.cameras[0], 1, 120, 1);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.eventSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.initiatorInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: detectorName }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        const eventsCount = countEvents(await getDetectorEvents(Configuration.cameras[0], timeToISO(dayEnd), timeToISO(dayStart), 1));
        console.log("Events count in response:", eventsCount);
        await locators.searchButton.click();
        await locators.foundEvent.nth(0).waitFor({ state: 'attached' });
        for (let foundEvent of await locators.foundEvent.all()) {
            await foundEvent.locator('img').waitFor({ state: 'attached' });
        }
        const eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toBeGreaterThanOrEqual(eventsCount);

        await clientNotFall(page);
    });

    test('Search by stop in area detector (CLOUD-T257)', async ({ page }) => {
        const locators = new Locators(page);
        const detectorName = "StopInArea";

        await cameraAnnihilator("all");
        await createCamera(1, virtualVendor, "Virtual", "admin123", "admin", "0.0.0.0", "80", "", "Camera", -1);
        await addVirtualVideo(Configuration.cameras, "tracker");
        await createArchiveContext("Black", Configuration.cameras, true, "High");
        let AVDetectorAccessPoint = await createAVDetector(Configuration.cameras[0], 'SceneDescription');
        await createAppDataDetector(AVDetectorAccessPoint, 'StopInZone', detectorName);

        await waitForDetectorEvents(page, Configuration.cameras[0], 1, 120, 1);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.eventSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.initiatorInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: detectorName }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        const eventsCount = countEvents(await getDetectorEvents(Configuration.cameras[0], timeToISO(dayEnd), timeToISO(dayStart), 1));
        console.log("Events count in response:", eventsCount);
        await locators.searchButton.click();
        await locators.foundEvent.nth(0).waitFor({ state: 'attached' });
        for (let foundEvent of await locators.foundEvent.all()) {
            await foundEvent.locator('img').waitFor({ state: 'attached' });
        }
        const eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toBeGreaterThanOrEqual(eventsCount);

        await clientNotFall(page);
    });

    test('Search by forgotten object detector (CLOUD-T258)', async ({ page }) => {
        const locators = new Locators(page);
        const detectorName = "LostObject";

        await cameraAnnihilator("all");
        await createCamera(1, virtualVendor, "Virtual", "admin123", "admin", "0.0.0.0", "80", "", "Camera", -1);
        await addVirtualVideo(Configuration.cameras, "tracker");
        await createArchiveContext("Black", Configuration.cameras, true, "High");
        let AVDetectorAccessPoint = await createAVDetector(Configuration.cameras[0], 'SceneDescription');
        await changeAVDetector(AVDetectorAccessPoint, [{ id: "DetectUnattendedObjects", value_bool: true }, { id: "NoModLongTime", value_int32: 20 }]);
        await createAppDataDetector(AVDetectorAccessPoint, 'LostObject', detectorName);

        await waitForDetectorEvents(page, Configuration.cameras[0], 1, 120, 1);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.eventSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.initiatorInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: detectorName }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        const eventsCount = countEvents(await getDetectorEvents(Configuration.cameras[0], timeToISO(dayEnd), timeToISO(dayStart), 1));
        console.log("Events count in response:", eventsCount);
        await locators.searchButton.click();
        await locators.foundEvent.nth(0).waitFor({ state: 'attached' });
        for (let foundEvent of await locators.foundEvent.all()) {
            await foundEvent.locator('img').waitFor({ state: 'attached' });
        }
        const eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toBeGreaterThanOrEqual(eventsCount);

        await clientNotFall(page);
    });

    test('Search by entrance in area detector (CLOUD-T260)', async ({ page }) => {
        const locators = new Locators(page);
        const detectorName = "Entrance";

        await cameraAnnihilator("all");
        await createCamera(1, virtualVendor, "Virtual", "admin123", "admin", "0.0.0.0", "80", "", "Camera", -1);
        await addVirtualVideo(Configuration.cameras, "tracker");
        await createArchiveContext("Black", Configuration.cameras, true, "High");
        let AVDetectorAccessPoint = await createAVDetector(Configuration.cameras[0], 'SceneDescription');
        let AppDataDetectorAccessPoint = await createAppDataDetector(AVDetectorAccessPoint, 'ComeInZone', detectorName);
        let visualElements = await getDetectorsVisualElement(AppDataDetectorAccessPoint);
        let targetCoordinates = [[0.25, 0.25], [0.75, 0.25], [0.75, 0.75], [0.25, 0.75]];
        expect(visualElements).not.toBeUndefined()
        await changeDetectorsSimpleVisualElement(visualElements![0].uid, targetCoordinates);

        await waitForDetectorEvents(page, Configuration.cameras[0], 1, 120, 1);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.eventSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.initiatorInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: detectorName }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        const eventsCount = countEvents(await getDetectorEvents(Configuration.cameras[0], timeToISO(dayEnd), timeToISO(dayStart), 1));
        console.log("Events count in response:", eventsCount);
        await locators.searchButton.click();
        await locators.foundEvent.nth(0).waitFor({ state: 'attached' });
        for (let foundEvent of await locators.foundEvent.all()) {
            await foundEvent.locator('img').waitFor({ state: 'attached' });
        }
        const eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toBeGreaterThanOrEqual(eventsCount);

        await clientNotFall(page);
    });

    test('Search by out of area detector (CLOUD-T261)', async ({ page }) => {
        const locators = new Locators(page);
        const detectorName = "OutOfZone";

        await cameraAnnihilator("all");
        await createCamera(1, virtualVendor, "Virtual", "admin123", "admin", "0.0.0.0", "80", "", "Camera", -1);
        await addVirtualVideo(Configuration.cameras, "tracker");
        await createArchiveContext("Black", Configuration.cameras, true, "High");
        let AVDetectorAccessPoint = await createAVDetector(Configuration.cameras[0], 'SceneDescription');
        let AppDataDetectorAccessPoint = await createAppDataDetector(AVDetectorAccessPoint, 'OutOfZone', detectorName);
        let visualElements = await getDetectorsVisualElement(AppDataDetectorAccessPoint);
        let targetCoordinates = [[0.25, 0.25], [0.75, 0.25], [0.75, 0.75], [0.25, 0.75]];
        expect(visualElements).not.toBeUndefined()
        await changeDetectorsSimpleVisualElement(visualElements![0].uid, targetCoordinates);

        await waitForDetectorEvents(page, Configuration.cameras[0], 1, 120, 1);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.eventSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.initiatorInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: detectorName }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        const eventsCount = countEvents(await getDetectorEvents(Configuration.cameras[0], timeToISO(dayEnd), timeToISO(dayStart), 1));
        console.log("Events count in response:", eventsCount);
        await locators.searchButton.click();
        await locators.foundEvent.nth(0).waitFor({ state: 'attached' });
        for (let foundEvent of await locators.foundEvent.all()) {
            await foundEvent.locator('img').waitFor({ state: 'attached' });
        }
        const eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toBeGreaterThanOrEqual(eventsCount);

        await clientNotFall(page);
    });
});

test.describe("Detectors. License plate search", () => {
    const detectorName = "LPR (VT)";
    const dayStart = new Date;
    const dayEnd = new Date;
    dayStart.setHours(0);
    dayStart.setMinutes(0);
    dayStart.setSeconds(0);
    dayEnd.setHours(23);
    dayEnd.setMinutes(59);
    dayEnd.setSeconds(59);

    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector();
        await cameraAnnihilator("all");
        await layoutAnnihilator("all");
        await deleteArchive('Black');
        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Camera", -1);
        await addVirtualVideo(Configuration.cameras, "Lpr3", "Lpr3");
        await createArchive('Black');
        await createArchiveVolume('Black', 10);
        await createArchiveContext('Black', Configuration.cameras, true, 'High');
        await createAVDetector(Configuration.cameras[0], 'LprDetector_Vit', detectorName);
    });

    test('Search for all plates (VT) (CLOUD-T274) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await waitForDetectorEvents(page, Configuration.cameras[0], 5, 240);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.LPSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.LPSearchField).toBeEmpty();
        let detectorEvents = await getDetectorEvents(Configuration.cameras[0], timeToISO(dayEnd), timeToISO(dayStart));
        const eventsCount = countEvents(detectorEvents);
        console.log("Events count in response:", eventsCount);
        
        console.log("Search input:", await locators.LPSearchField.inputValue());
        await locators.searchButton.click();
        await locators.foundEvent.nth(0).waitFor({ state: 'attached' });
        for (let foundEvent of await locators.foundEvent.all()) {
            await expect(foundEvent.locator('img')).toBeVisible();
            await expect(foundEvent.locator('p').nth(0)).toContainText(/\d{2}:\d{2}:\d{2} \d{2}\.\d{2}\.\d{4}/);
            await expect(foundEvent.locator('p').nth(1)).toContainText(/[A-Z0-9]{7}/);
        }
        let eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toBeGreaterThanOrEqual(eventsCount);
        expect(eventsCountUI).toBeLessThanOrEqual(Math.ceil(eventsCount * 1.1));

        await locators.LPSearchField.fill('*');
        console.log("Search input:", await locators.LPSearchField.inputValue());
        let requestPromise = page.waitForRequest(request => request.url().includes(`/search/auto/20`));
        await locators.searchButton.click();
        expect((await requestPromise).postData()).toContain('"plate":"*"');
        await locators.foundEvent.nth(0).waitFor({ state: 'attached' });
        for (let foundEvent of await locators.foundEvent.all()) {
            await expect(foundEvent.locator('img')).toBeVisible();
            await expect(foundEvent.locator('p').nth(0)).toContainText(/\d{2}:\d{2}:\d{2} \d{2}\.\d{2}\.\d{4}/);
            await expect(foundEvent.locator('p').nth(1)).toContainText(/[A-Z0-9]{7}/);
        }
        eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toBeGreaterThanOrEqual(eventsCount);

        await clientNotFall(page);
    });

    test('Search for specific plate (VT) (CLOUD-T275) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await waitForDetectorEvents(page, Configuration.cameras[0], 5, 240);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.LPSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        let detectorEvents = await getDetectorEvents(Configuration.cameras[0], timeToISO(dayEnd), timeToISO(dayStart));
        const eventsCount = countEvents(detectorEvents);
        console.log("Events count in response:", eventsCount);

        let plate = detectorEvents[0].plate
        await locators.LPSearchField.fill(plate);
        console.log("Search input:", await locators.LPSearchField.inputValue());
        let requestPromise = page.waitForRequest(request => request.url().includes(`/search/auto/20`));
        await locators.searchButton.click();
        expect((await requestPromise).postData()).toContain(`"plate":"${plate}"`);
        await locators.foundEvent.nth(0).waitFor({ state: 'attached' });
        for (let foundEvent of await locators.foundEvent.all()) {
            await expect(foundEvent.locator('img')).toBeVisible();
            await expect(foundEvent.locator('p').nth(0)).toContainText(/\d{2}:\d{2}:\d{2} \d{2}\.\d{2}\.\d{4}/);
            await expect(foundEvent.locator('p').nth(1)).toContainText(plate);
        }
        let eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toBeLessThan(eventsCount);

        plate = detectorEvents[1].plate
        await locators.LPSearchField.fill(plate);
        console.log("Search input:", await locators.LPSearchField.inputValue());
        requestPromise = page.waitForRequest(request => request.url().includes(`/search/auto/20`));
        await locators.searchButton.click();
        expect((await requestPromise).postData()).toContain(`"plate":"${plate}"`);
        await locators.foundEvent.nth(0).waitFor({ state: 'attached' });
        for (let foundEvent of await locators.foundEvent.all()) {
            await expect(foundEvent.locator('img')).toBeVisible();
            await expect(foundEvent.locator('p').nth(0)).toContainText(/\d{2}:\d{2}:\d{2} \d{2}\.\d{2}\.\d{4}/);
            await expect(foundEvent.locator('p').nth(1)).toContainText(plate);
        }
        eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toBeLessThan(eventsCount);
        
        await clientNotFall(page);
    });

    test('Search for invalid plate (VT) (CLOUD-T276)', async ({ page }) => {
        const locators = new Locators(page);

        await waitForDetectorEvents(page, Configuration.cameras[0], 5, 240);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.LPSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        let detectorEvents = await getDetectorEvents(Configuration.cameras[0], timeToISO(dayEnd), timeToISO(dayStart));

        let plate = detectorEvents[0].plate.slice(0, 3);
        await locators.LPSearchField.fill(plate);
        console.log("Search input:", await locators.LPSearchField.inputValue());
        let requestPromise = page.waitForRequest(request => request.url().includes(`/search/auto/20`));
        await locators.searchButton.click();
        expect((await requestPromise).postData()).toContain(`"plate":"${plate}"`);
        await expect(locators.noResultBanner).toBeVisible();
        await expect(locators.foundEvent).toHaveCount(0);

        plate = "AA777AA"
        await locators.LPSearchField.fill(plate);
        console.log("Search input:", await locators.LPSearchField.inputValue());
        requestPromise = page.waitForRequest(request => request.url().includes(`/search/auto/20`));
        await locators.searchButton.click();
        expect((await requestPromise).postData()).toContain(`"plate":"${plate}"`);
        await expect(locators.noResultBanner).toBeVisible();
        await expect(locators.foundEvent).toHaveCount(0);

        await clientNotFall(page);
    });

    test('Search plate by partial match (VT) (CLOUD-T277) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await waitForDetectorEvents(page, Configuration.cameras[0], 5, 240);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.LPSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        let detectorEvents = await getDetectorEvents(Configuration.cameras[0], timeToISO(dayEnd), timeToISO(dayStart));
        const eventsCount = countEvents(detectorEvents);
        console.log("Events count in response:", eventsCount);

        let plateBase = detectorEvents[0].plate.slice(0, 3);
        let plate = plateBase + "*";
        await locators.LPSearchField.fill(plate);
        console.log("Search input:", await locators.LPSearchField.inputValue());
        let requestPromise = page.waitForRequest(request => request.url().includes(`/search/auto/20`));
        await locators.searchButton.click();
        expect((await requestPromise).postData()).toContain(`"plate":"${plate}"`);
        await locators.foundEvent.nth(0).waitFor({ state: 'attached' });
        for (let foundEvent of await locators.foundEvent.all()) {
            await expect(foundEvent.locator('img')).toBeVisible();
            await expect(foundEvent.locator('p').nth(0)).toContainText(/\d{2}:\d{2}:\d{2} \d{2}\.\d{2}\.\d{4}/);
            await expect(foundEvent.locator('p').nth(1)).toContainText(plateBase);
        }
        let eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toBeLessThan(eventsCount);

        plateBase = detectorEvents[1].plate.slice(4);
        plate = "*" + plateBase;
        await locators.LPSearchField.fill(plate);
        console.log("Search input:", await locators.LPSearchField.inputValue());
        requestPromise = page.waitForRequest(request => request.url().includes(`/search/auto/20`));
        await locators.searchButton.click();
        expect((await requestPromise).postData()).toContain(`"plate":"${plate}"`);
        await locators.foundEvent.nth(0).waitFor({ state: 'attached' });
        for (let foundEvent of await locators.foundEvent.all()) {
            await expect(foundEvent.locator('img')).toBeVisible();
            await expect(foundEvent.locator('p').nth(0)).toContainText(/\d{2}:\d{2}:\d{2} \d{2}\.\d{2}\.\d{4}/);
            await expect(foundEvent.locator('p').nth(1)).toContainText(plateBase);
        }
        eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toBeLessThan(eventsCount);

        plateBase = detectorEvents[2].plate.slice(0, 2);
        plate = plateBase + "*" + detectorEvents[2].plate.slice(4, 5) + "*";
        await locators.LPSearchField.fill(plate);
        console.log("Search input:", await locators.LPSearchField.inputValue());
        requestPromise = page.waitForRequest(request => request.url().includes(`/search/auto/20`));
        await locators.searchButton.click();
        expect((await requestPromise).postData()).toContain(`"plate":"${plate}"`);
        await locators.foundEvent.nth(0).waitFor({ state: 'attached' });
        for (let foundEvent of await locators.foundEvent.all()) {
            await expect(foundEvent.locator('img')).toBeVisible();
            await expect(foundEvent.locator('p').nth(0)).toContainText(/\d{2}:\d{2}:\d{2} \d{2}\.\d{2}\.\d{4}/);
            await expect(foundEvent.locator('p').nth(1)).toContainText(plateBase);
        }
        eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toBeLessThan(eventsCount);

        plateBase = detectorEvents[3].plate;
        plate = plateBase.replace(plateBase.slice(3, 5), "??");
        await locators.LPSearchField.fill(plate);
        console.log("Search input:", await locators.LPSearchField.inputValue());
        requestPromise = page.waitForRequest(request => request.url().includes(`/search/auto/20`));
        await locators.searchButton.click();
        expect((await requestPromise).postData()).toContain(`"plate":"${plate}"`);
        await locators.foundEvent.nth(0).waitFor({ state: 'attached' });
        for (let foundEvent of await locators.foundEvent.all()) {
            await expect(foundEvent.locator('img')).toBeVisible();
            await expect(foundEvent.locator('p').nth(0)).toContainText(/\d{2}:\d{2}:\d{2} \d{2}\.\d{2}\.\d{4}/);
            await expect(foundEvent.locator('p').nth(1)).toContainText(plateBase);
        }
        eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toBeLessThan(eventsCount);
        
        await clientNotFall(page);
    });
});

test.describe("Detectors. Face search", () => {
    const detectorName = "Face";
    const dayStart = new Date;
    const dayEnd = new Date;
    dayStart.setHours(0);
    dayStart.setMinutes(0);
    dayStart.setSeconds(0);
    dayEnd.setHours(23);
    dayEnd.setMinutes(59);
    dayEnd.setSeconds(59);

    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector();
        await cameraAnnihilator("all");
        await layoutAnnihilator("all");
        await deleteArchive('Black');
        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Camera", -1);
        await addVirtualVideo(Configuration.cameras, "faceoffice", "faceoffice");
        await createArchive('Black');
        await createArchiveVolume('Black', 10);
        await createArchiveContext('Black', Configuration.cameras, true, 'High');
        await createAVDetector(Configuration.cameras[0], 'TvaFaceDetector', detectorName);
    });

    test('Face search without reference face (CLOUD-T278) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await waitForDetectorEvents(page, Configuration.cameras[0], 5, 240);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.faceSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.faceSearchField).toBeEmpty();
        await expect(locators.faceSearchField).toHaveAttribute('accept', 'image/jpeg');
        let detectorEvents = await getDetectorEvents(Configuration.cameras[0], timeToISO(dayEnd), timeToISO(dayStart));
        const eventsCount = countEvents(detectorEvents);
        console.log("Events count in response:", eventsCount);
        let requestPromise = page.waitForRequest(request => request.url().includes(`/search/face/20`));
        await locators.searchButton.click();
        expect((await requestPromise).postData()).not.toContain("image");
        await locators.foundEvent.nth(0).waitFor({ state: 'attached' });
        for (let foundEvent of await locators.foundEvent.all()) {
            await expect(foundEvent.locator('img')).toBeVisible();
            await expect(foundEvent.locator('p').nth(0)).toContainText(/\d{2}:\d{2}:\d{2} \d{2}\.\d{2}\.\d{4}/);
            await expect(foundEvent.locator('p').nth(1)).toBeHidden();
        }
        let eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toBeGreaterThanOrEqual(eventsCount);
        expect(eventsCountUI).toBeLessThanOrEqual(Math.ceil(eventsCount * 1.1));

        await clientNotFall(page);
    });

    test('Face search with uploaded photo (CLOUD-T279) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await waitForDetectorEvents(page, Configuration.cameras[0], 5, 240);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.faceSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.faceSearchField).toBeEmpty();
        await expect(locators.faceSearchField).toHaveAttribute('accept', 'image/jpeg');
        let detectorEvents = await getDetectorEvents(Configuration.cameras[0], timeToISO(dayEnd), timeToISO(dayStart));
        const eventsCount = countEvents(detectorEvents);
        console.log("Events count in response:", eventsCount);

        await locators.faceSearchField.setInputFiles('./test_data/photo.jpg');
        await locators.faceSearchImage.waitFor({ state: 'attached' });
        let requestPromise = page.waitForRequest(request => request.url().includes(`/search/face/20`));
        await locators.searchButton.click();
        expect((await requestPromise).postData()).toContain("image");
        await isRequestOk(requestPromise);

        await (locators.noResultBanner.or(locators.foundEvent.nth(0))).waitFor({ state: 'attached' });
        let haveEvents = false;
        for (let foundEvent of await locators.foundEvent.all()) {
            await expect(foundEvent.locator('img')).toBeVisible();
            await expect(foundEvent.locator('p').nth(0)).toContainText(/\d{2}:\d{2}:\d{2} \d{2}\.\d{2}\.\d{4}/);
            await expect(foundEvent.locator('p').nth(1)).toContainText(/\d{1,3}%/);
            if (!haveEvents) {
                haveEvents = true;
                let eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
                console.log("Events count in UI:", eventsCountUI);
                expect(eventsCountUI).toBeLessThan(eventsCount);
            }
        }

        await clientNotFall(page);
    });

    test('Face search with photo from result (CLOUD-T280) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await waitForDetectorEvents(page, Configuration.cameras[0], 5, 240);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.faceSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.faceSearchField).toBeEmpty();
        await expect(locators.faceSearchField).toHaveAttribute('accept', 'image/jpeg');
        let detectorEvents = await getDetectorEvents(Configuration.cameras[0], timeToISO(dayStart), timeToISO(dayEnd));
        let eventsCount = countEvents(detectorEvents);
        console.log("Events count in response:", eventsCount);
        let requestPromise = page.waitForRequest(request => request.url().includes(`/search/face/20`));
        await locators.searchButton.click();
        expect((await requestPromise).postData()).not.toContain("image");
        await locators.foundEvent.nth(0).waitFor({ state: 'attached' });
        for (let foundEvent of await locators.foundEvent.all()) {
            await expect(foundEvent.locator('img')).toBeVisible();
            await expect(foundEvent.locator('p').nth(0)).toContainText(/\d{2}:\d{2}:\d{2} \d{2}\.\d{2}\.\d{4}/);
            await expect(foundEvent.locator('p').nth(1)).toBeHidden();
        }
        let eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toBeGreaterThanOrEqual(eventsCount);
        expect(eventsCountUI).toBeLessThanOrEqual(Math.ceil(eventsCount * 1.1));

        let eventNumber = 1;
        await locators.foundEvent.nth(eventNumber).click();
        await expect(locators.foundEvent.nth(eventNumber)).toHaveCSS('border', /.*px solid.*/);
        await expect(locators.videoCellBox.locator('img')).toBeVisible();
        await expect(locators.videoCellBox.locator('rect')).toBeVisible();
        await compareBorderPositions(page, detectorEvents[eventNumber]);
        await locators.videoCellBox.locator('rect').click();
        await locators.faceSearchImage.waitFor({ state: 'attached' });
        requestPromise = page.waitForRequest(request => request.url().includes(`/search/face/20`));
        await locators.searchButton.click();
        expect((await requestPromise).postData()).toContain("image");
        await isRequestOk(requestPromise);

        await (locators.noResultBanner.or(locators.foundEvent.nth(0))).waitFor({ state: 'attached' });
        let haveEvents = false;
        for (let foundEvent of await locators.foundEvent.all()) {
            await expect(foundEvent.locator('img')).toBeVisible();
            await expect(foundEvent.locator('p').nth(0)).toContainText(/\d{2}:\d{2}:\d{2} \d{2}\.\d{2}\.\d{4}/);
            await expect(foundEvent.locator('p').nth(1)).toContainText(/\d{1,3}%/);
            if (!haveEvents) {
                haveEvents = true;
                eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
                console.log("Events count in UI:", eventsCountUI);
                expect(eventsCountUI).toBeLessThan(eventsCount);
            }
        }

        await locators.removeSearchFace.click();
        await expect(locators.faceSearchImage).toBeHidden();
        detectorEvents = await getDetectorEvents(Configuration.cameras[0], timeToISO(dayStart), timeToISO(dayEnd));
        eventsCount = countEvents(detectorEvents);
        console.log("Events count in response:", eventsCount);
        requestPromise = page.waitForRequest(request => request.url().includes(`/search/face/20`));
        await locators.searchButton.click();
        expect((await requestPromise).postData()).not.toContain("image");
        await locators.foundEvent.nth(0).waitFor({ state: 'attached' });
        for (let foundEvent of await locators.foundEvent.all()) {
            await expect(foundEvent.locator('img')).toBeVisible();
            await expect(foundEvent.locator('p').nth(0)).toContainText(/\d{2}:\d{2}:\d{2} \d{2}\.\d{2}\.\d{4}/);
            await expect(foundEvent.locator('p').nth(1)).toBeHidden();
        }
        eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
        console.log("Events count in UI:", eventsCountUI);
        expect(eventsCountUI).toBeGreaterThanOrEqual(eventsCount);
        expect(eventsCountUI).toBeLessThanOrEqual(Math.ceil(eventsCount * 1.1));
        
        await clientNotFall(page);
    });

    test('Changing similarity threshold (CLOUD-T281)', async ({ page }) => {
        const locators = new Locators(page);

        await waitForDetectorEvents(page, Configuration.cameras[0], 5, 240);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.faceSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.faceSearchField).toBeEmpty();
        await expect(locators.faceSearchField).toHaveAttribute('accept', 'image/jpeg');
        let detectorEvents = await getDetectorEvents(Configuration.cameras[0], timeToISO(dayEnd), timeToISO(dayStart));
        let eventsCount = countEvents(detectorEvents);
        console.log("Events count in response:", eventsCount);

        await locators.faceSearchField.setInputFiles('./test_data/photo.jpg');
        await locators.faceSearchImage.waitFor({ state: 'attached' });
        let inputValue = 98;
        await locators.faceSimilarityThreshold.fill(String(inputValue));
        await expect(locators.faceSimilarityThreshold).toHaveValue(String(inputValue));
        await locators.faceSimilarityThreshold.click();
        await page.keyboard.press('ArrowUp');
        await expect(locators.faceSimilarityThreshold).toHaveValue(String(++inputValue));
        await page.keyboard.press('ArrowUp');
        await expect(locators.faceSimilarityThreshold).toHaveValue(String(++inputValue));
        await page.keyboard.press('ArrowUp');
        await expect(locators.faceSimilarityThreshold).toHaveValue(String(inputValue));
        inputValue = 3;
        await locators.faceSimilarityThreshold.fill(String(inputValue));
        await expect(locators.faceSimilarityThreshold).toHaveValue(String(inputValue));
        await locators.faceSimilarityThreshold.click();
        await page.keyboard.press('ArrowDown');
        await expect(locators.faceSimilarityThreshold).toHaveValue(String(--inputValue));
        await page.keyboard.press('ArrowDown');
        await expect(locators.faceSimilarityThreshold).toHaveValue(String(--inputValue));
        await page.keyboard.press('ArrowDown');
        await expect(locators.faceSimilarityThreshold).toHaveValue(String(inputValue));

        inputValue = 1;
        await locators.faceSimilarityThreshold.fill(String(inputValue));
        let requestPromise = page.waitForRequest(request => request.url().includes(`/search/face/20`));
        await locators.searchButton.click();
        expect((await requestPromise).postData()).toContain("image");
        expect((await requestPromise).postData()).toContain(`"accuracy":${inputValue / 100}`);
        await isRequestOk(requestPromise);

        await (locators.noResultBanner.or(locators.foundEvent.nth(0))).waitFor({ state: 'attached' });
        let haveEvents = false;
        for (let foundEvent of await locators.foundEvent.all()) {
            await expect(foundEvent.locator('img')).toBeVisible();
            await expect(foundEvent.locator('p').nth(0)).toContainText(/\d{2}:\d{2}:\d{2} \d{2}\.\d{2}\.\d{4}/);
            let eventAccuracy = await foundEvent.locator('p').nth(1).innerText();
            expect(Number(eventAccuracy.replace('%', ''))).toBeGreaterThanOrEqual(inputValue);
            if (!haveEvents) {
                haveEvents = true;
                let eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
                console.log("Events count in UI:", eventsCountUI);
                expect(eventsCountUI).toBeLessThan(eventsCount);
            }
        }

        inputValue = 40;
        await locators.faceSimilarityThreshold.fill(String(inputValue));
        requestPromise = page.waitForRequest(request => request.url().includes(`/search/face/20`));
        await locators.searchButton.click();
        expect((await requestPromise).postData()).toContain("image");
        expect((await requestPromise).postData()).toContain(`"accuracy":${inputValue / 100}`);
        await isRequestOk(requestPromise);

        await (locators.noResultBanner.or(locators.foundEvent.nth(0))).waitFor({ state: 'attached' });
        haveEvents = false;
        for (let foundEvent of await locators.foundEvent.all()) {
            await expect(foundEvent.locator('img')).toBeVisible();
            await expect(foundEvent.locator('p').nth(0)).toContainText(/\d{2}:\d{2}:\d{2} \d{2}\.\d{2}\.\d{4}/);
            let eventAccuracy = await foundEvent.locator('p').nth(1).innerText();
            expect(Number(eventAccuracy.replace('%', ''))).toBeGreaterThanOrEqual(inputValue);
            if (!haveEvents) {
                haveEvents = true;
                let eventsCountUI = Number((await locators.eventsCounter.innerText()).replace('Found: ', ''));
                console.log("Events count in UI:", eventsCountUI);
                expect(eventsCountUI).toBeLessThan(eventsCount);
            }
        }

        await clientNotFall(page);
    });

    test('Changing result sorting type (CLOUD-T282)', async ({ page }) => {
        const locators = new Locators(page);

        await waitForDetectorEvents(page, Configuration.cameras[0], 5, 240);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.faceSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.faceSearchField).toBeEmpty();
        await expect(locators.faceSearchField).toHaveAttribute('accept', 'image/jpeg');
        await locators.searchButton.click();
        await locators.foundEvent.nth(0).waitFor({ state: 'attached' });
        let firstEventTime = await locators.foundEvent.locator('p').nth(0).innerText();
        await expect(locators.faceSortingMenu).toHaveValue('accuracy');
        await locators.faceSortingMenu.click({ force: true });
        await locators.sortingOptionTime.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.faceSortingMenu).toHaveValue('timestamp');
        await expect(locators.foundEvent.locator('p').nth(0)).toHaveText(firstEventTime);

        await page.route('**/result*', async route => {
            let body = {
                "events": Array()
            };

            let time = new Date();
    
            for (let i = 1; i <= 4; i++) {
                time.setSeconds(time.getSeconds() - 5);
                body.events.push(
                    {
                        "accuracy": (100 - 20 * i) / 100,
                        "offlineAnalyticsSource": "",
                        "origin": Configuration.cameras[0].accessPoint,
                        "position": {
                            "bottom": 0.2,
                            "left": 0.1,
                            "right": 0.2,
                            "top": 0.1
                        },
                        "timestamp": timeToISO(time)
                    }
                )
            }

            console.log(body);
            route.fulfill({ body: JSON.stringify(body), contentType: 'application/json; charset=utf-8' });
        });

        await locators.faceSearchField.setInputFiles('./test_data/photo.jpg');
        await locators.faceSearchImage.waitFor({ state: 'attached' });
        await locators.faceSimilarityThreshold.fill("10");
        await locators.faceSortingMenu.click({ force: true });
        await locators.sortingOptionSimilarity.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.faceSortingMenu).toHaveValue('accuracy');
        await locators.searchButton.click();
        await expect(locators.foundEvent).toHaveCount(4);
        await expect(locators.foundEvent.nth(0).locator('p').nth(1)).toHaveText('20%');
        await expect(locators.foundEvent.nth(1).locator('p').nth(1)).toHaveText('40%');
        await expect(locators.foundEvent.nth(2).locator('p').nth(1)).toHaveText('60%');
        await expect(locators.foundEvent.nth(3).locator('p').nth(1)).toHaveText('80%');
        await locators.resultSortingIcon.click();
        await expect(locators.foundEvent.nth(0).locator('p').nth(1)).toHaveText('80%');
        await expect(locators.foundEvent.nth(1).locator('p').nth(1)).toHaveText('60%');
        await expect(locators.foundEvent.nth(2).locator('p').nth(1)).toHaveText('40%');
        await expect(locators.foundEvent.nth(3).locator('p').nth(1)).toHaveText('20%');
        await locators.faceSortingMenu.click({ force: true });
        await locators.sortingOptionTime.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.faceSortingMenu).toHaveValue('timestamp');
        await expect(locators.foundEvent).toHaveCount(4);
        await expect(locators.foundEvent.nth(0).locator('p').nth(1)).toHaveText('80%');
        await expect(locators.foundEvent.nth(1).locator('p').nth(1)).toHaveText('60%');
        await expect(locators.foundEvent.nth(2).locator('p').nth(1)).toHaveText('40%');
        await expect(locators.foundEvent.nth(3).locator('p').nth(1)).toHaveText('20%');
        await locators.resultSortingIcon.click();
        await expect(locators.foundEvent.nth(0).locator('p').nth(1)).toHaveText('20%');
        await expect(locators.foundEvent.nth(1).locator('p').nth(1)).toHaveText('40%');
        await expect(locators.foundEvent.nth(2).locator('p').nth(1)).toHaveText('60%');
        await expect(locators.foundEvent.nth(3).locator('p').nth(1)).toHaveText('80%');

        await clientNotFall(page);
    });

});



test.describe("Detectors. Fast search", () => {
    const testRoleName = 'Fast';
    const testUserLogin = 'Search_test';
    const testUserPassword = 'Admin1234';
    const dayStart = new Date;
    const dayEnd = new Date;
    dayStart.setHours(0);
    dayStart.setMinutes(0);
    dayStart.setSeconds(0);
    dayStart.setMilliseconds(0);
    dayEnd.setHours(23);
    dayEnd.setMinutes(59);
    dayEnd.setSeconds(59);
    dayEnd.setMilliseconds(999);

    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector();
        await cameraAnnihilator("all");
        await layoutAnnihilator("all");
        await mapAnnihilator('all');
        await roleAnnihilator("all");
        await userAnnihilator("all");
        await deleteArchive('Black');
        await createCamera(4, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Camera", -1);
        await addVirtualVideo(Configuration.cameras, "tracker", "tracker");
        await createArchive('Black');
        await createArchiveVolume('Black', 10);
        await createArchiveContext('Black', Configuration.cameras, true, 'High');
        await createAVDetector(Configuration.cameras[0], 'SceneDescription', 'Tracker');
        await createAVDetector(Configuration.cameras[3], 'MotionDetection', 'Motion');
        console.log(Configuration.detectors);
        await changeAVDetector(Configuration.detectors[1].uid, [{ id: "TrackingObj", value_bool: true }]);
        await createRole(testRoleName);
        await setRolePermissions(testRoleName);
        await createUser(testUserLogin);
        await assignUserRole(testRoleName, testUserLogin);
        await setUserPassword(testUserLogin, testUserPassword);
        Configuration.detectors.sort((a, b) => Number(a.display_id) - Number(b.display_id));
        let wait = ms => new Promise(resolve => setTimeout(resolve, ms));
        await wait(10000);
    });

    test.beforeEach(async () => {
        await layoutAnnihilator("all");
    });

    test('Fast search interface check (CLOUD-T419)', async ({ page }) => {
        const locators = new Locators(page);

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await locators.fastSearchButton.click();
        await expect(locators.fastSearchCanvas).toBeVisible();
        await expect(locators.fastSearchCanvas).toHaveCSS('cursor', 'cell');
        await expect(locators.fastSearchProceedButton).toBeHidden();
        let canvasSizeEmpty = await locators.gridcell.evaluate(async (item) =>  {
            const canvas = item.querySelectorAll('canvas')[1];
            const blob: any = await new Promise(resolve => canvas.toBlob(resolve)); //ПОНЯТИЯ НЕ ИМЕЮ КАК ЭТО РАБОТАЕТ, ПОТОМ РАЗБЕРУСЬ
            return blob.size;
        });
        console.log('Empty canvas size:', canvasSizeEmpty);

        await selectSearchSectors(page, 1, 190);
        await expect(locators.fastSearchProceedButton).toBeVisible();
        let canvasSizeDrawed = await locators.gridcell.evaluate(async (item) =>  {
            const canvas = item.querySelectorAll('canvas')[1];
            const blob: any = await new Promise(resolve => canvas.toBlob(resolve));
            return blob.size;
        });
        console.log('Drawed canvas size:', canvasSizeDrawed);
        expect(canvasSizeDrawed).not.toEqual(canvasSizeEmpty);

        await locators.fastSearchButton.click();
        await expect(locators.fastSearchCanvas).toBeHidden();
        await expect(locators.fastSearchProceedButton).toBeHidden();
        await expect(locators.fastSearchButton).toBeVisible();

        await clientNotFall(page);
    });

    test('Fast search from solo camera (CLOUD-T420)', async ({ page }) => {
        const locators = new Locators(page);
        const detectorEndpoint = Configuration.detectors[0].uid + '/SourceEndpoint.vmda';

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await locators.fastSearchButton.click();
        await expect(locators.fastSearchCanvas).toBeVisible();
        let searchCoordinates = await selectSearchSectors(page, 181, 200);
        let requestPromise = page.waitForRequest(request => request.url().includes(`search/vmda/${timeToISO(dayStart)}/${timeToISO(dayEnd)}`));
        await locators.fastSearchProceedButton.click();
        await VMDASearchParamsCheck(page, requestPromise, searchCoordinates, [detectorEndpoint]);
        await expect(locators.setSearchType).toContainText("Motion in area");
        await (locators.noResultBanner.or(locators.foundEvent.nth(0))).waitFor({ state: 'attached' });

        await locators.liveMode.click();
        await locators.fastSearchButton.click();
        await expect(locators.fastSearchCanvas).toBeVisible();
        searchCoordinates = await selectSearchSectors(page, 10, 390);
        requestPromise = page.waitForRequest(request => request.url().includes(`search/vmda/${timeToISO(dayStart)}/${timeToISO(dayEnd)}`));
        await locators.fastSearchProceedButton.click();
        await VMDASearchParamsCheck(page, requestPromise, searchCoordinates, [detectorEndpoint]);
        await expect(locators.setSearchType).toContainText("Motion in area");
        await (locators.noResultBanner.or(locators.foundEvent.nth(0))).waitFor({ state: 'attached' });

        await locators.liveMode.click();
        await locators.fastSearchButton.click();
        await expect(locators.fastSearchCanvas).toBeVisible();
        searchCoordinates = await selectSearchSectors(page, 1, 400);
        requestPromise = page.waitForRequest(request => request.url().includes(`search/vmda/${timeToISO(dayStart)}/${timeToISO(dayEnd)}`));
        await locators.fastSearchProceedButton.click();
        await VMDASearchParamsCheck(page, requestPromise, searchCoordinates, [detectorEndpoint]);
        await expect(locators.setSearchType).toContainText("Motion in area");
        await (locators.noResultBanner.or(locators.foundEvent.nth(0))).waitFor({ state: 'attached' });

        await locators.liveMode.click();
        await locators.fastSearchButton.click();
        await expect(locators.fastSearchCanvas).toBeVisible();
        searchCoordinates = await selectSearchSectors(page, 218, 218);
        requestPromise = page.waitForRequest(request => request.url().includes(`search/vmda/${timeToISO(dayStart)}/${timeToISO(dayEnd)}`));
        await locators.fastSearchProceedButton.click();
        await VMDASearchParamsCheck(page, requestPromise, searchCoordinates, [detectorEndpoint]);
        await expect(locators.setSearchType).toContainText("Motion in area");
        await (locators.noResultBanner.or(locators.foundEvent.nth(0))).waitFor({ state: 'attached' });

        await locators.liveMode.click();
        await locators.fastSearchButton.click();
        await expect(locators.fastSearchCanvas).toBeVisible();
        searchCoordinates = await selectSearchSectors(page, 162, 309);
        requestPromise = page.waitForRequest(request => request.url().includes(`search/vmda/${timeToISO(dayStart)}/${timeToISO(dayEnd)}`));
        await locators.fastSearchProceedButton.click();
        await VMDASearchParamsCheck(page, requestPromise, searchCoordinates, [detectorEndpoint]);
        await expect(locators.setSearchType).toContainText("Motion in area");
        await (locators.noResultBanner.or(locators.foundEvent.nth(0))).waitFor({ state: 'attached' });

        await clientNotFall(page);
    });

    test('Fast search with disabled "Keep aspect ratio" (CLOUD-T929)', async ({ page }) => {
        const locators = new Locators(page);
        const detectorEndpoint = Configuration.detectors[0].uid + '/SourceEndpoint.vmda';

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await locators.topMenuButton.click();
        await locators.preferences.click();
        await locators.keepAspectRatio.uncheck();
        await locators.preferencesAccept.click();
        await locators.webpage.locator('video.VideoCell__video--fill').waitFor({ state: 'attached' });

        await locators.fastSearchButton.click();
        await expect(locators.fastSearchCanvas).toBeVisible();
        let searchFieldSize = await locators.fastSearchCanvas.boundingBox();
        let videoCellBoxSize = await locators.canvasElement.boundingBox();
        console.log("Search field size:", searchFieldSize);
        console.log("Videcell size:", videoCellBoxSize);
        expect(searchFieldSize!.height).toBeCloseTo(videoCellBoxSize!.height, 0);
        expect(searchFieldSize!.width).toBeCloseTo(videoCellBoxSize!.width, 0);
        let searchCoordinates = await selectSearchSectors(page, 181, 200);
        let requestPromise = page.waitForRequest(request => request.url().includes(`search/vmda/${timeToISO(dayStart)}/${timeToISO(dayEnd)}`));
        await locators.fastSearchProceedButton.click();
        await VMDASearchParamsCheck(page, requestPromise, searchCoordinates, [detectorEndpoint]);
        await (locators.noResultBanner.or(locators.foundEvent.nth(0))).waitFor({ state: 'attached' });

        await locators.liveMode.click();
        await locators.fastSearchButton.click();
        await expect(locators.fastSearchCanvas).toBeVisible();
        searchCoordinates = await selectSearchSectors(page, 10, 390);
        requestPromise = page.waitForRequest(request => request.url().includes(`search/vmda/${timeToISO(dayStart)}/${timeToISO(dayEnd)}`));
        await locators.fastSearchProceedButton.click();
        await VMDASearchParamsCheck(page, requestPromise, searchCoordinates, [detectorEndpoint]);
        await (locators.noResultBanner.or(locators.foundEvent.nth(0))).waitFor({ state: 'attached' });

        await locators.liveMode.click();
        await locators.fastSearchButton.click();
        await expect(locators.fastSearchCanvas).toBeVisible();
        searchCoordinates = await selectSearchSectors(page, 1, 400);
        requestPromise = page.waitForRequest(request => request.url().includes(`search/vmda/${timeToISO(dayStart)}/${timeToISO(dayEnd)}`));
        await locators.fastSearchProceedButton.click();
        await VMDASearchParamsCheck(page, requestPromise, searchCoordinates, [detectorEndpoint]);
        await (locators.noResultBanner.or(locators.foundEvent.nth(0))).waitFor({ state: 'attached' });

        await locators.liveMode.click();
        await locators.fastSearchButton.click();
        await expect(locators.fastSearchCanvas).toBeVisible();
        searchCoordinates = await selectSearchSectors(page, 218, 218);
        requestPromise = page.waitForRequest(request => request.url().includes(`search/vmda/${timeToISO(dayStart)}/${timeToISO(dayEnd)}`));
        await locators.fastSearchProceedButton.click();
        await VMDASearchParamsCheck(page, requestPromise, searchCoordinates, [detectorEndpoint]);
        await (locators.noResultBanner.or(locators.foundEvent.nth(0))).waitFor({ state: 'attached' });

        await locators.liveMode.click();
        await locators.fastSearchButton.click();
        await expect(locators.fastSearchCanvas).toBeVisible();
        searchCoordinates = await selectSearchSectors(page, 162, 309);
        requestPromise = page.waitForRequest(request => request.url().includes(`search/vmda/${timeToISO(dayStart)}/${timeToISO(dayEnd)}`));
        await locators.fastSearchProceedButton.click();
        await VMDASearchParamsCheck(page, requestPromise, searchCoordinates, [detectorEndpoint]);
        await (locators.noResultBanner.or(locators.foundEvent.nth(0))).waitFor({ state: 'attached' });

        await clientNotFall(page);
    });

    test('Changing search area after fast search (CLOUD-T423) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const detectorEndpoint = Configuration.detectors[0].uid + '/SourceEndpoint.vmda';

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await locators.fastSearchButton.click();
        await expect(locators.fastSearchCanvas).toBeVisible();
        let searchCoordinates = await selectSearchSectors(page, 129, 232);
        let requestPromise = page.waitForRequest(request => request.url().includes(`search/vmda/${timeToISO(dayStart)}/${timeToISO(dayEnd)}`));
        await locators.fastSearchProceedButton.click();
        await VMDASearchParamsCheck(page, requestPromise, searchCoordinates, [detectorEndpoint]);
        await expect(locators.setSearchType).toContainText("Motion in area");
        await (locators.noResultBanner.or(locators.foundEvent.nth(0))).waitFor({ state: 'attached' });

        await expect(locators.resizeControl).toHaveCount(4);
        let targetCoordinates = [[0.01, 0.38], [0.54, 0.51], [0.29, 0.71], [0.01, 0.94]];
        await setSearchArea(page, targetCoordinates);
        requestPromise = page.waitForRequest(request => request.url().includes(`search/vmda/${timeToISO(dayStart)}/${timeToISO(dayEnd)}`));
        await locators.searchButton.click();
        await VMDASearchParamsCheck(page, requestPromise, targetCoordinates, [detectorEndpoint]);
        await expect(locators.setSearchType).toContainText("Motion in area");
        await (locators.noResultBanner.or(locators.foundEvent.nth(0))).waitFor({ state: 'attached' });

        await clientNotFall(page);
    });

    test('Fast search from layout (CLOUD-T421) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const trackerEndpoint = Configuration.detectors[0].uid + '/SourceEndpoint.vmda';
        const motionEndpoint = Configuration.detectors[1].uid + '/SourceEndpoint.vmda';

        await createLayout(Configuration.cameras, 2, 2, "Search Layout");
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.cellTitle).toHaveCount(4);
        await expect(locators.gridcell.nth(1).locator(locators.fastSearchButton)).toBeHidden();
        await expect(locators.gridcell.nth(2).locator(locators.fastSearchButton)).toBeHidden();
        const firstCamera = await locators.cellTitle.nth(0).innerText();
        const lastCamera = await locators.cellTitle.nth(3).innerText();
        await locators.fastSearchButton.first().click();
        await expect(locators.fastSearchCanvas).toBeVisible();
        let searchCoordinates = await selectSearchSectors(page, 141, 265);
        let requestPromise = page.waitForRequest(request => request.url().includes(`search/vmda/${timeToISO(dayStart)}/${timeToISO(dayEnd)}`));
        await locators.fastSearchProceedButton.click();
        await VMDASearchParamsCheck(page, requestPromise, searchCoordinates, [trackerEndpoint]);
        await expect(locators.setSearchType).toContainText("Motion in area");
        await expect(locators.cellTitle).toHaveText(firstCamera);
        await (locators.noResultBanner.or(locators.foundEvent.nth(0))).waitFor({ state: 'attached' });

        await locators.liveMode.click();
        await expect(locators.cellTitle).toHaveCount(4);
        await locators.fastSearchButton.last().click();
        await expect(locators.fastSearchCanvas).toBeVisible();
        searchCoordinates = await selectSearchSectors(page, 176, 240);
        requestPromise = page.waitForRequest(request => request.url().includes(`search/vmda/${timeToISO(dayStart)}/${timeToISO(dayEnd)}`));
        await locators.fastSearchProceedButton.click();
        await VMDASearchParamsCheck(page, requestPromise, searchCoordinates, [motionEndpoint]);
        await expect(locators.setSearchType).toContainText("Motion in area");
        await expect(locators.cellTitle).toHaveText(lastCamera);
        await (locators.noResultBanner.or(locators.foundEvent.nth(0))).waitFor({ state: 'attached' });

        await clientNotFall(page);
    });

    test('Fast search after face search (CLOUD-T422)', async ({ page }) => {
        const locators = new Locators(page);
        const temporaryCameraName = "Temp";
        const temporaryDetectorName = "Face Detector";
        
        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", temporaryCameraName, -1);
        const tempCamera = Configuration.cameras.filter(item => item.displayName == temporaryCameraName);
        console.log(tempCamera);
        await addVirtualVideo(tempCamera, "faceoffice", "faceoffice");
        await createArchiveContext('Black', tempCamera, true, 'High');
        await createAVDetector(tempCamera[0], 'TvaFaceDetector', temporaryDetectorName);
        console.log(Configuration.detectors);
        const detectorEndpoint = (Configuration.detectors.filter(item => item.display_name == temporaryDetectorName))[0].uid + '/SourceEndpoint.vmda';
        console.log(detectorEndpoint);

        await page.goto(clientURL);
        await authorization(page, testUserLogin, testUserPassword);

        await expect(locators.cellTitle.nth(0)).toBeVisible();
        await openCameraList(page);
        await locators.cameraListItem.filter({ hasText: temporaryCameraName }).click();
        await expect(locators.cellTitle).toContainText(temporaryCameraName);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.faceSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.searchButton.click();
        await (locators.noResultBanner.or(locators.foundEvent.nth(0))).waitFor({ state: 'attached' });

        await locators.liveMode.click();
        await expect(locators.cellTitle).toContainText(temporaryCameraName);
        await locators.fastSearchButton.click();
        await expect(locators.fastSearchCanvas).toBeVisible();
        let searchCoordinates = await selectSearchSectors(page, 135, 240);
        let requestPromise = page.waitForRequest(request => request.url().includes(`search/vmda/${timeToISO(dayStart)}/${timeToISO(dayEnd)}`));
        await locators.fastSearchProceedButton.click();
        await VMDASearchParamsCheck(page, requestPromise, searchCoordinates, [detectorEndpoint]);
        await expect(locators.setSearchType).toContainText("Motion in area");
        await expect(locators.cellTitle).toContainText(temporaryCameraName);
        await (locators.noResultBanner.or(locators.foundEvent.nth(0))).waitFor({ state: 'attached' });

        await cameraAnnihilator(tempCamera);

        await clientNotFall(page);
    });

    test('Fast search by no root user (CLOUD-T928) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const trackerEndpoint = Configuration.detectors[0].uid + '/SourceEndpoint.vmda';

        await setRolePermissions(testRoleName);
        await page.goto(clientURL);
        await authorization(page, testUserLogin, testUserPassword);

        await expect(locators.cellTitle).toHaveCount(1);
        const firstCamera = await locators.cellTitle.nth(0).innerText();
        await locators.fastSearchButton.click();
        await expect(locators.fastSearchCanvas).toBeVisible();
        let searchCoordinates = await selectSearchSectors(page, 126, 212);
        let requestPromise = page.waitForRequest(request => request.url().includes(`search/vmda/${timeToISO(dayStart)}/${timeToISO(dayEnd)}`));
        await locators.fastSearchProceedButton.click();
        await VMDASearchParamsCheck(page, requestPromise, searchCoordinates, [trackerEndpoint]);
        await expect(locators.cellTitle).toHaveText(firstCamera);
        await (locators.noResultBanner.or(locators.foundEvent.nth(0))).waitFor({ state: 'attached' });

        await clientNotFall(page);
    });

    test('Fast search in the absence of detectors (CLOUD-T927)', async ({ page }) => {
        const locators = new Locators(page);

        await page.goto(clientURL);
        await authorization(page, testUserLogin, testUserPassword);

        await expect(locators.cellTitle).toHaveCount(1);
        await expect(locators.fastSearchButton).toBeVisible();
        await openCameraList(page);
        await locators.cameraListItem.nth(1).click();
        let targetCameraName = await locators.cameraListItem.nth(1).innerText();
        await expect(locators.cellTitle).toContainText(targetCameraName);
        await expect(locators.fastSearchButton).toBeHidden();

        await clientNotFall(page);
    });

    test('Fast search in the absence of archive (CLOUD-T424)', async ({ page }) => {
        const locators = new Locators(page);
        const temporaryCameraName = "No archive";

        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", temporaryCameraName, -1);
        const tempCamera = Configuration.cameras.filter(item => item.displayName == temporaryCameraName);
        console.log(tempCamera);
        await addVirtualVideo(tempCamera, "tracker", "tracker");
        await page.goto(clientURL);
        await authorization(page, testUserLogin, testUserPassword);

        await expect(locators.cellTitle).toHaveCount(1);
        await expect(locators.fastSearchButton).toBeVisible();
        await openCameraList(page);
        await locators.cameraListItem.filter({ hasText: temporaryCameraName }).click();
        await expect(locators.cellTitle).toContainText(temporaryCameraName);
        await expect(locators.singleArchiveMode).toBeHidden();
        await expect(locators.fastSearchButton).toBeHidden();

        await cameraAnnihilator(tempCamera);

        await clientNotFall(page);
    });

    test('Fast search when access to search is forbidden (CLOUD-T718)', async ({ page }) => {
        test.skip(isCloudTest, "Test is skipped for cloud");
        const locators = new Locators(page);
        const searchForbid = { feature_access: alloyAllPermisions.feature_access.filter(permission => permission != "FEATURE_ACCESS_SEARCH") };

        await setRolePermissions(testRoleName, searchForbid);
        await page.goto(clientURL);
        await authorization(page, testUserLogin, testUserPassword);

        await expect(locators.cellTitle).toHaveCount(1);
        await expect(locators.searchMode).toBeHidden();
        await expect(locators.fastSearchButton).toBeHidden();
        await openCameraList(page);
        await locators.cameraListItem.nth(1).click();
        let targetCameraName = await locators.cameraListItem.nth(1).innerText();
        await expect(locators.cellTitle).toContainText(targetCameraName);
        await expect(locators.fastSearchButton).toBeHidden();
        await locators.cameraListItem.last().click();
        targetCameraName = await locators.cameraListItem.last().innerText();
        await expect(locators.cellTitle).toContainText(targetCameraName);
        await expect(locators.fastSearchButton).toBeHidden();

        await clientNotFall(page);
    });

});

test.describe("Detectors. VMDA search", () => {
    const dayStart = new Date;
    const dayEnd = new Date;
    dayStart.setHours(0);
    dayStart.setMinutes(0);
    dayStart.setSeconds(0);
    dayStart.setMilliseconds(0);
    dayEnd.setHours(23);
    dayEnd.setMinutes(59);
    dayEnd.setSeconds(59);
    dayEnd.setMilliseconds(999);

    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector();
        await cameraAnnihilator("all");
        await layoutAnnihilator("all");
        await roleAnnihilator("all");
        await userAnnihilator("all");
        await deleteArchive('Black');
        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Camera", -1);
        await addVirtualVideo(Configuration.cameras, "tracker", "tracker");
        await createArchive('Black');
        await createArchiveVolume('Black', 10);
        await createArchiveContext('Black', Configuration.cameras, true, 'High');
        await createAVDetector(Configuration.cameras[0], 'SceneDescription', 'Tracker');
        console.log(Configuration.detectors);
    });

    test.beforeEach(async ({ page }) => {
        const tempCameras = Configuration.cameras.filter(item => item.displayName.includes('Temp'));
        await cameraAnnihilator(tempCameras);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
    });

    test('Search by motion in area (CLOUD-T446) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const detectorEndpoint = Configuration.detectors[0].uid + '/SourceEndpoint.vmda';

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.motionInAreaOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });

        await expect(locators.resizeControl).toHaveCount(4);
        let targetCoordinates = [[0.01, 0.38], [0.54, 0.51], [0.29, 0.71], [0.01, 0.94]];
        await setSearchArea(page, targetCoordinates);
        let requestPromise = page.waitForRequest(request => request.url().includes(`search/vmda/${timeToISO(dayStart)}/${timeToISO(dayEnd)}`));
        await locators.searchButton.click();
        await VMDASearchParamsCheck(page, requestPromise, targetCoordinates, [detectorEndpoint]);
        await expect(locators.setSearchType).toContainText("Motion in area");
        await (locators.noResultBanner.or(locators.foundEvent.nth(0))).waitFor({ state: 'attached' });
        if (await locators.eventsCounter.isVisible()) {
            console.log(await locators.eventsCounter.innerText());
        }

        await clientNotFall(page);
    });

    test('Search by line crossing (CLOUD-T447) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const detectorEndpoint = Configuration.detectors[0].uid + '/SourceEndpoint.vmda';

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.lineCrossingOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });

        await expect(locators.resizeControl).toHaveCount(2);
        let targetCoordinates = [[0.83, 0.35], [0.83, 0.71]];
        await setSearchArea(page, targetCoordinates);
        let requestPromise = page.waitForRequest(request => request.url().includes(`search/vmda/${timeToISO(dayStart)}/${timeToISO(dayEnd)}`));
        await locators.searchButton.click();
        await VMDASearchParamsCheck(page, requestPromise, targetCoordinates, [detectorEndpoint], "line");
        await expect(locators.setSearchType).toContainText("Line crossing");
        await (locators.noResultBanner.or(locators.foundEvent.nth(0))).waitFor({ state: 'attached' });
        if (await locators.eventsCounter.isVisible()) {
            console.log(await locators.eventsCounter.innerText());
        }

        await clientNotFall(page);
    });

    test('Search by transition between zones (CLOUD-T448)', async ({ page }) => {
        const locators = new Locators(page);
        const detectorEndpoint = Configuration.detectors[0].uid + '/SourceEndpoint.vmda';

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.moveBetweenZonesOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });

        await expect(locators.resizeControl).toHaveCount(8);
        let shapeOne = [[0.22, 0.19], [0.45, 0.22], [0.4, 0.49], [0.25, 0.46]];
        let shapeTwo = [[0.6, 0.27], [0.81, 0.31], [0.81, 0.58], [0.6, 0.52]];
        await setSearchArea(page, shapeOne);
        await setSearchArea(page, shapeTwo, 4);
        let requestPromise = page.waitForRequest(request => request.url().includes(`search/vmda/${timeToISO(dayStart)}/${timeToISO(dayEnd)}`));
        await locators.searchButton.click();
        await VMDASearchParamsCheck(page, requestPromise, shapeOne, [detectorEndpoint], "transition", shapeTwo);
        await expect(locators.setSearchType).toContainText("Move from area to area");
        await (locators.noResultBanner.or(locators.foundEvent.nth(0))).waitFor({ state: 'attached' });
        if (await locators.eventsCounter.isVisible()) {
            console.log(await locators.eventsCounter.innerText());
        }

        await clientNotFall(page);
    });

    test('Search by multiple objects (CLOUD-T449) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const detectorEndpoint = Configuration.detectors[0].uid + '/SourceEndpoint.vmda';
        const objectsCount = 3;

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.multipleObjectOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });

        await expect(locators.resizeControl).toHaveCount(4);
        await locators.objectsCountInput.fill(`${objectsCount}`);
        let targetCoordinates = [[0.01, 0.38], [0.54, 0.51], [0.29, 0.71], [0.01, 0.94]];
        await setSearchArea(page, targetCoordinates);
        let requestPromise = page.waitForRequest(request => request.url().includes(`search/vmda/${timeToISO(dayStart)}/${timeToISO(dayEnd)}`));
        await locators.searchButton.click();
        await VMDASearchParamsCheck(page, requestPromise, targetCoordinates, [detectorEndpoint], "zone", [], "", 0, objectsCount);
        await expect(locators.setSearchType).toContainText("Multiple objects");
        await (locators.noResultBanner.or(locators.foundEvent.nth(0))).waitFor({ state: 'attached' });
        if (await locators.eventsCounter.isVisible()) {
            console.log(await locators.eventsCounter.innerText());
        }

        await clientNotFall(page);
    });

    test('Search by loitering time (CLOUD-T450) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const detectorEndpoint = Configuration.detectors[0].uid + '/SourceEndpoint.vmda';
        const durationTime = 5;

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.loiteringOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });

        await expect(locators.resizeControl).toHaveCount(4);
        console.log(await locators.objectLoiteringDuration.inputValue());
        await locators.objectLoiteringDuration.fill(`${durationTime}`);
        console.log(await locators.objectLoiteringDuration.inputValue());
        let targetCoordinates = [[0.01, 0.38], [0.54, 0.38], [0.54, 0.94], [0.01, 0.94]];
        await setSearchArea(page, targetCoordinates);
        let requestPromise = page.waitForRequest(request => request.url().includes(`search/vmda/${timeToISO(dayStart)}/${timeToISO(dayEnd)}`));
        await locators.searchButton.click();
        await VMDASearchParamsCheck(page, requestPromise, targetCoordinates, [detectorEndpoint], "zone", [], "", durationTime, 0);
        await expect(locators.setSearchType).toContainText("Loitering");
        await (locators.noResultBanner.or(locators.foundEvent.nth(0))).waitFor({ state: 'attached' });
        if (await locators.eventsCounter.isVisible()) {
            console.log(await locators.eventsCounter.innerText());
        }

        await clientNotFall(page);
    });

    test('Check of objects count field (CLOUD-T561)', async ({ page }) => {
        const locators = new Locators(page);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.multipleObjectOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });

        let inputValue = 97;
        await locators.objectsCountInput.fill(String(inputValue));
        await expect(locators.objectsCountInput).toHaveValue(String(inputValue));
        await locators.objectsCountInput.click();
        await page.keyboard.press('ArrowUp');
        await expect(locators.objectsCountInput).toHaveValue(String(++inputValue));
        await page.keyboard.press('ArrowUp');
        await expect(locators.objectsCountInput).toHaveValue(String(++inputValue));
        await page.keyboard.press('ArrowUp');
        await expect(locators.objectsCountInput).toHaveValue(String(inputValue));
        await locators.objectsCountInput.fill("150");
        await expect(locators.objectsCountInput).toHaveValue(String(inputValue));
        inputValue = 3;
        await locators.objectsCountInput.fill(String(inputValue));
        await expect(locators.objectsCountInput).toHaveValue(String(inputValue));
        await locators.objectsCountInput.click();
        await page.keyboard.press('ArrowDown');
        await expect(locators.objectsCountInput).toHaveValue(String(--inputValue));
        await page.keyboard.press('ArrowDown');
        await expect(locators.objectsCountInput).toHaveValue(String(--inputValue));
        await page.keyboard.press('ArrowDown');
        await expect(locators.objectsCountInput).toHaveValue(String(inputValue));
        await locators.objectsCountInput.fill("0");
        await expect(locators.objectsCountInput).toHaveValue(String(inputValue));

        await clientNotFall(page);
    });

    test('Check of objects loitering duration field (CLOUD-T559)', async ({ page }) => {
        const locators = new Locators(page);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.loiteringOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });

        let inputValue = 3597;
        await locators.objectLoiteringDuration.fill(String(inputValue));
        await expect(locators.objectLoiteringDuration).toHaveValue(String(inputValue));
        await locators.objectLoiteringDuration.click();
        await page.keyboard.press('ArrowUp');
        await expect(locators.objectLoiteringDuration).toHaveValue(String(++inputValue));
        await page.keyboard.press('ArrowUp');
        await expect(locators.objectLoiteringDuration).toHaveValue(String(++inputValue));
        await page.keyboard.press('ArrowUp');
        await expect(locators.objectLoiteringDuration).toHaveValue(String(inputValue));
        await locators.objectLoiteringDuration.fill("4000");
        await expect(locators.objectLoiteringDuration).toHaveValue(String(inputValue));
        inputValue = 3;
        await locators.objectLoiteringDuration.fill(String(inputValue));
        await expect(locators.objectLoiteringDuration).toHaveValue(String(inputValue));
        await locators.objectLoiteringDuration.click();
        await page.keyboard.press('ArrowDown');
        await expect(locators.objectLoiteringDuration).toHaveValue(String(--inputValue));
        await page.keyboard.press('ArrowDown');
        await expect(locators.objectLoiteringDuration).toHaveValue(String(--inputValue));
        await page.keyboard.press('ArrowDown');
        await expect(locators.objectLoiteringDuration).toHaveValue(String(inputValue));
        await locators.objectLoiteringDuration.fill("-2");
        await expect(locators.objectLoiteringDuration).toHaveValue(String(inputValue));

        await clientNotFall(page);
    });

    test('Checking polygonal area controls (CLOUD-T550)', async ({ page }) => {
        const locators = new Locators(page);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.motionInAreaOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });

        await expect(locators.resizeControl).toHaveCount(4);
        let targetCoordinates = [[0.25, 0.25], [0.75, 0.25], [0.75, 0.75], [0.25, 0.75]];
        await setSearchArea(page, targetCoordinates);
        await checkCurrentControlsPosition(page, targetCoordinates);
        
        const videoCellCoordinates = await locators.canvasElement.boundingBox();
        let polygonCoordinates = await locators.webpage.locator('.VideoCell__overlay polygon').nth(0).boundingBox();
        console.log(polygonCoordinates);
        let polygonCenter = {
            x: polygonCoordinates!.x + polygonCoordinates!.width / 2,
            y: polygonCoordinates!.y + polygonCoordinates!.height / 2
        }
        await page.mouse.move(polygonCenter.x, polygonCenter.y);
        await page.mouse.down();
        await page.mouse.move(polygonCenter.x + videoCellCoordinates!.width * 0.25, polygonCenter.y + videoCellCoordinates!.height * 0.25);
        await page.mouse.up();
        await checkCurrentControlsPosition(page, [[0.5, 0.5], [1, 0.5], [1, 1], [0.5, 1]]);
        await page.waitForTimeout(2000);
        await page.mouse.down();
        await page.mouse.move(polygonCenter.x - videoCellCoordinates!.width * 0.25, polygonCenter.y - videoCellCoordinates!.height * 0.25);
        await page.mouse.up();
        await checkCurrentControlsPosition(page, [[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]]);
        await page.waitForTimeout(2000);
        await page.mouse.down();
        await page.mouse.move(polygonCenter.x + videoCellCoordinates!.width * 0.25, polygonCenter.y - videoCellCoordinates!.height * 0.25);
        await page.mouse.up();
        await checkCurrentControlsPosition(page, [[0.5, 0], [1, 0], [1, 0.5], [0.5, 0.5]]);
        await page.waitForTimeout(2000);
        await page.mouse.down();
        await page.mouse.move(polygonCenter.x - videoCellCoordinates!.width * 0.25, polygonCenter.y + videoCellCoordinates!.height * 0.25);
        await page.mouse.up();
        await checkCurrentControlsPosition(page, [[0, 0.5], [0.5, 0.5], [0.5, 1], [0, 1]]);
        //Сбрасываем визуальную область переключением на другой тип поиска
        await locators.setSearchType.click();
        await locators.multipleObjectOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });

        targetCoordinates = [[0, 0], [0.7, 0], [0.99, 0.99], [0.3, 0.99]];
        await setSearchArea(page, targetCoordinates);
        await checkCurrentControlsPosition(page, targetCoordinates);
        await locators.setSearchType.click();
        await locators.motionInAreaOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });

        await locators.dividerControl.nth(0).click();
        await locators.dividerControl.nth(2).click();
        await locators.dividerControl.nth(4).click();
        await locators.dividerControl.nth(6).click();
        await expect(locators.resizeControl).toHaveCount(8);
        targetCoordinates = [[0.4, 0.4], [0.5, 0.01], [0.6, 0.4], [0.99, 0.5], [0.6, 0.6], [0.5, 0.99], [0.4, 0.6], [0.01, 0.5]];
        await setSearchArea(page, targetCoordinates);
        await checkCurrentControlsPosition(page, targetCoordinates);

        await clientNotFall(page);
    });

    test('Checking polyline controls (CLOUD-T552)', async ({ page }) => {
        const locators = new Locators(page);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.lineCrossingOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });

        await expect(locators.resizeControl).toHaveCount(2);
        let targetCoordinates = [[0.25, 0.25], [0.75, 0.75]];
        await setSearchArea(page, targetCoordinates);
        await checkCurrentControlsPosition(page, targetCoordinates);

        const videoCellCoordinates = await locators.canvasElement.boundingBox();
        let polylineCoordinates = await locators.webpage.locator('.VideoCell__overlay polyline').nth(0).boundingBox();
        console.log(polylineCoordinates);
        let polylineCenter = {
            x: polylineCoordinates!.x + polylineCoordinates!.width / 2,
            y: polylineCoordinates!.y + polylineCoordinates!.height / 2
        }
        await page.mouse.move(polylineCenter.x, polylineCenter.y);
        await page.mouse.down();
        await page.mouse.move(polylineCenter.x + videoCellCoordinates!.width * 0.25, polylineCenter.y + videoCellCoordinates!.height * 0.25);
        await page.mouse.up();
        await checkCurrentControlsPosition(page, [[0.5, 0.5], [1, 1]]);
        await page.waitForTimeout(2000);
        await page.mouse.down();
        await page.mouse.move(polylineCenter.x - videoCellCoordinates!.width * 0.25, polylineCenter.y - videoCellCoordinates!.height * 0.25);
        await page.mouse.up();
        await checkCurrentControlsPosition(page, [[0, 0], [0.5, 0.5]]);
        await page.waitForTimeout(2000);
        await page.mouse.down();
        await page.mouse.move(polylineCenter.x - videoCellCoordinates!.width * 0.25, polylineCenter.y + videoCellCoordinates!.height * 0.25);
        await page.mouse.up();
        await checkCurrentControlsPosition(page, [[0, 0.5], [0.5, 1]]);
        await page.waitForTimeout(2000);
        await page.mouse.down();
        await page.mouse.move(polylineCenter.x + videoCellCoordinates!.width * 0.25, polylineCenter.y - videoCellCoordinates!.height * 0.25);
        await page.mouse.up();
        await checkCurrentControlsPosition(page, [[0.5, 0], [1, 0.5]]);
        await page.waitForTimeout(2000);
        await page.mouse.down();
        await page.mouse.move(polylineCenter.x, polylineCenter.y);
        await page.mouse.up();

        targetCoordinates = [[0.5, 0.3], [0.5, 0.7]];
        await setSearchArea(page, targetCoordinates);
        await checkCurrentControlsPosition(page, targetCoordinates);
        await page.waitForTimeout(2000);
        targetCoordinates = [[0.5, 0.01], [0.5, 0.99]];
        await setSearchArea(page, targetCoordinates);
        await checkCurrentControlsPosition(page, targetCoordinates);
        await page.waitForTimeout(2000);
        targetCoordinates = [[0.01, 0.01], [0.99, 0.99]];
        await setSearchArea(page, targetCoordinates);
        await checkCurrentControlsPosition(page, targetCoordinates);
        await page.waitForTimeout(2000);

        let elementsCount = await locators.webpage.locator('.VideoCell__overlay g').count();
        let leftArrow = locators.webpage.locator('.VideoCell__overlay g').nth(elementsCount - 2);
        let rightArrow = locators.webpage.locator('.VideoCell__overlay g').nth(elementsCount - 1);
        await rightArrow.click();
        await expect(rightArrow).toHaveCSS('opacity', '0.5');
        await expect(leftArrow).toHaveCSS('opacity', '1');
        await leftArrow.click();
        await expect(rightArrow).toHaveCSS('opacity', '0.5');
        await expect(leftArrow).toHaveCSS('opacity', '1');
        await rightArrow.click();
        await expect(rightArrow).toHaveCSS('opacity', '1');
        await expect(leftArrow).toHaveCSS('opacity', '1');
        await leftArrow.click();
        await expect(rightArrow).toHaveCSS('opacity', '1');
        await expect(leftArrow).toHaveCSS('opacity', '0.5');

        await clientNotFall(page);
    });

    test('Checking complex area controls (CLOUD-T553)', async ({ page }) => {
        const locators = new Locators(page);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.moveBetweenZonesOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });

        await expect(locators.resizeControl).toHaveCount(8);
        let shapeOne = [[0.2, 0.4], [0.4, 0.4], [0.4, 0.6], [0.2, 0.6]];
        let shapeTwo = [[0.6, 0.4], [0.8, 0.4], [0.8, 0.6], [0.6, 0.6]];
        await setSearchArea(page, shapeOne);
        await setSearchArea(page, shapeTwo, 4);
        await checkCurrentControlsPosition(page, shapeOne);
        await checkCurrentControlsPosition(page, shapeTwo, 4);
        
        const videoCellCoordinates = await locators.canvasElement.boundingBox();
        let polygonOneCoordinates = await locators.webpage.locator('.VideoCell__overlay polygon').first().boundingBox();
        let polygonTwoCoordinates = await locators.webpage.locator('.VideoCell__overlay polygon').last().boundingBox();
        console.log(polygonOneCoordinates);
        console.log(polygonTwoCoordinates);
        let polygonOneCenter = {
            x: polygonOneCoordinates!.x - 20 + polygonOneCoordinates!.width / 2,
            y: polygonOneCoordinates!.y + polygonOneCoordinates!.height / 2
        }
        let polygonTwoCenter = {
            x: polygonTwoCoordinates!.x + 20 + polygonTwoCoordinates!.width / 2,
            y: polygonTwoCoordinates!.y + polygonTwoCoordinates!.height / 2
        }
        await page.mouse.move(polygonOneCenter.x, polygonOneCenter.y);
        await page.mouse.down();
        await page.mouse.move(polygonOneCenter.x - videoCellCoordinates!.width * 0.2, polygonOneCenter.y - videoCellCoordinates!.height * 0.4);
        await page.mouse.up();
        await page.mouse.move(polygonTwoCenter.x, polygonTwoCenter.y);
        await page.mouse.down();
        await page.mouse.move(polygonTwoCenter.x + videoCellCoordinates!.width * 0.2, polygonTwoCenter.y + videoCellCoordinates!.height * 0.4);
        await page.mouse.up();
        await checkCurrentControlsPosition(page, [[0, 0], [0.2, 0], [0.2, 0.2], [0, 0.2]]);
        await checkCurrentControlsPosition(page, [[0.8, 0.8], [1, 0.8], [1, 1], [0.8, 1]], 4);
        await page.waitForTimeout(2000);

        await locators.setSearchType.click();
        await locators.motionInAreaOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.setSearchType.click();
        await locators.moveBetweenZonesOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.dividerControl.nth(3).click();
        await locators.dividerControl.nth(6).click();
        await expect(locators.resizeControl).toHaveCount(10);
        shapeOne = [[0.2, 0.4], [0.4, 0.3], [0.4, 0.7], [0.2, 0.6], [0.01, 0.5]];
        shapeTwo = [[0.6, 0.3], [0.8, 0.4], [0.99, 0.5], [0.8, 0.6], [0.6, 0.7]];
        await setSearchArea(page, shapeOne);
        await setSearchArea(page, shapeTwo, 5);
        await checkCurrentControlsPosition(page, shapeOne);
        await checkCurrentControlsPosition(page, shapeTwo, 5);
        await page.waitForTimeout(2000);

        const arrowSwitcher = locators.webpage.locator('#arrow-end ~ circle');
        const arrow = locators.webpage.locator('#arrow-end ~ line').first();
        await expect(arrow).toHaveAttribute('marker-start', '');
        await expect(arrow).toHaveAttribute('marker-end', 'url(#arrow-end)');
        await arrowSwitcher.click();
        await expect(arrow).toHaveAttribute('marker-start', 'url(#arrow-start)');
        await expect(arrow).toHaveAttribute('marker-end', 'url(#arrow-end)');
        await arrowSwitcher.click();
        await expect(arrow).toHaveAttribute('marker-start', 'url(#arrow-start)');
        await expect(arrow).toHaveAttribute('marker-end', '');
        await arrowSwitcher.click();
        await expect(arrow).toHaveAttribute('marker-start', '');
        await expect(arrow).toHaveAttribute('marker-end', 'url(#arrow-end)');

        await clientNotFall(page);
    });

    test('Shifting polygonal area when the player increases (CLOUD-T554)', async ({ page }) => {
        const locators = new Locators(page);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.motionInAreaOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });

        await expect(locators.resizeControl).toHaveCount(4);
        let targetCoordinates = [[0.01, 0.38], [0.54, 0.51], [0.29, 0.71], [0.01, 0.94]];
        await setSearchArea(page, targetCoordinates);
        await checkCurrentControlsPosition(page, targetCoordinates);
        await locators.playerWindowIncrease.click();
        await page.waitForTimeout(2000);
        await checkCurrentControlsPosition(page, targetCoordinates);
        await locators.playerWindowIncrease.click();
        await page.waitForTimeout(2000);
        await checkCurrentControlsPosition(page, targetCoordinates);
        await locators.playerWindowDecrease.click();
        await page.waitForTimeout(2000);
        await checkCurrentControlsPosition(page, targetCoordinates);
        await locators.playerWindowDecrease.click();
        await page.waitForTimeout(2000);
        await checkCurrentControlsPosition(page, targetCoordinates);
        
        await clientNotFall(page);
    });

    test('Shifting polyline when the player increases (CLOUD-T555)', async ({ page }) => {
        const locators = new Locators(page);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.lineCrossingOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });

        await expect(locators.resizeControl).toHaveCount(2);
        let targetCoordinates = [[0.02, 0.94], [0.54, 0.5]];
        await setSearchArea(page, targetCoordinates);
        await checkCurrentControlsPosition(page, targetCoordinates);
        await locators.playerWindowIncrease.click();
        await page.waitForTimeout(2000);
        await checkCurrentControlsPosition(page, targetCoordinates);
        await locators.playerWindowIncrease.click();
        await page.waitForTimeout(2000);
        await checkCurrentControlsPosition(page, targetCoordinates);
        await locators.playerWindowDecrease.click();
        await page.waitForTimeout(2000);
        await checkCurrentControlsPosition(page, targetCoordinates);
        await locators.playerWindowDecrease.click();
        await page.waitForTimeout(2000);
        await checkCurrentControlsPosition(page, targetCoordinates);

        await clientNotFall(page);
    });

    test('Shifting complex area when the player increases (CLOUD-T556)', async ({ page }) => {
        const locators = new Locators(page);

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.moveBetweenZonesOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });

        await expect(locators.resizeControl).toHaveCount(8);
        let shapeOne = [[0.22, 0.19], [0.45, 0.22], [0.4, 0.49], [0.25, 0.46]];
        let shapeTwo = [[0.6, 0.27], [0.81, 0.31], [0.81, 0.58], [0.6, 0.52]];
        await setSearchArea(page, shapeOne);
        await setSearchArea(page, shapeTwo, 4);
        await checkCurrentControlsPosition(page, shapeOne);
        await checkCurrentControlsPosition(page, shapeTwo, 4);
        await locators.playerWindowIncrease.click();
        await page.waitForTimeout(2000);
        await checkCurrentControlsPosition(page, shapeOne);
        await checkCurrentControlsPosition(page, shapeTwo, 4);
        await locators.playerWindowIncrease.click();
        await page.waitForTimeout(2000);
        await checkCurrentControlsPosition(page, shapeOne);
        await checkCurrentControlsPosition(page, shapeTwo, 4);
        await locators.playerWindowDecrease.click();
        await page.waitForTimeout(2000);
        await checkCurrentControlsPosition(page, shapeOne);
        await checkCurrentControlsPosition(page, shapeTwo, 4);
        await locators.playerWindowDecrease.click();
        await page.waitForTimeout(2000);
        await checkCurrentControlsPosition(page, shapeOne);
        await checkCurrentControlsPosition(page, shapeTwo, 4);
        await clientNotFall(page);
    });

    test('Heatmap building (CLOUD-T557) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const trackerName = 'Objects Tracker';
        const motionName = 'Move 1';
        const temporaryCameraName = "Temp 1";

        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", temporaryCameraName, -1);
        const tempCamera = Configuration.cameras.filter(item => item.displayName == temporaryCameraName);
        await addVirtualVideo(tempCamera, "tracker", "tracker");
        await createArchiveContext('Black', tempCamera, true, 'High');
        await createAVDetector(tempCamera[0], 'MotionDetection', motionName);
        await createAVDetector(tempCamera[0], 'SceneDescription', trackerName);
        console.log(Configuration.detectors);
        const motionEndpoint = (Configuration.detectors.filter(item => item.display_name == motionName))[0].uid + '/SourceEndpoint.vmda';
        const trackerEndpoint = (Configuration.detectors.filter(item => item.display_name == trackerName))[0].uid + '/SourceEndpoint.vmda';
        console.log(motionEndpoint, trackerEndpoint);
        await page.waitForTimeout(10000);
        await page.reload();

        await expect(locators.cellTitle).toHaveCount(1);
        await openCameraList(page);
        await locators.cameraListItem.filter({ hasText: temporaryCameraName }).click();
        await expect(locators.cellTitle).toContainText(temporaryCameraName);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.heatmapSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.metaDataInput.waitFor({ state: 'attached' });
        await locators.metaDataInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: motionName }).click();
        let heatmapImageRequest = page.waitForResponse(async response => response.url().includes('blob') && (await response.headerValue("Content-Type"))!.includes('image/png'));
        let requestPromise = page.waitForRequest(request => request.url().includes('/grpc'));
        await locators.searchButton.click();
        let requestBody = JSON.parse((await requestPromise).postData()!);
        console.log('Search request body:', requestBody);
        expect(requestBody?.data.dt_posix_start_time).toEqual(timeToISO(dayStart));
        expect(requestBody?.data.dt_posix_end_time).toEqual(timeToISO(dayEnd));
        expect(requestBody?.data.camera_ID).toEqual(motionEndpoint);
        expect(requestBody?.result_type).toEqual("RESULT_TYPE_IMAGE");
        expect(requestBody?.method).toEqual("axxonsoft.bl.heatmap.HeatMapService.BuildHeatmap");
        await isRequestOk(requestPromise);
        let blobHeaders = await (await heatmapImageRequest).allHeaders();
        console.log(blobHeaders);
        expect(Number(blobHeaders["content-length"])).toBeLessThan(1000);
        await expect(locators.heatmapBackgroundImage).toBeVisible();

        await locators.metaDataInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: trackerName }).click();
        heatmapImageRequest = page.waitForResponse(async response => response.url().includes('blob') && (await response.headerValue("Content-Type"))!.includes('image/png'));
        requestPromise = page.waitForRequest(request => request.url().includes('/grpc'));
        await locators.searchButton.click();
        requestBody = JSON.parse((await requestPromise).postData()!);
        console.log('Search request body:', requestBody);
        expect(requestBody?.data.dt_posix_start_time).toEqual(timeToISO(dayStart));
        expect(requestBody?.data.dt_posix_end_time).toEqual(timeToISO(dayEnd));
        expect(requestBody?.data.camera_ID).toEqual(trackerEndpoint);
        expect(requestBody?.result_type).toEqual("RESULT_TYPE_IMAGE");
        expect(requestBody?.method).toEqual("axxonsoft.bl.heatmap.HeatMapService.BuildHeatmap");
        await isRequestOk(requestPromise);
        blobHeaders = await (await heatmapImageRequest).allHeaders();
        console.log(blobHeaders);
        expect(Number(blobHeaders["content-length"])).toBeGreaterThan(1000);
        await expect(locators.heatmapBackgroundImage).toBeVisible();
        await expect(locators.heatmapImage).toBeVisible();
        await expect(locators.heatmapOpacityBar).toBeVisible();
        const opacityBarDimentions = await locators.heatmapOpacityBar.boundingBox();
        let opacityLevel = 0.9;
        await locators.heatmapOpacityBar.click({ position: { x: opacityBarDimentions!.width * opacityLevel, y: opacityBarDimentions!.height / 2 } });
        await expect(locators.heatmapImage).toHaveCSS('opacity', String(opacityLevel));
        opacityLevel = 0.3;
        await locators.heatmapOpacityBar.click({ position: { x: opacityBarDimentions!.width * opacityLevel, y: opacityBarDimentions!.height / 2 } });
        await expect(locators.heatmapImage).toHaveCSS('opacity', String(opacityLevel));
        opacityLevel = 0.5;
        await locators.heatmapOpacityBar.click({ position: { x: opacityBarDimentions!.width * opacityLevel, y: opacityBarDimentions!.height / 2 } });
        await expect(locators.heatmapImage).toHaveCSS('opacity', String(opacityLevel));

        await clientNotFall(page);
    });

    test('Heatmap building when two archives exist (CLOUD-T976)', async ({ page }) => {
        const locators = new Locators(page);
        const trackerName = 'Objects Tracker';
        const temporaryCameraName = "Temp 2";

        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", temporaryCameraName, -1);
        const tempCamera = Configuration.cameras.filter(item => item.displayName == temporaryCameraName);
        await addVirtualVideo(tempCamera, "tracker", "tracker");
        await createArchive("White");
        await createArchiveVolume("White", 1);
        await createArchiveContext("White", tempCamera, true, "High");
        await createArchiveContext('Black', tempCamera, true, 'High');
        await createAVDetector(tempCamera[0], 'SceneDescription', trackerName);
        console.log(Configuration.detectors);
        const trackerEndpoint = (Configuration.detectors.filter(item => item.display_name == trackerName))[0].uid + '/SourceEndpoint.vmda';
        console.log(trackerEndpoint);
        await page.waitForTimeout(30000);
        await page.reload();

        await expect(locators.cellTitle).toHaveCount(1);
        await openCameraList(page);
        await locators.cameraListItem.filter({ hasText: temporaryCameraName }).click();
        await expect(locators.cellTitle).toContainText(temporaryCameraName);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.heatmapSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.metaDataInput.waitFor({ state: 'attached' });
        await locators.metaDataInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: trackerName }).click();
        let heatmapImageRequest = page.waitForResponse(async response => response.url().includes('blob') && (await response.headerValue("Content-Type"))!.includes('image/png'));
        let requestPromise = page.waitForRequest(request => request.url().includes('/grpc'));
        await locators.searchButton.click();
        let requestBody = JSON.parse((await requestPromise).postData()!);
        console.log('Search request body:', requestBody);
        expect(requestBody?.data.dt_posix_start_time).toEqual(timeToISO(dayStart));
        expect(requestBody?.data.dt_posix_end_time).toEqual(timeToISO(dayEnd));
        expect(requestBody?.data.camera_ID).toEqual(trackerEndpoint);
        expect(requestBody?.result_type).toEqual("RESULT_TYPE_IMAGE");
        expect(requestBody?.method).toEqual("axxonsoft.bl.heatmap.HeatMapService.BuildHeatmap");
        await isRequestOk(requestPromise);
        let blobHeaders = await (await heatmapImageRequest).allHeaders();
        console.log(blobHeaders);
        expect(Number(blobHeaders["content-length"])).toBeGreaterThan(1000);
        await expect(locators.heatmapBackgroundImage).toBeVisible();
        await expect(locators.heatmapImage).toBeVisible();

        await clientNotFall(page);
    });

    test('Heatmap building with different aspect ratio (CLOUD-T897)', async ({ page }) => {
        const locators = new Locators(page);
        const trackerName = 'Objects Tracker';
        const temporaryCamera1 = "Temp 3";
        const temporaryCamera2 = "Temp 4";

        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", temporaryCamera1, -1);
        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", temporaryCamera2, -1);
        const tempCameras = Configuration.cameras.filter(item => item.displayName == temporaryCamera1 || item.displayName == temporaryCamera2);
        await addVirtualVideo([tempCameras[0]], "tracker", "tracker");
        await addVirtualVideo([tempCameras[1]], "witcher_640", "witcher_640");
        await createArchiveContext('Black', tempCameras, true, 'High');
        await createAVDetector(tempCameras[0], 'SceneDescription', trackerName);
        await createAVDetector(tempCameras[1], 'SceneDescription', trackerName);
        let trackers = Configuration.detectors.filter(item => item.display_name == trackerName);
        const trackerEndpoint1 = trackers[0].uid + '/SourceEndpoint.vmda';
        const trackerEndpoint2 = trackers[1].uid + '/SourceEndpoint.vmda';
        console.log(Configuration.detectors);
        await page.waitForTimeout(10000);
        await page.reload();

        await expect(locators.cellTitle).toHaveCount(1);
        await openCameraList(page);
        await locators.cameraListItem.filter({ hasText: temporaryCamera1 }).click();
        await expect(locators.cellTitle).toContainText(temporaryCamera1);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.heatmapSearchOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await locators.metaDataInput.waitFor({ state: 'attached' });
        await locators.metaDataInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: trackerName }).click();
        let heatmapImageRequest = page.waitForResponse(async response => response.url().includes('blob') && (await response.headerValue("Content-Type"))!.includes('image/png'));
        let requestPromise = page.waitForRequest(request => request.url().includes('/grpc'));
        await locators.searchButton.click();
        let requestBody = JSON.parse((await requestPromise).postData()!);
        console.log('Search request body:', requestBody);
        let cameraStreamSize = { width: 800, height: 450 };
        expect(requestBody?.data?.mask_size.height).toEqual(cameraStreamSize.height);
        expect(requestBody?.data?.mask_size.width).toEqual(cameraStreamSize.width);
        expect(requestBody?.data?.camera_ID).toEqual(trackerEndpoint1);
        await isRequestOk(requestPromise);
        await expect(locators.heatmapBackgroundImage).toBeVisible();
        await expect(locators.heatmapImage).toBeVisible();
        let img = await (await heatmapImageRequest).body();
        let imageDimentions = imageSize(img);
        expect(imageDimentions.height).toEqual(cameraStreamSize.height);
        expect(imageDimentions.width).toEqual(cameraStreamSize.width);

        await locators.cameraListItem.filter({ hasText: temporaryCamera2 }).click();
        await expect(locators.cellTitle).toContainText(temporaryCamera2);
        await locators.metaDataInput.waitFor({ state: 'attached' });
        await locators.metaDataInput.click({ force: true });
        await locators.webpage.getByRole('option', { name: trackerName }).click();
        heatmapImageRequest = page.waitForResponse(async response => response.url().includes('blob') && (await response.headerValue("Content-Type"))!.includes('image/png'));
        requestPromise = page.waitForRequest(request => request.url().includes('/grpc'));
        await locators.searchButton.click();
        requestBody = JSON.parse((await requestPromise).postData()!);
        console.log('Search request body:', requestBody);
        cameraStreamSize = { width: 640, height: 640 };
        expect(requestBody?.data?.mask_size.height).toEqual(cameraStreamSize.height);
        expect(requestBody?.data?.mask_size.width).toEqual(cameraStreamSize.width);
        expect(requestBody?.data?.camera_ID).toEqual(trackerEndpoint2);
        await isRequestOk(requestPromise);
        await expect(locators.heatmapBackgroundImage).toBeVisible();
        await expect(locators.heatmapImage).toBeVisible();
        img = await (await heatmapImageRequest).body();
        imageDimentions = imageSize(img);
        expect(imageDimentions.height).toEqual(cameraStreamSize.height);
        expect(imageDimentions.width).toEqual(cameraStreamSize.width);

        await clientNotFall(page);
    });

    test('VMDA search by multiple sources (CLOUD-T560) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const trackerName = 'Objects Tracker';
        const motionName = 'Move';
        const temporaryCameraName = "Temp 5";

        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", temporaryCameraName, -1);
        const tempCamera = Configuration.cameras.filter(item => item.displayName == temporaryCameraName);
        await addVirtualVideo(tempCamera, "tracker", "tracker");
        await createArchiveContext('Black', tempCamera, true, 'High');
        await createAVDetector(tempCamera[0], 'MotionDetection', motionName);
        await changeAVDetector(Configuration.detectors.filter(item => item.display_name == motionName)[0].uid, [{ id: "TrackingObj", value_bool: true }]);
        await createAVDetector(tempCamera[0], 'SceneDescription', trackerName);
        console.log(Configuration.detectors);
        const motionEndpoint = (Configuration.detectors.filter(item => item.display_name == motionName))[0].uid + '/SourceEndpoint.vmda';
        const trackerEndpoint = (Configuration.detectors.filter(item => item.display_name == trackerName))[0].uid + '/SourceEndpoint.vmda';
        console.log(motionEndpoint, trackerEndpoint);
        await page.waitForTimeout(10000);
        await page.reload();

        await expect(locators.cellTitle).toHaveCount(1);
        await openCameraList(page);
        await locators.cameraListItem.filter({ hasText: temporaryCameraName }).click();
        await expect(locators.cellTitle).toContainText(temporaryCameraName);
        await locators.searchMode.click();
        await locators.setSearchType.click();
        await locators.motionInAreaOption.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.resizeControl).toHaveCount(4);
        let targetCoordinates = [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]];
        await setSearchArea(page, targetCoordinates);
        let requestPromise = page.waitForRequest(request => request.url().includes(`search/vmda/${timeToISO(dayStart)}/${timeToISO(dayEnd)}`));
        await locators.searchButton.click();
        await VMDASearchParamsCheck(page, requestPromise, targetCoordinates, [motionEndpoint, trackerEndpoint]);
        await expect(locators.setSearchType).toContainText("Motion in area");
        await (locators.noResultBanner.or(locators.foundEvent.nth(0))).waitFor({ state: 'attached' });
        if (await locators.eventsCounter.isVisible()) {
            console.log(await locators.eventsCounter.innerText());
        }

        await clientNotFall(page);
    });

});
