import { test, expect, type WebSocket, type Page, Locator} from '@playwright/test';
import { extractMonthInterval, timeToSeconds, waitForStableState } from "../utils/utils.js";
import { Locators } from '../locators/locators.js';
import { isCloudTest, SEVENTY_YEARS } from '../global_variables.js';

export async function isMessagesStop(page: Page, ws: WebSocket) {
    let recivedFrame = false;

    function handler(wsEvent) {
        console.log(wsEvent.payload);
        recivedFrame = true;
    }

    await page.waitForTimeout(isCloudTest ? 10000 : 2000);

    ws.on('framereceived', handler);

    await page.waitForTimeout(2000);
    expect(recivedFrame).toBeFalsy();

    ws.removeListener('framereceived', handler);
}

export async function comparePointerPositions(startPos: string, lastPos: string, reversePlay = false, sameTime = false) {
    if (sameTime) {
        console.log(`Pointer start time: ${startPos}`);
        console.log(`Pointer stop time: ${lastPos}`);
        expect(timeToSeconds(startPos) == timeToSeconds(lastPos)).toBeTruthy();
    } else if (reversePlay) {
        console.log(`Pointer start time: ${startPos}`);
        console.log(`Pointer stop time: ${lastPos}`);
        expect(timeToSeconds(startPos) > timeToSeconds(lastPos)).toBeTruthy();
    } else {
        console.log(`Pointer start time: ${startPos}`);
        console.log(`Pointer stop time: ${lastPos}`);
        expect(timeToSeconds(startPos) < timeToSeconds(lastPos)).toBeTruthy();
    }
    
}

export async function clickToInterval(locator: Locator, height: number) {
    const intervalSize = await locator.boundingBox();
    await locator.click({position: {x: intervalSize!.width / 2, y: intervalSize!.height * height}});
}

export async function scrollLastInterval(page: Page) {
    const locators = new Locators(page);

    let source = locators.lastInterval;
    let target = locators.archiveBlockDataBar;
    await source.hover();
    await page.mouse.wheel(0, -1000);
    await page.waitForTimeout(1000);
    let sourceBox = await source.boundingBox();
    let targetBox = await target.boundingBox();
    
    await source.dragTo(target, { 
        sourcePosition: { x: sourceBox!.width / 2, y: sourceBox!.height / 2 }, 
        targetPosition: { x: targetBox!.width / 2, y: targetBox!.height / 2 },
    });

    await page.mouse.wheel(0, -3000);
    await page.waitForTimeout(1000);
}

export async function scrollInterval(page: Page, intervalLocator: Locator, wheelCount = 1000, wheelStepsRange = 500) {
    let scrollCount = Math.abs(Math.ceil(wheelCount / wheelStepsRange));
    while (scrollCount) {
        let wheel = wheelCount < 0 ? -wheelStepsRange : wheelStepsRange;
        await intervalLocator.hover();
        await page.mouse.wheel(0, wheel);
        await page.waitForTimeout(1000);
        scrollCount--;
    }
}

export function getTimeIntervalFromURL(stringURL: string) {
    let startPosition = stringURL.indexOf('202');
    let targetString = stringURL.slice(startPosition, startPosition + 39);
    return (targetString.split('/'));
}

export async function videoIsPlayingShort(page: Page, cellNumber: number, playSeconds: number, mustPlay: boolean) {
    const locators = new Locators(page);

    const timer = locators.videoCell.nth(cellNumber).locator('[data-testid="at-camera-time"]');
    const videoStarted = locators.gridcell.nth(cellNumber).locator('.VideoCell--playing');

    if (mustPlay) {
        await videoStarted.waitFor({ state: 'attached' });
    }

    console.log("Check video is playing during " + playSeconds + " seconds");
    let isVideoPlaying = true;
    let videoStoped = 0;
    let previousTime = await timer.innerHTML();
    console.log(`Start time in cell ${cellNumber}: ${previousTime}`, (new Date()).toJSON());
    for (let i = 0; i < playSeconds; i++) {
        await page.waitForTimeout(1000);
        let time = new Date();
        let currentTime = await timer.innerHTML();
        console.log(`#${i}. Time in cell ${cellNumber}: ${currentTime}`, time.toJSON());
        
        if (timeToSeconds(currentTime) == timeToSeconds(previousTime)){
            videoStoped++;
        } else videoStoped = 0;
        
        if (videoStoped >= 3) {
            isVideoPlaying = false;
            console.log(`Video in cell ${cellNumber} is not playing!`);
            break
        }
        previousTime = currentTime;
    }

    const errorMessage = `Video in cell ${cellNumber} ${mustPlay ? 'should have been playing,' : 'should not have been playing,'} but got the opposite.`;
    expect(isVideoPlaying, errorMessage).toBe(mustPlay);
}

export async function videoIsPlaying(page: Page, cellNumber: number, playSeconds: number, mustPlay: boolean, exactFrame = false) {
    const locators = new Locators(page);

    //const videoCell = locators.videoElement.nth(cellNumber).locator('canvas').first();
    const videoCell = locators.videoElement.nth(cellNumber*2);
    const videoStarted = locators.videoCellWrapper.nth(cellNumber).locator('.VideoCell--playing').first(); // добавил .first()

    if (mustPlay) {
        await videoStarted.waitFor({ state: 'attached' });
    }

    let previousFrame = await videoCell.screenshot();
    let videoStoped = 0;
    let isVideoPlaying = true;
    console.log(`Check video is playing in cell ${cellNumber} during ${playSeconds} seconds:`);
    for (let i = 0; i < playSeconds; i++) {
        await page.waitForTimeout(500);
        let timeout = page.waitForTimeout(500);
        let currentFrame = await videoCell.screenshot();
        console.log(`Frame ${i} size in cell ${cellNumber}: ${currentFrame.length}, previous ${previousFrame.length}`, (new Date()).toJSON());
        await timeout;

        let statement = exactFrame ? currentFrame.equals(previousFrame) : currentFrame.length > previousFrame.length - 50 && currentFrame.length < previousFrame.length + 50;
        if (statement) {
            videoStoped++;
        } else videoStoped = 0;

        if (videoStoped >= 3) {
            isVideoPlaying = false;
            console.log(`Video in cell ${cellNumber} is not playing!`);
            break;
        }
        
        previousFrame = currentFrame;
    }
    const errorMessage = `Video in cell ${cellNumber} ${mustPlay ? 'should have been playing,' : 'should not have been playing,'} but got the opposite.`;
    expect(isVideoPlaying, errorMessage).toBe(mustPlay);
}

export async function setCellTime(page: Page, cellNumber: number, hours: number | string, minutes: number | string, seconds: number | string) {
    const locators = new Locators(page);
    
    if (Number(seconds) < 0) {
        seconds = Number(seconds) + 60;
        minutes = Number(minutes) - 1;
    }
    if (Number(seconds) > 59) {
        seconds = Number(seconds) - 60;
        minutes = Number(minutes) + 1;
    }
    if (Number(minutes) < 0) {
        minutes = Number(minutes) + 60;
        hours = Number(hours) - 1;
    }
    if (Number(minutes) > 59) {
        minutes = Number(minutes) - 60;
        hours = Number(hours) + 1;
    }
    await locators.cellTimer.nth(cellNumber).click();
    await locators.cellPointerSetterHours.fill(String(hours));
    await locators.cellPointerSetterMinutes.fill(String(minutes));
    await locators.cellPointerSetterSeconds.fill(String(seconds));
    await page.keyboard.press("Enter");  
}

export function timeToISO(date: Date) {
    let time = date.toISOString(); //"2023-01-01T00:00:00.000Z"
    return time.replace(/[-]|[:]|[zZ]/g, "");
}

export function ISOToMilliseconds(isoTime: string) {
    let ISOProperFormat = `${isoTime.slice(0, 4)}-${isoTime.slice(4, 6)}-${isoTime.slice(6, 8)}T${isoTime.slice(9, 11)}:${isoTime.slice(11, 13)}:${isoTime.slice(13, 15)}`;
    if (isoTime.length > 16) {
        ISOProperFormat += `${isoTime.slice(15, 19)}Z`;
    } else ISOProperFormat += '.000Z';

    return Date.parse(ISOProperFormat);
}

export function transformISOtime(intervals: { begin: string, end: string }[]) {
    let trasformedArray: {
        begin: {
            year: number,
            month: number,
            day: number,
            hours: number,
            minutes: number,
            seconds: number,
            milliseconds: number,
        },
        end: {
            year: number,
            month: number,
            day: number,
            hours: number,
            minutes: number,
            seconds: number,
            milliseconds: number,
        },
    }[] = [];
    const currentTime = new Date();
    const timeOffset = currentTime.getTimezoneOffset() / 60;
    for (let interval of intervals) {
        let beginHoursWithOffset = Number(interval.begin.slice(9, 11)) - timeOffset;
        let beginDay = Number(interval.begin.slice(6, 8))
        if (beginHoursWithOffset >= 24) {
            beginHoursWithOffset = beginHoursWithOffset - 24;
            beginDay++
        }
        if (beginHoursWithOffset < 0) {
            beginHoursWithOffset = beginHoursWithOffset + 24;
            beginDay--
        }

        let endHoursWithOffset = Number(interval.end.slice(9, 11)) - timeOffset;
        let endDay = Number(interval.end.slice(6, 8))
        if (endHoursWithOffset >= 24) {
            endHoursWithOffset = endHoursWithOffset - 24;
            endDay++
        }
        if (endHoursWithOffset < 0) {
            endHoursWithOffset = endHoursWithOffset + 24;
            endDay--
        }

        trasformedArray.push(
            { //"20230628T075236.756000"
                begin: {
                    year: Number(interval.begin.slice(0, 4)),
                    month: Number(interval.begin.slice(4, 6)),
                    day: beginDay,
                    hours: beginHoursWithOffset,
                    minutes: Number(interval.begin.slice(11, 13)),
                    seconds: Number(interval.begin.slice(13, 15)),
                    milliseconds: Number(interval.begin.slice(16, 19)),
                },
                end: {
                    year: Number(interval.end.slice(0, 4)),
                    month: Number(interval.end.slice(4, 6)),
                    day: endDay,
                    hours: endHoursWithOffset,
                    minutes: Number(interval.end.slice(11, 13)),
                    seconds: Number(interval.end.slice(13, 15)),
                    milliseconds: Number(interval.end.slice(16, 19)),
                }
            }
        )
    }
    console.log(trasformedArray);
    return trasformedArray;
}

export async function waitWebSocketSentMessage(ws: WebSocket, predicateList: string[], timeToWait = 10000) {

    function predicateFunc(data) {
        let sentData = data.payload;
        for (let predicate of predicateList) {
            if (!sentData.includes(predicate)) return false;
        }
        return true;
    }

    let startCommand = ws.waitForEvent("framesent", { predicate: predicateFunc, timeout: timeToWait });

    return JSON.parse((await startCommand).payload.toString());
}

export async function camerasArePlaying(page: Page, cameraCount: number, playTime: number) {
    let exactComparison = cameraCount >= 12 ? true : false;
    let promiseArray: any[] = [];
    for (let i = 0; i < cameraCount; i++) {
        promiseArray.push(videoIsPlaying(page, i, playTime, true, exactComparison));
    }
    await Promise.all(promiseArray);
}

export async function camerasArePlayingShort(page: Page, cameraCount: number, playTime: number) {
    let promiseArray: any[] = [];
    for (let i = 0; i < cameraCount; i++) {
        promiseArray.push(videoIsPlayingShort(page, i, playTime, true));
    }
    await Promise.all(promiseArray);
}

export async function scrollArchive(page: Page, x2ScaleCount: number) {
    const locators = new Locators(page);

    //1 wheel = 0.875 scale change, 500 = x0.5
    const scaleBox = locators.archiveBlockScaleBox;
    await scaleBox.hover();
    await page.mouse.wheel(0, -x2ScaleCount * 500);
    await page.waitForTimeout(1000);
}

export function isTimeEquals(expectedTime: string, recivedTime: string, imprecision = 0) {
    console.log(`Expected time interval: ${expectedTime} ± ${imprecision}s = [${timeToSeconds(expectedTime, -imprecision)}s, ${timeToSeconds(expectedTime, imprecision)}s]`);
    console.log(`Recieved time: ${recivedTime} = ${timeToSeconds(recivedTime)}s`);
    expect(timeToSeconds(expectedTime, -imprecision) <= timeToSeconds(recivedTime) && timeToSeconds(recivedTime) <= timeToSeconds(expectedTime, imprecision)).toBeTruthy();
}


export async function getArchiveVisualInterval(page: Page,) {
    const locators = new Locators(page);

    const timeStampOnScale = locators.archiveTimestamps.locator('text');
    const scale = locators.archiveBlockScaleBox;
    // Получаем цену деления, то есть сколько секунд помещается между двумя отметками архива
    let stepSizeSeconds = timeToSeconds(isDateOrTime(await timeStampOnScale.nth(1).innerHTML())) - timeToSeconds(isDateOrTime(await timeStampOnScale.nth(0).innerHTML()));
    stepSizeSeconds = stepSizeSeconds <= 0 ? 86400 + stepSizeSeconds : stepSizeSeconds; // преобразование на случай отрицательного результата, когда допустим вторая засечка это 00:00:00, а первая 18:00:00
    // Получаем расттояние между соседними засечками архива
    const step1 = await timeStampOnScale.nth(1).boundingBox();
    const step2 = await timeStampOnScale.nth(2).boundingBox();
    console.log("Step 1", step1);
    console.log("Step 2", step2);
    const stepRangePixels = step2!.y - step1!.y;
    console.log(`Range between two ${stepSizeSeconds} second steps is ${stepRangePixels}px`);
    // Вычисляем растояние от краев архива до ближайших засечек архива
    const scaleCoordinates = await scale.boundingBox();
    console.log("Scale coordinates:", scaleCoordinates);
    const firstStep = await timeStampOnScale.first().boundingBox();
    console.log("First step coordinates:", firstStep);
    const lastStep = await timeStampOnScale.last().boundingBox();
    console.log("Last step coordinates:", lastStep);
    let topDistance = Math.abs(scaleCoordinates!.y - (firstStep!.y + firstStep!.height / 2));
    let bottomDistance = Math.abs(scaleCoordinates!.y + scaleCoordinates!.height - (lastStep!.y + lastStep!.height / 2));
    console.log("Top distance", topDistance);
    console.log("Bottom distance", bottomDistance);
    // Преобразуем расстояния от краев в секунды и получаем время на границах архива
    let startInterval = timeToSeconds(isDateOrTime(await timeStampOnScale.first().innerHTML())) - Math.floor((topDistance / stepRangePixels) * stepSizeSeconds);
    let lastInterval = timeToSeconds(isDateOrTime(await timeStampOnScale.last().innerHTML())) + Math.floor((bottomDistance / stepRangePixels) * stepSizeSeconds);
    let archiveInterval = [secondsToTimeText(startInterval), secondsToTimeText(lastInterval)];
    console.log("Archive interval is", archiveInterval);
    return archiveInterval;
}

export function isDateOrTime(str: string) {
    if (str.includes('.')) {
        return '00:00:00'
    }
    return str;
}

export function secondsToTimeText(seconds: number) {
    if (seconds < 0) {
        seconds = 86400 + seconds;
    }
    let hoursCount = Math.floor(seconds / 3600);
    let minutesCount = Math.floor((seconds - hoursCount * 3600) / 60);
    let secondsCount = (seconds - hoursCount * 3600 - minutesCount * 60);

    hoursCount = hoursCount >= 24 ? 0 : hoursCount;
    minutesCount = minutesCount >= 60 ? 0 : minutesCount;
    secondsCount = secondsCount >= 60 ? 0 : secondsCount;
    let h = hoursCount < 10 ? `0${hoursCount}` : `${hoursCount}`;
    let min = minutesCount < 10 ? `0${minutesCount}` : `${minutesCount}`;
    let sec = secondsCount < 10 ? `0${secondsCount}` : `${secondsCount}`;

    return `${h}:${min}:${sec}`;
}

export async function messagesNotSent(page: Page, ws: WebSocket) {

    function handler(msg) {
        console.log(msg.payload);
        if (!(msg.payload.includes('update_token'))) {
            expect(false, `Shouldn't sent any message in WS`).toBeTruthy();
        }
    }

    ws.on('framesent', handler);
    await page.waitForTimeout(3000);

    ws.removeListener('framesent', handler);
}

export async function emulateCalendarDays(page: Page, dateFrom: Date, dayCount: number, mode: 'random' | 'odd' | 'even' | 'all' = 'all') {
    let calendarDay = new Date(dateFrom);
    await page.route('**/calendar/**', async route => {
        if (route.request().url().includes(extractMonthInterval(dateFrom))) {
            calendarDay.setUTCHours(0, 0, 0, 0);
            console.log("Emulate dates before", calendarDay);
            let datesArray: number[] = [];
            for (let i = 0; i <= dayCount && dateFrom.getUTCDate() - i > 0; i++) {
                calendarDay.setUTCDate(dateFrom.getUTCDate() - i);
                let milliseconds = calendarDay.getTime() + SEVENTY_YEARS;
                if (mode == 'all') {
                    datesArray.unshift(milliseconds);
                } else if (mode == 'even' && calendarDay.getUTCDate() % 2 == 0) {
                    datesArray.unshift(milliseconds);
                } else if (mode == 'odd' && calendarDay.getUTCDate() % 2 != 0) {
                    datesArray.unshift(milliseconds);
                } else if (mode == 'random' && Math.random() > 0.5) {
                    datesArray.unshift(milliseconds);
                }
            }
            console.log(datesArray);
            datesArray.forEach(elem => console.log(new Date(elem - SEVENTY_YEARS).toISOString()));
            route.fulfill({ body: JSON.stringify(datesArray), contentType: 'application/json; charset=utf-8' });
        } else route.continue();
    });
}

export async function WSSendedMessagesTracer(ws: WebSocket) {
    ws.on('framesent', wsMessage => console.log(wsMessage.payload));
}