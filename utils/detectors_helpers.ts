import { test, expect, type WebSocket, type Page, Locator, Request,} from '@playwright/test';
import { timeToSeconds, waitForStableState } from "../utils/utils.js";
import { getDetectorEvents } from '../API/detectors.js';
import { timeToISO } from './archive_helpers.js';
import { Locators } from '../locators/locators.js';
import { randomUUID } from 'node:crypto';

export async function waitForDetectorEvents(page: Page, camera: { [key: string]: any, 'accessPointChanged': string }, eventsCount = 1, waitSeconds = 120, detectorId = 0) {
    let future = new Date();
    let past = new Date();
    //past.setSeconds(future.getSeconds() - 30);
    past.setMinutes(future.getMinutes() - 2);

    let i = 1;
    let events: any[] = [];
    while (events.length <= eventsCount) {
        events = await getDetectorEvents(camera, timeToISO(future), timeToISO(past), detectorId);
        console.log('Events were found:', events);
        if (events.length >= eventsCount) {
            break;
        }
        if (i >= waitSeconds / 10) {
            expect(false, `Got timed out ${waitSeconds} seconds to wait for ${eventsCount} events`).toBeTruthy();
        }
        i++;

        await page.waitForTimeout(10000);
        future = new Date();
    }
};

export async function compareBorderPositions(page: Page, event: { [key: string]: any }) {
    const locators = new Locators(page);
    let eventBorderUI = {
        x: Number((await locators.videoCellBox.locator('rect').getAttribute('x'))?.replace('%', '')),
        y: Number((await locators.videoCellBox.locator('rect').getAttribute('y'))?.replace('%', '')),
        h: Number((await locators.videoCellBox.locator('rect').getAttribute('height'))?.replace('%', '')),
        w: Number((await locators.videoCellBox.locator('rect').getAttribute('width'))?.replace('%', ''))
    }
    console.log("Event border in UI:", eventBorderUI);
    let eventBorderReal = {
        x: Number(event.rectangles[0].left * 100),
        y: Number(event.rectangles[0].top * 100),
        h: Number(event.rectangles[0].bottom * 100 - event.rectangles[0].top * 100),
        w: Number(event.rectangles[0].right * 100 - event.rectangles[0].left * 100)
    };
    console.log("Event border in response:", eventBorderReal);

    expect(Math.round(eventBorderUI.x * 100)).toEqual(Math.round(eventBorderReal.x * 100));
    expect(Math.round(eventBorderUI.y * 100)).toEqual(Math.round(eventBorderReal.y * 100));
    expect(Math.round(eventBorderUI.h * 100)).toEqual(Math.round(eventBorderReal.h * 100));
    expect(Math.round(eventBorderUI.w * 100)).toEqual(Math.round(eventBorderReal.w * 100));
}

export function countEvents(eventsList: { [key: string]: any }[]) {
    let counter = 0;
    for (let event of eventsList) {
        if (event.alertState == 'began' || event.alertState == 'happened') {
            counter++
        } 
    }
    return counter;
}

export async function selectSearchSectors(page: Page, startSector: number, lastSector: number, canvasNumber = 0) {
    /**
    * startSector - number of sector which contains left top corner
    * lastSector -  number of sector which contains right bottom corner
    */
    const grid = { width: 20, height: 20 };
    const locators = new Locators(page);
    const canvasDimentions = await locators.fastSearchCanvas.nth(canvasNumber).boundingBox();
    const sectorHeight = canvasDimentions!.height / grid.height;
    const sectorWidth = canvasDimentions!.width / grid.width;

    let XCoordinatesLeft = startSector % grid.width ? startSector % grid.width * sectorWidth - sectorWidth : grid.width * sectorWidth - sectorWidth;
    let YCoordinatesLeft = startSector % grid.width ? Math.floor(startSector / grid.width) * sectorHeight : Math.floor(startSector / grid.width) * sectorHeight - sectorHeight;
    let XCoordinatesRight = lastSector % grid.width ? lastSector % grid.width * sectorWidth : grid.width * sectorWidth;
    let YCoordinatesRight = Math.ceil(lastSector / grid.width) * sectorHeight;
    
    await page.mouse.move(canvasDimentions!.x + XCoordinatesLeft + sectorWidth / 2, canvasDimentions!.y + YCoordinatesLeft + sectorHeight / 2);
    await page.mouse.down();
    await page.mouse.move(canvasDimentions!.x + XCoordinatesRight - sectorWidth / 2, canvasDimentions!.y + YCoordinatesRight - sectorHeight / 2);
    await page.mouse.up();

    return ([
        [XCoordinatesLeft / canvasDimentions!.width, YCoordinatesLeft / canvasDimentions!.height], 
        [XCoordinatesRight / canvasDimentions!.width, YCoordinatesLeft / canvasDimentions!.height], 
        [XCoordinatesRight / canvasDimentions!.width, YCoordinatesRight / canvasDimentions!.height], 
        [XCoordinatesLeft / canvasDimentions!.width, YCoordinatesRight / canvasDimentions!.height]
    ]);
}

export async function setSearchArea(page: Page, targetCoordinates: number[][], startFromControl = 0) {
    const locators = new Locators(page);

    let videoCellCoordinates = await locators.canvasElement.boundingBox();
    console.log('Videocell coordinates:', videoCellCoordinates);

    for (let i = 0; i < targetCoordinates.length; i++) {
        let controlCoordinates = await locators.resizeControl.nth(i + startFromControl).boundingBox();
        let controlCenterPosition = {
            x: controlCoordinates!.x + controlCoordinates!.width / 2,
            y: controlCoordinates!.y + controlCoordinates!.height / 2
        }
        let controlDestinationCoordinates = {
            x: videoCellCoordinates!.x + videoCellCoordinates!.width * targetCoordinates[i][0],
            y: videoCellCoordinates!.y + videoCellCoordinates!.height * targetCoordinates[i][1]
        }
        console.log(`Control #${i + startFromControl} position:`, controlCenterPosition);
        console.log('Move to:', controlDestinationCoordinates);
        await page.mouse.move(controlCenterPosition.x, controlCenterPosition.y);
        await page.mouse.down();
        await page.mouse.move(controlDestinationCoordinates.x, controlDestinationCoordinates.y);
        await page.mouse.up();
    }
}

export async function checkCurrentControlsPosition(page: Page, targetCoordinates: number[][], startFromControl = 0) {
    const locators = new Locators(page);

    let videoCellCoordinates = await locators.canvasElement.boundingBox();
    console.log('Videocell coordinates:', videoCellCoordinates);

    for (let i = 0; i < targetCoordinates.length; i++) {
        let controlCoordinates = await locators.resizeControl.nth(i + startFromControl).boundingBox();
        let controlPositionAbsolute = {
            x: controlCoordinates!.x + controlCoordinates!.width / 2,
            y: controlCoordinates!.y + controlCoordinates!.height / 2
        }
        let controlPositionRelative = {
            x: (controlPositionAbsolute.x - videoCellCoordinates!.x) / videoCellCoordinates!.width,
            y: (controlPositionAbsolute.y - videoCellCoordinates!.y) / videoCellCoordinates!.height
        }
        console.log(`Control #${i + startFromControl} position (abs):`, controlPositionAbsolute);
        console.log(`Control #${i + startFromControl} position (rel):`, controlPositionRelative);
        console.log(`Control #${i + startFromControl} should be in position:`, targetCoordinates[i]);
        expect(controlPositionRelative.x).toBeCloseTo(targetCoordinates[i][0], 2);
        expect(controlPositionRelative.y).toBeCloseTo(targetCoordinates[i][1], 2);
    }
}

export async function isRequestOk(request: Promise<Request> | Request) {
    const response = await (await request).response();
    if (response === null) {
        expect(false, 'Response is null').toBeTruthy();
    } else expect(response.ok(), `Got response error: ${response.statusText()}`).toBeTruthy();
}

export async function VMDASearchParamsCheck(page: Page, requestPromise: Promise<Request> | Request, searchShapeOne: number[][], detectorEndpoints: string[], zoneType = "zone", searchShapeTwo: number[][] = [], direction = '', duration = 0, count = 0 ) {

    let requestBody = JSON.parse((await requestPromise).postData()!);
    console.log('Detectors endpoints:', detectorEndpoints);
    console.log('Search request body:', requestBody);
    expect(requestBody?.queryType).toEqual(zoneType);
    let requestZone = requestBody?.figures[0].shape;
    console.log('Searching field:', searchShapeOne);
    console.log('Search request zone:', requestZone);
    expect(requestZone.length).toEqual(searchShapeOne.length);
    for (let i = 0; i < searchShapeOne.length; i++) {
        for (let j = 0; j < 2; j++) {
            expect(requestZone[i][j]).toBeCloseTo(searchShapeOne[i][j], 2);
        }
    }
    expect(requestBody?.sources.length).toEqual(detectorEndpoints.length);
    for (let detectorEndpoint of detectorEndpoints) {
        expect(requestBody?.sources.includes(detectorEndpoint), 'Detectors endpoint is missing in the request').toBeTruthy();
    }

    if (searchShapeTwo.length) {
        let requestZone = requestBody?.figures[1].shape;
        console.log('Searching field two:', searchShapeTwo);
        console.log('Search request zone two:', requestZone);
        expect(requestZone.length).toEqual(searchShapeTwo.length);
        for (let i = 0; i < searchShapeTwo.length; i++) {
            for (let j = 0; j < 2; j++) {
                expect(requestZone[i][j]).toBeCloseTo(searchShapeTwo[i][j], 2);
            }
        }
    }

    if (direction == 'right' || direction == 'left') {
        console.log('Direction has been checked');
        expect(requestBody?.queryProperties.direction).toEqual(direction);
    }

    if (duration) {
        console.log('Duration has been checked');
        expect(requestBody?.conditions.duration).toEqual(duration);
    }

    if (count) {
        console.log('Count has been checked');
        expect(requestBody?.conditions.count).toEqual(count);
    }

    await isRequestOk(requestPromise);
}

export async function useFakeEvents(page: Page, eventTemplate: { [key: string]: any, id: string, timestamp: string }, eventsCount: number, eventsPeriod = 1 ) {

    await page.route('**/archive/events/detectors/**', async route => {

        let body = {
            "events": Array()
        };

        let time = new Date();

        for (let i = 1; i <= eventsCount; i++) {
            time.setSeconds(time.getSeconds() - eventsPeriod);
            let template = Object.assign({}, eventTemplate);
            template.id = randomUUID();
            template.timestamp = timeToISO(time) + '000';
            if (template.rectangles) {
                let rect = Object.assign({}, template.rectangles[0]);
                rect.left = Math.random() * 0.9;
                rect.top = Math.random() * 0.9;
                rect.right = rect.left + 0.1;
                rect.bottom = rect.top + 0.1;
                template.rectangles = [rect];
            }
            body.events.unshift(template);
        }

        console.log('body', body);
        route.fulfill({ body: JSON.stringify(body), contentType: 'application/json; charset=utf-8' });
    });
}