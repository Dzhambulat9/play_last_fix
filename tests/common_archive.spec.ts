import { test, expect, type WebSocket, type Page } from '@playwright/test';
import { clientURL, Configuration, ROOT_LOGIN, virtualVendor, ROOT_PASSWORD, isCloudTest, hostName, SEVENTY_YEARS, alloyAllPermisions } from '../global_variables.js';
import { createArchive, createArchiveVolume, createArchiveContext, deleteArchive, getArchiveList, getArchiveContext, changeArchiveContext, getArchiveIntervals } from '../API/archives.js';
import { createCamera, addVirtualVideo, changeMicrophoneStatus } from '../API/cameras.js';
import { createLayout } from '../API/layouts.js';
import { getHostName } from '../API/host.js';
import { cameraAnnihilator, layoutAnnihilator, configurationCollector, userAnnihilator, roleAnnihilator, waitAnimationEnds, timeToSeconds, authorization, clientNotFall, openCameraList, compareTwoNumbers, extractMonthInterval, emulateServerTimezone, getSoundStatusFromCell } from "../utils/utils.js";
import { Locators } from '../locators/locators.js';
import { isMessagesStop, comparePointerPositions, clickToInterval, scrollLastInterval, videoIsPlaying, setCellTime, timeToISO, transformISOtime, waitWebSocketSentMessage, camerasArePlaying, videoIsPlayingShort, camerasArePlayingShort, isTimeEquals, ISOToMilliseconds, messagesNotSent, emulateCalendarDays, scrollInterval, getTimeIntervalFromURL, isDateOrTime } from '../utils/archive_helpers.js';
import { createRole, setRolePermissions } from '../API/roles.js';
import { assignUserRole, createUser, setUserPassword } from '../API/users.js';
import { deleteArchiveInterval } from '../API/bookmarks.js';
let recordGenerated = false; //переменная показывает достаточен ли размер записи для начала теста
let canPlayH265: boolean;
let cellIsPlaying = videoIsPlaying;
let cellsArePlaying = camerasArePlaying;



test.describe("Archive. Common block", () => {

    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector();
        await cameraAnnihilator("all");
        await layoutAnnihilator("all");
        await deleteArchive('Black');
        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Single archive", 0);
        await addVirtualVideo(Configuration.cameras, "lprusa", "tracker");
        await createArchive("Black");
        await createArchiveVolume("Black", 10);
        await createArchiveContext("Black", Configuration.cameras, true, "High");
    });

    test.beforeEach(async ({ page }) => {
        await isRecordEnough(page);
        let deleteArr = Configuration.cameras.filter(item => item.displayName.includes('Temp'));
        await cameraAnnihilator(deleteArr);
    });
    
    
    test('Transition into archive (CLOUD-T902)', async ({ page }) => {
        const locators = new Locators(page);
        const currentDay = ((new Date).toLocaleString('ru-RU')).replace(/\,.*/, "");
        
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await openCameraList(page);
        await locators.cameraListItem.nth(0).click();
        let cameraName = await locators.cameraListItem.nth(0).innerText();

        await expect(locators.cellTitle).toHaveText(cameraName);
        let currentTime = await locators.cellTimer.innerText();
        await locators.singleArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveText(cameraName);
        await expect(locators.cellImage).toBeVisible();
        await expect(locators.archiveTimestamps.locator('text').nth(0)).toHaveText(currentDay);
        await expect(locators.archiveTimestamps.locator('text').nth(1)).toHaveText("03:00:00");
        await page.waitForTimeout(3000);
        let pointerTime = await locators.pointerTime.innerText();
        isTimeEquals(currentTime, pointerTime, 3);
        await expect(locators.videoElement).toBeHidden();
        
        await clientNotFall(page);
    });

    test('Playing archive after pointer move (CLOUD-T903) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());

        await openCameraList(page);
        await locators.cameraListItem.nth(0).click();
        let cameraName = await locators.cameraListItem.nth(0).innerText();

        await expect(locators.cellTitle).toHaveText(cameraName);
        await locators.singleArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(1);
        await scrollLastInterval(page);

        let getFrame = waitWebSocketSentMessage(WS, ['"speed":0', 'jpeg']);
        await clickToInterval(locators.lastInterval, 0.5);
        let wsFrameImage = await getFrame;
        console.log(wsFrameImage);
        await expect(locators.cellImage).toBeVisible();
        let startVideo = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        let wsFrameVideo = await startVideo;
        console.log(wsFrameVideo);
        compareTwoNumbers(ISOToMilliseconds(wsFrameImage.beginTime), ISOToMilliseconds(wsFrameVideo.beginTime), 100);
        await cellIsPlaying(page, 0, 7, true);

        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrameVideo.streamId]);
        await locators.archivePointerTab.hover();
        await page.mouse.down();
        await stopCommand;
        let archivePoinerTab = await locators.archivePointerTab.boundingBox();
        let messagesCheck = messagesNotSent(page, WS);
        await page.mouse.move(archivePoinerTab!.x + archivePoinerTab!.width / 2, archivePoinerTab!.y + archivePoinerTab!.height / 2 - 100);
        await page.waitForTimeout(500);
        await page.mouse.move(archivePoinerTab!.x + archivePoinerTab!.width / 2, archivePoinerTab!.y + archivePoinerTab!.height / 2 + 100);
        await page.waitForTimeout(500);
        await page.mouse.move(archivePoinerTab!.x + archivePoinerTab!.width / 2, archivePoinerTab!.y + archivePoinerTab!.height / 2);
        await messagesCheck;
        getFrame = waitWebSocketSentMessage(WS, ['"speed":0', 'jpeg']);
        await page.mouse.up();
        wsFrameImage = await getFrame;
        console.log(wsFrameImage);
        await expect(locators.videoElement).toBeHidden();
        await expect(locators.cellImage).toBeVisible();

        startVideo = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        wsFrameVideo = await startVideo;
        console.log(wsFrameVideo);
        compareTwoNumbers(ISOToMilliseconds(wsFrameImage.beginTime), ISOToMilliseconds(wsFrameVideo.beginTime), 100);
        await cellIsPlaying(page, 0, 7, true);

        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrameVideo.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS); 
        
        await clientNotFall(page);
    });

    test('Hiding archive panel (CLOUD-T904)', async ({ page }) => {
        const locators = new Locators(page);
        
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await openCameraList(page);
        await locators.cameraListItem.nth(0).click();
        let cameraName = await locators.cameraListItem.nth(0).innerText();

        await expect(locators.cellTitle).toHaveText(cameraName);
        await locators.singleArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(1);
        await expect(locators.cellImage).toBeVisible();
        let pointerTimeBeforeClose = await locators.pointerTime.innerText();
        await expect(locators.archiveBlock).toBeVisible();
        await expect(locators.lastInterval).toBeVisible();
        await locators.archivePanelButton.click();
        await expect(locators.archiveBlock).toBeHidden();
        await locators.archivePanelButton.click();
        await expect(locators.archiveBlock).toBeVisible();
        await expect(locators.lastInterval).toBeVisible();
        let pointerTimeAfterClose = await locators.pointerTime.innerText();
        isTimeEquals(pointerTimeBeforeClose, pointerTimeAfterClose, 0);
        
        await clientNotFall(page);
    });

    test('Changing pointer position via digital panel (CLOUD-T905)', async ({ page }) => {
        const locators = new Locators(page);
        
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());

        await openCameraList(page);
        await locators.cameraListItem.nth(0).click();
        let cameraName = await locators.cameraListItem.nth(0).innerText();

        await expect(locators.cellTitle).toHaveText(cameraName);
        let getFrame = waitWebSocketSentMessage(WS, ['"speed":0', 'jpeg']);
        await locators.singleArchiveMode.click();
        let wsPreviousImage =  await getFrame;
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellImage).toBeVisible();
        await locators.cellTimer.click();
        for (let i = 0; i < 3; i++) {
            let getFrame = waitWebSocketSentMessage(WS, ['"speed":0', 'jpeg']);
            await locators.secondsDecrease.click();
            let wsCurrentImage = await getFrame;
            console.log(wsPreviousImage, wsCurrentImage);
            compareTwoNumbers(ISOToMilliseconds(wsPreviousImage.beginTime) - 1000, ISOToMilliseconds(wsCurrentImage.beginTime), 100);
            wsPreviousImage = wsCurrentImage;
            let frameTime = (new Date(ISOToMilliseconds(wsCurrentImage.beginTime))).toLocaleString('ru-RU').replace(/.*\, /, "");
            await expect(locators.cellTimer).toHaveText(frameTime);
        }

        //Два раза нужно вводить, чтобы время не сбрасывалось к ближайшей записи
        await locators.cellTimer.click();
        await setCellTime(page, 0, "20", "00", "00");
        await locators.cellTimer.click();
        await setCellTime(page, 0, "20", "00", "00");
        await locators.secondsDecrease.click();
        await expect(locators.pointerTime).toHaveText("19:59:59");
        await locators.secondsIncrease.click();
        await expect(locators.pointerTime).toHaveText("20:00:00");
        
        await locators.cellTimer.click();
        let cameraIntervals = transformISOtime(await getArchiveIntervals("Black", Configuration.cameras[0], "past", "future"));
        let lastIntervalEndTime = cameraIntervals[0].end;
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes, lastIntervalEndTime.seconds);
        let expectedTime = (`0${lastIntervalEndTime.hours}`).slice(-2) + ':' + (`0${lastIntervalEndTime.minutes}`).slice(-2)  + ':' + (`0${lastIntervalEndTime.seconds}`).slice(-2);
        await expect(locators.pointerTime).toHaveText(expectedTime);
        await expect(locators.cellTimer).toHaveText(expectedTime);
        
        await clientNotFall(page);
    });

    test('Dragging the archive pointer (CLOUD-T906)', async ({ page }) => {
        const locators = new Locators(page);
        
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());

        await openCameraList(page);
        await locators.cameraListItem.nth(0).click();
        let cameraName = await locators.cameraListItem.nth(0).innerText();

        await expect(locators.cellTitle).toHaveText(cameraName);
        await locators.singleArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(1);
        await scrollLastInterval(page);
        await clickToInterval(locators.lastInterval, 0.5);
        await expect(locators.cellImage).toBeVisible();

        let getFrame = waitWebSocketSentMessage(WS, ['"speed":0', 'jpeg']);
        await locators.archivePointerTab.hover();
        await page.mouse.down();
        await getFrame;
        let archivePoinerTab = await locators.archivePointerTab.boundingBox();
        let messagesCheck = messagesNotSent(page, WS);
        await page.mouse.move(archivePoinerTab!.x + archivePoinerTab!.width / 2, archivePoinerTab!.y + archivePoinerTab!.height / 2 - 100);
        await page.waitForTimeout(500);
        await page.mouse.move(archivePoinerTab!.x + archivePoinerTab!.width / 2, archivePoinerTab!.y + archivePoinerTab!.height / 2 + 100);
        await page.waitForTimeout(500);
        await page.mouse.move(archivePoinerTab!.x + archivePoinerTab!.width / 2, archivePoinerTab!.y + archivePoinerTab!.height / 2 - 20);
        await messagesCheck;
        let pointerTimeBeforeUp = await locators.pointerTime.innerText();
        getFrame = waitWebSocketSentMessage(WS, ['"speed":0', 'jpeg']);
        await page.mouse.up();
        let wsFrameImage = await getFrame;
        console.log(wsFrameImage);
        let frameTime = (new Date(ISOToMilliseconds(wsFrameImage.beginTime))).toLocaleString('ru-RU').replace(/.*\, /, "");
        await expect(locators.cellImage).toBeVisible();
        let pointerTimeAfterUp = await locators.pointerTime.innerText();
        isTimeEquals(pointerTimeBeforeUp, pointerTimeAfterUp, 1);
        expect(pointerTimeAfterUp).toEqual(frameTime);
        await expect(locators.cellTimer).toHaveText(pointerTimeAfterUp);

        await clientNotFall(page);
    });

    test('Entering invalid values in digital panel (CLOUD-T907)', async ({ page }) => {
        const locators = new Locators(page);
        
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await openCameraList(page);
        await locators.cameraListItem.nth(0).click();
        let cameraName = await locators.cameraListItem.nth(0).innerText();

        await expect(locators.cellTitle).toHaveText(cameraName);
        await locators.singleArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellImage).toBeVisible();

        await locators.cellTimer.click();
        let hoursBlock = await locators.cellPointerSetterHours.inputValue();
        let minutesBlock = await locators.cellPointerSetterMinutes.inputValue();
        await locators.cellPointerSetterHours.fill("A");
        await expect(locators.cellPointerSetterHours).toHaveValue(hoursBlock);
        await locators.cellPointerSetterHours.fill("25");
        await expect(locators.cellPointerSetterHours).toHaveValue(hoursBlock);
        await locators.cellPointerSetterMinutes.fill("!");
        await expect(locators.cellPointerSetterMinutes).toHaveValue(minutesBlock);
        await locators.cellPointerSetterMinutes.fill("70");
        await expect(locators.cellPointerSetterMinutes).toHaveValue(minutesBlock);
        
        await clientNotFall(page);
    });

    test('Switching between archives (CLOUD-T911) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Temp", -1);
        const tempCamera = Configuration.cameras.filter(item => item.displayName == "Temp")[0];
        await addVirtualVideo([tempCamera], "lprusa", "tracker");
        await createArchive("White");
        await createArchiveVolume("White", 10);
        await createArchiveContext("White", [tempCamera], true, "High");
        await createArchiveContext("Black", [tempCamera], true, "Low");
        await page.waitForTimeout(10000);
        
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());

        await openCameraList(page);
        await locators.cameraListItem.getByText(tempCamera.displayName).click();

        await expect(locators.cellTitle).toContainText(tempCamera.displayName);
        await locators.singleArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellImage).toBeVisible();
        await expect(locators.cellArchive).toHaveText('White');
        let startVideo = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        let wsFrameVideo = await startVideo;
        console.log(wsFrameVideo);
        expect(wsFrameVideo.endpoint).toContain('SourceEndpoint.video:0:0');
        expect(wsFrameVideo.archive).toContain('MultimediaStorage.White');
        await cellIsPlaying(page, 0, 7, true);
        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrameVideo.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);
        let pointerStopTime = await locators.pointerTime.innerText();

        await locators.cellArchiveMenu.click();
        await locators.webpage.getByRole('menuitem', { name: 'Black' }).click();
        await expect(locators.cellArchive).toHaveText('Black');
        startVideo = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        wsFrameVideo = await startVideo;
        console.log(wsFrameVideo);
        let videoStartTime = (new Date(ISOToMilliseconds(wsFrameVideo.beginTime))).toLocaleString('ru-RU').replace(/.*\, /, "");
        expect(pointerStopTime).toEqual(videoStartTime);
        expect(wsFrameVideo.endpoint).toContain('SourceEndpoint.video:0:1');
        expect(wsFrameVideo.archive).toContain('MultimediaStorage.Black');
        await cellIsPlaying(page, 0, 7, true);
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrameVideo.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);

        await clientNotFall(page);
    });

    test('Transition between archive and search (CLOUD-T912) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());

        await openCameraList(page);
        await locators.cameraListItem.nth(0).click();
        let cameraName = await locators.cameraListItem.nth(0).innerText();

        await expect(locators.cellTitle).toHaveText(cameraName);
        await locators.singleArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(1);
        await scrollLastInterval(page);
        let getFrame = waitWebSocketSentMessage(WS, ['"speed":0', 'jpeg']);
        await clickToInterval(locators.lastInterval, 0.5);
        let wsFrameImage = await getFrame;
        let topArchiveTimestamp = await locators.archiveTimestamps.locator('text').first().innerHTML();
        let bottomArchiveTimestamp = await locators.archiveTimestamps.locator('text').last().innerHTML();
        let frameTime = (new Date(ISOToMilliseconds(wsFrameImage.beginTime))).toLocaleString('ru-RU').replace(/.*\, /, "");
        await expect(locators.pointerTime).toHaveText(frameTime);
        await expect(locators.cellTimer).toHaveText(frameTime);
        await expect(locators.cellImage).toBeVisible();
        await expect(locators.cellImage).toHaveAttribute("src", /blob:.*/);
        
        await locators.searchMode.click();
        await expect(locators.searchButton).toBeVisible();
        await expect(locators.pointerTime).toHaveText(frameTime);
        await expect(locators.cellTimer).toHaveText(frameTime);
        await expect(locators.cellImage).toBeVisible();
        await expect(locators.cellImage).toHaveAttribute("src", /blob:.*/);
        await expect(locators.archiveTimestamps.locator('text').first()).toHaveText(topArchiveTimestamp);
        await expect(locators.archiveTimestamps.locator('text').last()).toHaveText(bottomArchiveTimestamp);

        await locators.singleArchiveMode.click();
        await expect(locators.searchButton).toBeHidden();
        await expect(locators.pointerTime).toHaveText(frameTime);
        await expect(locators.cellTimer).toHaveText(frameTime);
        await expect(locators.cellImage).toBeVisible();
        await expect(locators.cellImage).toHaveAttribute("src", /blob:.*/);
        await expect(locators.archiveTimestamps.locator('text').first()).toHaveText(topArchiveTimestamp);
        await expect(locators.archiveTimestamps.locator('text').last()).toHaveText(bottomArchiveTimestamp);

        await clientNotFall(page);
    });

    test('Archive playback after reverse play (CLOUD-T913)', async ({ page }) => {
        const locators = new Locators(page);
        
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());

        await openCameraList(page);
        await locators.cameraListItem.nth(0).click();
        await locators.singleArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(1);

        let startPointerTime = await locators.pointerTime.innerText();
        let startCommand = waitWebSocketSentMessage(WS, ['"speed":-1']);
        await locators.x1SpeedReversed.click();
        await locators.playButton.click();
        let wsFrame = await startCommand;
        await cellIsPlaying(page, 0, 5, true);
        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);
        let lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime, true);
        startPointerTime = lastPointerTime;

        startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.x1Speed.click();
        await locators.playButton.click();
        wsFrame = await startCommand;
        await cellIsPlaying(page, 0, 5, true);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);

        await clientNotFall(page);
    });

    test('Archive playback after reverse frame rewinding (CLOUD-T914)', async ({ page }) => {
        const locators = new Locators(page);
        
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());

        await openCameraList(page);
        await locators.cameraListItem.nth(0).click();
        await locators.singleArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(1);

        //Получаем список кадров и листаем архив назад
        let frameRequest = page.waitForResponse(request => request.url().includes('archive/contents/frames'));
        await locators.prevFrameButton.click();
        let body = await (await frameRequest).json();
        console.log(body.frames);
        for (let i = 0; i < 4; i++) {
            let wsFrame = waitWebSocketSentMessage(WS, ['"speed":0', 'jpeg']);
            await locators.prevFrameButton.click();
            let frameObject = await wsFrame;
            console.log(frameObject.beginTime);
            expect(body.frames.includes(frameObject.beginTime + "000", i)).toBeTruthy();
            await page.waitForTimeout(500);
        }

        let startPointerTime = await locators.pointerTime.innerText();
        let startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        let wsFrame = await startCommand;
        await cellIsPlaying(page, 0, 5, true);
        let lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);

        await clientNotFall(page);
    });

    test('Switching archive speed (CLOUD-T915)', async ({ page }) => {
        const locators = new Locators(page);
        
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await openCameraList(page);
        await locators.cameraListItem.nth(0).click();
        await locators.singleArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(1);

        await locators.x1SpeedReversed.click();
        await expect(locators.x1SpeedReversed).toHaveClass(/.*MuiSlider-markLabelActive.*/);
        let x2SpeedNotch = await locators.speedNotch.nth(4).boundingBox();
        await page.mouse.click(x2SpeedNotch!.x + x2SpeedNotch!.width / 2, x2SpeedNotch!.y + x2SpeedNotch!.height / 2);
        await expect(locators.x2Speed).toHaveClass(/.*MuiSlider-markLabelActive.*/);
        let x2SpeedReversedNotch = await locators.speedNotch.nth(1).boundingBox();
        await page.mouse.click(x2SpeedReversedNotch!.x + x2SpeedReversedNotch!.width / 2, x2SpeedReversedNotch!.y + x2SpeedReversedNotch!.height / 2);
        await expect(locators.x2SpeedReversed).toHaveClass(/.*MuiSlider-markLabelActive.*/);
        await locators.speedSlider.dragTo(locators.x4Speed);
        await expect(locators.x4Speed).toHaveClass(/.*MuiSlider-markLabelActive.*/);
        await locators.speedSlider.dragTo(locators.x4SpeedReversed);
        await expect(locators.x4SpeedReversed).toHaveClass(/.*MuiSlider-markLabelActive.*/);

        await clientNotFall(page);
    });

    test('Switching to pointer when archive plays (CLOUD-T916)', async ({ page }) => {
        const locators = new Locators(page);
        
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await openCameraList(page);
        await locators.cameraListItem.nth(0).click();
        await locators.searchMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(1);
        await locators.templateTimePicker.click({ force: true });
        await locators.webpage.getByRole('option', { name: 'Next 5min' }).click();
        await locators.externalBackground.waitFor({ state: 'detached' });

        await expect(locators.archivePointerTab).not.toBeInViewport();
        await locators.playButton.click();
        await expect(locators.archivePointerTab).toBeInViewport();
        await cellIsPlaying(page, 0, 7, true);
        await locators.playButton.click();
        await expect(locators.archivePointerTab).toBeInViewport();
        let currentStartTime = (await locators.intervalStartInput.inputValue()).slice(0, 8);
        let currentEndTime = (await locators.intervalEndInput.inputValue()).slice(0, 8);
        expect(timeToSeconds(currentEndTime) - timeToSeconds(currentStartTime)).toEqual(5 * 60);

        await clientNotFall(page);
    });

    test('Dragging camera to player (CLOUD-T917)', async ({ page }) => {
        const locators = new Locators(page);

        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Temp", -1);
        const tempCamera = Configuration.cameras.filter(item => item.displayName == "Temp")[0];
        await addVirtualVideo([tempCamera], "lprusa", "tracker");
        await createArchiveContext("Black", [tempCamera], true, "High");
        await page.waitForTimeout(5000);
        
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());

        await openCameraList(page);
        await locators.cameraListItem.nth(0).click();
        await expect(locators.cellTitle).toContainText('Single archive');
        await locators.singleArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toContainText('Single archive');

        let camera = locators.cameraListItem.getByText(tempCamera.displayName);
        let intervalsRequest = page.waitForResponse(request => request.url().includes(`/intervals/${tempCamera.accessPointChanged}/20`) && request.url().includes(`MultimediaStorage.Black`));
        let getFrame = waitWebSocketSentMessage(WS, ['"speed":0', 'jpeg', tempCamera.accessPointChanged]);
        await camera.dragTo(locators.videoCell);
        await intervalsRequest;
        let wsFrameImage = await getFrame;
        console.log(wsFrameImage);
        await expect(locators.cellTitle).toContainText(tempCamera.displayName);
        await expect(locators.cellImage).toBeVisible();
        await expect(locators.lastInterval).toBeVisible();

        let startVideo = waitWebSocketSentMessage(WS, ['"speed":1', tempCamera.accessPointChanged]);
        await locators.playButton.click();
        let wsFrameVideo = await startVideo;
        console.log(wsFrameVideo);
        compareTwoNumbers(ISOToMilliseconds(wsFrameImage.beginTime), ISOToMilliseconds(wsFrameVideo.beginTime), 100);
        await cellIsPlaying(page, 0, 7, true);
        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrameVideo.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);

        await clientNotFall(page);
    });

    test('Picking camera with archive (CLOUD-T923) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Temp", -1);
        const tempCamera = Configuration.cameras.filter(item => item.displayName == "Temp")[0];
        await addVirtualVideo([tempCamera], "lprusa", "tracker");
        await createArchiveContext("Black", [tempCamera], true, "High");
        await page.waitForTimeout(5000);
        
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());

        await openCameraList(page);
        await locators.cameraListItem.nth(0).click();
        await expect(locators.cellTitle).toContainText('Single archive');
        await locators.singleArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toContainText('Single archive');
        await expect(locators.cellImage).toBeVisible();
        let currentTime = new Date();
        currentTime.setSeconds(currentTime.getSeconds() - 2);
        await scrollLastInterval(page);

        let seconds = (`0${currentTime.getSeconds()}`).slice(-2);
        let minutes = (`0${currentTime.getMinutes()}`).slice(-2);
        let hours = (`0${currentTime.getHours()}`).slice(-2);
        let expectedPointerTime = `${hours}:${minutes}:${seconds}`;
        await setCellTime(page, 0, hours, minutes, seconds);
        await expect(locators.pointerTime).toHaveText(expectedPointerTime);
        await expect(locators.cellTimer).toHaveText(expectedPointerTime);
        await expect(locators.cellImage).toBeVisible();
        let topArchiveTimestamp = await locators.archiveTimestamps.locator('text').first().innerHTML();
        let bottomArchiveTimestamp = await locators.archiveTimestamps.locator('text').last().innerHTML();

        let intervalsRequest = page.waitForResponse(request => request.url().includes(`/intervals/${tempCamera.accessPointChanged}/20`) && request.url().includes(`MultimediaStorage.Black`));
        let getFrame = waitWebSocketSentMessage(WS, ['"speed":0', 'jpeg', tempCamera.accessPointChanged]);
        await locators.cameraListItem.getByText(tempCamera.displayName).click();
        await intervalsRequest;
        let wsFrameImage = await getFrame;
        console.log(wsFrameImage);
        await expect(locators.cellTitle).toContainText(tempCamera.displayName);
        await expect(locators.cellImage).toBeVisible();
        await expect(locators.lastInterval).toBeVisible();
        await expect(locators.pointerTime).toHaveText(expectedPointerTime);
        await expect(locators.cellTimer).toHaveText(expectedPointerTime);
        await expect(locators.archiveTimestamps.locator('text').first()).toHaveText(topArchiveTimestamp);
        await expect(locators.archiveTimestamps.locator('text').last()).toHaveText(bottomArchiveTimestamp);
        await expect(locators.cellArchiveIntervals.last()).toBeVisible();

        let startVideo = waitWebSocketSentMessage(WS, ['"speed":1', tempCamera.accessPointChanged]);
        await locators.playButton.click();
        let wsFrameVideo = await startVideo;
        console.log(wsFrameVideo);
        compareTwoNumbers(ISOToMilliseconds(wsFrameImage.beginTime), ISOToMilliseconds(wsFrameVideo.beginTime), 100);
        await cellIsPlaying(page, 0, 7, true);
        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrameVideo.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);

        await clientNotFall(page);
    });

    test('Picking camera without archive (CLOUD-T924)', async ({ page }) => {
        const locators = new Locators(page);

        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Temp", -1);
        const tempCamera = Configuration.cameras.filter(item => item.displayName == "Temp")[0];
        await addVirtualVideo([tempCamera], "lprusa", "tracker");
        
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await openCameraList(page);
        await locators.cameraListItem.nth(0).click();
        await expect(locators.cellTitle).toContainText('Single archive');
        await locators.singleArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toContainText('Single archive');
        await expect(locators.cellImage).toBeVisible();
        await locators.cameraListItem.getByText(tempCamera.displayName).click();
        await expect(locators.popUpMessage).toBeVisible();
        await expect(locators.popUpMessage).toHaveText(`The camera doesn't have an archive`);
        await locators.popUpMessage.waitFor({ state: 'detached', timeout: 10000 });
        await expect(locators.cellTitle).toContainText('Single archive');
        await expect(locators.cellImage).toBeVisible();
        await expect(locators.archiveBlock).toBeVisible();

        await locators.searchMode.click();
        await expect(locators.searchButton).toBeVisible();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toContainText('Single archive');
        await expect(locators.cellImage).toBeVisible();
        await locators.cameraListItem.getByText(tempCamera.displayName).click();
        await expect(locators.popUpMessage).toBeVisible();
        await expect(locators.popUpMessage).toHaveText(`The camera doesn't have an archive`);
        await locators.popUpMessage.waitFor({ state: 'detached', timeout: 10000 });
        await expect(locators.cellTitle).toContainText('Single archive');
        await expect(locators.cellImage).toBeVisible();
        await expect(locators.archiveBlock).toBeVisible();
        await expect(locators.searchButton).toBeVisible();

        await clientNotFall(page);
    });

    test('Picking past date (CLOUD-T954) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.singleArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellImage).toBeVisible();
        await expect(locators.lastInterval).toBeVisible();

        let calendarDaysRequest = page.waitForResponse(request => request.url().includes(`/calendar/${Configuration.cameras[0].accessPointChanged}/${extractMonthInterval(new Date())}`));
        await locators.archiveBlockDateSelector.click();
        let calendarDays = await (await calendarDaysRequest).json();
        expect(calendarDays.length).toBeGreaterThanOrEqual(1);
        await expect(locators.datesTable.locator('button.Mui-disabled')).toHaveCount(await locators.datesTable.locator('button').count() - calendarDays.length);
        for (let date of calendarDays) {
            let day = new Date(date - SEVENTY_YEARS).getUTCDate();
            await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeEnabled();
            await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeVisible();
        }

        let previousMonthLastDay = new Date();
        previousMonthLastDay.setDate(0);
        await emulateCalendarDays(page, previousMonthLastDay, 0);
        calendarDaysRequest = page.waitForResponse(request => request.url().includes(`/calendar/${Configuration.cameras[0].accessPointChanged}/${extractMonthInterval(previousMonthLastDay)}`));
        await locators.previousMonthSwitcher.click();
        await expect(locators.datesTable).toHaveCount(1);
        await calendarDaysRequest;
        await expect(locators.datesTable.locator('button.Mui-disabled')).toHaveCount(await locators.datesTable.locator('button').count() - 1);
        await expect(locators.datesTable.locator('button').last()).toBeEnabled();
        await expect(locators.datesTable.locator('button').last()).toBeVisible();
        let getFrame = waitWebSocketSentMessage(WS, ['"speed":0', 'jpeg']);
        await locators.datesTable.locator('button').last().click();
        await locators.webpage.locator('[aria-label="12 hours"]').waitFor({ state: 'attached' });
        await locators.webpage.locator('[aria-label="12 hours"]').click({ force: true });
        await locators.webpage.locator('[aria-label="00 minutes"]').waitFor({ state: 'attached' });
        await locators.webpage.locator('[aria-label="00 minutes"]').click({ force: true });
        await locators.webpage.locator('[aria-label="00 seconds"]').waitFor({ state: 'attached' });
        await locators.webpage.locator('[aria-label="00 seconds"]').click({ force: true });
        await locators.acceptButtonInDatapicker.click();
        await locators.dialogBackground.waitFor({ state: 'detached' });
        let wsFrameImage = await getFrame;
        console.log(wsFrameImage);
        previousMonthLastDay.setHours(12, 0, 0, 0);
        compareTwoNumbers(ISOToMilliseconds(wsFrameImage.beginTime), previousMonthLastDay.getTime(), 1000);
        await expect(locators.archiveTimestamps.locator('text').first()).toHaveText((previousMonthLastDay.toLocaleString('ru-RU')).replace(/\,.*/, ""));
        await expect(locators.archiveTimestamps.locator('text').last()).toHaveText("21:00:00");
        await page.unroute(`**/calendar/**`);

        await clientNotFall(page);
    });

    test('Archive playback with sound (CLOUD-T963) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Temp", -1);
        const tempCamera = Configuration.cameras.filter(item => item.displayName == "Temp")[0];
        await addVirtualVideo([tempCamera], "witcher_640", "witcher_640");
        await changeMicrophoneStatus(tempCamera, true);
        await createArchiveContext("Black", [tempCamera], true, "High");
        await page.waitForTimeout(5000);
        
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());

        await openCameraList(page);
        await locators.cameraListItem.getByText(tempCamera.displayName).click();
        await expect(locators.cellTitle).toContainText(tempCamera.displayName);
        await locators.singleArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(1);
        await expect(locators.cellImage).toBeVisible();

        let startVideo = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        let wsFrameVideo = await startVideo;
        await expect(locators.videoCellMicro).toBeVisible();
        await expect(locators.videoCellMicro.getByTestId('VolumeOffIcon')).toBeVisible();
        let isSoundOn = await getSoundStatusFromCell(page, 0);
        expect(isSoundOn).toBeFalsy();
        await cellIsPlaying(page, 0, 7, true);

        await locators.videoCellMicro.click();
        await expect(locators.videoCellMicro.getByTestId('VolumeUpIcon')).toBeVisible();
        isSoundOn = await getSoundStatusFromCell(page, 0);
        expect(isSoundOn).toBeTruthy();
        await cellIsPlaying(page, 0, 7, true);

        let soundValue = 0.8;
        let soundBarCoordinates = await locators.videoCellSoundBar.boundingBox();
        await locators.videoCellSoundBar.click({ position: { x: soundBarCoordinates!.width / 2, y: soundBarCoordinates!.height * (1 - soundValue) } });
        await expect(locators.videoCellSoundBar.locator('input')).toHaveAttribute('value', String(soundValue));
        soundValue = 0.2;
        await locators.videoCellSoundBar.click({ position: { x: soundBarCoordinates!.width / 2, y: soundBarCoordinates!.height * (1 - soundValue) } });
        await expect(locators.videoCellSoundBar.locator('input')).toHaveAttribute('value', String(soundValue));
        isSoundOn = await getSoundStatusFromCell(page, 0);
        expect(isSoundOn).toBeTruthy();

        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrameVideo.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);

        await clientNotFall(page);
    });

    test('Archive playback with sound in search mode (CLOUD-T1161)', async ({ page }) => {
        const locators = new Locators(page);

        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Temp", -1);
        const tempCamera = Configuration.cameras.filter(item => item.displayName == "Temp")[0];
        await addVirtualVideo([tempCamera], "witcher_640", "witcher_640");
        await changeMicrophoneStatus(tempCamera, true);
        await createArchiveContext("Black", [tempCamera], true, "High");
        await page.waitForTimeout(5000);
        
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());

        await openCameraList(page);
        await locators.cameraListItem.getByText(tempCamera.displayName).click();
        await expect(locators.cellTitle).toContainText(tempCamera.displayName);
        await locators.searchMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(1);
        await expect(locators.cellImage).toBeVisible();

        let startVideo = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        let wsFrameVideo = await startVideo;
        await expect(locators.videoCellMicro).toBeVisible();
        await expect(locators.videoCellMicro.getByTestId('VolumeOffIcon')).toBeVisible();
        let isSoundOn = await getSoundStatusFromCell(page, 0);
        expect(isSoundOn).toBeFalsy();
        await cellIsPlaying(page, 0, 7, true);

        await locators.videoCellMicro.click();
        await expect(locators.videoCellMicro.getByTestId('VolumeUpIcon')).toBeVisible();
        isSoundOn = await getSoundStatusFromCell(page, 0);
        expect(isSoundOn).toBeTruthy();
        await cellIsPlaying(page, 0, 7, true);

        let soundValue = 0.8;
        let soundBarCoordinates = await locators.videoCellSoundBar.boundingBox();
        await locators.videoCellSoundBar.click({ position: { x: soundBarCoordinates!.width / 2, y: soundBarCoordinates!.height * (1 - soundValue) } });
        await expect(locators.videoCellSoundBar.locator('input')).toHaveAttribute('value', String(soundValue));
        soundValue = 0.2;
        await locators.videoCellSoundBar.click({ position: { x: soundBarCoordinates!.width / 2, y: soundBarCoordinates!.height * (1 - soundValue) } });
        await expect(locators.videoCellSoundBar.locator('input')).toHaveAttribute('value', String(soundValue));
        isSoundOn = await getSoundStatusFromCell(page, 0);
        expect(isSoundOn).toBeTruthy();

        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrameVideo.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);

        await clientNotFall(page);
    });

    test('Accelerated archive playback with sound (CLOUD-T964)', async ({ page }) => {
        const locators = new Locators(page);

        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Temp", -1);
        const tempCamera = Configuration.cameras.filter(item => item.displayName == "Temp")[0];
        await addVirtualVideo([tempCamera], "witcher_640", "witcher_640");
        await changeMicrophoneStatus(tempCamera, true);
        await createArchiveContext("Black", [tempCamera], true, "High");
        await page.waitForTimeout(5000);
        
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());

        await openCameraList(page);
        await locators.cameraListItem.getByText(tempCamera.displayName).click();
        await expect(locators.cellTitle).toContainText(tempCamera.displayName);
        await locators.singleArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await scrollLastInterval(page);
        await clickToInterval(locators.lastInterval, 0.2);
        await expect(locators.cellTitle).toHaveCount(1);
        await expect(locators.cellImage).toBeVisible();

        await locators.videoCellMicro.click();
        await expect(locators.videoCellMicro.getByTestId('VolumeUpIcon')).toBeVisible();
        let startVideo = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        let wsFrameVideo = await startVideo;
        await locators.nextLogo.dblclick();
        let isSoundOn = await getSoundStatusFromCell(page, 0);
        expect(isSoundOn).toBeTruthy()
        await expect(locators.videoCellDebug).toContainText('codec	video/mp4; codecs="avc1.64001f,mp4a.40.2"');
        await cellIsPlaying(page, 0, 7, true);
        // Add MutationObserver https://github.com/microsoft/playwright/issues/4051 !!!
        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrameVideo.streamId]);
        startVideo = waitWebSocketSentMessage(WS, ['"speed":2']);
        await locators.x2Speed.click();
        await stopCommand;
        wsFrameVideo = await startVideo;
        await cellIsPlaying(page, 0, 5, true);
        await expect(locators.videoCellDebug).toContainText('codec	video/mp4; codecs="avc1.64001f"');

        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrameVideo.streamId]);
        startVideo = waitWebSocketSentMessage(WS, ['"speed":-1']);
        await locators.x1SpeedReversed.click();
        await stopCommand;
        wsFrameVideo = await startVideo;
        await cellIsPlaying(page, 0, 5, true);
        await expect(locators.videoCellDebug).toContainText('codec	video/mp4; codecs="avc1.64001f"');

        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrameVideo.streamId]);
        startVideo = waitWebSocketSentMessage(WS, ['"speed":4']);
        await locators.x4Speed.click();
        await stopCommand;
        wsFrameVideo = await startVideo;
        await cellIsPlaying(page, 0, 5, true);
        await expect(locators.videoCellDebug).toContainText('codec	video/mp4; codecs="avc1.64001f"');

        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrameVideo.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);

        await clientNotFall(page);
    });

    test('Picking archive frame during playback (CLOUD-T979)', async ({ page }) => {
        const locators = new Locators(page);
        
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());

        await openCameraList(page);
        await locators.cameraListItem.nth(0).click();
        let cameraName = await locators.cameraListItem.nth(0).innerText();

        await expect(locators.cellTitle).toHaveText(cameraName);
        await locators.singleArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(1);
        await scrollLastInterval(page);

        let getFrame = waitWebSocketSentMessage(WS, ['"speed":0', 'jpeg']);
        await clickToInterval(locators.lastInterval, 0.5);
        let wsFrameImage = await getFrame;
        console.log(wsFrameImage);
        await expect(locators.cellImage).toBeVisible();
        let startVideo = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        let wsFrameVideo = await startVideo;
        console.log(wsFrameVideo);
        await cellIsPlaying(page, 0, 5, true);

        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrameVideo.streamId]);
        getFrame = waitWebSocketSentMessage(WS, ['"speed":0', 'jpeg']);
        await clickToInterval(locators.lastInterval, 0.2);
        await stopCommand;
        wsFrameImage = await getFrame;
        console.log(wsFrameImage);
        expect(ISOToMilliseconds(wsFrameImage.beginTime)).toBeLessThan(ISOToMilliseconds(wsFrameVideo.beginTime));
        let frameTime = (new Date(ISOToMilliseconds(wsFrameImage.beginTime))).toLocaleString('ru-RU').replace(/.*\, /, "");
        await expect(locators.pointerTime).toHaveText(frameTime);
        await expect(locators.cellTimer).toHaveText(frameTime);
        await expect(locators.cellImage).toHaveAttribute("src", /blob:.*/);
        await isMessagesStop(page, WS); 
        
        await clientNotFall(page);
    });

    test('Setting time in datepicker (CLOUD-T1025)', async ({ page }) => {
        const locators = new Locators(page);
        
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());

        await expect(locators.cellTitle).toHaveCount(1);
        await locators.singleArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellImage).toBeVisible();
        await expect(locators.lastInterval).toBeVisible();


        await locators.archiveBlockDateSelector.click();
        await locators.timeTab.click();
        await waitAnimationEnds(page, locators.datePickerMenu);
        const activeBlockColor = await locators.hoursBlock.evaluate(elem => getComputedStyle(elem).color);
        await expect(locators.hoursBlock).toHaveCSS("color", activeBlockColor);
        await expect(locators.minutesBlock).not.toHaveCSS("color", activeBlockColor);
        await expect(locators.secondsBlock).not.toHaveCSS("color", activeBlockColor);

        let getFrame = waitWebSocketSentMessage(WS, ['"speed":0', 'jpeg']);
        await locators.webpage.locator('[aria-label="12 hours"]').waitFor({ state: 'attached' });
        await locators.webpage.locator('[aria-label="12 hours"]').click({ force: true });
        await expect(locators.hoursBlock).toHaveText('12');
        await locators.secondsBlock.click();
        await expect(locators.secondsBlock).toHaveCSS("color", activeBlockColor);
        await locators.webpage.locator('[aria-label="00 seconds"]').waitFor({ state: 'attached' });
        await locators.webpage.locator('[aria-label="00 seconds"]').click({ force: true });
        await expect(locators.secondsBlock).toHaveText('00');
        await locators.previousTimeBlockSwitcher.click();
        await expect(locators.minutesBlock).toHaveCSS("color", activeBlockColor);
        await locators.webpage.locator('[aria-label="30 minutes"]').waitFor({ state: 'attached' });
        await locators.webpage.locator('[aria-label="30 minutes"]').click({ force: true });
        await expect(locators.minutesBlock).toHaveText('30');
        await locators.acceptButtonInDatapicker.click();
        await locators.dialogBackground.waitFor({ state: 'detached' });
        let wsFrameImage = await getFrame;
        console.log(wsFrameImage);
        let currentDayNoon = new Date();
        currentDayNoon.setHours(12, 30, 0, 0);
        compareTwoNumbers(ISOToMilliseconds(wsFrameImage.beginTime), currentDayNoon.getTime(), 1000);

        await clientNotFall(page);
    });

    test('Drawing archive intervals depending of the scale (CLOUD-T1298) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Temp", -1);
        const tempCamera = Configuration.cameras.filter(item => item.displayName == "Temp")[0];
        await addVirtualVideo([tempCamera], "tracker", "tracker");
        await createArchiveContext("Black", [tempCamera], true, "High");
        await page.waitForTimeout(20000);
        let gapEndTime = new Date();
        for (let i = 1; i < 4; i++) {
            let gapStartTime = new Date(gapEndTime);
            gapEndTime.setSeconds(gapEndTime.getSeconds() - 5);
            gapStartTime.setSeconds(gapStartTime.getSeconds() - 7);
            await deleteArchiveInterval(tempCamera.accessPoint, "Black", timeToISO(gapStartTime), timeToISO(gapEndTime));
        }

        page.on("response", async response => {
            if (response.url().includes(`intervals/${tempCamera.accessPointChanged}/20`)) {
                let intervals = (await response.json()).intervals;
                console.log(`Archive intervals ${response.url().replace(/\?.*?&/, '?')}:`, intervals);
                await expect(locators.archiveIntervals).toHaveCount(intervals.length);

                let timeInterval = getTimeIntervalFromURL(response.url());
                let scale = Math.round((ISOToMilliseconds(timeInterval[0]) - ISOToMilliseconds(timeInterval[1])) / 1000 * 0.005);
                expect(response.url()).toContain(`scale=${scale}&`);
                if (scale == 1) {
                    expect(intervals.length).toEqual(4);
                }
            }
        });

        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());

        await openCameraList(page);
        await locators.cameraListItem.getByText(tempCamera.displayName).click();
        await expect(locators.cellTitle).toContainText(tempCamera.displayName);
        let dayStart = new Date();
        let dayEnd = new Date();
        dayStart.setHours(0, 0, 0, 0);
        dayEnd.setHours(23, 59, 59, 999);
        let intervalsRequest = page.waitForResponse(request => request.url().includes(`archive/contents/intervals/${tempCamera.accessPointChanged}/${timeToISO(dayEnd)}/${timeToISO(dayStart)}`));
        await locators.singleArchiveMode.click();
        await intervalsRequest;
        await waitAnimationEnds(page, locators.archiveBlock);

        await scrollInterval(page, locators.lastInterval, -5000, 1000);
        let firstScaleTimestamp = timeToSeconds(isDateOrTime(await locators.archiveTimestamps.locator('text').nth(0).innerHTML()));
        let secondScaleTimestamp = timeToSeconds(isDateOrTime(await locators.archiveTimestamps.locator('text').nth(1).innerHTML()));
        let timeScale = secondScaleTimestamp - firstScaleTimestamp;
        expect(timeScale).toEqual(15);
        await scrollInterval(page, locators.lastInterval, 10000, 1000);
        firstScaleTimestamp = timeToSeconds(isDateOrTime(await locators.archiveTimestamps.locator('text').nth(0).innerHTML()));
        secondScaleTimestamp = timeToSeconds(isDateOrTime(await locators.archiveTimestamps.locator('text').nth(1).innerHTML()));
        timeScale = secondScaleTimestamp - firstScaleTimestamp;
        expect(timeScale).toEqual(0); // 0 соответсвует разнице в 1 день так как из isDateOrTime возвращается полночь

        await clientNotFall(page);
    });
});

test.describe("Archive. Timezone emulation", () => {
    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector();
        if (Configuration.cameras.length < 1) {
            await cameraAnnihilator("all");
            await layoutAnnihilator("all");
            await roleAnnihilator("all");
            await userAnnihilator("all");
            await deleteArchive('Black');
            await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Single archive", 0);
            await addVirtualVideo(Configuration.cameras, "lprusa", "tracker");
            await createArchive("Black");
            await createArchiveVolume("Black", 10);
            await createArchiveContext("Black", Configuration.cameras, true, "High");
        }
    });
    
    test.describe("Timezone - UTC+3 (Moscow)", () => {
        test.use({ timezoneId: "Europe/Moscow" });

        test('Requesting calendar, UTC+, Ts=Tc (CLOUD-T955) #smoke', async ({ page }) => {
            const locators = new Locators(page);
            const clientTimeZoneOffset = await page.evaluate(() => (new Date()).getTimezoneOffset());
            const serverTimezone = -clientTimeZoneOffset;
            console.log(-clientTimeZoneOffset, serverTimezone);

            await emulateServerTimezone(page, serverTimezone);
            
            let serverPropertiesRequest = page.waitForResponse(request => request.url().includes(`/hosts/${hostName}`));
            await page.goto(clientURL);
            await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
            let serverProperties = await (await serverPropertiesRequest).json();
            expect(serverProperties.timeZone).toEqual(serverTimezone);

            await page.unroute(`**/hosts/${hostName}*`);

            await expect(locators.cellTitle).toHaveCount(1);
            await locators.singleArchiveMode.click();
            await waitAnimationEnds(page, locators.archiveBlock);
            await expect(locators.cellImage).toBeVisible();
            await expect(locators.lastInterval).toBeVisible();

            await emulateCalendarDays(page, new Date(), 31);
            let calendarDaysRequest = page.waitForResponse(request => request.url().includes(`/calendar/${Configuration.cameras[0].accessPointChanged}/${extractMonthInterval(new Date())}`));
            await locators.archiveBlockDateSelector.click();
            let calendarDays = await (await calendarDaysRequest).json();
            await expect(locators.datesTable.locator('button.Mui-disabled')).toHaveCount(await locators.datesTable.locator('button').count() - calendarDays.length);
            for (let date of calendarDays) {
                let day = new Date(date - SEVENTY_YEARS).getUTCDate();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeEnabled();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeVisible();
            }
            await page.unroute(`**/calendar/**`);

            let previousMonth = new Date();
            previousMonth.setDate(0);
            await emulateCalendarDays(page, previousMonth, 10);
            calendarDaysRequest = page.waitForResponse(request => request.url().includes(`/calendar/${Configuration.cameras[0].accessPointChanged}/${extractMonthInterval(previousMonth)}`));
            await locators.previousMonthSwitcher.click();
            await expect(locators.datesTable).toHaveCount(1);
            calendarDays = await (await calendarDaysRequest).json();
            await expect(locators.datesTable.locator('button.Mui-disabled')).toHaveCount(await locators.datesTable.locator('button').count() - calendarDays.length);
            for (let date of calendarDays) {
                let day = new Date(date - SEVENTY_YEARS).getUTCDate();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeEnabled();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeVisible();
            }
            await page.unroute(`**/calendar/**`);

            await clientNotFall(page);
        });
    });

    test.describe("Timezone - UTC+2 (Jerusalem)", () => {
        test.use({ timezoneId: "Asia/Jerusalem" });

        test('Requesting calendar, UTC+, Ts=Tc, Daylight Time (CLOUD-T956)', async ({ page }) => {
            const locators = new Locators(page);
            const clientTimeZoneOffset = await page.evaluate(() => (new Date()).getTimezoneOffset());
            const serverTimezone = -clientTimeZoneOffset;
            console.log(-clientTimeZoneOffset, serverTimezone);

            await emulateServerTimezone(page, serverTimezone);
            
            let serverPropertiesRequest = page.waitForResponse(request => request.url().includes(`/hosts/${hostName}`));
            await page.goto(clientURL);
            await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
            let serverProperties = await (await serverPropertiesRequest).json();
            expect(serverProperties.timeZone).toEqual(serverTimezone);

            await page.unroute(`**/hosts/${hostName}*`);

            await expect(locators.cellTitle).toHaveCount(1);
            await locators.singleArchiveMode.click();
            await waitAnimationEnds(page, locators.archiveBlock);
            await expect(locators.cellImage).toBeVisible();
            await expect(locators.lastInterval).toBeVisible();

            await emulateCalendarDays(page, new Date(), 31);
            let calendarDaysRequest = page.waitForResponse(request => request.url().includes(`/calendar/${Configuration.cameras[0].accessPointChanged}/${extractMonthInterval(new Date())}`));
            await locators.archiveBlockDateSelector.click();
            let calendarDays = await (await calendarDaysRequest).json();
            await expect(locators.datesTable.locator('button.Mui-disabled')).toHaveCount(await locators.datesTable.locator('button').count() - calendarDays.length);
            for (let date of calendarDays) {
                let day = new Date(date - SEVENTY_YEARS).getUTCDate();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeEnabled();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeVisible();
            }
            await page.unroute(`**/calendar/**`);

            let previousMonth = new Date();
            previousMonth.setDate(0);
            await emulateCalendarDays(page, previousMonth, 10);
            calendarDaysRequest = page.waitForResponse(request => request.url().includes(`/calendar/${Configuration.cameras[0].accessPointChanged}/${extractMonthInterval(previousMonth)}`));
            await locators.previousMonthSwitcher.click();
            await expect(locators.datesTable).toHaveCount(1);
            calendarDays = await (await calendarDaysRequest).json();
            await expect(locators.datesTable.locator('button.Mui-disabled')).toHaveCount(await locators.datesTable.locator('button').count() - calendarDays.length);
            for (let date of calendarDays) {
                let day = new Date(date - SEVENTY_YEARS).getUTCDate();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeEnabled();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeVisible();
            }
            await page.unroute(`**/calendar/**`);

            await clientNotFall(page);
        });
    });

    test.describe("Client timezone - UTC+3 (Moscow) | Server - UTC+5", () => {
        test.use({ timezoneId: "Europe/Moscow" });

        test('Requesting calendar, UTC+, Ts>Tc (CLOUD-T957)', async ({ page }) => {
            const locators = new Locators(page);
            const clientTimeZoneOffset = await page.evaluate(() => (new Date()).getTimezoneOffset());
            const serverTimezone = -clientTimeZoneOffset + 2 * 60;
            console.log(-clientTimeZoneOffset, serverTimezone);

            await emulateServerTimezone(page, serverTimezone);
            
            let serverPropertiesRequest = page.waitForResponse(request => request.url().includes(`/hosts/${hostName}`));
            await page.goto(clientURL);
            await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
            let serverProperties = await (await serverPropertiesRequest).json();
            expect(serverProperties.timeZone).toEqual(serverTimezone);

            await page.unroute(`**/hosts/${hostName}*`);

            await expect(locators.cellTitle).toHaveCount(1);
            await locators.singleArchiveMode.click();
            await waitAnimationEnds(page, locators.archiveBlock);
            await expect(locators.cellImage).toBeVisible();
            await expect(locators.lastInterval).toBeVisible();

            await emulateCalendarDays(page, new Date(), 31);
            let calendarDaysRequest = page.waitForResponse(request => request.url().includes(`/calendar/${Configuration.cameras[0].accessPointChanged}/${extractMonthInterval(new Date())}`));
            await locators.archiveBlockDateSelector.click();
            let calendarDays = await (await calendarDaysRequest).json();
            await expect(locators.datesTable.locator('button.Mui-disabled')).toHaveCount(await locators.datesTable.locator('button').count() - calendarDays.length);
            for (let date of calendarDays) {
                let day = new Date(date - SEVENTY_YEARS).getUTCDate();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeEnabled();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeVisible();
            }
            await page.unroute(`**/calendar/**`);

            let previousMonth = new Date();
            previousMonth.setDate(0);
            await emulateCalendarDays(page, previousMonth, 10);
            calendarDaysRequest = page.waitForResponse(request => request.url().includes(`/calendar/${Configuration.cameras[0].accessPointChanged}/${extractMonthInterval(previousMonth)}`));
            await locators.previousMonthSwitcher.click();
            await expect(locators.datesTable).toHaveCount(1);
            calendarDays = await (await calendarDaysRequest).json();
            await expect(locators.datesTable.locator('button.Mui-disabled')).toHaveCount(await locators.datesTable.locator('button').count() - calendarDays.length);
            for (let date of calendarDays) {
                let day = new Date(date - SEVENTY_YEARS).getUTCDate();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeEnabled();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeVisible();
            }
            await page.unroute(`**/calendar/**`);

            await clientNotFall(page);
        });
    });

    test.describe("Client timezone - UTC+5 (Yekaterinburg) | Server - UTC+3", () => {
        test.use({ timezoneId: "Asia/Yekaterinburg" });

        test('Requesting calendar, UTC+, Ts<Tc (CLOUD-T958)', async ({ page }) => {
            const locators = new Locators(page);
            const clientTimeZoneOffset = await page.evaluate(() => (new Date()).getTimezoneOffset());
            const serverTimezone = -clientTimeZoneOffset - 2 * 60;
            console.log(-clientTimeZoneOffset, serverTimezone);

            await emulateServerTimezone(page, serverTimezone);
            
            let serverPropertiesRequest = page.waitForResponse(request => request.url().includes(`/hosts/${hostName}`));
            await page.goto(clientURL);
            await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
            let serverProperties = await (await serverPropertiesRequest).json();
            expect(serverProperties.timeZone).toEqual(serverTimezone);

            await page.unroute(`**/hosts/${hostName}*`);

            await expect(locators.cellTitle).toHaveCount(1);
            await locators.singleArchiveMode.click();
            await waitAnimationEnds(page, locators.archiveBlock);
            await expect(locators.cellImage).toBeVisible();
            await expect(locators.lastInterval).toBeVisible();

            await emulateCalendarDays(page, new Date(), 31);
            let calendarDaysRequest = page.waitForResponse(request => request.url().includes(`/calendar/${Configuration.cameras[0].accessPointChanged}/${extractMonthInterval(new Date())}`));
            await locators.archiveBlockDateSelector.click();
            let calendarDays = await (await calendarDaysRequest).json();
            await expect(locators.datesTable.locator('button.Mui-disabled')).toHaveCount(await locators.datesTable.locator('button').count() - calendarDays.length);
            for (let date of calendarDays) {
                let day = new Date(date - SEVENTY_YEARS).getUTCDate();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeEnabled();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeVisible();
            }
            await page.unroute(`**/calendar/**`);

            let previousMonth = new Date();
            previousMonth.setDate(0);
            await emulateCalendarDays(page, previousMonth, 10);
            calendarDaysRequest = page.waitForResponse(request => request.url().includes(`/calendar/${Configuration.cameras[0].accessPointChanged}/${extractMonthInterval(previousMonth)}`));
            await locators.previousMonthSwitcher.click();
            await expect(locators.datesTable).toHaveCount(1);
            calendarDays = await (await calendarDaysRequest).json();
            await expect(locators.datesTable.locator('button.Mui-disabled')).toHaveCount(await locators.datesTable.locator('button').count() - calendarDays.length);
            for (let date of calendarDays) {
                let day = new Date(date - SEVENTY_YEARS).getUTCDate();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeEnabled();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeVisible();
            }
            await page.unroute(`**/calendar/**`);

            await clientNotFall(page);
        });
    });

    test.describe("Client timezone - UTC-5 (Eastern USA) | Server - UTC-6", () => {
        test.use({ timezoneId: "US/Eastern" });

        test('Requesting calendar, UTC-, Ts<Tc (CLOUD-T959)', async ({ page }) => {
            const locators = new Locators(page);
            const clientTimeZoneOffset = await page.evaluate(() => (new Date()).getTimezoneOffset());
            const serverTimezone = -360;
            console.log(-clientTimeZoneOffset, serverTimezone);

            await emulateServerTimezone(page, serverTimezone);
            
            let serverPropertiesRequest = page.waitForResponse(request => request.url().includes(`/hosts/${hostName}`));
            await page.goto(clientURL);
            await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
            let serverProperties = await (await serverPropertiesRequest).json();
            expect(serverProperties.timeZone).toEqual(serverTimezone);

            await page.unroute(`**/hosts/${hostName}*`);

            await expect(locators.cellTitle).toHaveCount(1);
            await locators.singleArchiveMode.click();
            await waitAnimationEnds(page, locators.archiveBlock);
            await expect(locators.cellImage).toBeVisible();
            await expect(locators.lastInterval).toBeVisible();

            await emulateCalendarDays(page, new Date(), 31);
            let calendarDaysRequest = page.waitForResponse(request => request.url().includes(`/calendar/${Configuration.cameras[0].accessPointChanged}/${extractMonthInterval(new Date())}`));
            await locators.archiveBlockDateSelector.click();
            let calendarDays = await (await calendarDaysRequest).json();
            await expect(locators.datesTable.locator('button.Mui-disabled')).toHaveCount(await locators.datesTable.locator('button').count() - calendarDays.length);
            for (let date of calendarDays) {
                let day = new Date(date - SEVENTY_YEARS).getUTCDate();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeEnabled();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeVisible();
            }
            await page.unroute(`**/calendar/**`);

            let previousMonth = new Date();
            previousMonth.setDate(0);
            await emulateCalendarDays(page, previousMonth, 10);
            calendarDaysRequest = page.waitForResponse(request => request.url().includes(`/calendar/${Configuration.cameras[0].accessPointChanged}/${extractMonthInterval(previousMonth)}`));
            await locators.previousMonthSwitcher.click();
            await expect(locators.datesTable).toHaveCount(1);
            calendarDays = await (await calendarDaysRequest).json();
            await expect(locators.datesTable.locator('button.Mui-disabled')).toHaveCount(await locators.datesTable.locator('button').count() - calendarDays.length);
            for (let date of calendarDays) {
                let day = new Date(date - SEVENTY_YEARS).getUTCDate();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeEnabled();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeVisible();
            }
            await page.unroute(`**/calendar/**`);

            await clientNotFall(page);
        });
    });

    test.describe("Client timezone - UTC-8 (Pacific USA) | Server - UTC-6", () => {
        test.use({ timezoneId: "US/Pacific" });

        test('Requesting calendar, UTC-, Ts>Tc (CLOUD-T960)', async ({ page }) => {
            const locators = new Locators(page);
            const clientTimeZoneOffset = await page.evaluate(() => (new Date()).getTimezoneOffset());
            const serverTimezone = -360;
            console.log(-clientTimeZoneOffset, serverTimezone);

            await emulateServerTimezone(page, serverTimezone);
            
            let serverPropertiesRequest = page.waitForResponse(request => request.url().includes(`/hosts/${hostName}`));
            await page.goto(clientURL);
            await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
            let serverProperties = await (await serverPropertiesRequest).json();
            expect(serverProperties.timeZone).toEqual(serverTimezone);

            await page.unroute(`**/hosts/${hostName}*`);

            await expect(locators.cellTitle).toHaveCount(1);
            await locators.singleArchiveMode.click();
            await waitAnimationEnds(page, locators.archiveBlock);
            await expect(locators.cellImage).toBeVisible();
            await expect(locators.lastInterval).toBeVisible();

            await emulateCalendarDays(page, new Date(), 31);
            let calendarDaysRequest = page.waitForResponse(request => request.url().includes(`/calendar/${Configuration.cameras[0].accessPointChanged}/${extractMonthInterval(new Date())}`));
            await locators.archiveBlockDateSelector.click();
            let calendarDays = await (await calendarDaysRequest).json();
            await expect(locators.datesTable.locator('button.Mui-disabled')).toHaveCount(await locators.datesTable.locator('button').count() - calendarDays.length);
            for (let date of calendarDays) {
                let day = new Date(date - SEVENTY_YEARS).getUTCDate();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeEnabled();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeVisible();
            }
            await page.unroute(`**/calendar/**`);

            let previousMonth = new Date();
            previousMonth.setDate(0);
            await emulateCalendarDays(page, previousMonth, 10);
            calendarDaysRequest = page.waitForResponse(request => request.url().includes(`/calendar/${Configuration.cameras[0].accessPointChanged}/${extractMonthInterval(previousMonth)}`));
            await locators.previousMonthSwitcher.click();
            await expect(locators.datesTable).toHaveCount(1);
            calendarDays = await (await calendarDaysRequest).json();
            await expect(locators.datesTable.locator('button.Mui-disabled')).toHaveCount(await locators.datesTable.locator('button').count() - calendarDays.length);
            for (let date of calendarDays) {
                let day = new Date(date - SEVENTY_YEARS).getUTCDate();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeEnabled();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeVisible();
            }
            await page.unroute(`**/calendar/**`);

            await clientNotFall(page);
        });
    });

    test.describe("Timezone - UTC-4 (Atlantic Canada)", () => {
        test.use({ timezoneId: "Canada/Atlantic" });

        test('Requesting calendar, UTC-, Ts=Tc, Daylight Time (CLOUD-T961)', async ({ page }) => {
            const locators = new Locators(page);
            const clientTimeZoneOffset = await page.evaluate(() => (new Date()).getTimezoneOffset());
            const serverTimezone = -clientTimeZoneOffset;
            console.log(-clientTimeZoneOffset, serverTimezone);

            await emulateServerTimezone(page, serverTimezone);
            
            let serverPropertiesRequest = page.waitForResponse(request => request.url().includes(`/hosts/${hostName}`));
            await page.goto(clientURL);
            await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
            let serverProperties = await (await serverPropertiesRequest).json();
            expect(serverProperties.timeZone).toEqual(serverTimezone);

            await page.unroute(`**/hosts/${hostName}*`);

            await expect(locators.cellTitle).toHaveCount(1);
            await locators.singleArchiveMode.click();
            await waitAnimationEnds(page, locators.archiveBlock);
            await expect(locators.cellImage).toBeVisible();
            await expect(locators.lastInterval).toBeVisible();

            await emulateCalendarDays(page, new Date(), 31);
            let calendarDaysRequest = page.waitForResponse(request => request.url().includes(`/calendar/${Configuration.cameras[0].accessPointChanged}/${extractMonthInterval(new Date())}`));
            await locators.archiveBlockDateSelector.click();
            let calendarDays = await (await calendarDaysRequest).json();
            await expect(locators.datesTable.locator('button.Mui-disabled')).toHaveCount(await locators.datesTable.locator('button').count() - calendarDays.length);
            for (let date of calendarDays) {
                let day = new Date(date - SEVENTY_YEARS).getUTCDate();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeEnabled();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeVisible();
            }
            await page.unroute(`**/calendar/**`);

            let previousMonth = new Date();
            previousMonth.setDate(0);
            await emulateCalendarDays(page, previousMonth, 10);
            calendarDaysRequest = page.waitForResponse(request => request.url().includes(`/calendar/${Configuration.cameras[0].accessPointChanged}/${extractMonthInterval(previousMonth)}`));
            await locators.previousMonthSwitcher.click();
            await expect(locators.datesTable).toHaveCount(1);
            calendarDays = await (await calendarDaysRequest).json();
            await expect(locators.datesTable.locator('button.Mui-disabled')).toHaveCount(await locators.datesTable.locator('button').count() - calendarDays.length);
            for (let date of calendarDays) {
                let day = new Date(date - SEVENTY_YEARS).getUTCDate();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeEnabled();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeVisible();
            }
            await page.unroute(`**/calendar/**`);

            await clientNotFall(page);
        });
    });

    test.describe("Timezone - UTC-3 (East Brazil)", () => {
        test.use({ timezoneId: "Brazil/East" });

        test('Requesting calendar, UTC-, Ts=Tc (CLOUD-T962)', async ({ page }) => {
            const locators = new Locators(page);
            const clientTimeZoneOffset = await page.evaluate(() => (new Date()).getTimezoneOffset());
            const serverTimezone = -clientTimeZoneOffset;
            console.log(-clientTimeZoneOffset, serverTimezone);

            await emulateServerTimezone(page, serverTimezone);
            
            let serverPropertiesRequest = page.waitForResponse(request => request.url().includes(`/hosts/${hostName}`));
            await page.goto(clientURL);
            await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
            let serverProperties = await (await serverPropertiesRequest).json();
            expect(serverProperties.timeZone).toEqual(serverTimezone);

            await page.unroute(`**/hosts/${hostName}*`);

            await expect(locators.cellTitle).toHaveCount(1);
            await locators.singleArchiveMode.click();
            await waitAnimationEnds(page, locators.archiveBlock);
            await expect(locators.cellImage).toBeVisible();
            await expect(locators.lastInterval).toBeVisible();

            await emulateCalendarDays(page, new Date(), 31);
            let calendarDaysRequest = page.waitForResponse(request => request.url().includes(`/calendar/${Configuration.cameras[0].accessPointChanged}/${extractMonthInterval(new Date())}`));
            await locators.archiveBlockDateSelector.click();
            let calendarDays = await (await calendarDaysRequest).json();
            await expect(locators.datesTable.locator('button.Mui-disabled')).toHaveCount(await locators.datesTable.locator('button').count() - calendarDays.length);
            for (let date of calendarDays) {
                let day = new Date(date - SEVENTY_YEARS).getUTCDate();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeEnabled();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeVisible();
            }
            await page.unroute(`**/calendar/**`);

            let previousMonth = new Date();
            previousMonth.setDate(0);
            await emulateCalendarDays(page, previousMonth, 10);
            calendarDaysRequest = page.waitForResponse(request => request.url().includes(`/calendar/${Configuration.cameras[0].accessPointChanged}/${extractMonthInterval(previousMonth)}`));
            await locators.previousMonthSwitcher.click();
            await expect(locators.datesTable).toHaveCount(1);
            calendarDays = await (await calendarDaysRequest).json();
            await expect(locators.datesTable.locator('button.Mui-disabled')).toHaveCount(await locators.datesTable.locator('button').count() - calendarDays.length);
            for (let date of calendarDays) {
                let day = new Date(date - SEVENTY_YEARS).getUTCDate();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeEnabled();
                await expect(locators.datesTable.getByRole('gridcell', { name: String(day), exact: true })).toBeVisible();
            }
            await page.unroute(`**/calendar/**`);

            await clientNotFall(page);
        });
    });
});


test.describe("Archive. User permissions check", () => {
    const testUserLogin = "archive_test";
    const testUserPassword = "Archive12345";
    const testRoleName = "Archive_test";

    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector();
        await cameraAnnihilator("all");
        await roleAnnihilator("all");
        await userAnnihilator("all");
        await createCamera(5, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "User test", 0);
        await addVirtualVideo(Configuration.cameras, "lprusa", "tracker");
        await createArchive("Black");
        await createArchiveVolume("Black", 10);
        await createArchiveContext("Black", Configuration.cameras, true, "High");
        await createRole(testRoleName);
        await setRolePermissions(testRoleName);
        await createUser(testUserLogin);
        await assignUserRole(testRoleName, testUserLogin);
        await setUserPassword(testUserLogin, testUserPassword);
        await createLayout(Configuration.cameras, 2, 2, "Base", testRoleName);
    });

    test.beforeEach(async ({ page }) => {
        await setRolePermissions(testRoleName);
    });
    
    test('Presentation of archive mode if access to archive is denied (CLOUD-T966)', async ({ page }) => {
        const locators = new Locators(page);
        const errorMessage = new RegExp(`Endpoint field is required|No records in archive`); //!!!
        await setRolePermissions(testRoleName, { default_archive_access: "ARCHIVE_ACCESS_FORBID" });
        
        await page.goto(clientURL);
        await authorization(page, testUserLogin, testUserPassword);

        await openCameraList(page);
        await locators.cameraListItem.last().click();
        await expect(locators.cellTitle).toHaveCount(1);
        await expect(locators.singleArchiveMode).toBeHidden();
        await expect(locators.multiArchiveMode).toBeHidden();
        
        await locators.firstLayout.click();
        await expect(locators.cellTitle).toHaveCount(4)
        await expect(locators.singleArchiveMode).toBeHidden();
        await expect(locators.multiArchiveMode).toBeVisible();

        await locators.multiArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellInfoContainer).toHaveCount(4);
        for (let videoCell of await locators.videoCell.all()) {
            await expect(videoCell.locator(locators.noSignalBanner)).toHaveText(errorMessage);
            await expect(videoCell.locator(locators.noSignalBanner).locator('svg')).toBeVisible();
        }

        await locators.playButton.click();
        let promiseArray = [
            cellIsPlaying(page, 0, 5, false),
            cellIsPlaying(page, 1, 5, false),
            cellIsPlaying(page, 2, 5, false),
            cellIsPlaying(page, 3, 5, false),
        ];
        await Promise.all(promiseArray);
        await expect(locators.cellInfoContainer).toHaveCount(4);
        for (let videoCell of await locators.videoCell.all()) {
            await expect(videoCell.locator(locators.noSignalBanner)).toHaveText(errorMessage);
            await expect(videoCell.locator(locators.noSignalBanner).locator('svg')).toBeVisible();
        }
        
        await clientNotFall(page);
    });

    test('Presentation of archive mode if access to rights setup is denied (CLOUD-T967)', async ({ page }) => {
        const locators = new Locators(page);
        await setRolePermissions(testRoleName, { user_rights_setup_access: "USER_RIGHTS_SETUP_ACCESS_NO" });
        
        await page.goto(clientURL);
        await authorization(page, testUserLogin, testUserPassword);

        await openCameraList(page);
        await locators.cameraListItem.last().click();
        await expect(locators.cellTitle).toHaveCount(1);
        await expect(locators.liveMode).toBeVisible();
        await expect(locators.singleArchiveMode).toBeVisible();
        await expect(locators.searchMode).toBeVisible();
        
        await locators.firstLayout.click();
        await expect(locators.cellTitle).toHaveCount(4)
        await expect(locators.liveMode).toBeVisible();
        await expect(locators.singleArchiveMode).toBeVisible();
        await expect(locators.multiArchiveMode).toBeVisible();
        await expect(locators.searchMode).toBeVisible();

        await locators.multiArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellImage).toHaveCount(4);
        for (let videoCell of await locators.videoCell.all()) {
            await expect(videoCell.locator(locators.noSignalBanner)).toBeHidden();
        }

        await locators.playButton.click();
        await cellsArePlaying(page, 4, 5);
        for (let videoCell of await locators.videoCell.all()) {
            await expect(videoCell.locator(locators.noSignalBanner)).toBeHidden();
        }
        
        await clientNotFall(page);
    });

    test('Presentation of archive mode if access to archive search is denied (CLOUD-T968)', async ({ page }) => {
        const locators = new Locators(page);
        const userWithoutSearch = { feature_access: alloyAllPermisions.feature_access.filter(permission => permission != "FEATURE_ACCESS_SEARCH") };
        await setRolePermissions(testRoleName, userWithoutSearch);
        
        await page.goto(clientURL);
        await authorization(page, testUserLogin, testUserPassword);
        
        await locators.firstLayout.click();
        await expect(locators.cellTitle).toHaveCount(4)
        await locators.multiArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellImage).toHaveCount(4);
        for (let videoCell of await locators.videoCell.all()) {
            await expect(videoCell.locator(locators.noSignalBanner)).toBeHidden();
        }

        await locators.playButton.click();
        await cellsArePlaying(page, 4, 5);
        for (let videoCell of await locators.videoCell.all()) {
            await expect(videoCell.locator(locators.noSignalBanner)).toBeHidden();
        }
        
        await clientNotFall(page);
    });
});

async function isRecordEnough(page: Page) {
    if (!recordGenerated) {
        await page.waitForTimeout(10000);
        recordGenerated = true;
    }
}
