import { test, expect } from '@playwright/test';
import { clientURL, Configuration, ROOT_LOGIN, virtualVendor, ROOT_PASSWORD } from '../global_variables';
import { createArchive, createArchiveVolume, createArchiveContext, deleteArchive } from '../API/archives';
import { createCamera, addVirtualVideo, changeSingleCameraActiveStatus, changeMicrophoneStatus} from '../API/cameras';
import { createLayout } from '../API/layouts';
import { getHostName } from '../API/host';
import { cameraAnnihilator, layoutAnnihilator, configurationCollector, userAnnihilator, roleAnnihilator, authorization, openCameraList, clientNotFall, mapAnnihilator, closeCameraList, waitForStableState, compareTwoNumbers } from "../utils/utils.js";
import { Locators } from '../locators/locators';
import { setCellTime, waitWebSocketSentMessage, camerasArePlaying } from '../utils/archive_helpers';
import { isRequestOk } from '../utils/detectors_helpers';
import { createCameraMarker, createGeoMap, createRasterMap, createTransitionMarker } from '../API/maps';
import { createAVDetector } from '../API/detectors.js';


test.describe("Maps", () => {

    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector();

        await cameraAnnihilator("all");
        await layoutAnnihilator("all");
        await roleAnnihilator("all");
        await userAnnihilator("all");
        await deleteArchive('Black');
        await createCamera(4, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Camera", 0);
        await addVirtualVideo(Configuration.cameras, "lprusa", "tracker");
        await createLayout(Configuration.cameras, 2, 1, "Map Layout");
        await createArchive("Black");
        await createArchiveVolume("Black", 20);
        await createArchiveContext("Black", Configuration.cameras, true, "High");
    });

    test.beforeEach(async () => {
        await mapAnnihilator('all');
    });
    
    
    test('OpenStreet map creation (CLOUD-T719/CLOUD-T1027) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const mapName = "Geo Map";

        await createGeoMap(mapName);
        
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await locators.cellTitle.first().waitFor({ state: 'attached' });
        let responsePromise = page.waitForRequest(request => request.url().includes('v1/mapbox'));
        await locators.mapPanelButton.click();
        await isRequestOk(responsePromise);
        await expect(locators.mapBoxCanvas).toBeVisible();
        await expect(locators.mapBoxCanvas).toBeEnabled();
        await expect(locators.webpage.getByTitle(mapName, { exact: true })).toBeVisible();
        await expect(locators.webpage.getByTitle(mapName, { exact: true })).toHaveAttribute("aria-selected", "true");
        await expect(locators.mapBoxLogo).toBeAttached();
        await expect(locators.mapBoxLogo).toBeHidden();

        await clientNotFall(page);
    });

    test('Raster map creation (CLOUD-T720/CLOUD-T1028) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const mapName = "Raster Map";

        await createRasterMap(mapName, 'coordinates.jpg');
        
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await locators.cellTitle.first().waitFor({ state: 'attached' });
        let responsePromise = page.waitForRequest(request => request.url().includes('v1/maps/image'));
        await locators.mapPanelButton.click();
        await isRequestOk(responsePromise);
        await expect(locators.mapBoxCanvas).toBeVisible();
        await expect(locators.mapBoxCanvas).toBeEnabled();
        await expect(locators.webpage.getByTitle(mapName, { exact: true })).toBeVisible();
        await expect(locators.webpage.getByTitle(mapName, { exact: true })).toHaveAttribute("aria-selected", "true");
        await expect(locators.mapBoxLogo).toBeAttached();
        await expect(locators.mapBoxLogo).toBeHidden();

        await clientNotFall(page);
    });

    test('Raster svg map creation (CLOUD-T878)', async ({ page }) => {
        const locators = new Locators(page);
        const mapName1 = "SVG Map";
        const mapName2 = "SVG Map Zero";

        await createRasterMap(mapName1, 'spiral.svg');
        await createRasterMap(mapName2, 'spiral.svg', 0, 0);
        
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await locators.cellTitle.first().waitFor({ state: 'attached' });
        await locators.mapPanelButton.click();
        await locators.webpage.getByTitle(mapName1, { exact: true }).click();
        await expect(locators.webpage.getByTitle(mapName1, { exact: true })).toHaveAttribute("aria-selected", "true");
        await expect(locators.mapBoxCanvas).toBeVisible();
        await locators.webpage.getByTitle(mapName2, { exact: true }).click();
        await expect(locators.webpage.getByTitle(mapName2, { exact: true })).toHaveAttribute("aria-selected", "true");
        await expect(locators.mapBoxCanvas).toBeHidden();

        await clientNotFall(page);
    });

    test('Filling of map slider (CLOUD-T742)', async ({ page }) => {
        const locators = new Locators(page);
        const mapName = "Map with very big label";
        const viewPortWidth = page.viewportSize()!.width;

        for (let i = 1; i <= Math.ceil(viewPortWidth / 150); i++) {
            await createGeoMap(`${mapName} #${i}`);
        }
        
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await locators.cellTitle.first().waitFor({ state: 'attached' });
        await locators.mapPanelButton.click();
        await expect(locators.rightSlider).toBeVisible();
        let firstMap = locators.webpage.getByTitle(mapName, { exact: false }).first();
        let lastMap = locators.webpage.getByTitle(mapName, { exact: false }).last();
        await expect(firstMap).toBeInViewport({ ratio: 0.95 });
        await expect(lastMap).not.toBeInViewport({ ratio: 1 });
        await locators.rightSlider.click();
        await expect(firstMap).not.toBeInViewport({ ratio: 1 });
        await expect(lastMap).toBeInViewport({ ratio: 0.95 });
        await locators.leftSlider.click();
        await expect(firstMap).toBeInViewport({ ratio: 0.95 });
        await expect(lastMap).not.toBeInViewport({ ratio: 1 });

        await clientNotFall(page);
    });

    test('Changing geo map width (CLOUD-T721)', async ({ page }) => {
        const locators = new Locators(page);
        const mapName = "Geo Map";

        await createGeoMap(mapName);
        
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await locators.cellTitle.first().waitFor({ state: 'attached' });
        await locators.mapPanelButton.click();
        await page.waitForTimeout(2000);
        const mapSizeStart = await locators.mapBoxCanvas.boundingBox();
        console.log("Map size start:", mapSizeStart);
        await openCameraList(page);
        await page.waitForTimeout(2000);
        const mapSizeCollapsed = await locators.mapBoxCanvas.boundingBox();
        console.log("Map size collapsed:", mapSizeCollapsed);
        expect(mapSizeCollapsed?.width).toBeLessThan(mapSizeStart!.width);
        await locators.eventPanelButton.click();
        await page.waitForTimeout(2000);
        const mapSizeMini = await locators.mapBoxCanvas.boundingBox();
        console.log("Map size mini:", mapSizeMini);
        expect(mapSizeMini?.width).toBeLessThan(mapSizeCollapsed!.width);
        await locators.eventPanelButton.click();
        await closeCameraList(page);
        await page.waitForTimeout(2000);
        const mapSizeLast = await locators.mapBoxCanvas.boundingBox();
        console.log("Map size last:", mapSizeLast);
        compareTwoNumbers(mapSizeStart!.width, mapSizeLast!.width, 1);
        
        await clientNotFall(page);
    });

    test('Changing raster map width (CLOUD-T722)', async ({ page }) => {
        const locators = new Locators(page);
        const mapName = "Raster Map";

        await createRasterMap(mapName, 'w_map.jpg');
        
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await locators.cellTitle.first().waitFor({ state: 'attached' });
        await locators.mapPanelButton.click();
        await page.waitForTimeout(2000);
        const mapSizeStart = await locators.mapBoxCanvas.boundingBox();
        console.log("Map size start:", mapSizeStart);
        await openCameraList(page);
        await page.waitForTimeout(2000);
        const mapSizeCollapsed = await locators.mapBoxCanvas.boundingBox();
        console.log("Map size collapsed:", mapSizeCollapsed);
        expect(mapSizeCollapsed?.width).toBeLessThan(mapSizeStart!.width);
        await locators.eventPanelButton.click();
        await page.waitForTimeout(2000);
        const mapSizeMini = await locators.mapBoxCanvas.boundingBox();
        console.log("Map size mini:", mapSizeMini);
        expect(mapSizeMini?.width).toBeLessThan(mapSizeCollapsed!.width);
        await locators.eventPanelButton.click();
        await closeCameraList(page);
        await page.waitForTimeout(2000);
        const mapSizeLast = await locators.mapBoxCanvas.boundingBox();
        console.log("Map size last:", mapSizeLast);
        compareTwoNumbers(mapSizeStart!.width, mapSizeLast!.width, 1);
        
        await clientNotFall(page);
    });

    test('Changing geo map height (CLOUD-T723)', async ({ page }) => {
        const locators = new Locators(page);
        const mapName = "Geo Map";

        await createGeoMap(mapName);
        
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await locators.cellTitle.first().waitFor({ state: 'attached' });;
        const layoutFieldSize = await locators.layoutField.boundingBox();
        console.log("Layout field size:", layoutFieldSize);
        expect(layoutFieldSize?.height).not.toBeUndefined();

        await locators.mapPanelButton.click();
        await page.waitForTimeout(2000);
        let mapFieldSize = await locators.mapBoxCanvas.boundingBox();
        console.log("Map field size:", mapFieldSize);
        compareTwoNumbers(mapFieldSize!.height, layoutFieldSize!.height / 2, 1);

        await locators.mapPanelExpandButton.click();
        await page.waitForTimeout(2000);
        mapFieldSize = await locators.mapBoxCanvas.boundingBox();
        console.log("Map field size:", mapFieldSize);
        compareTwoNumbers(mapFieldSize!.height, layoutFieldSize!.height, 1);

        await locators.mapPanelButton.click();
        await page.waitForTimeout(2000);
        mapFieldSize = await locators.mapBoxCanvas.boundingBox();
        console.log("Map field size:", mapFieldSize);
        expect(mapFieldSize?.height).toEqual(1);

        await locators.mapPanelButton.click();
        await page.waitForTimeout(2000);
        mapFieldSize = await locators.mapBoxCanvas.boundingBox();
        console.log("Map field size:", mapFieldSize);
        compareTwoNumbers(mapFieldSize!.height, layoutFieldSize!.height, 1);

        await locators.mapPanelCollapseButton.click();
        await page.waitForTimeout(2000);
        mapFieldSize = await locators.mapBoxCanvas.boundingBox();
        console.log("Map field size:", mapFieldSize);
        compareTwoNumbers(mapFieldSize!.height, layoutFieldSize!.height / 2, 1);

        await locators.mapPanelCollapseButton.click();
        await page.waitForTimeout(2000);
        mapFieldSize = await locators.mapBoxCanvas.boundingBox();
        console.log("Map field size:", mapFieldSize);
        expect(mapFieldSize?.height).toEqual(1);
        
        await clientNotFall(page);
    });

    test('Changing raster map height (CLOUD-T724)', async ({ page }) => {
        const locators = new Locators(page);
        const mapName = "Raster Map";

        await createRasterMap(mapName, 'w_map.jpg');
        
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await locators.cellTitle.first().waitFor({ state: 'attached' });
        const layoutFieldSize = await locators.layoutField.boundingBox();
        console.log("Layout field size:", layoutFieldSize);
        expect(layoutFieldSize?.height).not.toBeUndefined();

        await locators.mapPanelButton.click();
        await page.waitForTimeout(2000);
        let mapFieldSize = await locators.mapBoxCanvas.boundingBox();
        console.log("Map field size:", mapFieldSize);
        compareTwoNumbers(mapFieldSize!.height, layoutFieldSize!.height / 2, 1);

        await locators.mapPanelExpandButton.click();
        await page.waitForTimeout(2000);
        mapFieldSize = await locators.mapBoxCanvas.boundingBox();
        console.log("Map field size:", mapFieldSize);
        compareTwoNumbers(mapFieldSize!.height, layoutFieldSize!.height, 1);

        await locators.mapPanelButton.click();
        await page.waitForTimeout(2000);
        mapFieldSize = await locators.mapBoxCanvas.boundingBox();
        console.log("Map field size:", mapFieldSize);
        expect(mapFieldSize?.height).toEqual(1);

        await locators.mapPanelButton.click();
        await page.waitForTimeout(2000);
        mapFieldSize = await locators.mapBoxCanvas.boundingBox();
        console.log("Map field size:", mapFieldSize);
        compareTwoNumbers(mapFieldSize!.height, layoutFieldSize!.height, 1);

        await locators.mapPanelCollapseButton.click();
        await page.waitForTimeout(2000);
        mapFieldSize = await locators.mapBoxCanvas.boundingBox();
        console.log("Map field size:", mapFieldSize);
        compareTwoNumbers(mapFieldSize!.height, layoutFieldSize!.height / 2, 1);

        await locators.mapPanelCollapseButton.click();
        await page.waitForTimeout(2000);
        mapFieldSize = await locators.mapBoxCanvas.boundingBox();
        console.log("Map field size:", mapFieldSize);
        expect(mapFieldSize?.height).toEqual(1);
        
        await clientNotFall(page);
    });

    test('Adding camera markers to geo map (CLOUD-T725) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const mapName = "Geo Map";
        const camera1 = Configuration.cameras[0];
        const camera2 = Configuration.cameras[1];
        let markerResponses = Array();

        let mapID = await createGeoMap(mapName, { x: 50, y: 50 }, 5);
        await createCameraMarker(mapID, camera1.accessPoint, { x: 51, y: 51 });
        await createCameraMarker(mapID, camera2.accessPoint, { x: 49, y: 49 });

        page.on("response", async response => {
            if (response.url().includes('maps/markers')) {
                markerResponses.unshift(await response.json());
                console.log(markerResponses[0].markers);
                console.log("---x---x---x---x---x---x---x---x---x---x---");
            }
        })

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await locators.cellTitle.first().waitFor({ state: 'attached' });
        await locators.mapPanelButton.click();
        await page.waitForTimeout(2000);
        expect(markerResponses[0]?.markers[camera1.accessPoint]?.position).toEqual({ x: 51, y: 51 });
        expect(markerResponses[0]?.markers[camera2.accessPoint]?.position).toEqual({ x: 49, y: 49 });
        await expect(locators.mapBoxMarker).toHaveCount(2);
        await locators.mapPanelExpandButton.click();
        await page.waitForTimeout(2000);
        expect(markerResponses[0]?.markers[camera1.accessPoint]?.position).toEqual({ x: 51, y: 51 });
        expect(markerResponses[0]?.markers[camera2.accessPoint]?.position).toEqual({ x: 49, y: 49 });
        await expect(locators.mapBoxMarker).toHaveCount(2);

        await clientNotFall(page);
    });

    test('Adding camera markers to raster map (CLOUD-T726) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const mapName = "Raster";
        const camera3 = Configuration.cameras[2];
        const camera4 = Configuration.cameras[3];
        let markerResponses = Array();

        let mapID = await createRasterMap(mapName, 'coordinates.jpg');
        await createCameraMarker(mapID, camera3.accessPoint, { x: 0.8, y: 0.8 });
        await createCameraMarker(mapID, camera4.accessPoint, { x: -0.3, y: -0.3 });

        page.on("response", async response => {
            if (response.url().includes('maps/markers')) {
                markerResponses.unshift(await response.json());
                console.log(markerResponses[0].markers);
                console.log("---x---x---x---x---x---x---x---x---x---x---");
            }
        })

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await locators.cellTitle.first().waitFor({ state: 'attached' });
        await locators.mapPanelButton.click();
        await page.waitForTimeout(2000);
        expect(markerResponses[0]?.markers[camera3.accessPoint]?.position).toEqual({ x: 0.8, y: 0.8 });
        expect(markerResponses[0]?.markers[camera4.accessPoint]?.position).toEqual({ x: -0.3, y: -0.3 });
        await expect(locators.mapBoxMarker).toHaveCount(2);
        await locators.mapPanelExpandButton.click();
        await page.waitForTimeout(2000);
        expect(markerResponses[0]?.markers[camera3.accessPoint]?.position).toEqual({ x: 0.8, y: 0.8 });
        expect(markerResponses[0]?.markers[camera4.accessPoint]?.position).toEqual({ x: -0.3, y: -0.3 });
        await expect(locators.mapBoxMarker).toHaveCount(2);

        await clientNotFall(page);
    });

    test('Adding transition markers to maps (CLOUD-T727) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const geoMapName = 'Geo';
        const rasterMapName = 'Raster';

        let rasterMapID = await createRasterMap(rasterMapName, 'coordinates.jpg');
        let geoMapID = await createGeoMap(geoMapName, { x: 0, y: 0 });
        await createTransitionMarker(rasterMapID, geoMapID, { x: 0, y: 0 });
        await createTransitionMarker(geoMapID, rasterMapID, { x: 0, y: 0 });

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await locators.cellTitle.first().waitFor({ state: 'attached' });
        await locators.mapPanelButton.click();
        await locators.webpage.getByTitle(geoMapName, { exact: true }).click();
        await expect(locators.mapBoxMarker).toBeInViewport({ ratio: 1 });
        await expect(locators.mapBoxMarker.locator('p')).toHaveText(rasterMapName);
        await locators.mapBoxMarker.locator('svg').click();
        await expect(locators.mapBoxMarker).toBeInViewport({ ratio: 1 });
        await expect(locators.mapBoxMarker.locator('p')).toHaveText(geoMapName);
        await expect(locators.webpage.getByTitle(rasterMapName, { exact: true })).toHaveAttribute("aria-selected", "true");
        await locators.mapPanelExpandButton.click();
        await page.waitForTimeout(2000);
        await locators.mapBoxMarker.locator('svg').click();
        await expect(locators.mapBoxMarker).toBeInViewport({ ratio: 1 });
        await expect(locators.mapBoxMarker.locator('p')).toHaveText(rasterMapName);
        await expect(locators.webpage.getByTitle(geoMapName, { exact: true })).toHaveAttribute("aria-selected", "true");
        let mapFieldSize = await locators.mapBoxCanvas.boundingBox();
        expect(mapFieldSize!.height).toBeGreaterThan(page.viewportSize()!.height / 2);

        await clientNotFall(page);
    });

    test('Hiding marker names (CLOUD-T728)', async ({ page }) => {
        const locators = new Locators(page);
        const geoMapName = 'Geo';
        const rasterMapName = 'Raster';

        let rasterMapID = await createRasterMap(rasterMapName, 'coordinates.jpg');
        let geoMapID = await createGeoMap(geoMapName, { x: 50, y: 50 }, 5);
        await createTransitionMarker(geoMapID, rasterMapID, { x: 50, y: 50 });
        await createCameraMarker(geoMapID, Configuration.cameras[0].accessPoint, { x: 49, y: 49 });
        await createCameraMarker(geoMapID, Configuration.cameras[1].accessPoint, { x: 51, y: 51 });

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await locators.cellTitle.first().waitFor({ state: 'attached' });
        await locators.mapPanelButton.click();
        await locators.webpage.getByTitle(geoMapName, { exact: true }).click();
        await expect(locators.mapBoxMarker).toHaveCount(3);
        for (let marker of await locators.mapBoxMarker.all()) {
            expect(marker.locator('p')).toBeVisible();
        }
        await locators.topMenuButton.click();
        await locators.preferences.click();
        await locators.showMarkerNames.uncheck();
        await locators.preferencesAccept.click();
        await expect(locators.mapBoxMarker).toHaveCount(3);
        for (let marker of await locators.mapBoxMarker.all()) {
            expect(marker.locator('p')).toBeHidden();
        }
        await locators.topMenuButton.click();
        await locators.preferences.click();
        await locators.showMarkerNames.check();
        await locators.preferencesAccept.click();
        await expect(locators.mapBoxMarker).toHaveCount(3);
        for (let marker of await locators.mapBoxMarker.all()) {
            expect(marker.locator('p')).toBeVisible();
        }

        await clientNotFall(page);
    });

    test('Showing long marker names (CLOUD-T729)', async ({ page }) => {
        const locators = new Locators(page);
        const geoMapName = 'Geo';
        const rasterMapName = 'Raster map with long name';
        const cameraName = 'Camera with long name';

        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", cameraName, -1);
        let camera = Configuration.cameras.filter(item => item.displayName == cameraName)[0];
        await addVirtualVideo([camera], "lprusa", "tracker");
        let rasterMapID = await createRasterMap(rasterMapName, 'coordinates.jpg');
        let geoMapID = await createGeoMap(geoMapName, { x: 50, y: 50 }, 5);
        await createTransitionMarker(geoMapID, rasterMapID, { x: 51, y: 51 });
        await createCameraMarker(geoMapID, camera.accessPoint, { x: 49, y: 49 });

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await locators.cellTitle.first().waitFor({ state: 'attached' });
        await locators.mapPanelButton.click();
        await locators.webpage.getByTitle(geoMapName, { exact: true }).click();
        await locators.mapBoxMarker.locator('p').filter({ hasText: `${camera.displayId}.${cameraName}` }).waitFor({ state: 'attached' });
        await locators.mapBoxMarker.locator('p').filter({ hasText: `${rasterMapName}` }).waitFor({ state: 'attached' });
        await expect(locators.mapBoxMarker.locator('p')).toHaveCount(2);
        let cameraMarkerCSS = await locators.mapBoxMarker.nth(0).evaluate(elem => {
            let element = elem.querySelector('p');
            if (element == null) {
                return { width: 0, textOverflow: 0 }
            }
            let computedStyle = getComputedStyle(element);
            return { width: computedStyle.width, textOverflow: computedStyle.textOverflow };
        });
        let transitionMarkerCSS = await locators.mapBoxMarker.nth(1).evaluate(elem => {
            let element = elem.querySelector('p');
            if (element == null) {
                return { width: 0, textOverflow: 0 }
            }
            let computedStyle = getComputedStyle(element);
            return { width: computedStyle.width, textOverflow: computedStyle.textOverflow };
        });
        console.log("Camera marker text:", cameraMarkerCSS);
        console.log("Transition marker text:", transitionMarkerCSS);
        expect(cameraMarkerCSS).toEqual({ width: "80px", textOverflow: "ellipsis" });
        expect(transitionMarkerCSS).toEqual({ width: "80px", textOverflow: "ellipsis" });

        await locators.webpage.getByRole('button', { name: `${camera.displayId}.${cameraName}` }).locator('p').hover();
        await expect(locators.webpage.locator('[role="tooltip"]').nth(0)).toHaveText(`${camera.displayId}.${cameraName}`);
        await locators.webpage.getByRole('button', { name: rasterMapName }).locator('p').hover();
        await expect(locators.webpage.locator('[role="tooltip"]').nth(0)).toHaveText(rasterMapName);

        await clientNotFall(page);
    });
  

    test('Opening marker player on geo map (CLOUD-T730) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const geoMapName = 'Geo';
        const camera1 = Configuration.cameras[0];
        const camera2 = Configuration.cameras[1];
        const camera3 = Configuration.cameras[2];

        let geoMapID = await createGeoMap(geoMapName, { x: 30, y: 30 }, 5);
        await createCameraMarker(geoMapID, camera1.accessPoint, { x: 28, y: 30 });
        await createCameraMarker(geoMapID, camera2.accessPoint, { x: 30, y: 30 });
        await createCameraMarker(geoMapID, camera3.accessPoint, { x: 32, y: 30 });

        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());

        await locators.cellTitle.first().waitFor({ state: 'attached' });
        await locators.mapPanelButton.click();
        await expect(locators.mapBoxMarker).toHaveCount(3);
        let playMessage = waitWebSocketSentMessage(WS, [camera3.videoStreams[1].accessPoint.slice(6), 'play']);
        await locators.mapBoxMarker.filter({ hasText: `${camera3.displayId}.${camera3.displayName}` }).click();
        let wsFrame = await playMessage;
        await expect(locators.mapBoxPopupVideo).toBeVisible();
        await expect(locators.videoElement).toHaveCount(3);
        await camerasArePlaying(page, 3, 7);
        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.mapBoxMarker.filter({ hasText: `${camera2.displayId}.${camera2.displayName}` }).click();
        await stopCommand;
        await expect(locators.mapBoxPopup).toBeHidden();
        await expect(locators.gridcell).toHaveCount(1);
        await expect(locators.cellTitle).toHaveText(`${camera2.displayId}.${camera2.displayName}`);
        await expect(locators.videoElement).toBeVisible();
        await camerasArePlaying(page, 1, 5);
        playMessage = waitWebSocketSentMessage(WS, [camera1.videoStreams[1].accessPoint.slice(6), 'play']);
        await locators.mapBoxMarker.filter({ hasText: `${camera1.displayId}.${camera1.displayName}` }).click();
        wsFrame = await playMessage;
        await expect(locators.mapBoxPopupVideo).toBeVisible();
        await expect(locators.videoElement).toHaveCount(2);
        await camerasArePlaying(page, 2, 7);
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.mapBoxPopupVideo.click({ force: true });
        await stopCommand;
        await expect(locators.mapBoxPopup).toBeHidden();
        await expect(locators.gridcell).toHaveCount(1);
        await expect(locators.cellTitle).toHaveText(`${camera1.displayId}.${camera1.displayName}`);
        await expect(locators.videoElement).toBeVisible();
        await camerasArePlaying(page, 1, 5);

        await clientNotFall(page);
    });

    test('Opening marker player on raster map (CLOUD-T731) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const rasterMapName = 'Raster Map';
        const camera1 = Configuration.cameras[0];
        const camera2 = Configuration.cameras[1];
        const camera3 = Configuration.cameras[2];

        let rasterMapID = await createRasterMap(rasterMapName, 'coordinates.jpg');
        await createCameraMarker(rasterMapID, camera1.accessPoint, { x: -0.5, y: 0 });
        await createCameraMarker(rasterMapID, camera2.accessPoint, { x: 0, y: 0 });
        await createCameraMarker(rasterMapID, camera3.accessPoint, { x: 0.5, y: 0 });

        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());

        await locators.cellTitle.first().waitFor({ state: 'attached' });
        await locators.mapPanelButton.click();
        await expect(locators.mapBoxMarker).toHaveCount(3);
        let playMessage = waitWebSocketSentMessage(WS, [camera3.videoStreams[1].accessPoint.slice(6), 'play']);
        await locators.mapBoxMarker.filter({ hasText: `${camera3.displayId}.${camera3.displayName}` }).click();
        let wsFrame = await playMessage;
        await expect(locators.mapBoxPopupVideo).toBeVisible();
        await expect(locators.videoElement).toHaveCount(3);
        await camerasArePlaying(page, 3, 7);
        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.mapBoxMarker.filter({ hasText: `${camera2.displayId}.${camera2.displayName}` }).click();
        await stopCommand;
        await expect(locators.mapBoxPopup).toBeHidden();
        await expect(locators.gridcell).toHaveCount(1);
        await expect(locators.cellTitle).toHaveText(`${camera2.displayId}.${camera2.displayName}`);
        await expect(locators.videoElement).toBeVisible();
        await camerasArePlaying(page, 1, 5);
        playMessage = waitWebSocketSentMessage(WS, [camera1.videoStreams[1].accessPoint.slice(6), 'play']);
        await locators.mapBoxMarker.filter({ hasText: `${camera1.displayId}.${camera1.displayName}` }).click();
        wsFrame = await playMessage;
        await expect(locators.mapBoxPopupVideo).toBeVisible();
        await expect(locators.videoElement).toHaveCount(2);
        await camerasArePlaying(page, 2, 7);
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.mapBoxPopupVideo.click({ force: true });
        await stopCommand;
        await expect(locators.mapBoxPopup).toBeHidden();
        await expect(locators.gridcell).toHaveCount(1);
        await expect(locators.cellTitle).toHaveText(`${camera1.displayId}.${camera1.displayName}`);
        await expect(locators.videoElement).toBeVisible();
        await camerasArePlaying(page, 1, 5);

        await clientNotFall(page);
    });

    test('Switching between video markers (CLOUD-T732)', async ({ page }) => {
        const locators = new Locators(page);
        const rasterMapName = 'Raster Map';
        const camera1 = Configuration.cameras[0];
        const camera2 = Configuration.cameras[1];
        const camera3 = Configuration.cameras[2];

        let rasterMapID = await createRasterMap(rasterMapName, 'coordinates.jpg');
        await createCameraMarker(rasterMapID, camera1.accessPoint, { x: -0.5, y: -0.5 });
        await createCameraMarker(rasterMapID, camera2.accessPoint, { x: 0, y: 0 });
        await createCameraMarker(rasterMapID, camera3.accessPoint, { x: 0.5, y: 0.5 });

        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());

        await expect(locators.gridcell).toHaveCount(2);
        const layoutFieldSize = await locators.layoutField.boundingBox();
        console.log("Layout field size:", layoutFieldSize);
        expect(layoutFieldSize?.height).not.toBeUndefined();

        await locators.mapPanelButton.click();
        await locators.mapPanelExpandButton.click();
        await page.waitForTimeout(2000);
        await expect(locators.mapBoxMarker).toHaveCount(3);
        let playMessage = waitWebSocketSentMessage(WS, [camera3.videoStreams[1].accessPoint.slice(6), 'play']);
        await locators.mapBoxMarker.filter({ hasText: `${camera3.displayId}.${camera3.displayName}` }).click();
        let wsFrame = await playMessage;
        await expect(locators.mapBoxPopupVideo).toBeInViewport({ ratio: 1 });
        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);

        playMessage = waitWebSocketSentMessage(WS, [camera2.videoStreams[1].accessPoint.slice(6), 'play']);
        await locators.mapBoxMarker.filter({ hasText: `${camera2.displayId}.${camera2.displayName}` }).click();
        await stopCommand;
        wsFrame = await playMessage;
        await expect(locators.mapBoxPopupVideo).toBeInViewport({ ratio: 1 });
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.mapBoxCanvas.click({ position: { x: 50, y: 50 } });
        await expect(locators.mapBoxPopup).toBeHidden();
        await stopCommand;

        playMessage = waitWebSocketSentMessage(WS, [camera1.videoStreams[1].accessPoint.slice(6), 'play']);
        await locators.mapBoxMarker.filter({ hasText: `${camera1.displayId}.${camera1.displayName}` }).click();
        wsFrame = await playMessage;
        await expect(locators.mapBoxPopupVideo).toBeInViewport({ ratio: 1 });
        await expect(locators.gridcell.nth(0)).toBeHidden();
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.mapBoxPopupVideo.click({ force: true });
        await stopCommand;
        await page.waitForTimeout(2000);
        let mapFieldSize = await locators.mapBoxCanvas.boundingBox();
        console.log("Map field size:", mapFieldSize);
        compareTwoNumbers(mapFieldSize!.height, layoutFieldSize!.height / 2, 1);
        await expect(locators.mapBoxPopup).toBeHidden();
        await expect(locators.gridcell).toBeVisible();
        await expect(locators.cellTitle).toHaveText(`${camera1.displayId}.${camera1.displayName}`);
        await expect(locators.videoElement).toBeVisible();
        await expect(locators.gridcell.nth(0)).toBeInViewport({ ratio: 1 });

        await clientNotFall(page);
    });

    test('Transition between maps with opened player window (CLOUD-T733)', async ({ page }) => {
        const locators = new Locators(page);
        const geoMapName = 'Geo';
        const rasterMapName = 'Raster';
        const camera3 = Configuration.cameras[2];
        const camera4 = Configuration.cameras[3];

        let rasterMapID = await createRasterMap(rasterMapName, 'coordinates.jpg');
        let geoMapID = await createGeoMap(geoMapName, { x: 0, y: 0 });
        await createTransitionMarker(rasterMapID, geoMapID, { x: 0, y: 0 });
        await createTransitionMarker(geoMapID, rasterMapID, { x: 0, y: 0 });
        await createCameraMarker(geoMapID, camera3.accessPoint, { x: 2, y: 0 });
        await createCameraMarker(rasterMapID, camera4.accessPoint, { x: 0.5, y: 0 });

        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());

        await locators.cellTitle.first().waitFor({ state: 'attached' });
        await locators.mapPanelButton.click();
        await locators.webpage.getByTitle(geoMapName, { exact: true }).click();
        let playMessage = waitWebSocketSentMessage(WS, [camera3.videoStreams[1].accessPoint.slice(6), 'play']);
        await locators.mapBoxMarker.filter({ hasText: `${camera3.displayId}.${camera3.displayName}` }).click();
        let wsFrame = await playMessage;
        await expect(locators.mapBoxPopupVideo).toBeVisible();
        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.webpage.getByTitle(rasterMapName, { exact: true }).click();
        await stopCommand;
        await expect(locators.mapBoxPopupVideo).toBeHidden();
        await expect(locators.webpage.getByTitle(rasterMapName, { exact: true })).toHaveAttribute("aria-selected", "true");
        playMessage = waitWebSocketSentMessage(WS, [camera4.videoStreams[1].accessPoint.slice(6), 'play']);
        await locators.mapBoxMarker.filter({ hasText: `${camera4.displayId}.${camera4.displayName}` }).click();
        wsFrame = await playMessage;
        await expect(locators.mapBoxPopupVideo).toBeVisible();
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.mapBoxMarker.filter({ hasText: geoMapName }).click();
        await stopCommand;
        await expect(locators.mapBoxPopupVideo).toBeHidden();
        await expect(locators.webpage.getByTitle(geoMapName, { exact: true })).toHaveAttribute("aria-selected", "true");

        await clientNotFall(page);
    });

    test('Presentation of debuging information in map (CLOUD-T735)', async ({ page }) => {
        const locators = new Locators(page);
        const geoMapName = 'Geo';
        const rasterMapName = 'Raster';
        const camera1 = Configuration.cameras[0];
        const camera2 = Configuration.cameras[1];
        const geoMarkerCoordinates = { x: 2, y: 2 };
        const rasterMarkerCoordinates = { x: -0.5, y: -0.5 };

        let rasterMapID = await createRasterMap(rasterMapName, 'coordinates.jpg');
        let geoMapID = await createGeoMap(geoMapName, { x: 0, y: 0 }, 6);
        await createCameraMarker(geoMapID, camera1.accessPoint, geoMarkerCoordinates);
        await createCameraMarker(rasterMapID, camera2.accessPoint, rasterMarkerCoordinates);

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await locators.cellTitle.first().waitFor({ state: 'attached' });
        await locators.mapPanelButton.click();
        await locators.mapPanelExpandButton.click();
        await waitForStableState(locators.mapBoxCanvas);
        await locators.webpage.getByTitle(geoMapName, { exact: true }).click();
        await locators.nextLogo.dblclick();
        await expect(locators.mapBoxDebugPanel).toBeVisible();
        await expect(locators.mapBoxDebugPanel.locator('p').first()).toHaveText('Map type: MAP_TYPE_GEO');

        //Убрать потом
        await locators.webpage.getByTitle(rasterMapName, { exact: true }).click();
        await locators.webpage.getByTitle(geoMapName, { exact: true }).click();
        //-----------

        await locators.mapBoxMarker.hover();
        let debugCoordinates = (await locators.mapBoxDebugPanel.locator('p').last().innerText()).replace(/.*x = /, '').split(', y = '); //заменяем строку "Cursor position: x = 0.000, y = 0.000" на массив [0.000, 0.000]
        console.log("Coordinates in debug panel:", debugCoordinates);
        expect(Number(debugCoordinates[0])).toBeCloseTo(geoMarkerCoordinates.x, 1);
        expect(Number(debugCoordinates[1])).toBeCloseTo(geoMarkerCoordinates.y, 1);
        await locators.mapBoxMarker.locator('svg').click();
        await expect(locators.mapBoxPopupVideo).toBeVisible();
        await expect(locators.mapBoxPopup.locator(".VideoCell__debug")).toBeHidden();

        await locators.webpage.getByTitle(rasterMapName, { exact: true }).click();
        await expect(locators.mapBoxDebugPanel).toBeVisible();
        await expect(locators.mapBoxDebugPanel.locator('p').first()).toHaveText('Map type: MAP_TYPE_RASTER');
        await locators.mapBoxMarker.hover();
        debugCoordinates = (await locators.mapBoxDebugPanel.locator('p').last().innerText()).replace(/.*x = /, '').split(', y = ');
        console.log("Coordinates in debug panel:", debugCoordinates);
        expect(Number(debugCoordinates[0])).toBeCloseTo(rasterMarkerCoordinates.x, 2);
        expect(Number(debugCoordinates[1])).toBeCloseTo(rasterMarkerCoordinates.y, 2);
        await locators.mapBoxMarker.locator('svg').click();
        await expect(locators.mapBoxPopupVideo).toBeVisible();
        await expect(locators.mapBoxPopup.locator(".VideoCell__debug")).toBeHidden();
        
        await locators.nextLogo.dblclick();
        await expect(locators.mapBoxDebugPanel).toBeHidden();

        await clientNotFall(page);
    });

    test('Presentation of disabled camera marker (CLOUD-T734)', async ({ page }) => {
        const locators = new Locators(page);
        const rasterMapName = 'Raster';
        const cameraName = 'Disabled camera';

        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", cameraName, -1);
        let camera = Configuration.cameras.filter(item => item.displayName == cameraName)[0];
        await changeSingleCameraActiveStatus(camera.cameraBinding, false);
        let rasterMapID = await createRasterMap(rasterMapName, 'coordinates.jpg');
        await createCameraMarker(rasterMapID, camera.accessPoint, { x: 0, y: 0 });

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await locators.cellTitle.first().waitFor({ state: 'attached' });
        await locators.mapPanelButton.click();
        await locators.mapBoxMarker.locator('svg').click();
        await expect(locators.mapBoxPopup.locator(locators.noSignalBanner)).toBeVisible();
        await expect(locators.mapBoxPopup.locator(locators.noSignalBanner).locator('p')).toHaveText("No signal", { ignoreCase: false });
        await expect(locators.mapBoxPopup.locator(locators.noSignalBanner).locator('svg')).toBeVisible();
        await expect(locators.mapBoxPopupVideo).toBeHidden();

        await clientNotFall(page);
    });

    test('Watching marker video in archive (CLOUD-T738)', async ({ page }) => {
        const locators = new Locators(page);
        const currentTime = new Date();
        const rasterMapName = 'Raster';
        const camera1 = Configuration.cameras[0];
        const camera2 = Configuration.cameras[1];

        let rasterMapID = await createRasterMap(rasterMapName, 'coordinates.jpg');
        await createCameraMarker(rasterMapID, camera1.accessPoint, { x: -0.5, y: 0 });
        await createCameraMarker(rasterMapID, camera2.accessPoint, { x: 0.5, y: 0 });

        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());

        await expect(locators.cellTitle.nth(0)).toBeVisible();
        await openCameraList(page);
        await locators.cameraListItem.filter({ hasText: `${camera1.displayId}.${camera1.displayName}` }).nth(0).click();
        await locators.singleArchiveMode.click();
        await setCellTime(page, 0, currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds());
        let archivePlayMessage = waitWebSocketSentMessage(WS, [camera1.videoStreams[0].accessPoint.slice(6), 'play', '"speed":1']);
        await locators.playButton.click();
        let archiveStreamData = await archivePlayMessage;

        await locators.mapPanelButton.click();
        let livePlayMessage = waitWebSocketSentMessage(WS, [camera2.videoStreams[1].accessPoint.slice(6), 'play', '"speed":1']);
        await locators.mapBoxMarker.filter({ hasText: `${camera2.displayId}.${camera2.displayName}` }).click();
        let liveStreamData = await livePlayMessage;
        await expect(locators.mapBoxPopupVideo).toBeVisible();
        await expect(locators.videoElement).toHaveCount(2);
        await camerasArePlaying(page, 2, 7);

        let liveStopCommand = waitWebSocketSentMessage(WS, ['stop', liveStreamData.streamId]);
        let archiveStopCommand = waitWebSocketSentMessage(WS, ['stop', archiveStreamData.streamId]);
        await locators.mapBoxMarker.filter({ hasText: `${camera1.displayId}.${camera1.displayName}` }).click();
        await liveStopCommand;
        await archiveStopCommand;
        await expect(locators.videoElement).toHaveCount(0);
        await expect(locators.mapBoxPopup).toBeHidden();

        await clientNotFall(page);
    });

    test('Creating markers in the same position (CLOUD-T741)', async ({ page }) => {
        const locators = new Locators(page);
        const rasterMapName = 'Raster';
        const camera1 = Configuration.cameras[0];
        const camera2 = Configuration.cameras[1];
        const camera3 = Configuration.cameras[2];

        let rasterMapID = await createRasterMap(rasterMapName, 'coordinates.jpg');
        await createCameraMarker(rasterMapID, camera1.accessPoint, { x: 0, y: 0 });
        await createCameraMarker(rasterMapID, camera2.accessPoint, { x: 0, y: 0 });
        await createCameraMarker(rasterMapID, camera3.accessPoint, { x: 0, y: 0 });

        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        console.log(WS.url());

        await locators.cellTitle.first().waitFor({ state: 'attached' });
        await locators.mapPanelButton.click();
        await locators.mapPanelExpandButton.click();
        await page.waitForTimeout(2000);
        await expect(locators.mapBoxMarker).toHaveCount(1);
        await locators.mapBoxMarker.click();
        await expect(locators.mapBoxPopup.getByRole('button')).toHaveCount(3);
        let playMessage = waitWebSocketSentMessage(WS, [camera2.videoStreams[1].accessPoint.slice(6), 'play']);
        await locators.mapBoxPopup.getByRole('button').filter({ hasText: `${camera2.displayId}.${camera2.displayName}` }).click();
        let wsFrame = await playMessage; 
        await expect(locators.mapBoxPopupVideo).toBeVisible();
        
        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.mapBoxCanvas.click({ position: { x: 50, y: 50 } });
        await stopCommand;
        await locators.mapBoxMarker.click();
        playMessage = waitWebSocketSentMessage(WS, [camera1.videoStreams[1].accessPoint.slice(6), 'play']);
        await locators.mapBoxPopup.getByRole('button').filter({ hasText: `${camera1.displayId}.${camera1.displayName}` }).click();
        wsFrame = await playMessage;
        await expect(locators.mapBoxPopupVideo).toBeVisible();

        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.mapPanelCollapseButton.click();
        await stopCommand;
        await page.waitForTimeout(2000);
        await expect(locators.mapBoxMarker).toHaveCount(1);
        await locators.mapBoxMarker.click();
        await expect(locators.mapBoxPopup.getByRole('button')).toHaveCount(3);
        await locators.mapBoxPopup.getByRole('button').filter({ hasText: `${camera2.displayId}.${camera2.displayName}` }).click();
        await expect(locators.gridcell).toHaveCount(1);
        await expect(locators.cellTitle).toHaveText(`${camera2.displayId}.${camera2.displayName}`);
        await expect(locators.videoElement).toBeVisible();

        playMessage = waitWebSocketSentMessage(WS, [camera3.videoStreams[1].accessPoint.slice(6), 'play']);
        await locators.mapBoxPopup.getByRole('button').filter({ hasText: `${camera3.displayId}.${camera3.displayName}` }).click();
        wsFrame = await playMessage; 
        await expect(locators.mapBoxPopupVideo).toBeVisible();

        await clientNotFall(page);
    });

    test('Displaying icons in marker player (CLOUD-T1123)', async ({ page }) => {
        const locators = new Locators(page);
        const geoMapName = 'Geo';
        const cameraName = 'Sound camera';

        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", cameraName, -1);
        let camera = Configuration.cameras[Configuration.cameras.length - 1] //.filter(item => item.displayName == cameraName)[0];
        console.log(camera);
        await addVirtualVideo([camera], "lprusa", "tracker");
        await createArchiveContext("Black", [camera], true, "High");
        await changeMicrophoneStatus(camera, true);
        await createAVDetector(camera, 'MotionDetection');
        let geoMapID = await createGeoMap(geoMapName, { x: 50, y: 50 }, 6);
        await createCameraMarker(geoMapID, camera.accessPoint, { x: 50, y: 50 });
        await createLayout([camera], 1, 1, "Full icons");

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        await expect(locators.cellTitle).toHaveText(`${camera.displayId}.${camera.displayName}`);
        await expect(locators.videoCell.locator(locators.videoCellIcons)).toHaveCount(3);
        await expect(locators.alertReviewIcon).toBeVisible();

        await locators.mapPanelButton.click();
        await locators.mapPanelExpandButton.click();
        await page.waitForTimeout(2000);
        await locators.mapBoxMarker.locator('svg').click();
        await expect(locators.mapBoxPopup.locator(locators.videoCellIcons).nth(0)).toBeHidden();
        await expect(locators.mapBoxPopup.locator(locators.videoCellIcons).nth(1)).toBeHidden();
        await expect(locators.mapBoxPopup.locator(locators.videoCellIcons).nth(2)).toBeHidden();
        await expect(locators.mapBoxPopup.locator('.VideoCell--alert-review')).toBeHidden();

        await clientNotFall(page);
    });
});