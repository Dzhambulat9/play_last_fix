import { test, expect, type WebSocket, chromium } from '@playwright/test';
import { clientURL, Configuration, hostName, ROOT_LOGIN, virtualVendor, ROOT_PASSWORD, isCloudTest } from '../global_variables';
import { createArchive, createArchiveVolume, createArchiveContext, deleteArchive } from '../API/archives';
import { createCamera, addVirtualVideo, changeSingleCameraActiveStatus, changeMicrophoneStatus, setPTZPreset, setPanamorphMode } from '../API/cameras';
import { createLayout } from '../API/layouts';
import { getHostName } from '../API/host';
import { cameraAnnihilator, layoutAnnihilator, configurationCollector, userAnnihilator, roleAnnihilator, waitAnimationEnds, authorization, openCameraList, clientNotFall, closeCameraList } from "../utils/utils.js";
import { Locators } from '../locators/locators';
import { videoIsPlaying, timeToISO, camerasArePlaying, videoIsPlayingShort, camerasArePlayingShort, ISOToMilliseconds } from '../utils/archive_helpers';
import { setServerConfig } from '../API/server';
import { isRequestOk } from '../utils/detectors_helpers';
import { checkInitiatedStreams, checkSessionRequestsStopped } from '../utils/live_helpers.js';
let h264Cameras: any[], h265Cameras: any[], mjpegCameras:  any[];
let h264Count = 14;
let h265Count = 4;
let MJPEGCount = 2;
let allTestCameraCount = h264Count + h265Count + MJPEGCount;
let activeStreams: { [key: string]: any, method: string, streamId: string, }[] = [];
let canPlayH265: boolean;
let cellIsPlaying = videoIsPlaying;
let cellsArePlaying = camerasArePlaying;


test.describe("Live mode. Hardware acceleration on", () => {

    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector(); 
        if (Configuration.cameras.length != allTestCameraCount) {
            await cameraAnnihilator("all");
            await layoutAnnihilator("all");
            await roleAnnihilator("all");
            await userAnnihilator("all");
            await deleteArchive('Black');
            await createCamera(h264Count, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "H264_Test", 0);
            await createCamera(h265Count, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "H265_Test", h264Count);
            await createCamera(MJPEGCount, virtualVendor, "Virtual", "admin123", "admin", "0.0.0.0", "80", "", "MJPEG_Test", h264Count + h265Count);
            h264Cameras = Configuration.cameras.slice(0, h264Count);
            h265Cameras = Configuration.cameras.slice(h264Count, h264Count + h265Count);
            mjpegCameras = Configuration.cameras.slice(h264Count + h265Count, h264Count + h265Count + MJPEGCount);
            await addVirtualVideo(h264Cameras, "lprusa", "tracker");
            await addVirtualVideo(h265Cameras, "H265-2K", "H265-640-REAL-CROP");
            await addVirtualVideo(mjpegCameras, "witcher_mjpeg");
            await createArchive("Black");
            await createArchiveVolume("Black", 20);
            await createArchiveContext("Black", Configuration.cameras, true, "High");
        }
        h264Cameras = Configuration.cameras.slice(0, h264Count);
        h265Cameras = Configuration.cameras.slice(h264Count, h264Count + h265Count);
        mjpegCameras = Configuration.cameras.slice(h264Count + h265Count, h264Count + h265Count + MJPEGCount);
    });

    test.beforeEach(async ({ page }) => {
        await layoutAnnihilator("all");

        if (canPlayH265 == undefined) {
            canPlayH265 = await page.evaluate(() => {
                return (MediaSource.isTypeSupported("video/mp4; codecs=hvc1.1.6.L153.b0"));
            });
            console.log(`Browser ${ canPlayH265 ? "can play H265" : "can't play H265" }`);
            if (!canPlayH265) {
                cellIsPlaying = videoIsPlayingShort;
                cellsArePlaying = camerasArePlayingShort;
            }
        }
    });

    test.afterEach(async () => {
        if (Configuration.cameras.length > allTestCameraCount) {
            let deleteArr = Configuration.cameras.filter(item => !item.displayName.includes('_Test'));
            await cameraAnnihilator(deleteArr);
        }
    });
    
    test('H264 playback (CLOUD-T1101) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const testCamera = h264Cameras[5];
        const cameraName = `${testCamera.displayId}.${testCamera.displayName}`;
        const shortAccessPoint = testCamera.accessPoint.replace('hosts/', '').replace('video:0:0', 'video:0');

        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());
        traceActiveStreams(WS);

        await openCameraList(page);
        await locators.search.fill(cameraName);
        await locators.cameraListItem.filter({ hasText: cameraName }).click();
        await expect(locators.cellTitle).toContainText(cameraName);
        await locators.videoCell.locator('video').waitFor({ state: 'attached' });
        await cellIsPlaying(page, 0, 10, true);
        expect(activeStreams.length).toEqual(1);
        expect(activeStreams[0].format).toEqual('mp4');
        expect(activeStreams[0].speed).toEqual(1);
        expect(activeStreams[0].endpoint).toContain(shortAccessPoint);

        await clientNotFall(page);
    });

    test('H265 playback, transcoding: off, hardware acceleration: on (CLOUD-T1103) #smoke', async ({ page }) => {
        test.skip(!canPlayH265, "Browser can't play H265, so test will be skipped");

        const locators = new Locators(page);
        const testCamera = h265Cameras[1];
        const cameraName = `${testCamera.displayId}.${testCamera.displayName}`;
        const shortAccessPoint = testCamera.accessPoint.replace('hosts/', '').replace('video:0:0', 'video:0');

        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());
        traceActiveStreams(WS);

        await openCameraList(page);
        await locators.search.fill(cameraName);
        await locators.cameraListItem.filter({ hasText: cameraName }).click();
        await expect(locators.cellTitle).toContainText(cameraName);
        await locators.videoCell.locator('video').waitFor({ state: 'attached' });
        await cellIsPlaying(page, 0, 10, true);
        expect(activeStreams.length).toEqual(1);
        expect(activeStreams[0].format).toEqual('mp4');
        expect(activeStreams[0].speed).toEqual(1);
        expect(activeStreams[0].endpoint).toContain(shortAccessPoint);

        await clientNotFall(page);
    });

    test('MJPEG playback (CLOUD-T1102)', async ({ page }) => {
        const locators = new Locators(page);
        const testCamera = mjpegCameras[0];
        const cameraName = `${testCamera.displayId}.${testCamera.displayName}`;
        const shortAccessPoint = testCamera.accessPoint.replace('hosts/', '').replace('video:0:0', 'video:0');

        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());
        traceActiveStreams(WS);

        await openCameraList(page);
        await locators.search.fill(cameraName);
        await locators.cameraListItem.filter({ hasText: cameraName }).click();
        await expect(locators.cellTitle).toContainText(cameraName);
        await locators.videoCell.locator('img').waitFor({ state: 'attached' });
        await cellIsPlaying(page, 0, 10, true);
        expect(activeStreams.length).toEqual(1);
        expect(activeStreams[0].format).toEqual('jpeg');
        expect(activeStreams[0].speed).toEqual(1);
        expect(activeStreams[0].endpoint).toContain(shortAccessPoint);

        await clientNotFall(page);
    });

    test('Attempt to switch to full-screen mode on a single camera (CLOUD-T1107)', async ({ page }) => {
        const locators = new Locators(page);
        const testCamera = h264Cameras[3];
        const cameraName = `${testCamera.displayId}.${testCamera.displayName}`;
        const shortAccessPoint = testCamera.accessPoint.replace('hosts/', '').replace('video:0:0', 'video:0');

        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());
        traceActiveStreams(WS);

        await openCameraList(page);
        await locators.search.fill(cameraName);
        await locators.cameraListItem.filter({ hasText: cameraName }).nth(0).click();
        await expect(locators.cellTitle).toContainText(cameraName);
        await locators.videoCell.locator('video').waitFor({ state: 'attached' });
        await cellIsPlaying(page, 0, 5, true);
        let streamID = activeStreams[0].streamId;
        await locators.videoCell.dblclick();
        await expect(locators.gridcell).toHaveCount(1);
        await expect(locators.videoCell.locator('video')).toBeVisible();
        await cellIsPlaying(page, 0, 10, true);
        expect(activeStreams.length).toEqual(1);
        expect(activeStreams[0].format).toEqual('mp4');
        expect(activeStreams[0].speed).toEqual(1);
        expect(activeStreams[0].endpoint).toContain(shortAccessPoint);
        expect(activeStreams[0].streamId).toEqual(streamID);

        await clientNotFall(page);
    });

    test('Switching to full-screen mode on a single camera from layout (CLOUD-T1108) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await createLayout(h264Cameras, 2, 2, "Transition");
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());
        traceActiveStreams(WS);

        await expect(locators.gridcell).toHaveCount(4);
        await expect(locators.videoCell.locator('video')).toHaveCount(4);
        await cellsArePlaying(page, 4, 5);
        let cameraName = await locators.cellTitle.nth(0).innerText();
        await locators.videoCell.nth(0).dblclick();
        await expect(locators.gridcell).toHaveCount(1);
        await expect(locators.cellTitle).toHaveText(cameraName);
        await expect(locators.videoCell.locator('video')).toHaveCount(1);
        await cellIsPlaying(page, 0, 7, true);
        expect(activeStreams.length).toEqual(1);
        expect(activeStreams[0].format).toEqual('mp4');
        expect(activeStreams[0].speed).toEqual(1);

        await locators.videoCell.nth(0).dblclick();
        await expect(locators.gridcell).toHaveCount(4);
        await expect(locators.videoCell.locator('video')).toHaveCount(4);
        await cellsArePlaying(page, 4, 5);
        expect(activeStreams.length).toEqual(4);
        for (let stream of activeStreams) {
            expect(stream.format).toEqual('mp4');
            expect(stream.speed).toEqual(1);
        }

        cameraName = await locators.cellTitle.nth(3).innerText();
        await locators.videoCell.nth(3).dblclick();
        await expect(locators.gridcell).toHaveCount(1);
        await expect(locators.cellTitle).toHaveText(cameraName);
        await expect(locators.videoCell.locator('video')).toHaveCount(1);
        await cellIsPlaying(page, 0, 7, true);
        expect(activeStreams.length).toEqual(1);
        expect(activeStreams[0].format).toEqual('mp4');
        expect(activeStreams[0].speed).toEqual(1);

        await clientNotFall(page);
    });

    test('Switching between live and archive mode (CLOUD-T1110) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await createLayout(h264Cameras, 2, 2, "Transition");
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());
        traceActiveStreams(WS);

        await expect(locators.gridcell).toHaveCount(4);
        await expect(locators.videoCell.locator('video')).toHaveCount(4);
        await cellsArePlaying(page, 4, 5);
        await locators.multiArchiveMode.click();
        await expect(locators.gridcell).toHaveCount(4);
        await expect(locators.videoCell.locator('video')).toHaveCount(0);

        await locators.liveMode.click();
        await expect(locators.gridcell).toHaveCount(4);
        await expect(locators.videoCell.locator('video')).toHaveCount(4);
        await cellsArePlaying(page, 4, 7);
        expect(activeStreams.length).toEqual(4);
        for (let stream of activeStreams) {
            expect(stream.format).toEqual('mp4');
            expect(stream.speed).toEqual(1);
        }

        await clientNotFall(page);
    });

    test('Switching between layouts (CLOUD-T1106) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        let h264ShortList = h264Cameras.slice(0, 12);
        let h265ShortList = h265Cameras.slice(0, 2);
        if (canPlayH265) {
            await createLayout(h264ShortList.concat(h265ShortList, mjpegCameras), 4, 4, 'X16');
            h264ShortList = h264Cameras.slice(0, 6);
            await createLayout(h264ShortList.concat(h265ShortList, mjpegCameras), 3, 3, 'X9');
        } else {
            await createLayout(h264Cameras.concat(mjpegCameras), 4, 4, 'X16');
            h264ShortList = h264Cameras.slice(0, 8);
            await createLayout(h264ShortList.concat(mjpegCameras), 3, 3, 'X9');
        }
        await createLayout(h264ShortList, 2, 2, 'X4');
        await createLayout(h264ShortList, 1, 1, 'X1');

        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());
        traceActiveStreams(WS);

        await expect(locators.layoutItemsList).toHaveCount(4);
        await locators.expandLayoutList.click();
        await waitAnimationEnds(page, locators.layoutItems);
        let cellCount = 4;
        await locators.webpage.getByText(`X${cellCount}`, { exact: true }).click();
        await expect(locators.gridcell).toHaveCount(cellCount);
        await expect(locators.videoCell.locator('video')).toHaveCount(cellCount);
        await cellsArePlaying(page, cellCount, 5);
        console.log(activeStreams);
        expect(activeStreams.length).toEqual(cellCount);
        for (let i = 0; i < cellCount; i++) {
            expect(activeStreams[i].format).toEqual('mp4');
            expect(activeStreams[i].speed).toEqual(1);
        }

        await locators.expandLayoutList.click();
        await waitAnimationEnds(page, locators.layoutItems);
        cellCount = 1;
        await locators.webpage.getByText(`X${cellCount}`, { exact: true }).click();
        await expect(locators.gridcell).toHaveCount(cellCount);
        await expect(locators.videoCell.locator('video')).toHaveCount(cellCount);
        await cellsArePlaying(page, cellCount, 5);
        console.log(activeStreams);
        expect(activeStreams.length).toEqual(cellCount);
        for (let i = 0; i < cellCount; i++) {
            expect(activeStreams[i].format).toEqual('mp4');
            expect(activeStreams[i].speed).toEqual(1);
        }

        await locators.expandLayoutList.click();
        await waitAnimationEnds(page, locators.layoutItems);
        cellCount = 9;
        await locators.webpage.getByText(`X${cellCount}`, { exact: true }).click();
        await expect(locators.gridcell).toHaveCount(cellCount);
        await expect(locators.videoCell.locator('video')).toHaveCount(cellCount - 1);
        await expect(locators.videoCell.locator('img')).toHaveCount(1);
        await cellsArePlaying(page, cellCount, 5);
        console.log(activeStreams);
        expect(activeStreams.length).toEqual(cellCount);
        expect(activeStreams.filter(item => item.format == 'jpeg').length).toEqual(1);
        expect(activeStreams.filter(item => item.speed == 1).length).toEqual(cellCount);

        await locators.expandLayoutList.click();
        await waitAnimationEnds(page, locators.layoutItems);
        cellCount = 16;
        await locators.webpage.getByText(`X${cellCount}`, { exact: true }).click();
        await expect(locators.gridcell).toHaveCount(cellCount);
        await expect(locators.videoCell.locator('video')).toHaveCount(cellCount - 2);
        await expect(locators.videoCell.locator('img')).toHaveCount(2);
        await cellsArePlaying(page, cellCount, 5);
        console.log(activeStreams);
        expect(activeStreams.length).toEqual(cellCount);
        expect(activeStreams.filter(item => item.format == 'jpeg').length).toEqual(2);
        expect(activeStreams.filter(item => item.speed == 1).length).toEqual(cellCount);

        await clientNotFall(page);
    });

    test('Changing the resolution of the MJPEG stream when the cell is enlarged (CLOUD-T1113)', async ({ page }) => {
        const locators = new Locators(page);

        let cameraTestLits = h264Cameras.slice(0, 3);
        cameraTestLits.push(mjpegCameras[0]);
        await createLayout(cameraTestLits, 2, 2, "MJPEG width");
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());
        traceActiveStreams(WS);

        await expect(locators.gridcell).toHaveCount(4);
        await expect(locators.videoCell.locator('video')).toHaveCount(3);
        await expect(locators.videoCell.locator('img')).toHaveCount(1);
        await cellsArePlaying(page, 4, 5);
        const layoutSpace = await locators.layoutField.boundingBox();
        const jpegStream = activeStreams.filter(item => item.format == 'jpeg')[0];
        const startWidth = layoutSpace!.width / 2 < 750 ? 512 : 1024;
        expect(jpegStream.width).toEqual(startWidth);
        const cameraName = await locators.cellTitle.nth(3).innerText();
        await locators.videoCell.nth(3).dblclick();
        await expect(locators.gridcell).toHaveCount(1);
        await expect(locators.cellTitle).toHaveText(cameraName);
        await expect(locators.videoCell.locator('img')).toHaveCount(1);
        await cellIsPlaying(page, 0, 5, true);
        expect(activeStreams.length).toEqual(1);
        expect(activeStreams[0].format).toEqual('jpeg');
        expect(activeStreams[0].width).toEqual(2 * startWidth);

        await clientNotFall(page);
    });

    test('Changing the resolution of the MJPEG stream when the cell width changes (CLOUD-T1140)', async ({ page }) => {
        const locators = new Locators(page);

        await createLayout([mjpegCameras[0]], 1, 1, "MJPEG width");
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());
        traceActiveStreams(WS);

        await expect(locators.videoCell.locator('img')).toHaveCount(1);
        await cellIsPlaying(page, 0, 5, true);
        const cellSpace = await locators.gridcell.boundingBox();
        const jpegStream = activeStreams[0];
        const startWidth = cellSpace!.width < 1500 ? 1024 : 2048;
        expect(jpegStream.width).toEqual(startWidth);
        await openCameraList(page);
        let widthChangeMessage = WS.waitForEvent('framesent');
        let panelSize = await locators.cameraListInnerSpace.boundingBox();
        await locators.cameraPanelDragline.hover();
        await page.mouse.down();
        await page.mouse.move(panelSize!.x + cellSpace!.width / 2, 350);
        await page.mouse.up();
        await widthChangeMessage;
        await cellIsPlaying(page, 0, 5, true);
        expect(activeStreams.length).toEqual(1);
        expect(activeStreams[0].format).toEqual('jpeg');
        expect(activeStreams[0].width).toEqual(startWidth / 2);

        widthChangeMessage = WS.waitForEvent('framesent');
        await closeCameraList(page);
        await widthChangeMessage;
        await cellIsPlaying(page, 0, 5, true);
        expect(activeStreams.length).toEqual(1);
        expect(activeStreams[0].format).toEqual('jpeg');
        expect(activeStreams[0].width).toEqual(startWidth);

        await clientNotFall(page)
    });

    test('Drag working camera to layout (CLOUD-T1142)', async ({ page }) => {
        const locators = new Locators(page);
        const testCameraName = `${h264Cameras[4].displayId}.${h264Cameras[4].displayName}`;

        await createLayout(h264Cameras.slice(0, 4), 2, 2);
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());
        traceActiveStreams(WS);

        await expect(locators.videoElement).toHaveCount(4);
        await openCameraList(page);
        const camera = locators.cameraListItem.getByText(testCameraName, { exact: true });
        const cell = locators.getCellLocator(page, 0);
        await camera.dragTo(cell);
        await expect(locators.cellTitle.nth(0)).toHaveText(testCameraName);
        await expect(locators.gridcell).toHaveCount(4);
        await expect(locators.videoElement).toHaveCount(4);
        await cellsArePlaying(page, 4, 7);
        expect(activeStreams.length).toEqual(4);

        await clientNotFall(page);
    });

    test('Drag disabled camera to layout (CLOUD-T1143)', async ({ page }) => {
        const locators = new Locators(page);

        await createLayout(h264Cameras.slice(0, 4), 2, 2);
        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Disabled", -1);
        const testCamera = Configuration.cameras.filter(item => item.displayName == "Disabled")[0];
        await addVirtualVideo([testCamera], "lprusa", "tracker");
        await changeSingleCameraActiveStatus(testCamera.cameraBinding, false);

        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());
        traceActiveStreams(WS);

        await locators.topMenuButton.click();
        await locators.preferences.click();
        await locators.showOnlyLiveCamerasPreference.uncheck();
        await locators.preferencesAccept.click();

        await expect(locators.videoElement).toHaveCount(4);
        await openCameraList(page);
        await locators.cameraListItem.first().waitFor({ state: 'attached' });
        await locators.cameraListInnerSpace.hover();
        await page.mouse.wheel(0, 1000);
        const camera = locators.cameraListItem.getByText(testCamera.displayName);
        const cell = locators.getCellLocator(page, 3);
        await camera.dragTo(cell);
        await expect(locators.cellTitle.nth(3)).toContainText(testCamera.displayName);
        await expect(locators.videoCell.nth(3).locator(locators.noSignalBanner)).toBeVisible();
        await expect(locators.gridcell).toHaveCount(4);
        await expect(locators.videoElement).toHaveCount(3);
        expect(activeStreams.length).toEqual(3);

        await clientNotFall(page);
    });

    test('Drag already existing camera to layout (CLOUD-T1144)', async ({ page }) => {
        const locators = new Locators(page);
        const testCameraName = `${h264Cameras[0].displayId}.${h264Cameras[0].displayName}`;

        await createLayout(h264Cameras.slice(0, 4), 2, 2);
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());
        traceActiveStreams(WS);

        await expect(locators.videoElement).toHaveCount(4);
        await expect(locators.cellTitle.nth(0)).toHaveText(testCameraName);
        await openCameraList(page);
        const camera = locators.cameraListItem.getByText(testCameraName, { exact: true });
        let cell = locators.getCellLocator(page, 0);
        await camera.dragTo(cell);
        await expect(locators.gridcell).toHaveCount(4);
        await expect(locators.videoElement).toHaveCount(4);
        await cellsArePlaying(page, 4, 7);
        expect(activeStreams.length).toEqual(4);

        cell = locators.getCellLocator(page, 3);
        await camera.dragTo(cell);
        await expect(locators.cellTitle.nth(0)).toHaveText(testCameraName);
        await expect(locators.cellTitle.nth(3)).toHaveText(testCameraName);
        await expect(locators.cellTitle.filter({ hasText: testCameraName })).toHaveCount(2);
        await expect(locators.gridcell).toHaveCount(4);
        await expect(locators.videoElement).toHaveCount(4);
        await cellsArePlaying(page, 4, 7);
        expect(activeStreams.length).toEqual(4);

        await clientNotFall(page);
    });

    test('Playback camera with sound (CLOUD-T1162) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        
        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Sound Camera", -1);
        const testCamera = Configuration.cameras.filter(item => item.displayName == "Sound Camera")[0];
        await addVirtualVideo([testCamera], "witcher_640", "witcher_640");
        await changeMicrophoneStatus(testCamera, true);
        await createLayout([testCamera, h264Cameras[0]], 2, 1);

        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());
        traceActiveStreams(WS);

        await expect(locators.videoElement).toHaveCount(2);
        await expect(locators.videoCellMicro.nth(0)).toBeVisible();
        await expect(locators.videoCellMicro.nth(1)).toBeHidden();
        await expect(locators.videoCellMicro.nth(0).getByTestId('VolumeOffIcon')).toBeVisible();
        let isSoundOn = await locators.videoCell.nth(0).evaluate((item) => {
            const videoCell = item.querySelector('video');
            return !(videoCell!.muted);
        });
        expect(isSoundOn).toBeFalsy();
        await cellsArePlaying(page, 2, 7);
        expect(activeStreams.length).toEqual(2);

        await locators.videoCellMicro.nth(0).click();
        await expect(locators.videoCellMicro.nth(0).getByTestId('VolumeUpIcon')).toBeVisible();
        isSoundOn = await locators.videoCell.nth(0).evaluate((item) => {
            const videoCell = item.querySelector('video');
            return !(videoCell!.muted);
        });
        expect(isSoundOn).toBeTruthy();
        await cellsArePlaying(page, 2, 7);
        expect(activeStreams.length).toEqual(2);

        let soundValue = 0.8;
        let soundBarCoordinates = await locators.videoCellSoundBar.boundingBox();
        await locators.videoCellSoundBar.click({ position: { x: soundBarCoordinates!.width / 2, y: soundBarCoordinates!.height * (1 - soundValue) } });
        await expect(locators.videoCellSoundBar.locator('input')).toHaveAttribute('value', String(soundValue));
        soundValue = 0.2;
        await locators.videoCellSoundBar.click({ position: { x: soundBarCoordinates!.width / 2, y: soundBarCoordinates!.height * (1 - soundValue) } });
        await expect(locators.videoCellSoundBar.locator('input')).toHaveAttribute('value', String(soundValue));
        isSoundOn = await locators.videoCell.nth(0).evaluate((item) => {
            const videoCell = item.querySelector('video');
            return !(videoCell!.muted);
        });
        expect(isSoundOn).toBeTruthy();
        
        await clientNotFall(page);
    });

    test('Picking correct stream when switching camera (CLOUD-T1248)', async ({ page }) => {
        const locators = new Locators(page);
        
        await createCamera(4, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Stream", -1);
        const testCameras = Configuration.cameras.filter(item => item.displayName == "Stream");
        await addVirtualVideo(testCameras, "H265-2K-REAL", "H265-640-REAL-CROP");
        await createLayout(testCameras.slice(0, 3), 3, 1);
        await createLayout(testCameras.slice(0, 2), 2, 1);
        const testCamerasStreamsList = testCameras.map((item) => { 
            return { 0: item.videoStreams[0]?.accessPoint, 1: item.videoStreams[1]?.accessPoint }
        })
        console.log(testCamerasStreamsList);

        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());
        await checkInitiatedStreams(page, WS, [testCamerasStreamsList[0]["0"], testCamerasStreamsList[1]["0"]]);

        await openCameraList(page);
        await locators.search.fill(`${testCameras[3].displayId}.${testCameras[3].displayName}`);
        await expect(locators.cameraListItem).toHaveCount(1);
        let streamCheck = checkInitiatedStreams(page, WS, [testCamerasStreamsList[3]["0"]]);
        await locators.cameraListItem.click();
        await streamCheck;

        await locators.search.fill('');
        streamCheck = checkInitiatedStreams(page, WS, [testCamerasStreamsList[0]["1"], testCamerasStreamsList[1]["1"], testCamerasStreamsList[2]["1"]]);
        await locators.secondLayout.click();
        await streamCheck;
        
        await clientNotFall(page);
    });

    test('Watching fisheye camera in live mode (CLOUD-T1223) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Panomorph", -1);
        const testCamera = Configuration.cameras.filter(item => item.displayName == "Panomorph")[0];
        await addVirtualVideo([testCamera], "lprusa", "tracker");
        await setPanamorphMode(testCamera.videochannelID, true);
        await createLayout([testCamera, h264Cameras[0]], 2, 1);

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.gridcell).toHaveCount(2);
        await expect(locators.videoCell.locator('canvas[data-engine="three.js r155"]')).toBeVisible();
        await cellIsPlaying(page, 0, 7, true);
        await locators.gridcell.first().dblclick();
        await expect(locators.gridcell).toHaveCount(1);
        await expect(locators.videoCell.locator('canvas[data-engine="three.js r155"]')).toBeVisible();
        await cellIsPlaying(page, 0, 7, true);

        await clientNotFall(page);
    });

    test('Authorization token refresh (CLOUD-T1116) #smoke', async ({ page }) => {
        test.skip(isCloudTest, "Test is skipped for cloud");

        const locators = new Locators(page);

        await createLayout(h264Cameras, 2, 2, "Layout");
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        //Меняем время истечения токена в локалсторадже
        await expect(locators.videoCell.locator('video').nth(0)).toBeVisible();
        let currentTime = new Date();
        currentTime.setSeconds(currentTime.getSeconds() + 20);
        const expiresAt = (timeToISO(currentTime)).replace(/\.\d{3}/, '');
        await page.evaluate((expiresAt) => {
            localStorage.expires_at = `"${expiresAt}"`;
        }, expiresAt);

        const refreshRequest = page.waitForRequest(request => request.url().includes('v1/authentication/renew'), { timeout: 12000 });
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.reload();
        const WS = await WSPromise;
        console.log(WS.url());
        traceActiveStreams(WS);
        const refreshMessage = WS.waitForEvent('framesent', { predicate: message => message.payload.includes('update_token'), timeout: 12000 });
        await openCameraList(page);
        await locators.cameraListItem.nth(1).click();
        await expect(locators.gridcell).toHaveCount(1);
        await expect(locators.videoCell.locator('video')).toHaveCount(1);
        await isRequestOk(refreshRequest);
        const messageText = (await refreshMessage).payload;
        await cellIsPlaying(page, 0, 7, true);
        const refreshResponse = await (await refreshRequest).response();
        const responseBody = await refreshResponse?.json();
        console.log(responseBody);
        const expiresDate = await page.evaluate(() => window.localStorage.getItem('expires_at'));
        const authToken = await page.evaluate(() => window.localStorage.getItem('auth_token'));
        expect(expiresDate).toEqual(`"${responseBody.expires_at}"`);
        expect(authToken).toEqual(`"${responseBody.token_value}"`);
        expect(messageText).toContain(responseBody.token_value);

        await locators.firstLayout.click();
        await expect(locators.videoCell.locator('video')).toHaveCount(4);
        await cellsArePlaying(page, 4, 5);
        expect(WS.isClosed()).toBeFalsy();

        await clientNotFall(page);
    });

    test('Authorization token refresh for cloud (CLOUD-T1116X)', async ({ page }) => {
        test.skip(!isCloudTest, "Test is only for cloud environment");
        
        const locators = new Locators(page);
        let tokenExpiresTime: any = undefined;

        await page.route('**/vmsToken*', async route => {

            let response = await route.fetch();
            let responseBody = await response.json();
            console.log('Original response body', responseBody);
            let realTokenExpiresTime = new Date(ISOToMilliseconds(responseBody.expiredAt));

            if (tokenExpiresTime == undefined) {
                tokenExpiresTime = new Date();
                tokenExpiresTime.setSeconds(tokenExpiresTime.getSeconds() + 40);

                if (realTokenExpiresTime < tokenExpiresTime) {
                    tokenExpiresTime = realTokenExpiresTime;
                }
            }
            
            const expiresAt = (timeToISO(tokenExpiresTime)).replace(/\.\d{3}/, '');
            responseBody.expiredAt = expiresAt;
            console.log('Changed response body', responseBody);

            route.fulfill({ body: JSON.stringify(responseBody), contentType: 'application/json; charset=utf-8' });
        });

        await createLayout(h264Cameras, 2, 2, "Layout");
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        console.log(WS.url());
        traceActiveStreams(WS);
        await expect(locators.videoCell.locator('video').nth(0)).toBeVisible();

        const timeDistance = tokenExpiresTime.getTime() - (new Date).getTime();
        const refreshRequest = page.waitForRequest(request => request.url().includes('renew'), { timeout: timeDistance - 8000 });
        const refreshMessage = WS.waitForEvent('framesent', { predicate: message => message.payload.includes('update_token'), timeout: timeDistance - 8000 });
        await openCameraList(page);
        await locators.cameraListItem.nth(1).click();
        await expect(locators.gridcell).toHaveCount(1);
        await expect(locators.videoCell.locator('video')).toHaveCount(1);
        await isRequestOk(refreshRequest);
        const messageText = (await refreshMessage).payload;
        await cellIsPlaying(page, 0, 7, true);
        const refreshResponse = await (await refreshRequest).response();
        const responseBody = await refreshResponse?.json();
        console.log(responseBody);
        const expiresDate = await page.evaluate(() => window.sessionStorage.getItem('expires_at'));
        const authToken = await page.evaluate(() => window.sessionStorage.getItem('auth_token'));
        expect(expiresDate).toEqual(responseBody.expiredAt);
        expect(authToken).toEqual(responseBody.token);
        expect(messageText).toContain(responseBody.token);
        await locators.firstLayout.click();
        await expect(locators.videoCell.locator('video')).toHaveCount(4);
        await cellsArePlaying(page, 4, 5);
        expect(WS.isClosed()).toBeFalsy();

        await clientNotFall(page);
    });

    test('Updating stream after reconnection (CLOUD-T1111) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await createLayout(h264Cameras, 2, 2, "Layout");
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/events?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());
        WS.on('framereceived', frame => { console.log(new Date(), frame.payload) });

        await expect(locators.videoCell.locator('video')).toHaveCount(4);
        await changeSingleCameraActiveStatus(h264Cameras[1].cameraBinding, false);
        await changeSingleCameraActiveStatus(h264Cameras[2].cameraBinding, false);
        await expect(locators.videoCell.nth(0).locator(locators.noSignalBanner)).not.toBeVisible();
        await expect(locators.videoCell.nth(1).locator(locators.noSignalBanner)).toBeVisible();
        await expect(locators.videoCell.nth(2).locator(locators.noSignalBanner)).toBeVisible();
        await expect(locators.videoCell.nth(3).locator(locators.noSignalBanner)).not.toBeVisible();
        await expect(locators.videoCell.nth(1).locator(locators.noSignalBanner)).toHaveText("No signal", { ignoreCase: false });
        await expect(locators.videoCell.nth(2).locator(locators.noSignalBanner)).toHaveText("No signal", { ignoreCase: false });
        await expect(locators.videoCell.nth(1).locator(locators.noSignalBanner).locator('svg')).toBeVisible();
        await expect(locators.videoCell.nth(2).locator(locators.noSignalBanner).locator('svg')).toBeVisible();
        let promiseArray = [
            cellIsPlaying(page, 0, 7, true),
            cellIsPlaying(page, 1, 7, false),
            cellIsPlaying(page, 2, 7, false),
            cellIsPlaying(page, 3, 7, true),
        ];
        await Promise.all(promiseArray);

        await changeSingleCameraActiveStatus(h264Cameras[1].cameraBinding, true);
        await changeSingleCameraActiveStatus(h264Cameras[2].cameraBinding, true);
        await expect(locators.videoCell.nth(0).locator(locators.noSignalBanner)).not.toBeVisible();
        await expect(locators.videoCell.nth(1).locator(locators.noSignalBanner)).not.toBeVisible();
        await expect(locators.videoCell.nth(2).locator(locators.noSignalBanner)).not.toBeVisible();
        await expect(locators.videoCell.nth(3).locator(locators.noSignalBanner)).not.toBeVisible();
        await cellsArePlaying(page, 4, 5);

        await clientNotFall(page);
    });

});

test.describe("Live mode. GreenStream", () => {
    const viewportSize = { width: 1920, height: 1080 };
    test.use({ viewport: viewportSize });

    let testCameras = Configuration.cameras;
    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector();
        testCameras = Configuration.cameras.filter(item => item.displayName.includes('GreenStream'));
        if (testCameras.length == 0) {
            await createCamera(4, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "GreenStream", -1);
            testCameras = Configuration.cameras.filter(item => item.displayName.includes('GreenStream'));
            await addVirtualVideo(testCameras.slice(0, 1), "witcher_1920x800_H264", "witcher_640");
            await addVirtualVideo(testCameras.slice(1, ), "witcher_1920x800_H264", "witcher_704x576_H264");
        }
    });

    test.beforeEach(async () => {
        await layoutAnnihilator("all");
    });

    test('Switching the stream when the cell width changes (CLOUD-T1304) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const testCamerasStreamsList = testCameras.map((item) => { 
            return { 0: item.videoStreams[0]?.accessPoint, 1: item.videoStreams[1]?.accessPoint }
        });
        console.log(testCamerasStreamsList);
        const highStreamCommon = "1920\u2a2f800";
        const lowStreamCommon = "704\u2a2f576";
        const lowStreamFirstCamera = "640\u2a2f640";

        await createLayout(testCameras, 2, 2, "GreenStream", '', { 2: "HIGH", 3: "LOW" });
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());
        traceActiveStreams(WS);

        await page.evaluate(() => localStorage.cameraList = 250);
        await expect(locators.videoCell).toHaveCount(4);
        await expect(locators.cellStreamMenu.nth(0)).toContainText("Auto");
        await expect(locators.cellStreamMenu.nth(1)).toContainText("Auto");
        await expect(locators.cellStreamMenu.nth(2)).toContainText("High");
        await expect(locators.cellStreamMenu.nth(3)).toContainText("Low");

        let cellTargetSize = 730;
        await openCameraList(page);
        let streamCheck = checkInitiatedStreams(page, WS, [testCamerasStreamsList[1]["1"]]);
        await locators.cameraPanelDragline.hover();
        await page.mouse.down();
        await page.mouse.move(viewportSize.width - cellTargetSize * 2 - 40, 350);
        await page.mouse.up();
        await streamCheck;
        console.log("Cell size:", await locators.videoCell.first().boundingBox());
        await expect(locators.cellStreamMenu.nth(0)).toContainText(highStreamCommon);
        await expect(locators.cellStreamMenu.nth(1)).toContainText(lowStreamCommon);
        await expect(locators.cellStreamMenu.nth(2)).toContainText(highStreamCommon);
        await expect(locators.cellStreamMenu.nth(3)).toContainText(lowStreamCommon);
        console.log(activeStreams);
        expect(activeStreams.length).toEqual(4);
        await cellsArePlaying(page, 4, 5);

        cellTargetSize = 660;
        streamCheck = checkInitiatedStreams(page, WS, [testCamerasStreamsList[0]["1"]]);
        await locators.cameraPanelDragline.hover();
        await page.mouse.down();
        await page.mouse.move(viewportSize.width - cellTargetSize * 2 - 40, 350);
        await page.mouse.up();
        await streamCheck;
        console.log("Cell size:", await locators.videoCell.first().boundingBox());
        await expect(locators.cellStreamMenu.nth(0)).toContainText(lowStreamFirstCamera);
        await expect(locators.cellStreamMenu.nth(1)).toContainText(lowStreamCommon);
        await expect(locators.cellStreamMenu.nth(2)).toContainText(highStreamCommon);
        await expect(locators.cellStreamMenu.nth(3)).toContainText(lowStreamCommon);
        console.log(activeStreams);
        expect(activeStreams.length).toEqual(4);
        await cellsArePlaying(page, 4, 5);

        streamCheck = checkInitiatedStreams(page, WS, [testCamerasStreamsList[0]["0"], testCamerasStreamsList[1]["0"]]);
        await closeCameraList(page);
        await streamCheck;
        console.log("Cell size:", await locators.videoCell.first().boundingBox());
        await expect(locators.cellStreamMenu.nth(0)).toContainText(highStreamCommon);
        await expect(locators.cellStreamMenu.nth(1)).toContainText(highStreamCommon);
        await expect(locators.cellStreamMenu.nth(2)).toContainText(highStreamCommon);
        await expect(locators.cellStreamMenu.nth(3)).toContainText(lowStreamCommon);
        console.log(activeStreams);
        expect(activeStreams.length).toEqual(4);
        await cellsArePlaying(page, 4, 5);

        await clientNotFall(page);
    });

    test('Switching the stream (CLOUD-T1303) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const testCamerasStreamsList = testCameras.map((item) => { 
            return { 0: item.videoStreams[0]?.accessPoint, 1: item.videoStreams[1]?.accessPoint }
        });
        console.log(testCamerasStreamsList);
        const highStreamCommon = "1920\u2a2f800";
        const lowStreamFirstCamera = "640\u2a2f640";

        await createLayout(testCameras, 2, 2, "GreenStream");
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());
        traceActiveStreams(WS);

        await expect(locators.videoCell).toHaveCount(4);
        await expect(locators.cellStreamMenu.nth(0)).toContainText("Auto");
        await expect(locators.cellStreamMenu.nth(1)).toContainText("Auto");
        await expect(locators.cellStreamMenu.nth(2)).toContainText("Auto");
        await expect(locators.cellStreamMenu.nth(3)).toContainText("Auto");

        let streamCheck = checkInitiatedStreams(page, WS, []);
        await locators.cellStreamMenu.nth(0).click();
        await locators.highStream.click();
        await locators.externalBackground.waitFor({state: 'detached'});
        await streamCheck;
        await expect(locators.cellStreamMenu.nth(0)).toContainText(highStreamCommon);
        await expect(locators.cellStreamMenu.nth(1)).toContainText(highStreamCommon);
        await expect(locators.cellStreamMenu.nth(2)).toContainText(highStreamCommon);
        await expect(locators.cellStreamMenu.nth(3)).toContainText(highStreamCommon);
        await cellsArePlaying(page, 4, 5);

        streamCheck = checkInitiatedStreams(page, WS, []);
        await locators.cellStreamMenu.nth(0).click();
        await locators.autoStream.click();
        await locators.externalBackground.waitFor({state: 'detached'});
        await streamCheck;
        await expect(locators.cellStreamMenu.nth(0)).toContainText(highStreamCommon);
        await expect(locators.cellStreamMenu.nth(1)).toContainText(highStreamCommon);
        await expect(locators.cellStreamMenu.nth(2)).toContainText(highStreamCommon);
        await expect(locators.cellStreamMenu.nth(3)).toContainText(highStreamCommon);
        await cellsArePlaying(page, 4, 5);

        streamCheck = checkInitiatedStreams(page, WS, [testCamerasStreamsList[0]["1"]]);
        await locators.cellStreamMenu.nth(0).click();
        await locators.lowStream.click();
        await locators.externalBackground.waitFor({state: 'detached'});
        await streamCheck;
        await expect(locators.cellStreamMenu.nth(0)).toContainText(lowStreamFirstCamera);
        await expect(locators.cellStreamMenu.nth(1)).toContainText(highStreamCommon);
        await expect(locators.cellStreamMenu.nth(2)).toContainText(highStreamCommon);
        await expect(locators.cellStreamMenu.nth(3)).toContainText(highStreamCommon);
        await cellsArePlaying(page, 4, 5);

        streamCheck = checkInitiatedStreams(page, WS, [testCamerasStreamsList[0]["0"]]);
        await locators.cellStreamMenu.nth(0).click();
        await locators.autoStream.click();
        await locators.externalBackground.waitFor({state: 'detached'});
        await streamCheck;
        await expect(locators.cellStreamMenu.nth(0)).toContainText(highStreamCommon);
        await expect(locators.cellStreamMenu.nth(1)).toContainText(highStreamCommon);
        await expect(locators.cellStreamMenu.nth(2)).toContainText(highStreamCommon);
        await expect(locators.cellStreamMenu.nth(3)).toContainText(highStreamCommon);
        await cellsArePlaying(page, 4, 5);

        await clientNotFall(page);
    });
});

test.describe("Live mode. Hardware acceleration off", () => {

    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector();
        await layoutAnnihilator("all");
        await setServerConfig([{ id: "recode_video_stream", value_bool: false }]);
        h265Cameras = Configuration.cameras.filter(item => item.displayName == 'H265');
        if (h265Cameras.length == 0) {
            await createCamera(h265Count, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "H265", -1);
            h265Cameras = Configuration.cameras.filter(item => item.displayName == 'H265');
            await addVirtualVideo(h265Cameras, "H265-2K", "H265-640-REAL-CROP");
        }
    });

    test('H265 playback, transcoding: off, hardware acceleration: off (CLOUD-T1104)', async () => {
        const browser = await chromium.launch({
            args: ['--disable-accelerated-video-decode'],
        });
        const context = await browser.newContext();
        const page = await context.newPage();

        canPlayH265 = await page.evaluate(() => {
            return (MediaSource.isTypeSupported("video/mp4; codecs=hvc1.1.6.L153.b0"));
        });
        console.log(`Browser ${ canPlayH265 ? "can play H265" : "can't play H265" }`);

        const locators = new Locators(page);
        const testCamera = h265Cameras[0];
        const cameraName = `${testCamera.displayId}.${testCamera.displayName}`;

        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());
        traceActiveStreams(WS);

        await openCameraList(page);
        await locators.search.fill(cameraName);
        await locators.cameraListItem.filter({ hasText: cameraName }).nth(0).click();
        await expect(locators.cellTitle).toContainText(cameraName);
        await locators.videoCell.locator('img').waitFor({ state: 'attached' });
        await expect(locators.videoCell).toHaveClass(/VideoCell--loading/);
        await cellIsPlaying(page, 0, 10, false);

        await clientNotFall(page);
        await context.close();
    });

    test('H265 playback, transcoding: on, hardware acceleration: off (CLOUD-T1105) #smoke', async () => {
        await setServerConfig([{ id: "recode_video_stream", value_bool: true }]);
        const browser = await chromium.launch({
            args: ['--disable-accelerated-video-decode'],
        });
        const context = await browser.newContext();
        const page = await context.newPage();

        canPlayH265 = await page.evaluate(() => {
            return (MediaSource.isTypeSupported("video/mp4; codecs=hvc1.1.6.L153.b0"));
        });
        console.log(`Browser ${ canPlayH265 ? "can play H265" : "can't play H265" }`);

        const locators = new Locators(page);
        const testCamera = h265Cameras[0];
        const cameraName = `${testCamera.displayId}.${testCamera.displayName}`;
        const shortAccessPoint = testCamera.accessPoint.replace('hosts/', '').replace('video:0:0', 'video:0');

        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());
        traceActiveStreams(WS);

        await openCameraList(page);
        await locators.search.fill(cameraName);
        await locators.cameraListItem.filter({ hasText: cameraName }).nth(0).click();
        await expect(locators.cellTitle).toContainText(cameraName);
        await locators.videoCell.locator('img').waitFor({ state: 'attached' });
        await cellIsPlaying(page, 0, 10, true);
        expect(activeStreams.length).toEqual(1);
        expect(activeStreams[0].format).toEqual('jpeg');
        expect(activeStreams[0].speed).toEqual(1);
        expect(activeStreams[0].endpoint).toContain(shortAccessPoint);

        await clientNotFall(page);
        await context.close();
    });

});

test.describe("Live mode. Telemetry test", () => {
    let PTZCameras: any[], nonPTZCameras: any[];

    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector(); 
        await cameraAnnihilator("all");
        await layoutAnnihilator("all");
        await createCamera(4, virtualVendor, "TestDevice", "admin123", "admin", "0.0.0.0", "80", "", "PTZ", -1);
        await createCamera(4, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "No Telemetry", -1);
        console.log(Configuration.cameras);
        PTZCameras = Configuration.cameras.filter((item) => item.ptzs != false);
        nonPTZCameras = Configuration.cameras.filter((item) => item.ptzs == false);
        await addVirtualVideo(PTZCameras, "faceoffice");
        await addVirtualVideo(nonPTZCameras, "lprusa", "tracker");
        await createArchive("Black");
        await createArchiveVolume("Black", 10);
        await createArchiveContext("Black", Configuration.cameras, true, "High");
    });

    test.beforeEach(async () => {
        await layoutAnnihilator("all");
    });
    
    test('Keep alive of telemetry session (CLOUD-T1131)', async ({ page }) => {
        const locators = new Locators(page);
        const firstPTZcamera = PTZCameras[0];
        const secondPTZcamera = PTZCameras[1];

        await createLayout([firstPTZcamera, secondPTZcamera, nonPTZCameras[0], nonPTZCameras[1]], 2, 2);

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.gridcell).toHaveCount(4);
        await locators.gridcell.nth(0).click();
        let keepAliveRequest = page.waitForRequest(request => request.url().includes(`/session/keepalive/${hostName}/DeviceIpint.${firstPTZcamera.displayId}/TelemetryControl.0`));
        await locators.telemetryPanelButton.click();
        await expect(locators.telemetryPanel).toBeVisible();
        await isRequestOk(keepAliveRequest);
        await isRequestOk(page.waitForRequest(request => request.url().includes(`/session/keepalive/${hostName}/DeviceIpint.${firstPTZcamera.displayId}/TelemetryControl.0`), { timeout: 10000 }));

        keepAliveRequest = page.waitForRequest(request => request.url().includes(`/session/keepalive/${hostName}/DeviceIpint.${secondPTZcamera.displayId}/TelemetryControl.0`));
        let oldSessionIsClosed = checkSessionRequestsStopped(page, firstPTZcamera.displayId);
        await locators.gridcell.nth(1).click();
        await expect(locators.telemetryPanel).toBeVisible();
        await isRequestOk(keepAliveRequest);
        await oldSessionIsClosed;
        await isRequestOk(page.waitForRequest(request => request.url().includes(`/session/keepalive/${hostName}/DeviceIpint.${secondPTZcamera.displayId}/TelemetryControl.0`), { timeout: 10000 }));

        await locators.telemetryPanelButton.click();
        await expect(locators.telemetryPanel).toBeHidden();
        await checkSessionRequestsStopped(page);

        await clientNotFall(page);
    });

    test('Transition into layout with different PTZ-camera (CLOUD-T1132)', async ({ page }) => {
        const locators = new Locators(page);
        const firstPTZcamera = PTZCameras[0];
        const secondPTZcamera = PTZCameras[1];

        await createLayout([firstPTZcamera, nonPTZCameras[0]], 2, 1);
        await createLayout([secondPTZcamera, nonPTZCameras[1]], 2, 1);

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.gridcell).toHaveCount(2);
        await locators.gridcell.nth(0).click();
        await locators.telemetryPanelButton.click();
        await expect(locators.telemetryPanel).toBeVisible();

        await locators.secondLayout.click();
        await expect(locators.telemetryPanel).toBeHidden();
        await checkSessionRequestsStopped(page);
        await locators.gridcell.nth(0).click();
        await expect(locators.telemetryPanel).toBeHidden();
        await locators.telemetryPanelButton.click();
        await expect(locators.telemetryPanel).toBeVisible();

        await clientNotFall(page);
    });

    test('Transition into layout with the same PTZ-camera (CLOUD-T1133)', async ({ page }) => {
        const locators = new Locators(page);
        const PTZcamera = PTZCameras[0];

        await createLayout([nonPTZCameras[1], PTZcamera], 2, 1); 
        await createLayout([PTZcamera, nonPTZCameras[0]], 2, 1);

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.gridcell).toHaveCount(2);
        await locators.gridcell.nth(0).click();
        await locators.telemetryPanelButton.click();
        await expect(locators.telemetryPanel).toBeVisible();

        await locators.secondLayout.click();
        await expect(locators.telemetryPanel).toBeVisible();
        await isRequestOk(page.waitForRequest(request => request.url().includes(`/session/keepalive/${hostName}/DeviceIpint.${PTZcamera.displayId}/TelemetryControl.0`), { timeout: 10000 }));
        await locators.telemetryPanelButton.click();
        await expect(locators.telemetryPanel).toBeHidden();
        await checkSessionRequestsStopped(page);

        await clientNotFall(page);
    });

    test('Presentation PTZ-panel in different modes (CLOUD-T1136)', async ({ page }) => {
        const locators = new Locators(page);
        const PTZcamera = PTZCameras[0];

        await createLayout([PTZcamera, nonPTZCameras[0]], 2, 1);

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.gridcell).toHaveCount(2);
        await locators.gridcell.nth(0).click();
        await locators.telemetryPanelButton.click();
        await expect(locators.telemetryPanel).toBeVisible();

        await locators.singleArchiveMode.click();
        await expect(locators.archiveBlock).toBeVisible();
        await expect(locators.telemetryPanel).toBeHidden();
        await expect(locators.telemetryPanelButton).toBeHidden();

        await locators.liveMode.click();
        await locators.gridcell.nth(0).click();
        await locators.telemetryPanelButton.click();
        await expect(locators.telemetryPanel).toBeVisible();

        await locators.searchMode.click();
        await expect(locators.archiveBlock).toBeVisible();
        await expect(locators.telemetryPanel).toBeHidden();
        await expect(locators.telemetryPanelButton).toBeHidden();

        await clientNotFall(page);
    });

    test('Manual telemetry operating (CLOUD-T1241) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const PTZcamera = PTZCameras[0];
        const getSessionRequestURL = `/control/telemetry/session/acquire/${hostName}/DeviceIpint.${PTZcamera.displayId}/TelemetryControl.0`;
        const moveRequestURL = `/control/telemetry/move/${hostName}/DeviceIpint.${PTZcamera.displayId}/TelemetryControl.0`;

        await createLayout([PTZcamera, nonPTZCameras[0]], 2, 1);

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.gridcell).toHaveCount(2);
        await locators.gridcell.nth(0).click();
        let getSession = page.waitForResponse(request => request.url().includes(getSessionRequestURL));
        await locators.telemetryPanelButton.click();
        await expect(locators.telemetryPanel).toBeVisible();
        const sessionID = (await (await getSession).json())?.session_id;

        //Нажимаем на джойстике влево и проверяем запросы на поворот и остановку поворота
        let moveParams = `mode=continuous&pan=-0.5&tilt=0&session_id=${sessionID}`;
        const stopParams = `mode=continuous&pan=0&tilt=0&session_id=${sessionID}`;
        let moveRequest = page.waitForRequest(request => request.url().includes(moveRequestURL) && request.url().includes(moveParams));
        let stopRequest = page.waitForRequest(request => request.url().includes(moveRequestURL) && request.url().includes(stopParams));
        await locators.telemetryPanelLeftButton.click();
        await isRequestOk(moveRequest);
        await isRequestOk(stopRequest);

        //Меняем скорость и нажимаем на джойстике вверх
        await locators.telemetrySliderMark.nth(2).click();
        moveParams = `mode=continuous&pan=0&tilt=0.2&session_id=${sessionID}`;
        moveRequest = page.waitForRequest(request => request.url().includes(moveRequestURL) && request.url().includes(moveParams));
        stopRequest = page.waitForRequest(request => request.url().includes(moveRequestURL) && request.url().includes(stopParams));
        await locators.telemetryPanelTopButton.click();
        await isRequestOk(moveRequest);
        await isRequestOk(stopRequest);

        await locators.telemetrySliderMark.nth(8).click();
        moveParams = `mode=continuous&pan=0&tilt=-0.8&session_id=${sessionID}`;
        moveRequest = page.waitForRequest(request => request.url().includes(moveRequestURL) && request.url().includes(moveParams));
        stopRequest = page.waitForRequest(request => request.url().includes(moveRequestURL) && request.url().includes(stopParams));
        await locators.telemetryPanelBottomButton.click();
        await isRequestOk(moveRequest);
        await isRequestOk(stopRequest);

        await locators.telemetrySliderMark.nth(0).click();
        moveParams = `mode=continuous&pan=0.1&tilt=0&session_id=${sessionID}`;
        moveRequest = page.waitForRequest(request => request.url().includes(moveRequestURL) && request.url().includes(moveParams));
        stopRequest = page.waitForRequest(request => request.url().includes(moveRequestURL) && request.url().includes(stopParams));
        await locators.telemetryPanelRightButton.click();
        await isRequestOk(moveRequest);
        await isRequestOk(stopRequest);

        await locators.telemetrySliderMark.nth(10).click();
        moveParams = `mode=continuous&pan=1&tilt=1&session_id=${sessionID}`;
        moveRequest = page.waitForRequest(request => request.url().includes(moveRequestURL) && request.url().includes(moveParams));
        stopRequest = page.waitForRequest(request => request.url().includes(moveRequestURL) && request.url().includes(stopParams));
        await locators.telemetryPanelTopRightButton.click();
        await isRequestOk(moveRequest);
        await isRequestOk(stopRequest);

        await locators.telemetrySliderMark.nth(5).click();
        moveParams = `mode=continuous&pan=-0.5&tilt=-0.5&session_id=${sessionID}`;
        moveRequest = page.waitForRequest(request => request.url().includes(moveRequestURL) && request.url().includes(moveParams));
        stopRequest = page.waitForRequest(request => request.url().includes(moveRequestURL) && request.url().includes(stopParams));
        await locators.telemetryPanelBottomLeftButton.click();
        await isRequestOk(moveRequest);
        await isRequestOk(stopRequest);

        moveParams = `mode=continuous&pan=-0.5&tilt=0.5&session_id=${sessionID}`;
        moveRequest = page.waitForRequest(request => request.url().includes(moveRequestURL) && request.url().includes(moveParams));
        stopRequest = page.waitForRequest(request => request.url().includes(moveRequestURL) && request.url().includes(stopParams));
        await locators.telemetryPanelTopLeftButton.click();
        await isRequestOk(moveRequest);
        await isRequestOk(stopRequest);

        moveParams = `mode=continuous&pan=0.5&tilt=-0.5&session_id=${sessionID}`;
        moveRequest = page.waitForRequest(request => request.url().includes(moveRequestURL) && request.url().includes(moveParams));
        stopRequest = page.waitForRequest(request => request.url().includes(moveRequestURL) && request.url().includes(stopParams));
        await locators.telemetryPanelBottomRightButton.click();
        await isRequestOk(moveRequest);
        await isRequestOk(stopRequest);

        await clientNotFall(page);
    });

    test('Telemetry operating by presets (CLOUD-T1286) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const PTZcamera = PTZCameras[0];
        const getSessionRequestURL = `/control/telemetry/session/acquire/${hostName}/DeviceIpint.${PTZcamera.displayId}/TelemetryControl.0`;
        const moveRequestURL = `/control/telemetry/preset/go/${hostName}/DeviceIpint.${PTZcamera.displayId}/TelemetryControl.0`;
        const presets = {
            0: "Preset 1",
            1: "Preset 2",
            2: "Preset 3",
        };

        await createLayout([PTZcamera, nonPTZCameras[0]], 2, 1);
        await setPTZPreset(PTZcamera.ptzs[0].accessPoint, 0, presets[0]);
        await setPTZPreset(PTZcamera.ptzs[0].accessPoint, 1, presets[1]);
        await setPTZPreset(PTZcamera.ptzs[0].accessPoint, 2, presets[2]);

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.gridcell).toHaveCount(2);
        await locators.gridcell.nth(0).click();
        let getSession = page.waitForResponse(request => request.url().includes(getSessionRequestURL));
        await locators.telemetryPanelButton.click();
        await expect(locators.telemetryPanel).toBeVisible();
        await expect(locators.telemetryPreset).toHaveCount(3);
        const sessionID = (await (await getSession).json())?.session_id;

        //Переходим по пресетам
        for (let i = 0; i < 3; i++) {
            await expect(locators.telemetryPreset.nth(i)).toHaveText(`${i}. ${presets[i]}`);
            let moveParams = `pos=${i}&session_id=${sessionID}`;
            let moveRequest = page.waitForRequest(request => request.url().includes(moveRequestURL) && request.url().includes(moveParams));
            await locators.telemetryPreset.nth(i).click();
            await isRequestOk(moveRequest);
        }

        await clientNotFall(page);
    });

    test('Zoom camera by telemetry (CLOUD-T1287)', async ({ page }) => {
        const locators = new Locators(page);
        const PTZcamera = PTZCameras[0];
        const getSessionRequestURL = `/control/telemetry/session/acquire/${hostName}/DeviceIpint.${PTZcamera.displayId}/TelemetryControl.0`;
        const moveRequestURL = `/control/telemetry/zoom/${hostName}/DeviceIpint.${PTZcamera.displayId}/TelemetryControl.0`;

        await createLayout([PTZcamera, nonPTZCameras[0]], 2, 1);

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.gridcell).toHaveCount(2);
        await locators.gridcell.nth(0).click();
        let getSession = page.waitForResponse(request => request.url().includes(getSessionRequestURL));
        await locators.telemetryPanelButton.click();
        await expect(locators.telemetryPanel).toBeVisible();
        const sessionID = (await (await getSession).json())?.session_id;

        let moveParams = `mode=continuous&value=0.5&session_id=${sessionID}`;
        const stopParams = `mode=continuous&value=0&session_id=${sessionID}`;
        let moveRequest = page.waitForRequest(request => request.url().includes(moveRequestURL) && request.url().includes(moveParams));
        let stopRequest = page.waitForRequest(request => request.url().includes(moveRequestURL) && request.url().includes(stopParams));
        await locators.telemetryZoomIn.click();
        await isRequestOk(moveRequest);
        await isRequestOk(stopRequest);

        moveParams = `mode=continuous&value=-0.5&session_id=${sessionID}`;
        moveRequest = page.waitForRequest(request => request.url().includes(moveRequestURL) && request.url().includes(moveParams));
        stopRequest = page.waitForRequest(request => request.url().includes(moveRequestURL) && request.url().includes(stopParams));
        await locators.telemetryZoomOut.click();
        await isRequestOk(moveRequest);
        await isRequestOk(stopRequest);


        await locators.telemetrySliderMark.nth(0).click();
        moveParams = `mode=continuous&value=-0.1&session_id=${sessionID}`;
        moveRequest = page.waitForRequest(request => request.url().includes(moveRequestURL) && request.url().includes(moveParams));
        stopRequest = page.waitForRequest(request => request.url().includes(moveRequestURL) && request.url().includes(stopParams));
        await locators.telemetryZoomOut.click();
        await isRequestOk(moveRequest);
        await isRequestOk(stopRequest);

        await locators.telemetrySliderMark.nth(10).click();
        moveParams = `mode=continuous&value=1&session_id=${sessionID}`;
        moveRequest = page.waitForRequest(request => request.url().includes(moveRequestURL) && request.url().includes(moveParams));
        stopRequest = page.waitForRequest(request => request.url().includes(moveRequestURL) && request.url().includes(stopParams));
        await locators.telemetryZoomIn.click();
        await isRequestOk(moveRequest);
        await isRequestOk(stopRequest);

        await clientNotFall(page);
    });

});


export function traceActiveStreams(ws: WebSocket) {
    activeStreams = [];

    ws.on('framesent', async data => {
        console.log(data.payload)
        if (!data.payload.includes('update_token')) {
            let messageData = JSON.parse(data.payload.toString())
            activeStreams.unshift(messageData);
            if (messageData.method.includes('stop')) {
                activeStreams = activeStreams.filter(element => !(element.streamId.includes(messageData.streamId)));
            }
            // console.log(activeStreams);                
        }
    })
}
