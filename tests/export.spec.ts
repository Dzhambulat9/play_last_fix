import { test, expect, Page } from '@playwright/test';
import { clientURL, Configuration, virtualVendor, ROOT_LOGIN, ROOT_PASSWORD } from '../global_variables';
import { createArchive, createArchiveVolume, createArchiveContext, deleteArchive, getArchiveIntervals } from '../API/archives';
import { createCamera, addVirtualVideo, changeMicrophoneStatus } from '../API/cameras';
import { Locators } from '../locators/locators';
import { getHostName } from '../API/host';
import { waitForStableState, cameraAnnihilator, layoutAnnihilator, configurationCollector, userAnnihilator, roleAnnihilator, authorization, openCameraList, clientNotFall, closeCameraList, waitAnimationEnds, compareTwoNumbers, timeToSeconds, getTimeStringsFromDateObject } from "../utils/utils.js";
import { isTimeEquals, setCellTime, transformISOtime, scrollArchive } from '../utils/archive_helpers';
import { getFileSize } from '../utils/fs.mjs';
import { createLayout } from '../API/layouts.js';
let h264Camera: { [key: string]: any, cameraBinding: string, videochannelID: string, accessPoint: string, accessPointChanged: string };
let h264CameraSound: { [key: string]: any, cameraBinding: string, videochannelID: string, accessPoint: string, accessPointChanged: string };
let h265Camera: { [key: string]: any, cameraBinding: string, videochannelID: string, accessPoint: string, accessPointChanged: string };
let mjpegCamera: { [key: string]: any, cameraBinding: string, videochannelID: string, accessPoint: string, accessPointChanged: string };

test.describe("Export. Common block", () => {

    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector();
        await cameraAnnihilator("all");
        await layoutAnnihilator("all");
        await roleAnnihilator("all");
        await userAnnihilator("all");
        await deleteArchive('Black');
        await createCamera(4, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Export", 0);
        h264Camera = Configuration.cameras[0];
        h264CameraSound = Configuration.cameras[1];
        h265Camera = Configuration.cameras[2];
        mjpegCamera = Configuration.cameras[3];
        await addVirtualVideo([h264Camera], "tracker", "tracker");
        await addVirtualVideo([h264CameraSound], "witcher_640", "witcher_640");
        await addVirtualVideo([h265Camera], "H265-2K", "H265-2K");
        await addVirtualVideo([mjpegCamera], "witcher_mjpeg", "witcher_mjpeg");
        await changeMicrophoneStatus(h264CameraSound, true);
        await createArchive("Black");
        await createArchiveVolume("Black", 20);
        await createArchiveContext("Black", Configuration.cameras, true, "High");
    });
    
    test.beforeEach(async ({ page }) => {
        const firstCameraIntervals = transformISOtime(await getArchiveIntervals("Black", h264Camera, "past", "future"));
        const lastIntervalLength = firstCameraIntervals[0]?.end.minutes - firstCameraIntervals[0]?.begin.minutes;
        console.log(lastIntervalLength);
        if (lastIntervalLength == 0 || isNaN(lastIntervalLength)) {
            await page.waitForTimeout(60000);
        } 
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
    });

    test('Video export - AVI (H264) (CLOUD-T168) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const currentCamera = h264Camera;
        const cameraIntervals = transformISOtime(await getArchiveIntervals("Black", currentCamera, "past", "future"));
        const lastIntervalEndTime = cameraIntervals[0].end;

        await openCameraList(page);
        await locators.cameraListItem.nth(0).click();
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.singleArchiveMode.click();
        await closeCameraList(page);
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await page.waitForTimeout(3000);

        await scrollArchive(page, 6);
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes - 1, lastIntervalEndTime.seconds);
        await locators.intervalStartButton.click();
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes, lastIntervalEndTime.seconds);
        await locators.intervalEndButton.click();
        await dragArchiveScaleIfNeed(page);

        page.on("response", async response => {
            if (response.url().includes(`status`)) {
                let progress = (await response.json()).progress * 100;
                console.log("Export progress:", progress);
                await expect(locators.exportProgress).toHaveText(`${Math.floor(progress)}%`);
            }
        });

        await locators.scaleExportMenuButton.click();
        await expect(locators.formatPicker).toHaveText('mkv');
        await locators.formatPicker.click();
        await locators.optionAVI.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.formatPicker).toHaveText('avi');
        await locators.localExportButton.click();
        await expect(locators.exportName).toContainText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.exportFile.waitFor({ state: 'attached', timeout: 60000 });
        const download = page.waitForEvent('download', { timeout: 3000 });
        await locators.exportFile.click();
        const file = await download;
        expect(await file.failure()).toBeNull();
        expect(file.suggestedFilename()).toContain('.avi');
        await clientNotFall(page);
    });

    test('Video export - MP4 (H264) (CLOUD-T171) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const currentCamera = h264Camera;
        const cameraIntervals = transformISOtime(await getArchiveIntervals("Black", currentCamera, "past", "future"));
        const lastIntervalEndTime = cameraIntervals[0].end;

        await openCameraList(page);
        await locators.cameraListItem.nth(0).click();
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.singleArchiveMode.click();
        await closeCameraList(page);
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await page.waitForTimeout(3000);

        await scrollArchive(page, 6);
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes - 1, lastIntervalEndTime.seconds);
        await locators.intervalStartButton.click();
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes, lastIntervalEndTime.seconds);
        await locators.intervalEndButton.click();
        await dragArchiveScaleIfNeed(page);

        page.on("response", async response => {
            if (response.url().includes(`status`)) {
                let progress = (await response.json()).progress * 100;
                console.log("Export progress:", progress);
                await expect(locators.exportProgress).toHaveText(`${Math.floor(progress)}%`);
            }
        });

        await locators.scaleExportMenuButton.click();
        await expect(locators.formatPicker).toHaveText('mkv');
        await locators.formatPicker.click();
        await locators.optionMP4.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.formatPicker).toHaveText('mp4');
        await locators.localExportButton.click();
        await expect(locators.exportName).toContainText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.exportFile.waitFor({ state: 'attached', timeout: 60000 });
        const download = page.waitForEvent('download', { timeout: 3000 });
        await locators.exportFile.click();
        const file = await download;
        expect(await file.failure()).toBeNull();
        expect(file.suggestedFilename()).toContain('.mp4');
        await clientNotFall(page);
    });

    test('Video export - EXE (H264) (CLOUD-T170) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const currentCamera = h264Camera;
        const cameraIntervals = transformISOtime(await getArchiveIntervals("Black", currentCamera, "past", "future"));
        const lastIntervalEndTime = cameraIntervals[0].end;

        await openCameraList(page);
        await locators.cameraListItem.nth(0).click();
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.singleArchiveMode.click();
        await closeCameraList(page);
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await page.waitForTimeout(3000);

        await scrollArchive(page, 6);
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes - 1, lastIntervalEndTime.seconds);
        await locators.intervalStartButton.click();
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes, lastIntervalEndTime.seconds);
        await locators.intervalEndButton.click();
        await dragArchiveScaleIfNeed(page);

        page.on("response", async response => {
            if (response.url().includes(`status`)) {
                let progress = (await response.json()).progress * 100;
                console.log("Export progress:", progress);
                await expect(locators.exportProgress).toHaveText(`${Math.floor(progress)}%`);
            }
        });

        await locators.scaleExportMenuButton.click();
        await expect(locators.formatPicker).toHaveText('mkv');
        await locators.formatPicker.click();
        await locators.optionEXE.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.formatPicker).toHaveText('exe');
        await locators.localExportButton.click();
        await expect(locators.exportName).toContainText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.exportFile.waitFor({ state: 'attached', timeout: 60000 });
        let download = page.waitForEvent('download', { timeout: 3000 });
        await locators.exportFile.click();
        const file = await download;
        expect(await file.failure()).toBeNull();
        expect(file.suggestedFilename()).toContain('.exe');
        await clientNotFall(page);
    });

    test('Video export - MKV (H264) (CLOUD-T169) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const currentCamera = h264Camera;
        const cameraIntervals = transformISOtime(await getArchiveIntervals("Black", currentCamera, "past", "future"));
        const lastIntervalEndTime = cameraIntervals[0].end;

        await openCameraList(page);
        await locators.cameraListItem.nth(0).click();
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.singleArchiveMode.click();
        await closeCameraList(page);
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await page.waitForTimeout(3000);

        await scrollArchive(page, 6);
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes - 1, lastIntervalEndTime.seconds);
        await locators.intervalStartButton.click();
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes, lastIntervalEndTime.seconds);
        await locators.intervalEndButton.click();
        await dragArchiveScaleIfNeed(page);

        page.on("response", async response => {
            if (response.url().includes(`status`)) {
                let progress = (await response.json()).progress * 100;
                console.log("Export progress:", progress);
                await expect(locators.exportProgress).toHaveText(`${Math.floor(progress)}%`);
            }
        });

        await locators.scaleExportMenuButton.click();
        await expect(locators.formatPicker).toHaveText('mkv');
        await locators.localExportButton.click();
        await expect(locators.exportName).toContainText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.exportFile.waitFor({ state: 'attached', timeout: 60000 });
        let download = page.waitForEvent('download', { timeout: 3000 });
        await locators.exportFile.click();
        const file = await download;
        expect(await file.failure()).toBeNull();
        expect(file.suggestedFilename()).toContain('.mkv');
        await clientNotFall(page);
    });

    test('Video export - AVI (H264 Sound) (CLOUD-T172)', async ({ page }) => {
        const locators = new Locators(page);
        const currentCamera = h264CameraSound;
        const cameraIntervals = transformISOtime(await getArchiveIntervals("Black", currentCamera, "past", "future"));
        const lastIntervalEndTime = cameraIntervals[0].end;

        await openCameraList(page);
        await locators.cameraListItem.nth(1).click();
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.singleArchiveMode.click();
        await closeCameraList(page);
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await page.waitForTimeout(3000);

        await scrollArchive(page, 6);
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes - 1, lastIntervalEndTime.seconds);
        await locators.intervalStartButton.click();
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes, lastIntervalEndTime.seconds);
        await locators.intervalEndButton.click();
        await dragArchiveScaleIfNeed(page);

        page.on("response", async response => {
            if (response.url().includes(`status`)) {
                let progress = (await response.json()).progress * 100;
                console.log("Export progress:", progress);
                await expect(locators.exportProgress).toHaveText(`${Math.floor(progress)}%`);
            }
        });

        await locators.scaleExportMenuButton.click();
        await expect(locators.formatPicker).toHaveText('mkv');
        await locators.formatPicker.click();
        await locators.optionAVI.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.formatPicker).toHaveText('avi');
        await locators.localExportButton.click();
        await expect(locators.exportName).toContainText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.exportFile.waitFor({ state: 'attached', timeout: 60000 });
        const download = page.waitForEvent('download', { timeout: 3000 });
        await locators.exportFile.click();
        const file = await download;
        expect(await file.failure()).toBeNull();
        expect(file.suggestedFilename()).toContain('.avi');
        await clientNotFall(page);
    });

    test('Video export - MP4 (H264 Sound) (CLOUD-T175)', async ({ page }) => {
        const locators = new Locators(page);
        const currentCamera = h264CameraSound;
        const cameraIntervals = transformISOtime(await getArchiveIntervals("Black", currentCamera, "past", "future"));
        const lastIntervalEndTime = cameraIntervals[0].end;

        await openCameraList(page);
        await locators.cameraListItem.nth(1).click();
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.singleArchiveMode.click();
        await closeCameraList(page);
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await page.waitForTimeout(3000);

        await scrollArchive(page, 6);
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes - 1, lastIntervalEndTime.seconds);
        await locators.intervalStartButton.click();
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes, lastIntervalEndTime.seconds);
        await locators.intervalEndButton.click();
        await dragArchiveScaleIfNeed(page);

        page.on("response", async response => {
            if (response.url().includes(`status`)) {
                let progress = (await response.json()).progress * 100;
                console.log("Export progress:", progress);
                await expect(locators.exportProgress).toHaveText(`${Math.floor(progress)}%`);
            }
        });

        await locators.scaleExportMenuButton.click();
        await expect(locators.formatPicker).toHaveText('mkv');
        await locators.formatPicker.click();
        await locators.optionMP4.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.formatPicker).toHaveText('mp4');
        await locators.localExportButton.click();
        await expect(locators.exportName).toContainText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.exportFile.waitFor({ state: 'attached', timeout: 60000 });
        const download = page.waitForEvent('download', { timeout: 3000 });
        await locators.exportFile.click();
        const file = await download;
        expect(await file.failure()).toBeNull();
        expect(file.suggestedFilename()).toContain('.mp4');
        await clientNotFall(page);
    });

    test('Video export - EXE (H264 Sound) (CLOUD-T174)', async ({ page }) => {
        const locators = new Locators(page);
        const currentCamera = h264CameraSound;
        const cameraIntervals = transformISOtime(await getArchiveIntervals("Black", currentCamera, "past", "future"));
        const lastIntervalEndTime = cameraIntervals[0].end;

        await openCameraList(page);
        await locators.cameraListItem.nth(1).click();
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.singleArchiveMode.click();
        await closeCameraList(page);
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await page.waitForTimeout(3000);

        await scrollArchive(page, 6);
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes - 1, lastIntervalEndTime.seconds);
        await locators.intervalStartButton.click();
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes, lastIntervalEndTime.seconds);
        await locators.intervalEndButton.click();
        await dragArchiveScaleIfNeed(page);

        page.on("response", async response => {
            if (response.url().includes(`status`)) {
                let progress = (await response.json()).progress * 100;
                console.log("Export progress:", progress);
                await expect(locators.exportProgress).toHaveText(`${Math.floor(progress)}%`);
            }
        });

        await locators.scaleExportMenuButton.click();
        await expect(locators.formatPicker).toHaveText('mkv');
        await locators.formatPicker.click();
        await locators.optionEXE.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.formatPicker).toHaveText('exe');
        await locators.localExportButton.click();
        await expect(locators.exportName).toContainText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.exportFile.waitFor({ state: 'attached', timeout: 60000 });
        let download = page.waitForEvent('download', { timeout: 3000 });
        await locators.exportFile.click();
        const file = await download;
        expect(await file.failure()).toBeNull();
        expect(file.suggestedFilename()).toContain('.exe');
        await clientNotFall(page);
    });

    test('Video export - MKV (H264 Sound) (CLOUD-T173)', async ({ page }) => {
        const locators = new Locators(page);
        const currentCamera = h264CameraSound;
        const cameraIntervals = transformISOtime(await getArchiveIntervals("Black", currentCamera, "past", "future"));
        const lastIntervalEndTime = cameraIntervals[0].end;

        await openCameraList(page);
        await locators.cameraListItem.nth(1).click();
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.singleArchiveMode.click();
        await closeCameraList(page);
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await page.waitForTimeout(3000);

        await scrollArchive(page, 6);
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes - 1, lastIntervalEndTime.seconds);
        await locators.intervalStartButton.click();
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes, lastIntervalEndTime.seconds);
        await locators.intervalEndButton.click();
        await dragArchiveScaleIfNeed(page);

        page.on("response", async response => {
            if (response.url().includes(`status`)) {
                let progress = (await response.json()).progress * 100;
                console.log("Export progress:", progress);
                await expect(locators.exportProgress).toHaveText(`${Math.floor(progress)}%`);
            }
        });

        await locators.scaleExportMenuButton.click();
        await expect(locators.formatPicker).toHaveText('mkv');
        await locators.localExportButton.click();
        await expect(locators.exportName).toContainText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.exportFile.waitFor({ state: 'attached', timeout: 60000 });
        let download = page.waitForEvent('download', { timeout: 3000 });
        await locators.exportFile.click();
        const file = await download;
        expect(await file.failure()).toBeNull();
        expect(file.suggestedFilename()).toContain('.mkv');
        await clientNotFall(page);
    });

    test('Video export - AVI (H265) (CLOUD-T176)', async ({ page }) => {
        const locators = new Locators(page);
        const currentCamera = h265Camera;
        const cameraIntervals = transformISOtime(await getArchiveIntervals("Black", currentCamera, "past", "future"));
        const lastIntervalEndTime = cameraIntervals[0].end;

        await openCameraList(page);
        await locators.cameraListItem.nth(2).click();
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.singleArchiveMode.click();
        await closeCameraList(page);
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await page.waitForTimeout(3000);

        await scrollArchive(page, 6);
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes, lastIntervalEndTime.seconds - 20);
        await locators.intervalStartButton.click();
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes, lastIntervalEndTime.seconds);
        await locators.intervalEndButton.click();
        await dragArchiveScaleIfNeed(page);

        page.on("response", async response => {
            if (response.url().includes(`status`)) {
                let progress = (await response.json()).progress * 100;
                console.log("Export progress:", progress);
                await expect(locators.exportProgress).toHaveText(`${Math.floor(progress)}%`);
            }
        });

        await locators.scaleExportMenuButton.click();
        await expect(locators.formatPicker).toHaveText('mkv');
        await locators.formatPicker.click();
        await locators.optionAVI.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.formatPicker).toHaveText('avi');
        await locators.localExportButton.click();
        await expect(locators.exportName).toContainText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.exportFile.waitFor({ state: 'attached', timeout: 60000 });
        const download = page.waitForEvent('download', { timeout: 3000 });
        await locators.exportFile.click();
        const file = await download;
        expect(await file.failure()).toBeNull();
        expect(file.suggestedFilename()).toContain('.avi');
        await clientNotFall(page);
    });

    test('Video export - MP4 (H265) (CLOUD-T179)', async ({ page }) => {
        const locators = new Locators(page);
        const currentCamera = h265Camera;
        const cameraIntervals = transformISOtime(await getArchiveIntervals("Black", currentCamera, "past", "future"));
        const lastIntervalEndTime = cameraIntervals[0].end;

        await openCameraList(page);
        await locators.cameraListItem.nth(2).click();
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.singleArchiveMode.click();
        await closeCameraList(page);
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await page.waitForTimeout(3000);

        await scrollArchive(page, 6);
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes - 1, lastIntervalEndTime.seconds);
        await locators.intervalStartButton.click();
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes, lastIntervalEndTime.seconds);
        await locators.intervalEndButton.click();
        await dragArchiveScaleIfNeed(page);

        page.on("response", async response => {
            if (response.url().includes(`status`)) {
                let progress = (await response.json()).progress * 100;
                console.log("Export progress:", progress);
                await expect(locators.exportProgress).toHaveText(`${Math.floor(progress)}%`);
            }
        });

        await locators.scaleExportMenuButton.click();
        await expect(locators.formatPicker).toHaveText('mkv');
        await locators.formatPicker.click();
        await locators.optionMP4.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.formatPicker).toHaveText('mp4');
        await locators.localExportButton.click();
        await expect(locators.exportName).toContainText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.exportFile.waitFor({ state: 'attached', timeout: 60000 });
        const download = page.waitForEvent('download', { timeout: 3000 });
        await locators.exportFile.click();
        const file = await download;
        expect(await file.failure()).toBeNull();
        expect(file.suggestedFilename()).toContain('.mp4');
        await clientNotFall(page);
    });

    test('Video export - EXE (H265) (CLOUD-T178)', async ({ page }) => {
        const locators = new Locators(page);
        const currentCamera = h265Camera;
        const cameraIntervals = transformISOtime(await getArchiveIntervals("Black", currentCamera, "past", "future"));
        const lastIntervalEndTime = cameraIntervals[0].end;

        await openCameraList(page);
        await locators.cameraListItem.nth(2).click();
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.singleArchiveMode.click();
        await closeCameraList(page);
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await page.waitForTimeout(3000);

        await scrollArchive(page, 6);
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes - 1, lastIntervalEndTime.seconds);
        await locators.intervalStartButton.click();
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes, lastIntervalEndTime.seconds);
        await locators.intervalEndButton.click();
        await dragArchiveScaleIfNeed(page);

        page.on("response", async response => {
            if (response.url().includes(`status`)) {
                let progress = (await response.json()).progress * 100;
                console.log("Export progress:", progress);
                await expect(locators.exportProgress).toHaveText(`${Math.floor(progress)}%`);
            }
        });

        await locators.scaleExportMenuButton.click();
        await expect(locators.formatPicker).toHaveText('mkv');
        await locators.formatPicker.click();
        await locators.optionEXE.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.formatPicker).toHaveText('exe');
        await locators.localExportButton.click();
        await expect(locators.exportName).toContainText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.exportFile.waitFor({ state: 'attached', timeout: 60000 });
        let download = page.waitForEvent('download', { timeout: 3000 });
        await locators.exportFile.click();
        const file = await download;
        expect(await file.failure()).toBeNull();
        expect(file.suggestedFilename()).toContain('.exe');
        await clientNotFall(page);
    });

    test('Video export - MKV (H265) (CLOUD-T177)', async ({ page }) => {
        const locators = new Locators(page);
        const currentCamera = h265Camera;
        const cameraIntervals = transformISOtime(await getArchiveIntervals("Black", currentCamera, "past", "future"));
        const lastIntervalEndTime = cameraIntervals[0].end;

        await openCameraList(page);
        await locators.cameraListItem.nth(2).click();
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.singleArchiveMode.click();
        await closeCameraList(page);
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await page.waitForTimeout(3000);

        await scrollArchive(page, 6);
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes - 1, lastIntervalEndTime.seconds);
        await locators.intervalStartButton.click();
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes, lastIntervalEndTime.seconds);
        await locators.intervalEndButton.click();
        await dragArchiveScaleIfNeed(page);

        page.on("response", async response => {
            if (response.url().includes(`status`)) {
                let progress = (await response.json()).progress * 100;
                console.log("Export progress:", progress);
                await expect(locators.exportProgress).toHaveText(`${Math.floor(progress)}%`);
            }
        });

        await locators.scaleExportMenuButton.click();
        await expect(locators.formatPicker).toHaveText('mkv');
        await locators.localExportButton.click();
        await expect(locators.exportName).toContainText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.exportFile.waitFor({ state: 'attached', timeout: 60000 });
        let download = page.waitForEvent('download', { timeout: 3000 });
        await locators.exportFile.click();
        const file = await download;
        expect(await file.failure()).toBeNull();
        expect(file.suggestedFilename()).toContain('.mkv');
        await clientNotFall(page);
    });

    test('Video export with different compression rate (CLOUD-T1002)', async ({ page }) => {
        const locators = new Locators(page);
        const currentCamera = h264Camera;
        const cameraIntervals = transformISOtime(await getArchiveIntervals("Black", currentCamera, "past", "future"));
        const lastIntervalEndTime = cameraIntervals[0].end;

        await openCameraList(page);
        await locators.cameraListItem.nth(0).click();
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.singleArchiveMode.click();
        await closeCameraList(page);
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await page.waitForTimeout(3000);

        await scrollArchive(page, 6);
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes - 1, lastIntervalEndTime.seconds);
        await locators.intervalStartButton.click();
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes, lastIntervalEndTime.seconds);
        await locators.intervalEndButton.click();
        await dragArchiveScaleIfNeed(page);

        page.on("response", async response => {
            if (response.url().includes(`status`)) {
                let progress = (await response.json()).progress * 100;
                console.log("Export progress:", progress);
                await expect(locators.exportProgress).toHaveText(`${Math.floor(progress)}%`);
            }
        });

        await locators.scaleExportMenuButton.click();
        await expect(locators.formatPicker).toHaveText('mkv');
        await locators.formatPicker.click();
        await locators.optionMP4.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.formatPicker).toHaveText('mp4');
        await locators.compressionPicker.click();
        await locators.optionLow.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.compressionPicker).toHaveText('Low level');
        let exportRequest = page.waitForRequest(request => request.url().includes("export/archive"));
        await locators.localExportButton.click();
        let exportRequestBody = JSON.parse((await exportRequest).postData()!);
        console.log(exportRequestBody);
        expect(exportRequestBody.format).toContain("mp4");
        expect(exportRequestBody.vc).toEqual(4);
        await expect(locators.exportName).toContainText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.exportFile.waitFor({ state: 'attached', timeout: 60000 });
        let download = page.waitForEvent('download', { timeout: 3000 });
        await locators.exportFile.click();
        const highFile = await download;
        expect(await highFile.failure()).toBeNull();
        expect(highFile.suggestedFilename()).toContain('.mp4');
        const highFileSize = getFileSize(await highFile.path());
        console.log(`First file size: ${highFileSize} Bytes`);

        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes - 1, lastIntervalEndTime.seconds);
        await locators.intervalStartButton.click();
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes, lastIntervalEndTime.seconds);
        await locators.intervalEndButton.click();
        await dragArchiveScaleIfNeed(page);
        await locators.scaleExportMenuButton.click();
        await expect(locators.formatPicker).toHaveText('mkv');
        await locators.formatPicker.click();
        await locators.optionMP4.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.formatPicker).toHaveText('mp4');
        await locators.compressionPicker.click();
        await locators.optionMedium.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.compressionPicker).toHaveText('Medium level');
        exportRequest = page.waitForRequest(request => request.url().includes("export/archive"));
        await locators.localExportButton.click();
        exportRequestBody = JSON.parse((await exportRequest).postData()!);
        console.log(exportRequestBody);
        expect(exportRequestBody.format).toContain("mp4");
        expect(exportRequestBody.vc).toEqual(5);
        await expect(locators.exportName).toContainText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.exportFile.waitFor({ state: 'attached', timeout: 60000 });
        download = page.waitForEvent('download', { timeout: 3000 });
        await locators.exportFile.click();
        const mediumFile = await download;
        expect(await mediumFile.failure()).toBeNull();
        expect(mediumFile.suggestedFilename()).toContain('.mp4');
        const mediumFileSize = getFileSize(await mediumFile.path());
        console.log(`Second file size: ${mediumFileSize} Bytes`);

        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes - 1, lastIntervalEndTime.seconds);
        await locators.intervalStartButton.click();
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes, lastIntervalEndTime.seconds);
        await locators.intervalEndButton.click();
        await dragArchiveScaleIfNeed(page);
        await locators.scaleExportMenuButton.click();
        await expect(locators.formatPicker).toHaveText('mkv');
        await locators.formatPicker.click();
        await locators.optionMP4.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.formatPicker).toHaveText('mp4');
        await locators.compressionPicker.click();
        await locators.optionHigh.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.compressionPicker).toHaveText('High level');
        exportRequest = page.waitForRequest(request => request.url().includes("export/archive"));
        await locators.localExportButton.click();
        exportRequestBody = JSON.parse((await exportRequest).postData()!);
        console.log(exportRequestBody);
        expect(exportRequestBody.format).toContain("mp4");
        expect(exportRequestBody.vc).toEqual(6);
        await expect(locators.exportName).toContainText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.exportFile.waitFor({ state: 'attached', timeout: 60000 });
        download = page.waitForEvent('download', { timeout: 3000 });
        await locators.exportFile.click();
        const lowFile = await download;
        expect(await lowFile.failure()).toBeNull();
        expect(lowFile.suggestedFilename()).toContain('.mp4');
        const lowFileSize = getFileSize(await lowFile.path());
        console.log(`Third file size: ${lowFileSize} Bytes`);
        expect(highFileSize > mediumFileSize && mediumFileSize > lowFileSize).toBeTruthy();
        await clientNotFall(page);
    });

    test('Video export with comment (CLOUD-T1003)', async ({ page }) => {
        const locators = new Locators(page);
        const currentCamera = h264Camera;
        const cameraIntervals = transformISOtime(await getArchiveIntervals("Black", currentCamera, "past", "future"));
        const lastIntervalEndTime = cameraIntervals[0].end;

        await openCameraList(page);
        await locators.cameraListItem.nth(0).click();
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.singleArchiveMode.click();
        await closeCameraList(page);
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await page.waitForTimeout(3000);

        await scrollArchive(page, 6);
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes - 1, lastIntervalEndTime.seconds);
        await locators.intervalStartButton.click();
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes, lastIntervalEndTime.seconds);
        await locators.intervalEndButton.click();
        await dragArchiveScaleIfNeed(page);

        page.on("response", async response => {
            if (response.url().includes(`status`)) {
                let progress = (await response.json()).progress * 100;
                console.log("Export progress:", progress);
                await expect(locators.exportProgress).toHaveText(`${Math.floor(progress)}%`);
            }
        });

        await locators.scaleExportMenuButton.click();
        await expect(locators.formatPicker).toHaveText('mkv');
        await locators.commentField.fill('Export comment');
        let exportRequest = page.waitForRequest(request => request.url().includes("export/archive"));
        await locators.localExportButton.click();
        let exportRequestBody = JSON.parse((await exportRequest).postData()!);
        console.log(exportRequestBody);
        expect(exportRequestBody.comment).toContain("Export comment");
        expect(exportRequestBody.format).toContain("mkv");
        await expect(locators.exportName).toContainText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.exportFile.waitFor({ state: 'attached', timeout: 60000 });
        let download = page.waitForEvent('download', { timeout: 3000 });
        await locators.exportFile.click();
        const highFile = await download;
        expect(await highFile.failure()).toBeNull();
        expect(highFile.suggestedFilename()).toContain('.mkv');
        const highFileSize = getFileSize(await highFile.path());
        console.log(`First file size: ${highFileSize} Bytes`);

        await locators.intervalEndButton.click();
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes - 1, lastIntervalEndTime.seconds);
        await locators.intervalStartButton.click();
        await dragArchiveScaleIfNeed(page);
        await locators.scaleExportMenuButton.click();
        await expect(locators.formatPicker).toHaveText('mkv');
        exportRequest = page.waitForRequest(request => request.url().includes("export/archive"));
        await locators.localExportButton.click();
        exportRequestBody = JSON.parse((await exportRequest).postData()!);
        console.log(exportRequestBody);
        expect(exportRequestBody.comment).toContain("");
        expect(exportRequestBody.format).toContain("mkv");
        await expect(locators.exportName).toContainText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.exportFile.waitFor({ state: 'attached', timeout: 60000 });
        download = page.waitForEvent('download', { timeout: 3000 });
        await locators.exportFile.click();
        const lowFile = await download;
        expect(await lowFile.failure()).toBeNull();
        expect(lowFile.suggestedFilename()).toContain('.mkv');
        const lowFileSize = getFileSize(await lowFile.path());
        console.log(`Second file size: ${lowFileSize} Bytes`);
        expect(highFileSize > lowFileSize).toBeTruthy();
        await clientNotFall(page);
    });

    test('Set export interval manually (CLOUD-T163)', async ({ page }) => {
        const locators = new Locators(page);
        const today = new Date();
        const currentDay = today.getDate() < 10 ? '0' + String(today.getDate()) : String(today.getDate());
        const currentMonth = today.getMonth() + 1 < 10 ? '0' + String(today.getMonth() + 1) : String(today.getMonth() + 1);
        const currentYear = today.getFullYear();
        const currentDate = `${currentDay}.${currentMonth}.${currentYear}`;
        const currentCamera = h264Camera;
        const cameraIntervals = transformISOtime(await getArchiveIntervals("Black", currentCamera, "past", "future"));
        const lastIntervalEndTime = cameraIntervals[0].end;

        await openCameraList(page);
        await locators.cameraListItem.nth(0).click();
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        //Переходим в режим поиска и выставляем там интервал в 5 минут (задание одинакового времени создает эту разницу)
        await locators.searchMode.click();
        await closeCameraList(page);
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await page.waitForTimeout(3000);
        await locators.intervalStartInput.fill(`${lastIntervalEndTime.hours}:${lastIntervalEndTime.minutes}:${lastIntervalEndTime.seconds} ${currentDate}`);
        await locators.intervalEndInput.fill(`${lastIntervalEndTime.hours}:${lastIntervalEndTime.minutes}:${lastIntervalEndTime.seconds} ${currentDate}`);
        await expect(locators.lastInterval).toHaveAttribute("y", /^\d+\.?\d*/);

        //Измеряем расстояние между двумя тридцатисекундными интервалами, чтобы переместить поинтер на это значение
        const step1 = await locators.archiveTimestamps.nth(1).boundingBox();
        const step2 = await locators.archiveTimestamps.nth(2).boundingBox();
        const stepRange = Math.floor(step2!.y - step1!.y);
        console.log(`Range between two 30s steps is ${stepRange}px`);
        //Определяем начало экспорта
        const intervalSize = await locators.lastInterval.boundingBox();
        console.log("Interval size: ", intervalSize);
        await locators.lastInterval.click({ position: { x: intervalSize!.width / 2, y: intervalSize!.height / 2 } });
        await locators.intervalStartButton.click();
        //Определяем конец экспорта, который ниже на 30 секунд
        await locators.lastInterval.click({ position: { x: intervalSize!.width / 2, y: (intervalSize!.height / 2) + stepRange } });
        await waitForStableState(locators.archivePointerTab);
        let pointerPositionCurrent = await locators.archivePointerTab.boundingBox();
        console.log("Pointer position: ", pointerPositionCurrent);
        await locators.intervalEndButton.click();
        //Проверяем, что после клика на кнопку определения конца интервала поинтер не сместился
        let pointerPositionPrevious = pointerPositionCurrent;
        pointerPositionCurrent = await locators.archivePointerTab.boundingBox();
        console.log("Pointer position: ", pointerPositionCurrent);
        expect(Math.floor(pointerPositionCurrent!.y)).toEqual(Math.floor(pointerPositionPrevious!.y));
        //Проверяем отображаемую длину экспорта
        let exportLength = await locators.exportLengthBlock.innerHTML();
        isTimeEquals('00:00:30', exportLength, 2);
        let exportInterval = await locators.exportInterval.boundingBox();
        console.log("Export interval size: ", exportInterval);

        //Перетаскиваем поинтер к середине выделенного интервала экспорта и переопределяем конец интервала
        await locators.archivePointerTab.hover({ position: { x: pointerPositionCurrent!.width / 2, y: pointerPositionCurrent!.height / 2 } });
        await page.mouse.down();
        await page.mouse.move(pointerPositionCurrent!.x + pointerPositionCurrent!.width / 2, exportInterval!.y + exportInterval!.height / 2);
        await page.mouse.up();
        await waitForStableState(locators.archivePointerTab);
        pointerPositionCurrent = await locators.archivePointerTab.boundingBox();
        console.log("Pointer position: ", pointerPositionCurrent);
        await locators.intervalEndButton.click();
        pointerPositionPrevious = pointerPositionCurrent;
        pointerPositionCurrent = await locators.archivePointerTab.boundingBox();
        console.log("Pointer position: ", pointerPositionCurrent);
        expect(Math.floor(pointerPositionCurrent!.y)).toEqual(Math.floor(pointerPositionPrevious!.y));
        exportLength = await locators.exportLengthBlock.innerHTML();
        isTimeEquals('00:00:15', exportLength, 2);
        exportInterval = await locators.exportInterval.boundingBox();
        console.log("Export interval size: ", exportInterval);

        //Перетаскиваем поинтер раньше начала выделенного интервала экспорта и переопределяем его
        await locators.archivePointerTab.hover({ position: { x: pointerPositionCurrent!.width / 2, y: pointerPositionCurrent!.height / 2 } });
        await page.mouse.down();
        await page.mouse.move(pointerPositionCurrent!.x + pointerPositionCurrent!.width / 2, exportInterval!.y - stepRange / 2);
        await page.mouse.up();
        await waitForStableState(locators.archivePointerTab);
        pointerPositionCurrent = await locators.archivePointerTab.boundingBox();
        console.log("Pointer position: ", pointerPositionCurrent);
        await locators.intervalStartButton.click();
        pointerPositionPrevious = pointerPositionCurrent;
        pointerPositionCurrent = await locators.archivePointerTab.boundingBox();
        console.log("Pointer position: ", pointerPositionCurrent);
        expect(Math.floor(pointerPositionCurrent!.y)).toEqual(Math.floor(pointerPositionPrevious!.y));
        exportLength = await locators.exportLengthBlock.innerHTML();
        isTimeEquals('00:00:30', exportLength, 2);
        exportInterval = await locators.exportInterval.boundingBox();
        console.log("Export interval size: ", exportInterval);

        //Кликом перемещаем поинтер позже конца выделенного интервала и переопределяем его
        await locators.lastInterval.click({ position: { x: intervalSize!.width / 2, y: (intervalSize!.height / 2) + stepRange } });
        await waitForStableState(locators.archivePointerTab);
        pointerPositionCurrent = await locators.archivePointerTab.boundingBox();
        console.log("Pointer position: ", pointerPositionCurrent);
        await locators.intervalEndButton.click();
        pointerPositionPrevious = pointerPositionCurrent;
        pointerPositionCurrent = await locators.archivePointerTab.boundingBox();
        console.log("Pointer position: ", pointerPositionCurrent);
        expect(Math.floor(pointerPositionCurrent!.y)).toEqual(Math.floor(pointerPositionPrevious!.y));
        exportLength = await locators.exportLengthBlock.innerHTML();
        isTimeEquals('00:00:45', exportLength, 2);
        exportInterval = await locators.exportInterval.boundingBox();
        console.log("Export interval size: ", exportInterval);

        await clientNotFall(page);
    });

    test('Set export interval by digital panel (CLOUD-T165)', async ({ page }) => {
        const locators = new Locators(page);
        const currentCamera = h264Camera;
        const cameraIntervals = transformISOtime(await getArchiveIntervals("Black", currentCamera, "past", "future"));
        const lastIntervalEndTime = cameraIntervals[0].end;

        await openCameraList(page);
        await locators.cameraListItem.nth(0).click();
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.singleArchiveMode.click();
        await closeCameraList(page);
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await page.waitForTimeout(3000);

        await scrollArchive(page, 8);
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes - 1, lastIntervalEndTime.seconds);
        await locators.intervalStartButton.click();
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes, lastIntervalEndTime.seconds);
        await locators.intervalEndButton.click();
        let exportIntervalCurrent = await locators.exportInterval.boundingBox();
        console.log("Export interval size: ", exportIntervalCurrent);
        let exportLength = await locators.exportLengthBlock.innerHTML();
        isTimeEquals('00:01:00', exportLength, 2);
        //Через цифровую шкалу двигаем поинтер на 10 секунд назад
        await locators.cellTimer.click();
        for (let i = 0; i < 10; i++) {
            await locators.secondsDecrease.click();
        }
        //Проверяем, что выделенный интервал тот же как внешне, так и в табло
        let exportIntervalPrevious = exportIntervalCurrent;
        exportIntervalCurrent = await locators.exportInterval.boundingBox();
        console.log("Export interval size: ", exportIntervalCurrent);
        expect(Math.floor(exportIntervalCurrent!.y)).toEqual(Math.floor(exportIntervalPrevious!.y));
        exportLength = await locators.exportLengthBlock.innerHTML();
        isTimeEquals('00:01:00', exportLength, 2);
        //Переопределяем интервал
        await waitForStableState(locators.archivePointerTab);
        let pointerPositionCurrent = await locators.archivePointerTab.boundingBox();
        console.log("Pointer position: ", pointerPositionCurrent);
        await locators.intervalEndButton.click();
        let pointerPositionPrevious = pointerPositionCurrent;
        pointerPositionCurrent = await locators.archivePointerTab.boundingBox();
        console.log("Pointer position: ", pointerPositionCurrent);
        expect(Math.floor(pointerPositionCurrent!.y)).toEqual(Math.floor(pointerPositionPrevious!.y));
        exportLength = await locators.exportLengthBlock.innerHTML();
        isTimeEquals('00:00:50', exportLength, 2);

        await clientNotFall(page);
    });

    test('Set interval endtime wihout starttime (CLOUD-T166)', async ({ page }) => {
        const locators = new Locators(page);
        const currentCamera = h264Camera;
        const cameraIntervals = transformISOtime(await getArchiveIntervals("Black", currentCamera, "past", "future"));
        const lastIntervalEndTime = cameraIntervals[0].end;

        await openCameraList(page);
        await locators.cameraListItem.nth(0).click();
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.singleArchiveMode.click();
        await closeCameraList(page);
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await page.waitForTimeout(3000);

        await scrollArchive(page, 8);
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes, lastIntervalEndTime.seconds);
        await locators.intervalEndButton.click();
        const exportLength = await locators.exportLengthBlock.innerHTML();
        isTimeEquals('00:05:00', exportLength, 1);
        await expect(locators.exportLengthBlock).toBeVisible();
        await expect(locators.exportInterval).toBeVisible();
        await expect(locators.scaleExportMenuButton).toBeVisible();
        await waitForStableState(locators.archivePointerTab);
        let pointerPositionCurrent = await locators.archivePointerTab.boundingBox();
        console.log("Pointer position: ", pointerPositionCurrent);
        let exportInterval = await locators.exportInterval.boundingBox();
        console.log("Export interval size: ", exportInterval);
        expect(Math.floor(pointerPositionCurrent!.y)).toBeGreaterThan(Math.floor(exportInterval!.y));

        await clientNotFall(page);
    });

    test('Cancel selected interval (CLOUD-T167)', async ({ page }) => {
        const locators = new Locators(page);
        const currentCamera = h264Camera;
        const cameraIntervals = transformISOtime(await getArchiveIntervals("Black", currentCamera, "past", "future"));
        const lastIntervalEndTime = cameraIntervals[0].end;

        await openCameraList(page);
        await locators.cameraListItem.nth(0).click();
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.singleArchiveMode.click();
        await closeCameraList(page);
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await page.waitForTimeout(3000);

        await scrollArchive(page, 8);
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes - 1, lastIntervalEndTime.seconds);
        await locators.intervalStartButton.click();
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes, lastIntervalEndTime.seconds);
        await locators.intervalEndButton.click();
        await dragArchiveScaleIfNeed(page);
        await expect(locators.exportLengthBlock).toBeVisible();
        await expect(locators.exportInterval).toBeVisible();
        await expect(locators.scaleExportMenuButton).toBeVisible();
  
        await locators.cancelIntervalButton.click();
        await expect(locators.exportLengthBlock).toBeHidden();
        await expect(locators.exportInterval).toBeHidden();
        await expect(locators.scaleExportMenuButton).toBeHidden();

        await clientNotFall(page);
    });

    test('Fast export of an arbitrary fragment using a calendar (CLOUD-T990) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const currentCamera = h264Camera;

        await openCameraList(page);
        await locators.cameraListItem.nth(0).click();
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);
        await locators.singleArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await closeCameraList(page);
        await expect(locators.cellTitle).toHaveText(`${currentCamera.displayId}.${currentCamera.displayName}`);

        await scrollArchive(page, 6);
        let currentTime = new Date();
        await locators.videoCellExport.click();
        await page.waitForTimeout(3000);
        let expectedPointerTime = getTimeStringsFromDateObject(currentTime);
        isTimeEquals(await locators.pointerTime.innerText(), expectedPointerTime.fullTime, 2);

        await locators.exportDatePickerButton.last().click();
        currentTime.setSeconds(currentTime.getSeconds() - 10);
        expectedPointerTime = getTimeStringsFromDateObject(currentTime);
        await locators.exportDatePickerHours.fill(expectedPointerTime.hours);
        await locators.exportDatePickerMinutes.fill(expectedPointerTime.minutes);
        await locators.exportDatePickerSeconds.fill(expectedPointerTime.seconds);
        await locators.exportDatePickerSaveButton.click();
        await page.waitForTimeout(3000);
        expect(await locators.exportEndInput.inputValue()).toContain(expectedPointerTime.fullTime);
        isTimeEquals(await locators.pointerTime.innerText(), expectedPointerTime.fullTime, 1);

        await locators.exportDatePickerButton.first().click();
        currentTime.setSeconds(currentTime.getSeconds() - 30);
        expectedPointerTime = getTimeStringsFromDateObject(currentTime);
        await locators.exportDatePickerHours.fill(expectedPointerTime.hours);
        await locators.exportDatePickerMinutes.fill(expectedPointerTime.minutes);
        await locators.exportDatePickerSeconds.fill(expectedPointerTime.seconds);
        await locators.exportDatePickerSaveButton.click();
        await page.waitForTimeout(3000);
        expect(await locators.exportStartInput.inputValue()).toContain(expectedPointerTime.fullTime);
        isTimeEquals(await locators.pointerTime.innerText(), expectedPointerTime.fullTime, 1);
        isTimeEquals(await locators.exportLengthBlock.innerHTML(), "00:00:30", 1);

        await locators.localExportButton.click();
        await expect(locators.archiveBlock).toBeVisible();
        await locators.exportFile.waitFor({ state: 'attached', timeout: 60000 });
        let download = page.waitForEvent('download', { timeout: 3000 });
        await locators.exportFile.click();
        const file = await download;
        expect(await file.failure()).toBeNull();
        expect(file.suggestedFilename()).toContain('.mkv');
        await clientNotFall(page);
    });

    test('Fast export of frame using a calendar (CLOUD-T1165) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await openCameraList(page);
        const currentCamera = await locators.cameraListItem.nth(0).innerText();
        await locators.cameraListItem.nth(0).click();
        await expect(locators.cellTitle).toHaveText(currentCamera);
        await locators.singleArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await closeCameraList(page);
        await expect(locators.cellTitle).toHaveText(currentCamera);
        await locators.intervalEndButton.click();
        await dragArchiveScaleIfNeed(page);
        await locators.scaleExportMenuButton.click();

        await locators.formatPicker.click();
        await locators.optionJPG.click();
        await locators.externalBackground.waitFor({ state: 'detached' });
        await expect(locators.formatPicker).toHaveText('jpg');
        await expect(locators.exportEndInput).toBeHidden();
        expect(await locators.exportStartInput.inputValue()).toContain(await locators.pointerTime.innerText());
        await locators.exportDatePickerButton.first().click();
        let currentTime = new Date();
        currentTime.setSeconds(currentTime.getSeconds() - 10);
        let expectedPointerTime = getTimeStringsFromDateObject(currentTime);
        await locators.exportDatePickerHours.fill(expectedPointerTime.hours);
        await locators.exportDatePickerMinutes.fill(expectedPointerTime.minutes);
        await locators.exportDatePickerSeconds.fill(expectedPointerTime.seconds);
        await locators.exportDatePickerSaveButton.click();
        await page.waitForTimeout(3000);
        expect(await locators.exportStartInput.inputValue()).toContain(expectedPointerTime.fullTime);
        isTimeEquals(await locators.pointerTime.innerText(), expectedPointerTime.fullTime, 1);

        await locators.localExportButton.click();
        await expect(locators.archiveBlock).toBeVisible();
        await locators.exportFile.waitFor({ state: 'attached', timeout: 60000 });
        let download = page.waitForEvent('download', { timeout: 3000 });
        await locators.exportFile.click();
        const file = await download;
        expect(await file.failure()).toBeNull();
        expect(file.suggestedFilename()).toContain('.jpg');
        expect(file.suggestedFilename()).toContain(currentCamera);
        await clientNotFall(page);
    });

    test('Export from layout in archive (CLOUD-T1138) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const currentCamera = h264Camera;
        const cameraIntervals = transformISOtime(await getArchiveIntervals("Black", currentCamera, "past", "future"));
        const lastIntervalEndTime = cameraIntervals[0].end;

        await createLayout([h264Camera, h265Camera], 2, 1, "Test Layout");

        await page.reload();
        await expect(locators.cellTitle).toHaveCount(2);
        await locators.multiArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(2);

        await scrollArchive(page, 6);
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes - 1, lastIntervalEndTime.seconds);
        await locators.intervalStartButton.click();
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes, lastIntervalEndTime.seconds);
        await locators.intervalEndButton.click();
        await dragArchiveScaleIfNeed(page);
        await expect(locators.cellImage.nth(0)).toHaveAttribute("src", /blob:.*/);
        await expect(locators.cellImage.nth(1)).toHaveAttribute("src", /blob:.*/);
        let cellTimeBeforeExport = await locators.cellTimer.first().innerText();

        await locators.scaleExportMenuButton.click();
        await expect(locators.cellTitle).toHaveCount(1);
        await expect(locators.cellTitle).toHaveText(`${h264Camera.displayId}.${h264Camera.displayName}`);
        await expect(locators.cellTimer).toHaveText(cellTimeBeforeExport);
        await expect(locators.pointerTime).toHaveText(cellTimeBeforeExport);
        await expect(locators.cellImage).toHaveAttribute("src", /blob:.*/);
        await expect(locators.formatPicker).toHaveText('mkv');
        await locators.exportWindowCancelButton.click();
        await expect(locators.formatPicker).toBeHidden();
        await expect(locators.cellTitle).toHaveCount(2);
        await expect(locators.cellTimer.first()).toHaveText(cellTimeBeforeExport);
        await expect(locators.pointerTime).toHaveText(cellTimeBeforeExport);
        await expect(locators.cellImage.nth(0)).toHaveAttribute("src", /blob:.*/);
        await expect(locators.cellImage.nth(1)).toHaveAttribute("src", /blob:.*/);

        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes - 1, lastIntervalEndTime.seconds);
        await locators.intervalStartButton.click();
        await setCellTime(page, 0, lastIntervalEndTime.hours, lastIntervalEndTime.minutes, lastIntervalEndTime.seconds);
        await locators.intervalEndButton.click();
        await dragArchiveScaleIfNeed(page);
        
        await locators.scaleExportMenuButton.click();
        await expect(locators.cellTitle).toHaveCount(1);
        await expect(locators.cellTitle).toHaveText(`${h264Camera.displayId}.${h264Camera.displayName}`);
        await expect(locators.cellTimer).toHaveText(cellTimeBeforeExport);
        await expect(locators.pointerTime).toHaveText(cellTimeBeforeExport);
        await expect(locators.formatPicker).toHaveText('mkv');
        await locators.localExportButton.click();
        await expect(locators.formatPicker).toBeHidden();
        await expect(locators.cellTitle).toHaveCount(2);
        await locators.exportFile.waitFor({ state: 'attached', timeout: 60000 });
        let download = page.waitForEvent('download', { timeout: 3000 });
        await locators.exportFile.click();
        const file = await download;
        expect(await file.failure()).toBeNull();
        expect(file.suggestedFilename()).toContain('.mkv');
        await clientNotFall(page);
    });

    test('Export from layout in live (CLOUD-T1158) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await createLayout([h264Camera, h265Camera], 2, 1, "Test Layout 2");

        await page.reload();
        await expect(locators.cellTitle).toHaveCount(2);
        for (let i = 0; i < 2; i++){
            let currentTime = new Date();
            let cameraName = await locators.cellTitle.nth(i).innerText();
            await locators.videoCellExport.nth(i).click();
            await page.waitForTimeout(3000);
            await expect(locators.cellTitle).toHaveText(cameraName);
            let expectedPointerTime = getTimeStringsFromDateObject(currentTime);
            let pointerTime = await locators.pointerTime.innerText();
            isTimeEquals(pointerTime, expectedPointerTime.fullTime, 2);
            isTimeEquals(await locators.exportLengthBlock.innerHTML(), "00:05:00", 1);
            expect(await locators.exportEndInput.inputValue()).toContain(pointerTime);

            await expect(locators.formatPicker).toHaveText('mkv');
            await locators.localExportButton.click();
            await expect(locators.formatPicker).toBeHidden();
            await expect(locators.archiveBlock).toBeHidden();
            await expect(locators.videoElement).toHaveCount(2);  // поменял на 4 так, как для каждого окна есть два элемента с таким локатором 
            await locators.exportFile.waitFor({ state: 'attached', timeout: 90000 });
            let download = page.waitForEvent('download', { timeout: 3000 });
            await locators.exportFile.click();
            let file = await download;
            expect(await file.failure()).toBeNull();
            expect(file.suggestedFilename()).toContain(cameraName);
            expect(file.suggestedFilename()).toContain('.mkv');
        }
        
        await clientNotFall(page);
    });

});

async function dragArchiveScaleIfNeed(page: Page) {
    const locators = new Locators(page);

    const scaleBox = await locators.archiveBlockScaleBox.boundingBox();
    let exportButtonBox = await locators.scaleExportMenuButton.boundingBox();
    const scaleBoxCenterX = scaleBox!.x + scaleBox!.width / 2;
    const scaleBoxCenterY = scaleBox!.y + scaleBox!.height / 2;

    while (exportButtonBox!.y > (scaleBox!.y + scaleBox!.height)) {
        await page.mouse.move(scaleBoxCenterX, scaleBoxCenterY);
        await page.mouse.down();
        await page.mouse.move(scaleBoxCenterX, scaleBoxCenterY - 200);
        await page.mouse.up();
        exportButtonBox = await locators.scaleExportMenuButton.boundingBox();
        console.log(exportButtonBox);
    }
}