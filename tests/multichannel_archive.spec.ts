import { test, expect, type Page } from '@playwright/test';
import { clientURL, Configuration, ROOT_LOGIN, virtualVendor, ROOT_PASSWORD, isCloudTest } from '../global_variables.js';
import { createArchive, createArchiveVolume, createArchiveContext, deleteArchive, getArchiveContext, changeArchiveContext, getArchiveIntervals } from '../API/archives.js';
import { createCamera, addVirtualVideo, changeMicrophoneStatus, setPanamorphMode } from '../API/cameras.js';
import { createLayout } from '../API/layouts.js';
import { getHostName } from '../API/host.js';
import { cameraAnnihilator, layoutAnnihilator, configurationCollector, userAnnihilator, roleAnnihilator, waitAnimationEnds, timeToSeconds, authorization, clientNotFall, compareTwoNumbers } from "../utils/utils.js";
import { Locators } from '../locators/locators.js';
import { isMessagesStop, comparePointerPositions, clickToInterval, scrollLastInterval, videoIsPlaying, setCellTime, timeToISO, transformISOtime, waitWebSocketSentMessage, camerasArePlaying, videoIsPlayingShort, camerasArePlayingShort, ISOToMilliseconds, WSSendedMessagesTracer } from '../utils/archive_helpers.js';
import { createRole, setObjectPermissions, setRolePermissions } from '../API/roles.js';
import { assignUserRole, createUser, setUserPassword } from '../API/users.js';
import { imageSize } from 'image-size';
let h264Cameras: any[], h265Cameras: any[], mjpegCameras:  any[];
let recordGenerated = false; //переменная показывает достаточен ли размер записи для начала теста
let canPlayH265: boolean;
let cellIsPlaying = videoIsPlaying;
let cellsArePlaying = camerasArePlaying;


test.describe("Multichannel archive. Configuration block", () => {
    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector();
        await cameraAnnihilator("all");
        await layoutAnnihilator("all");
        await roleAnnihilator("all");
        await userAnnihilator("all");
        await deleteArchive('Black');
        await createCamera(12, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "H264", 0);
        await createCamera(9, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "H265", 12);
        await createCamera(2, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "MJPEG", 21);
        h264Cameras = Configuration.cameras.slice(0, 12);
        h265Cameras = Configuration.cameras.slice(12, 21);
        mjpegCameras = Configuration.cameras.slice(21, 23);
        await addVirtualVideo(h264Cameras, "tracker", "tracker");
        await addVirtualVideo(h265Cameras, "H265-2K", "H265-2K");
        await addVirtualVideo(mjpegCameras, "witcher_mjpeg", "witcher_mjpeg");
        await createArchive("Black");
        await createArchiveVolume("Black", 20);
        await createArchiveContext("Black", Configuration.cameras, true, "High");
    });

    test('Configuration', async ({ page }) => {
        expect(Configuration.cameras.length).toEqual(23);
        expect(Configuration.archives.length).toBeGreaterThanOrEqual(1);
        console.log("Configuration created");
    });
})

test.describe("Multichannel archive. Common block", () => {

    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector(); 
        if (Configuration.cameras.length < 20) {
            await cameraAnnihilator("all");
            await layoutAnnihilator("all");
            await roleAnnihilator("all");
            await userAnnihilator("all");
            await deleteArchive('Black');
            await createCamera(12, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "H264", 0);
            await createCamera(9, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "H265", 12);
            await createCamera(2, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "MJPEG", 21);
            h264Cameras = Configuration.cameras.slice(0, 12);
            h265Cameras = Configuration.cameras.slice(12, 21);
            mjpegCameras = Configuration.cameras.slice(21, 23);
            await addVirtualVideo(h264Cameras, "tracker", "tracker");
            await addVirtualVideo(h265Cameras, "H265-2K", "H265-2K");
            await addVirtualVideo(mjpegCameras, "witcher_mjpeg", "witcher_mjpeg");
            await createArchive("Black");
            await createArchiveVolume("Black", 20);
            await createArchiveContext("Black", Configuration.cameras, true, "High");
        }
        h264Cameras = Configuration.cameras.slice(0, 12);
        h265Cameras = Configuration.cameras.slice(12, 21);
        mjpegCameras = Configuration.cameras.slice(21, 23);
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
    
    
    test('X1 layout h264 playback (CLOUD-T300) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await createLayout(h264Cameras, 1, 1, "X1-H264");

        //Проверяем, что записи достаточно
        await isRecordEnough(page);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        
        //Получаем веб-сокет объект видеостримов
        const WS = await page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        console.log(WS.url());

        //Переходим в архив
        await locators.cellTitle.nth(0).waitFor({ state: 'attached' });
        await locators.singleArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(1);
        await expect(locators.cellTitle).toContainText("H264");

        //Кликаем на центр последнего записанного интервала
        await scrollLastInterval(page);
        await clickToInterval(locators.lastInterval, 0.5);

        //Сохраняем время поинтера перед воспроизведением и жмем на плей
        let startPointerTime = await locators.pointerTime.innerText();
        let startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        let wsFrame = await startCommand;
        await cellIsPlaying(page, 0, 5, true);
        let lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Переключаем восрпоизведение на скорость x4 и проверяем, что предыдущий поток остановлен и инициирован новый
        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        startCommand = waitWebSocketSentMessage(WS, ['"speed":4']);
        await locators.x4Speed.click();
        await stopCommand;
        wsFrame = await startCommand;
        await cellIsPlaying(page, 0, 5, true);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);

        //Останавливаем видео и проверяем что отправилось соответсвующее сообщение в WS
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);

        //Перемещаем поинтер, переключаем воспроизведение на скорость x2 и воспроизводим
        await clickToInterval(locators.lastInterval, 0.3);
        startPointerTime = await locators.pointerTime.innerText();
        startCommand = waitWebSocketSentMessage(WS, ['"speed":2']);
        await locators.x2Speed.click();
        await locators.playButton.click();
        wsFrame = await startCommand;
        await cellIsPlaying(page, 0, 5, true);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Переключаем восрпоизведение на скорость -x2 и проверяем, что предыдущий поток остановлен и инициирован новый
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        startCommand = waitWebSocketSentMessage(WS, ['"speed":-2']);
        await locators.x2SpeedReversed.click();
        await stopCommand;
        wsFrame = await startCommand;
        await cellIsPlaying(page, 0, 5, true);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime, true);
        startPointerTime = lastPointerTime;

        //Переключаем восрпоизведение на скорость -x1 и проверяем, что предыдущий поток остановлен и инициирован новый
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        startCommand = waitWebSocketSentMessage(WS, ['"speed":-1']);
        await locators.x1SpeedReversed.click();
        await stopCommand;
        wsFrame = await startCommand;
        await cellIsPlaying(page, 0, 5, true);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime, true);

        //Перемещаем поинтер и проверяем что поток остановлен
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await clickToInterval(locators.lastInterval, 0.7);
        await stopCommand;
        await isMessagesStop(page, WS);

        //Переключаем воспроизведение на скорость -x4 и воспроизводим
        startPointerTime = await locators.pointerTime.innerText();
        startCommand = waitWebSocketSentMessage(WS, ['"speed":-4']);
        await locators.x4SpeedReversed.click();
        await locators.playButton.click();
        wsFrame = await startCommand;
        await cellIsPlaying(page, 0, 5, true);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime, true);

        //Останавливаем видео и проверяем что отправилось соответсвующее сообщение в WS
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);    
        
        await clientNotFall(page);
    });

    test('X1 layout H265 playback (CLOUD-T301) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await createLayout(h265Cameras, 1, 1, "X1-H265");

        //Проверяем, что записи достаточно
        await isRecordEnough(page);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        //Получаем веб-сокет объект видеостримов
        const WS = await page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        console.log(WS.url());

        //Переходим в архив
        await locators.cellTitle.nth(0).waitFor({ state: 'attached' });
        await locators.singleArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(1);
        await expect(locators.cellTitle).toContainText("H265");
        
        //Кликаем на центр последнего записанного интервала
        await scrollLastInterval(page);
        await clickToInterval(locators.lastInterval, 0.5);

        //Сохраняем время поинтера перед воспроизведением и жмем на плей
        let startPointerTime = await locators.pointerTime.innerText();
        let startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        let wsFrame = await startCommand;
        await cellIsPlaying(page, 0, 5, true);
        let lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Переключаем восрпоизведение на скорость x4 и проверяем, что предыдущий поток остановлен и инициирован новый
        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        startCommand = waitWebSocketSentMessage(WS, ['"speed":4']);
        await locators.x4Speed.click();
        await stopCommand;
        wsFrame = await startCommand;
        await cellIsPlaying(page, 0, 5, true);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);

        //Останавливаем видео и проверяем что отправилось соответсвующее сообщение в WS
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);

        //Перемещаем поинтер, переключаем воспроизведение на скорость x2 и воспроизводим
        await clickToInterval(locators.lastInterval, 0.3);
        startPointerTime = await locators.pointerTime.innerText();
        startCommand = waitWebSocketSentMessage(WS, ['"speed":2']);
        await locators.x2Speed.click();
        await locators.playButton.click();
        wsFrame = await startCommand;
        await cellIsPlaying(page, 0, 5, true);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Переключаем восрпоизведение на скорость -x2 и проверяем, что предыдущий поток остановлен и инициирован новый
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        startCommand = waitWebSocketSentMessage(WS, ['"speed":-2']);
        await locators.x2SpeedReversed.click();
        await stopCommand;
        wsFrame = await startCommand;
        await cellIsPlaying(page, 0, 5, true);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime, true);
        startPointerTime = lastPointerTime;

        //Переключаем восрпоизведение на скорость -x1 и проверяем, что предыдущий поток остановлен и инициирован новый
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        startCommand = waitWebSocketSentMessage(WS, ['"speed":-1']);
        await locators.x1SpeedReversed.click();
        await stopCommand;
        wsFrame = await startCommand;
        await cellIsPlaying(page, 0, 5, true);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime, true);

        //Перемещаем поинтер и проверяем что поток остановлен
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await clickToInterval(locators.lastInterval, 0.7);
        await stopCommand;
        await isMessagesStop(page, WS);

        //Переключаем воспроизведение на скорость -x4 и воспроизводим
        startPointerTime = await locators.pointerTime.innerText();
        startCommand = waitWebSocketSentMessage(WS, ['"speed":-4']);
        await locators.x4SpeedReversed.click();
        await locators.playButton.click();
        wsFrame = await startCommand;
        await cellIsPlaying(page, 0, 5, true);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime, true);

        //Останавливаем видео и проверяем что отправилось соответсвующее сообщение в WS
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS); 
        
        await clientNotFall(page);
    });

    test('X12 or X4 layout H264 play (CLOUD-T302) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        const cameraCount = canPlayH265 && !isCloudTest ? 12 : 4;
        if (canPlayH265 && !isCloudTest) {
            await createLayout(h264Cameras, 4, 3, "X12-H264");
        } else await createLayout(h264Cameras, 2, 2, "X4-H264");

        //Проверяем, что записи достаточно
        await isRecordEnough(page);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        //Получаем веб-сокет объект видеостримов
        const WS = await page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        console.log(WS.url());

        //Переходим в архив
        await locators.cellTitle.nth(0).waitFor({ state: 'attached' });
        await locators.multiArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(cameraCount);
        for (let cameraName of await locators.cellTitle.all()) {
            await expect(cameraName).toContainText("H264");
        }

        //Кликаем на центр последнего записанного интервала
        await scrollLastInterval(page);
        await clickToInterval(locators.lastInterval, 0.5);

        //Сохраняем время поинтера перед воспроизведением и жмем на плей
        let startPointerTime = await locators.pointerTime.innerText();
        let startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        let wsFrame = await startCommand;
        await cellsArePlaying(page, cameraCount, 5);
        let lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Переключаем восрпоизведение на скорость x4 и проверяем, что предыдущий поток остановлен и инициирован новый
        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        startCommand = waitWebSocketSentMessage(WS, ['"speed":4']);
        await locators.x4Speed.click();
        await stopCommand;
        wsFrame = await startCommand;
        await cellsArePlaying(page, cameraCount, 5);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);

        //Останавливаем видео и проверяем что отправилось соответсвующее сообщение в WS
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);

        //Перемещаем поинтер, переключаем воспроизведение на скорость x2 и воспроизводим
        await clickToInterval(locators.lastInterval, 0.3);
        startPointerTime = await locators.pointerTime.innerText();
        startCommand = waitWebSocketSentMessage(WS, ['"speed":2']);
        await locators.x2Speed.click();
        await locators.playButton.click();
        wsFrame = await startCommand;
        await cellsArePlaying(page, cameraCount, 5);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Переключаем восрпоизведение на скорость -x2 и проверяем, что предыдущий поток остановлен и инициирован новый
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        startCommand = waitWebSocketSentMessage(WS, ['"speed":-2']);
        await locators.x2SpeedReversed.click();
        await stopCommand;
        wsFrame = await startCommand;
        await cellsArePlaying(page, cameraCount, 5);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime, true);
        startPointerTime = lastPointerTime;

        //Переключаем восрпоизведение на скорость -x1 и проверяем, что предыдущий поток остановлен и инициирован новый
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        startCommand = waitWebSocketSentMessage(WS, ['"speed":-1']);
        await locators.x1SpeedReversed.click();
        await stopCommand;
        wsFrame = await startCommand;
        await cellsArePlaying(page, cameraCount, 5);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime, true);

        //Перемещаем поинтер и проверяем что поток остановлен
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await clickToInterval(locators.lastInterval, 0.7);
        await stopCommand;
        await isMessagesStop(page, WS);

        //Переключаем воспроизведение на скорость -x4 и воспроизводим
        startPointerTime = await locators.pointerTime.innerText();
        startCommand = waitWebSocketSentMessage(WS, ['"speed":-4']);
        await locators.x4SpeedReversed.click();
        await locators.playButton.click();
        wsFrame = await startCommand;
        await cellsArePlaying(page, cameraCount, 5);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime, true);

        //Останавливаем видео и проверяем что отправилось соответсвующее сообщение в WS
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);  
        
        await clientNotFall(page);
    });

    test('X9 or X2 layout H265 playback (CLOUD-T303)', async ({ page }) => {
        const locators = new Locators(page);
        const cameraCount = canPlayH265 && !isCloudTest ? 9 : 2;
        if (canPlayH265 && !isCloudTest) {
            await createLayout(h265Cameras, 3, 3, "X9-H265");
        } else await createLayout(h265Cameras, 2, 1, "X2-H265");

        //Проверяем, что записи достаточно
        await isRecordEnough(page);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        //Получаем веб-сокет объект видеостримов
        const WS = await page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        console.log(WS.url());

        //Переходим в архив
        await locators.cellTitle.nth(0).waitFor({ state: 'attached' });
        await locators.multiArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(cameraCount);
        for (let cameraName of await locators.cellTitle.all()) {
            await expect(cameraName).toContainText("H265");
        }

        //Кликаем на центр последнего записанного интервала
        await scrollLastInterval(page);
        await clickToInterval(locators.lastInterval, 0.5);

        //Сохраняем время поинтера перед воспроизведением и жмем на плей
        let startPointerTime = await locators.pointerTime.innerText();
        let startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        let wsFrame = await startCommand;
        await cellsArePlaying(page, cameraCount, 5);
        let lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Переключаем восрпоизведение на скорость x4 и проверяем, что предыдущий поток остановлен и инициирован новый
        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        startCommand = waitWebSocketSentMessage(WS, ['"speed":4']);
        await locators.x4Speed.click();
        await stopCommand;
        wsFrame = await startCommand;
        await cellsArePlaying(page, cameraCount, 5);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);

        //Останавливаем видео и проверяем что отправилось соответсвующее сообщение в WS
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);

        //Перемещаем поинтер, переключаем воспроизведение на скорость x2 и воспроизводим
        await clickToInterval(locators.lastInterval, 0.3);
        startPointerTime = await locators.pointerTime.innerText();
        startCommand = waitWebSocketSentMessage(WS, ['"speed":2']);
        await locators.x2Speed.click();
        await locators.playButton.click();
        wsFrame = await startCommand;
        await cellsArePlaying(page, cameraCount, 5);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Переключаем восрпоизведение на скорость -x2 и проверяем, что предыдущий поток остановлен и инициирован новый
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        startCommand = waitWebSocketSentMessage(WS, ['"speed":-2']);
        await locators.x2SpeedReversed.click();
        await stopCommand;
        wsFrame = await startCommand;
        await cellsArePlaying(page, cameraCount, 5);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime, true);
        startPointerTime = lastPointerTime;

        //Переключаем восрпоизведение на скорость -x1 и проверяем, что предыдущий поток остановлен и инициирован новый
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        startCommand = waitWebSocketSentMessage(WS, ['"speed":-1']);
        await locators.x1SpeedReversed.click();
        await stopCommand;
        wsFrame = await startCommand;
        await cellsArePlaying(page, cameraCount, 5);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime, true);

        //Перемещаем поинтер и проверяем что поток остановлен
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await clickToInterval(locators.lastInterval, 0.7);
        await stopCommand;
        await isMessagesStop(page, WS);

        //Переключаем воспроизведение на скорость -x4 и воспроизводим
        startPointerTime = await locators.pointerTime.innerText();
        startCommand = waitWebSocketSentMessage(WS, ['"speed":-4']);
        await locators.x4SpeedReversed.click();
        await locators.playButton.click();
        wsFrame = await startCommand;
        await cellsArePlaying(page, cameraCount, 5);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime, true);

        //Останавливаем видео и проверяем что отправилось соответсвующее сообщение в WS
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);
        
        await clientNotFall(page);
    });

    test('X16 or X4 layout H264/H265/MJPEG playback (CLOUD-T304)', async ({ page }) => {
        const locators = new Locators(page);
        const cameraCount = canPlayH265 && !isCloudTest ? 16 : 4;

        let mixedArr = Array();
        if (canPlayH265 && !isCloudTest) {
            for (let i = 0; i < cameraCount; i++) {
                if (i < 8) {
                    mixedArr.push(h264Cameras[i]);
                } else if (i < 14) {
                    mixedArr.push(h265Cameras[i-8]);
                } else if (i < 16) {
                    mixedArr.push(mjpegCameras[i-14]);
                }
            }
        } else mixedArr = [h264Cameras[0], h264Cameras[1], h265Cameras[0], mjpegCameras[0]];

        if (canPlayH265 && !isCloudTest) {
            await createLayout(mixedArr, 4, 4, "X16-MIXED");
        } else await createLayout(mixedArr, 2, 2, "X4-MIXED");

        //Проверяем, что записи достаточно
        await isRecordEnough(page);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        //Получаем веб-сокет объект видеостримов
        const WS = await page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        console.log(WS.url());

        //Переходим в архив
        await locators.cellTitle.nth(0).waitFor({ state: 'attached' });
        await locators.multiArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(cameraCount);
        
        //Кликаем на центр последнего записанного интервала
        await scrollLastInterval(page);
        await clickToInterval(locators.lastInterval, 0.5);

        //Сохраняем время поинтера перед воспроизведением
        let startPointerTime = await locators.pointerTime.innerText();
        let mp4StartCommand = waitWebSocketSentMessage(WS, ['"speed":1', 'mp4']);
        let mjpegStartCommand = waitWebSocketSentMessage(WS, ['"speed":1', 'jpeg']);
        await locators.playButton.click();
        let wsFrameMP4 = await mp4StartCommand;
        let wsFrameMJPEG = await mjpegStartCommand;
        await cellsArePlaying(page, cameraCount, 10);
        let lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Переключаем восрпоизведение на скорость x2 и проверяем, что предыдущие потоки остановлены и инициированы новые
        mp4StartCommand = waitWebSocketSentMessage(WS, ['"speed":2', 'mp4']);
        mjpegStartCommand = waitWebSocketSentMessage(WS, ['"speed":2', 'jpeg']);
        let mp4StopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrameMP4.streamId]);
        let mjpegStopCommand =  waitWebSocketSentMessage(WS, ['stop', wsFrameMJPEG.streamId]);
        await locators.x2Speed.click();
        await mp4StopCommand;
        await mjpegStopCommand;
        wsFrameMP4 = await mp4StartCommand;
        wsFrameMJPEG = await mjpegStartCommand;
        await cellsArePlaying(page, cameraCount, 5);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);

        //Останавливаем видео и проверяем что отправилось соответсвующее сообщение в WS
        mp4StopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrameMP4.streamId]);
        mjpegStopCommand =  waitWebSocketSentMessage(WS, ['stop', wsFrameMJPEG.streamId]);
        await locators.playButton.click();
        await mp4StopCommand;
        await mjpegStopCommand;
        await isMessagesStop(page, WS);

        //Перемещаем поинтер, переключаем воспроизведение на скорость -x2 и воспроизводим
        await clickToInterval(locators.lastInterval, 0.7);
        startPointerTime =await locators.pointerTime.innerText();
        mp4StartCommand = waitWebSocketSentMessage(WS, ['"speed":-2', 'mp4']);
        mjpegStartCommand = waitWebSocketSentMessage(WS, ['"speed":-2', 'jpeg']);
        await locators.x2SpeedReversed.click();
        await locators.playButton.click();
        wsFrameMP4 = await mp4StartCommand;
        wsFrameMJPEG = await mjpegStartCommand;
        await cellsArePlaying(page, cameraCount, 10);
        lastPointerTime = await locators.archivePointer.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime, true);
        startPointerTime = lastPointerTime;

        //Переключаем восрпоизведение на скорость -x1 и проверяем, что предыдущий поток остановлен и инициирован новый
        mp4StartCommand = waitWebSocketSentMessage(WS, ['"speed":-1', 'mp4']);
        mjpegStartCommand = waitWebSocketSentMessage(WS, ['"speed":-1', 'jpeg']);
        mp4StopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrameMP4.streamId]);
        mjpegStopCommand =  waitWebSocketSentMessage(WS, ['stop', wsFrameMJPEG.streamId]);
        await locators.x1SpeedReversed.click();
        await mp4StopCommand;
        await mjpegStopCommand;
        wsFrameMP4 = await mp4StartCommand;
        wsFrameMJPEG = await mjpegStartCommand;
        await cellsArePlaying(page, cameraCount, 5);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime, true);

        //Останавливаем видео и проверяем что отправилось соответсвующее сообщение в WS
        mp4StopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrameMP4.streamId]);
        mjpegStopCommand =  waitWebSocketSentMessage(WS, ['stop', wsFrameMJPEG.streamId]);
        await locators.playButton.click();
        await mp4StopCommand;
        await mjpegStopCommand;
        await isMessagesStop(page, WS);
        
        await clientNotFall(page);
    });

    test('Layout playback with camera recording disabled (CLOUD-T305) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "H264 Empty", -1);
        const lastCamera = Configuration.cameras[Configuration.cameras.length - 1];
        await addVirtualVideo([lastCamera], "tracker", "tracker");
        await createArchiveContext("Black", [lastCamera], false, "High");
        await createLayout([h264Cameras[0], h264Cameras[1], h265Cameras[0], lastCamera], 2, 2, "Without record");
       
        //Проверяем, что записи достаточно
        await isRecordEnough(page);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        //Получаем веб-сокет объект видеостримов
        const WS = await page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        console.log(WS.url());

        //Переходим в архив
        await locators.cellTitle.nth(0).waitFor({ state: 'attached' });
        await locators.multiArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(4);
        await expect(locators.cellTitle.nth(0)).toContainText("H264");
        await expect(locators.cellTitle.nth(1)).toContainText("H264");
        await expect(locators.cellTitle.nth(2)).toContainText("H265");
        await expect(locators.cellTitle.nth(3)).toContainText("H264 Empty");
        await expect(locators.cellInfoContainer.last()).toHaveText("No records in archive", { ignoreCase: false });
        await expect(locators.cellContainerSVG.last()).toBeVisible();
        
        //Кликаем на начало последнего записанного интервала
        await scrollLastInterval(page);
        await clickToInterval(locators.lastInterval, 0.3);
        page.waitForTimeout(3000);
        let emptyCellFirstFrame = await locators.canvasElement.nth(3).screenshot();
        console.log("Start frame size: " + emptyCellFirstFrame.length + " bytes");

        //Сохраняем время поинтера перед воспроизведением и жмем на плей
        let startPointerTime = await locators.pointerTime.innerText();
        let startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        let wsFrame = await startCommand;
        await expect(locators.cellInfoContainer.last()).toHaveText("No records in archive", { ignoreCase: false });
        await expect(locators.cellContainerSVG.last()).toBeVisible();
        let promiseArray = [
            cellIsPlaying(page, 0, 5, true),
            cellIsPlaying(page, 1, 5, true),
            cellIsPlaying(page, 2, 5, true),
            cellIsPlaying(page, 3, 5, false),
        ];
        await Promise.all(promiseArray);
        let emptyCellLastFrame = await locators.canvasElement.nth(3).screenshot();
        emptyCellFirstFrame.length - 100 < emptyCellLastFrame.length && emptyCellLastFrame.length < emptyCellFirstFrame.length + 100
        let lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Выбираем вторую камеру и проверяем, что видео не останавилось, сообщение о пустом архиве присутсвует
        await locators.gridcell.nth(1).click();
        await expect(locators.cellInfoContainer.last()).toHaveText("No records in archive", { ignoreCase: false });
        await expect(locators.cellContainerSVG.last()).toBeVisible();
        promiseArray = [
            cellIsPlaying(page, 0, 5, true),
            cellIsPlaying(page, 1, 5, true),
            cellIsPlaying(page, 2, 5, true),
            cellIsPlaying(page, 3, 5, false),
        ];
        await Promise.all(promiseArray);
        emptyCellLastFrame = await locators.canvasElement.nth(3).screenshot();
        emptyCellFirstFrame.length - 100 < emptyCellLastFrame.length && emptyCellLastFrame.length < emptyCellFirstFrame.length + 100
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Ставим архив на паузу и проверяем, что поток команд прекратился
        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);

        //Кликаем на кнопку воспроизведения и ждем сообщение о старте потоков со скоростью 1
        startPointerTime = await locators.pointerTime.innerText();
        startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        wsFrame = await startCommand;
        await expect(locators.cellInfoContainer.last()).toHaveText("No records in archive", { ignoreCase: false });
        await expect(locators.cellContainerSVG.last()).toBeVisible();
        promiseArray = [
            cellIsPlaying(page, 0, 5, true),
            cellIsPlaying(page, 1, 5, true),
            cellIsPlaying(page, 2, 5, true),
            cellIsPlaying(page, 3, 5, false),
        ];
        await Promise.all(promiseArray);
        emptyCellLastFrame = await locators.canvasElement.nth(3).screenshot();
        emptyCellFirstFrame.length - 100 < emptyCellLastFrame.length && emptyCellLastFrame.length < emptyCellFirstFrame.length + 100
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Выбираем третью камеру и проверяем, что видео не останавилось, сообщение о пустом архиве присутсвует
        await locators.gridcell.nth(2).click();
        await expect(locators.cellInfoContainer.last()).toHaveText("No records in archive", { ignoreCase: false });
        await expect(locators.cellContainerSVG.last()).toBeVisible();
        promiseArray = [
            cellIsPlaying(page, 0, 5, true),
            cellIsPlaying(page, 1, 5, true),
            cellIsPlaying(page, 2, 5, true),
            cellIsPlaying(page, 3, 5, false),
        ];
        await Promise.all(promiseArray);
        emptyCellLastFrame = await locators.canvasElement.nth(3).screenshot();
        emptyCellFirstFrame.length - 100 < emptyCellLastFrame.length && emptyCellLastFrame.length < emptyCellFirstFrame.length + 100
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Ставим архив на паузу и проверяем, что поток команд прекратился
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);

        //Кликаем на кнопку воспроизведения и ждем сообщение о старте потоков со скоростью 1
        startPointerTime = await locators.pointerTime.innerText();
        startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        wsFrame = await startCommand;
        await expect(locators.cellInfoContainer.last()).toHaveText("No records in archive", { ignoreCase: false });
        await expect(locators.cellContainerSVG.last()).toBeVisible();
        promiseArray = [
            cellIsPlaying(page, 0, 5, true),
            cellIsPlaying(page, 1, 5, true),
            cellIsPlaying(page, 2, 5, true),
            cellIsPlaying(page, 3, 5, false),
        ];
        await Promise.all(promiseArray);
        emptyCellLastFrame = await locators.canvasElement.nth(3).screenshot();
        emptyCellFirstFrame.length - 100 < emptyCellLastFrame.length && emptyCellLastFrame.length < emptyCellFirstFrame.length + 100
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);

        //Выбираем четвертую камеру
        await locators.gridcell.nth(3).click();
        await expect(locators.cellInfoContainer.last()).toHaveText("No records in archive", { ignoreCase: false });
        await expect(locators.cellContainerSVG.last()).toBeVisible();
        promiseArray = [
            cellIsPlaying(page, 0, 5, true),
            cellIsPlaying(page, 1, 5, true),
            cellIsPlaying(page, 2, 5, true),
            cellIsPlaying(page, 3, 5, false),
        ];
        await Promise.all(promiseArray);

        //Ставим архив на паузу и проверяем, что поток команд прекратился
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);
        
        await clientNotFall(page);
    });

    test('Layout playback with no camera archive (CLOUD-T306)', async ({ page }) => {
        const locators = new Locators(page);

        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "H264 No Archive", -1);
        const lastCamera = Configuration.cameras[Configuration.cameras.length - 1];
        await addVirtualVideo([lastCamera], "tracker", "tracker");
        await createLayout([h264Cameras[0], h264Cameras[1], h265Cameras[0], lastCamera], 2, 2, "Without archive");
        
        //Проверяем, что записи достаточно
        await isRecordEnough(page);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        //Получаем веб-сокет объект видеостримов
        const WS = await page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        console.log(WS.url());

        //Переходим в архив
        await locators.cellTitle.nth(0).waitFor({ state: 'attached' });
        await locators.multiArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(4);
        await expect(locators.cellTitle.nth(0)).toContainText("H264");
        await expect(locators.cellTitle.nth(1)).toContainText("H264");
        await expect(locators.cellTitle.nth(2)).toContainText("H265");
        await expect(locators.cellTitle.nth(3)).toContainText("H264 No Archive");
        await expect(locators.cellInfoContainer.last()).toHaveText("No records in archive", { ignoreCase: false });
        await expect(locators.cellContainerSVG.last()).toBeVisible();

        //Кликаем на начало последнего записанного интервала
        await scrollLastInterval(page);
        await clickToInterval(locators.lastInterval, 0.3);
        page.waitForTimeout(3000);
        let emptyCellFirstFrame = await locators.canvasElement.nth(3).screenshot();
        console.log("Start frame size: " + emptyCellFirstFrame.length + " bytes");

        //Сохраняем время поинтера перед воспроизведением и жмем на плей
        let startPointerTime = await locators.pointerTime.innerText();
        let startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        let wsFrame = await startCommand;
        await expect(locators.cellInfoContainer.last()).toHaveText("No records in archive", { ignoreCase: false });
        await expect(locators.cellContainerSVG.last()).toBeVisible();
        let promiseArray = [
            cellIsPlaying(page, 0, 5, true),
            cellIsPlaying(page, 1, 5, true),
            cellIsPlaying(page, 2, 5, true),
            cellIsPlaying(page, 3, 5, false),
        ];
        await Promise.all(promiseArray);
        let emptyCellLastFrame = await locators.canvasElement.nth(3).screenshot();
        emptyCellFirstFrame.length - 100 < emptyCellLastFrame.length && emptyCellLastFrame.length < emptyCellFirstFrame.length + 100
        let lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Выбираем вторую камеру и проверяем, что видео не останавилось, сообщение о пустом архиве присутсвует
        await locators.gridcell.nth(1).click();
        await expect(locators.cellInfoContainer.last()).toHaveText("No records in archive", { ignoreCase: false });
        await expect(locators.cellContainerSVG.last()).toBeVisible();
        promiseArray = [
            cellIsPlaying(page, 0, 5, true),
            cellIsPlaying(page, 1, 5, true),
            cellIsPlaying(page, 2, 5, true),
            cellIsPlaying(page, 3, 5, false),
        ];
        await Promise.all(promiseArray);
        emptyCellLastFrame = await locators.canvasElement.nth(3).screenshot();
        emptyCellFirstFrame.length - 100 < emptyCellLastFrame.length && emptyCellLastFrame.length < emptyCellFirstFrame.length + 100
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Ставим архив на паузу и проверяем, что поток команд прекратился
        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);

        //Кликаем на кнопку воспроизведения и ждем сообщение о старте потоков со скоростью 1
        startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        wsFrame = await startCommand;
        await expect(locators.cellInfoContainer.last()).toHaveText("No records in archive", { ignoreCase: false });
        await expect(locators.cellContainerSVG.last()).toBeVisible();
        promiseArray = [
            cellIsPlaying(page, 0, 5, true),
            cellIsPlaying(page, 1, 5, true),
            cellIsPlaying(page, 2, 5, true),
            cellIsPlaying(page, 3, 5, false),
        ];
        await Promise.all(promiseArray);
        emptyCellLastFrame = await locators.canvasElement.nth(3).screenshot();
        emptyCellFirstFrame.length - 100 < emptyCellLastFrame.length && emptyCellLastFrame.length < emptyCellFirstFrame.length + 100
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Выбираем третью камеру и проверяем, что видео не останавилось, сообщение о пустом архиве присутсвует
        await locators.gridcell.nth(2).click();
        await expect(locators.cellInfoContainer.last()).toHaveText("No records in archive", { ignoreCase: false });
        await expect(locators.cellContainerSVG.last()).toBeVisible();
        promiseArray = [
            cellIsPlaying(page, 0, 5, true),
            cellIsPlaying(page, 1, 5, true),
            cellIsPlaying(page, 2, 5, true),
            cellIsPlaying(page, 3, 5, false),
        ];
        await Promise.all(promiseArray);
        emptyCellLastFrame = await locators.canvasElement.nth(3).screenshot();
        emptyCellFirstFrame.length - 100 < emptyCellLastFrame.length && emptyCellLastFrame.length < emptyCellFirstFrame.length + 100
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Ставим архив на паузу и проверяем, что поток команд прекратился
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);

        //Кликаем на кнопку воспроизведения и ждем сообщение о старте потоков со скоростью 1
        startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        wsFrame = await startCommand;
        await expect(locators.cellInfoContainer.last()).toHaveText("No records in archive", { ignoreCase: false });
        await expect(locators.cellContainerSVG.last()).toBeVisible();
        promiseArray = [
            cellIsPlaying(page, 0, 5, true),
            cellIsPlaying(page, 1, 5, true),
            cellIsPlaying(page, 2, 5, true),
            cellIsPlaying(page, 3, 5, false),
        ];
        await Promise.all(promiseArray);
        emptyCellLastFrame = await locators.canvasElement.nth(3).screenshot();
        emptyCellFirstFrame.length - 100 < emptyCellLastFrame.length && emptyCellLastFrame.length < emptyCellFirstFrame.length + 100
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);

        //Выбираем четвертую камеру
        await locators.gridcell.nth(3).click();
        await expect(locators.cellInfoContainer.last()).toHaveText("No records in archive", { ignoreCase: false });
        await expect(locators.cellContainerSVG.last()).toBeVisible();
        promiseArray = [
            cellIsPlaying(page, 0, 5, true),
            cellIsPlaying(page, 1, 5, true),
            cellIsPlaying(page, 2, 5, true),
            cellIsPlaying(page, 3, 5, false),
        ];
        await Promise.all(promiseArray);

        //Ставим архив на паузу и проверяем, что поток команд прекратился
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);
        
        await clientNotFall(page);
    });

    test('Layout playback with duplicate camera (CLOUD-T307)', async ({ page }) => {
        const locators = new Locators(page);

        await createLayout([h264Cameras[0], h264Cameras[1], h265Cameras[0], h264Cameras[0]], 2, 2, "Duplicate camera");
        
        //Проверяем, что записи достаточно
        await isRecordEnough(page);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        
        //Получаем веб-сокет объект видеостримов
        const WS = await page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        console.log(WS.url());
        
        //Переходим в архив
        await locators.cellTitle.nth(0).waitFor({ state: 'attached' });
        await locators.multiArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(4);
        await expect(locators.cellTitle.nth(0)).toContainText("H264");
        await expect(locators.cellTitle.nth(1)).toContainText("H264");
        await expect(locators.cellTitle.nth(2)).toContainText("H265");
        await expect(locators.cellTitle.nth(3)).toContainText("H264");
        await expect(locators.gridcell.locator('.VideoCell--active')).toHaveCount(2);

        //Кликаем на начало последнего записанного интервала
        await scrollLastInterval(page);
        await clickToInterval(locators.lastInterval, 0.3);

        //Сохраняем время поинтера перед воспроизведением и жмем на плей
        let startPointerTime = await locators.pointerTime.innerText();
        let startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        let wsFrame = await startCommand;
        await cellsArePlaying(page, 4, 5);
        let lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Ставим архив на паузу и проверяем, что поток команд прекратился
        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);

        //Сохраняем время поинтера перед воспроизведением и жмем на плей
        startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        wsFrame = await startCommand;
        await cellsArePlaying(page, 4, 5);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Переключаем восрпоизведение на скорость x2 и проверяем, что предыдущий поток остановлен и инициирован новый
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        startCommand = waitWebSocketSentMessage(WS, ['"speed":2']);
        await locators.x2Speed.click();
        await stopCommand;
        wsFrame = await startCommand;
        await cellsArePlaying(page, 4, 5);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Выбираем вторую камеру и проверяем, что видео не останавилось
        await locators.gridcell.nth(1).click();
        await cellsArePlaying(page, 4, 5);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Ставим архив на паузу и проверяем, что поток команд прекратился
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);

        //Выбираем третью камеру и воспрозводим архив на скорости x1
        await locators.gridcell.nth(2).click();
        await locators.x1Speed.click();
        startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        wsFrame = await startCommand;
        await cellsArePlaying(page, 4, 5);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Выбираем четвертую камеру и проверяем, что видео не останавилось
        await locators.gridcell.nth(3).click();
        await cellsArePlaying(page, 4, 5);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Ставим архив на паузу и проверяем, что поток команд прекратился
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);
        
        await clientNotFall(page);
    });

    test('Switching between solo and layout playback (CLOUD-T308) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await createLayout([h264Cameras[0], h264Cameras[1], h265Cameras[0], h265Cameras[1]], 2, 2, "Transition");
        
        //Проверяем, что записи достаточно
        await isRecordEnough(page);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        //Получаем веб-сокет объект видеостримов
        const WS = await page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        console.log(WS.url());

        //Переходим в архив
        await locators.cellTitle.nth(0).waitFor({ state: 'attached' });
        await locators.multiArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(4);
        await expect(locators.cellTitle.nth(0)).toContainText("H264");
        await expect(locators.cellTitle.nth(1)).toContainText("H264");
        await expect(locators.cellTitle.nth(2)).toContainText("H265");
        await expect(locators.cellTitle.nth(3)).toContainText("H265");

        //Кликаем на начало последнего записанного интервала
        await scrollLastInterval(page);
        await clickToInterval(locators.lastInterval, 0.3);

        //Сохраняем время поинтера перед воспроизведением и жмем на плей
        let startPointerTime = await locators.pointerTime.innerText();
        let startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        let wsFrame = await startCommand;
        await cellsArePlaying(page, 4, 5);
        let lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Дважды кликаем на первую камеру и проверяем, что видео остановлено
        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.gridcell.nth(0).dblclick();
        await stopCommand;
        await isMessagesStop(page, WS);
        await expect(locators.cellTitle).toHaveCount(1);
        await expect(locators.cellTitle.nth(0)).toContainText("H264");

        //Кликаем на кнопку воспроизведения и ждем сообщение о старте потоков со скоростью 1
        startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        wsFrame = await startCommand;
        await cellIsPlaying(page, 0, 5, true);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Дважды кликаем на первую камеру и проверяем, что видео остановлено
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.gridcell.nth(0).dblclick();
        await stopCommand;
        await isMessagesStop(page, WS);
        await expect(locators.cellTitle).toHaveCount(4);

        //Кликаем на кнопку воспроизведения и ждем сообщение о старте потоков со скоростью 1
        startPointerTime = await locators.pointerTime.innerText();
        startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        wsFrame = await startCommand;
        await cellsArePlaying(page, 4, 5);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;
        
        //Дважды кликаем на последнюю камеру и проверяем, что видео остановлено
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.gridcell.nth(3).dblclick();
        await stopCommand;
        await isMessagesStop(page, WS);
        await expect(locators.cellTitle).toHaveCount(1);
        await expect(locators.cellTitle.nth(0)).toContainText("H265");

        //Кликаем на кнопку воспроизведения и ждем сообщение о старте потоков со скоростью 1
        startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        wsFrame = await startCommand;
        await cellIsPlaying(page, 0, 5, true);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Ставим архив на паузу и проверяем, что поток команд прекратился
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);

        //Дважды кликаем на камеру
        await locators.gridcell.nth(0).dblclick();
        await expect(locators.cellTitle).toHaveCount(4);

        //Кликаем на кнопку воспроизведения и ждем сообщение о старте потоков со скоростью 1
        startPointerTime = await locators.pointerTime.innerText();
        startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        wsFrame = await startCommand;
        await cellsArePlaying(page, 4, 5);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Ставим архив на паузу и проверяем, что поток команд прекратился
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);
        
        await clientNotFall(page);
    });

    test('Switch layout while playing (CLOUD-T309)', async ({ page }) => {
        const locators = new Locators(page);

        await createLayout([h264Cameras[0], h265Cameras[0], h264Cameras[1], h265Cameras[1]], 2, 2, "Full");
        await createLayout([h265Cameras[1], h264Cameras[1]], 2, 1, "Half 2");
        await createLayout([h264Cameras[0], h265Cameras[0]], 2, 1, "Half 1");

        //Проверяем, что записи достаточно
        await isRecordEnough(page);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        //Получаем веб-сокет объект видеостримов
        const WS = await page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        console.log(WS.url());

        //Переходим в архив
        await locators.cellTitle.nth(0).waitFor({ state: 'attached' });
        await locators.multiArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(2);
        await expect(locators.cellTitle.nth(0)).toContainText("H264");
        await expect(locators.cellTitle.nth(1)).toContainText("H265");
        await expect(locators.videoCell.nth(0)).toHaveClass(/.*VideoCell--active.*/);

        //Кликаем на начало последнего записанного интервала
        await scrollLastInterval(page);
        await clickToInterval(locators.lastInterval, 0.3);

        //Сохраняем время поинтера перед воспроизведением
        let startPointerTime = await locators.pointerTime.innerText();
        let startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        let wsFrame = await startCommand;
        await cellsArePlaying(page, 2, 5);
        let lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Выбираем вторую раскладку и проверяем, что видео остановлено
        await locators.expandLayoutList.click();
        await waitAnimationEnds(page, locators.layoutItems);
        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.secondLayout.click();
        await stopCommand;
        await isMessagesStop(page, WS);
        await expect(locators.cellTitle).toHaveCount(2);
        await expect(locators.cellTitle.nth(0)).toContainText("H265");
        await expect(locators.cellTitle.nth(1)).toContainText("H264");
        await expect(locators.videoCell.nth(0)).toHaveClass(/.*VideoCell--active.*/);

        //Кликаем на кнопку воспроизведения и ждем сообщение о старте потоков со скоростью 1
        startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        wsFrame = await startCommand;
        await cellsArePlaying(page, 2, 5);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Ставим архив на паузу и проверяем, что поток команд прекратился
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);

        //Выбираем третью раскладку
        await locators.expandLayoutList.click();
        await waitAnimationEnds(page, locators.layoutItems);
        await locators.thirdLayout.click();
        await expect(locators.cellTitle).toHaveCount(4);
        await expect(locators.cellTitle.nth(0)).toContainText("H264");
        await expect(locators.cellTitle.nth(1)).toContainText("H265");
        await expect(locators.cellTitle.nth(2)).toContainText("H264");
        await expect(locators.cellTitle.nth(3)).toContainText("H265");
        await expect(locators.videoCell.nth(3)).toHaveClass(/.*VideoCell--active.*/);

        //Кликаем на кнопку воспроизведения и ждем сообщение о старте потоков со скоростью 1
        startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        wsFrame = await startCommand;
        await cellsArePlaying(page, 4, 5);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Ставим архив на паузу и проверяем, что поток команд прекратился
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);
        
        await clientNotFall(page);
    });

    test('Switch archive while playing (CLOUD-T310)', async ({ page }) => {
        const locators = new Locators(page);

        await deleteArchive("White");
        await createArchive("White");
        await createArchiveVolume("White", 1);
        await createArchiveContext("White", [h264Cameras[0], h264Cameras[1], h265Cameras[0], h265Cameras[1]], true, "High");
        await createLayout([h264Cameras[0], h264Cameras[1], h265Cameras[0], h265Cameras[1]], 2, 2, "Full");
        
        //Проверяем, что записи достаточно
        await isRecordEnough(page);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        //Получаем веб-сокет объект видеостримов
        const WS = await page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        console.log(WS.url());

        //Переходим в архив
        await locators.cellTitle.nth(0).waitFor({ state: 'attached' });
        await locators.multiArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(4);
        await expect(locators.cellTitle.nth(0)).toContainText("H264");
        await expect(locators.cellTitle.nth(1)).toContainText("H264");
        await expect(locators.cellTitle.nth(2)).toContainText("H265");
        await expect(locators.cellTitle.nth(3)).toContainText("H265");
        
        //Кликаем на начало последнего записанного интервала
        await scrollLastInterval(page);
        await clickToInterval(locators.lastInterval, 0.3);

        //Сохраняем время поинтера перед воспроизведением
        let startPointerTime = await locators.pointerTime.innerText();
        let startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        let wsFrame = await startCommand;
        expect(wsFrame.entities[0].archive.includes('Black')).toBeTruthy();
        expect(wsFrame.entities[1].archive.includes('Black')).toBeTruthy();
        if (canPlayH265) {
            expect(wsFrame.entities[2].archive.includes('Black')).toBeTruthy();
            expect(wsFrame.entities[3].archive.includes('Black')).toBeTruthy();
        }
        await cellsArePlaying(page, 4, 5);
        let lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Переключаем архив на первой камере
        await locators.cellArchiveMenu.nth(0).click();
        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.webpage.getByRole('menuitem', { name: 'White' }).click();
        await stopCommand;
        await isMessagesStop(page, WS);

        //Кликаем на кнопку воспроизведения и ждем сообщение о старте потоков со скоростью 1
        startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        wsFrame = await startCommand;
        startPointerTime = await locators.pointerTime.innerText();
        expect(wsFrame.entities[0].archive.includes('White')).toBeTruthy();
        expect(wsFrame.entities[1].archive.includes('Black')).toBeTruthy();
        if (canPlayH265) {
            expect(wsFrame.entities[2].archive.includes('Black')).toBeTruthy();
            expect(wsFrame.entities[3].archive.includes('Black')).toBeTruthy();
        }
        await cellsArePlaying(page, 4, 5);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Ставим архив на паузу и проверяем, что поток команд прекратился
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);

        //Переключаем архив на всех камерах
        for (let i = 0; i < 4; i++) {
            await locators.cellArchiveMenu.nth(i).click();
            await locators.webpage.getByRole('menuitem', { name: 'White' }).click();
            await locators.webpage.getByRole('menuitem', { name: 'White' }).waitFor({ state: 'detached' });
        }

        //Кликаем на кнопку воспроизведения и ждем сообщение о старте потоков со скоростью 1
        startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        wsFrame = await startCommand;
        startPointerTime = await locators.pointerTime.innerText();
        expect(wsFrame.entities[0].archive.includes('White')).toBeTruthy();
        expect(wsFrame.entities[1].archive.includes('White')).toBeTruthy();
        if (canPlayH265) {
            expect(wsFrame.entities[2].archive.includes('White')).toBeTruthy();
            expect(wsFrame.entities[3].archive.includes('White')).toBeTruthy();
        }
        await cellsArePlaying(page, 4, 5);
        lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        startPointerTime = lastPointerTime;

        //Переключаем архив на последней камере
        await locators.cellArchiveMenu.nth(3).click();
        stopCommand = stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.webpage.getByRole('menuitem', { name: 'Black' }).click();
        await stopCommand;
        await isMessagesStop(page, WS);
        
        await clientNotFall(page);
    });

    test('Correct codec presentation (CLOUD-T311)', async ({ page }) => {
        const locators = new Locators(page);

        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "H265/H264 High", -1);
        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "H265/H264 Low", -1);
        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "H264/MJPEG High", -1);
        let addedCameras = [Configuration.cameras[Configuration.cameras.length - 3], Configuration.cameras[Configuration.cameras.length - 2], Configuration.cameras[Configuration.cameras.length - 1]]
        await addVirtualVideo([addedCameras[0]], "H265-2K", "tracker");
        await addVirtualVideo([addedCameras[1]], "H265-2K", "tracker");
        await addVirtualVideo([addedCameras[2]], "tracker", "witcher_mjpeg");
        await createArchiveContext("Black", [addedCameras[0]], true, "High");
        await createArchiveContext("Black", [addedCameras[1]], true, "Low");
        await createArchiveContext("Black", [addedCameras[2]], true, "High");
        await createLayout([addedCameras[0], addedCameras[1], addedCameras[2]], 3, 1, "Codecs representation");
        await page.waitForTimeout(10000);

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        //Получаем веб-сокет объект видеостримов
        const WS = await page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        console.log(WS.url());

        //Активируем дебаг панель
        await locators.nextLogo.dblclick();

        //Переключаем все камеры на высокий поток
        for (let streamMenu of (await locators.cellStreamMenu.all())) {
            await streamMenu.click();
            await locators.webpage.getByRole('menuitem', { name: 'High' }).click();
            await locators.streamsList.waitFor({ state: 'detached' });
        }
        await expect(locators.webpage.getByTestId("at-camera-resolution-CAMERA_STREAM_RESOLUTION_HIGH")).toHaveCount(3);

        //Переходим в архив
        await locators.cellTitle.nth(0).waitFor({ state: 'attached' });
        await locators.multiArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(3);
        await expect(locators.videoCellDebug.nth(0)).toContainText("H265");
        await expect(locators.videoCellDebug.nth(1)).toContainText("H264");
        await expect(locators.videoCellDebug.nth(2)).toContainText("H264");

        //Кликаем на кнопку воспроизведения
        let startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        let wsFrame = await startCommand;
        await cellsArePlaying(page, 3, 5);
        await expect(locators.videoCellDebug.nth(0)).toContainText("H265");
        await expect(locators.videoCellDebug.nth(1)).toContainText("H264");
        await expect(locators.videoCellDebug.nth(2)).toContainText("H264");

        //Выходим в лайв режим
        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.liveMode.click();
        await stopCommand;

        //Переключаем все камеры на низкий поток
        await expect(locators.cellStreamMenu).toHaveCount(3);
        for (let streamMenu of (await locators.cellStreamMenu.all())) {
            await streamMenu.click();
            await locators.webpage.getByRole('menuitem', { name: 'Low' }).click();
            await locators.streamsList.waitFor({ state: 'detached' });
        }
        await expect(locators.webpage.getByTestId("at-camera-resolution-CAMERA_STREAM_RESOLUTION_LOW")).toHaveCount(3);

        //Переходим в архив
        await locators.cellTitle.nth(0).waitFor({ state: 'attached' });
        await locators.multiArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(3);
        await expect(locators.videoCellDebug.nth(0)).toContainText("H265");
        await expect(locators.videoCellDebug.nth(1)).toContainText("H264");
        await expect(locators.videoCellDebug.nth(2)).toContainText("H264");

        //Кликаем на кнопку воспроизведения
        startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        wsFrame = await startCommand;
        await cellsArePlaying(page, 3, 5);
        await expect(locators.videoCellDebug.nth(0)).toContainText("H265");
        await expect(locators.videoCellDebug.nth(1)).toContainText("H264");
        await expect(locators.videoCellDebug.nth(2)).toContainText("H264");
        
        await clientNotFall(page);
    });

    test('Playback thru archive gap, when archive exists for other cameras (CLOUD-T312) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        const camera1 = h264Cameras[0];
        const camera2 = h264Cameras[1];
        const camera3 = canPlayH265 ? h265Cameras[0] : h264Cameras[9];
        const camera4 = canPlayH265 ? h265Cameras[1] : h264Cameras[10];
        await isRecordEnough(page);
        let contextList = await getArchiveContext("Black", [camera1]);
        await changeArchiveContext(contextList, false, "High");
        const archiveRecordOffTime = new Date();
        await page.waitForTimeout(10000);
        await changeArchiveContext(contextList, true, "High");
        await createLayout([camera1, camera2, camera3, camera4], 2, 2, "Archive Gap 1");
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        //Получаем веб-сокет объект видеостримов
        const WS = await page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        console.log(WS.url());

        //Переходим в архив
        await locators.cellTitle.nth(0).waitFor({ state: 'attached' });
        await locators.multiArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(4);

        //Выставляем время архива до пробела
        await scrollLastInterval(page);
        const currentTime = new Date();
        const firstCameraIntervals = transformISOtime(await getArchiveIntervals("Black", camera1, timeToISO(currentTime), timeToISO(archiveRecordOffTime)));
        let framePromise = WS.waitForEvent("framereceived");
        await setCellTime(page, 0, firstCameraIntervals[0].end.hours, firstCameraIntervals[0].end.minutes, firstCameraIntervals[0].end.seconds - 5);
        await framePromise;

        //Кликаем на кнопку воспроизведения и ддем в течении 5 секунд, что видео нигде не останавилось
        await locators.playButton.click();
        let promiseArray = [
            cellIsPlaying(page, 0, 5, true),
            cellIsPlaying(page, 1, 5, true),
            cellIsPlaying(page, 2, 5, true),
            cellIsPlaying(page, 3, 5, true),
        ];
        await Promise.all(promiseArray);

        //Вычисляем размер пробела в секундах
        const gapStartHours = firstCameraIntervals[0].end.hours;
        const gapStartMinutes = firstCameraIntervals[0].end.minutes;
        const gapStartSeconds = firstCameraIntervals[0].end.seconds;
        const gapStoptHours = firstCameraIntervals[1].begin.hours;
        const gapStopMinutes = firstCameraIntervals[1].begin.minutes;
        const gapStopSeconds = firstCameraIntervals[1].begin.seconds;
        const gapLength = timeToSeconds(`${gapStoptHours}:${gapStopMinutes}:${gapStopSeconds}`) - timeToSeconds(`${gapStartHours}:${gapStartMinutes}:${gapStartSeconds}`);

        //Ждем в течении длины пробела, видео на первой ячейке должно было останавится
        promiseArray = [
            cellIsPlaying(page, 0, gapLength, false),
            cellIsPlaying(page, 1, gapLength, true),
            cellIsPlaying(page, 2, gapLength, true),
            cellIsPlaying(page, 3, gapLength, true),
        ];
        await Promise.all(promiseArray);

        //Смотрим в течении 5 секунд, что видео везеде идет
        promiseArray = [
            cellIsPlaying(page, 0, 5, true),
            cellIsPlaying(page, 1, 5, true),
            cellIsPlaying(page, 2, 5, true),
            cellIsPlaying(page, 3, 5, true),
        ];
        await Promise.all(promiseArray);

        //Останваливаем воспроизведение
        await locators.playButton.click();
        await isMessagesStop(page, WS);
        
        await clientNotFall(page);
    });

    test('Playback thru archive gap, when archive not exists for other cameras (CLOUD-T313) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        const camera1 = h264Cameras[2];
        const camera2 = canPlayH265 ? h265Cameras[2] : h264Cameras[9];
        const camera3 = h264Cameras[3];
        const camera4 = canPlayH265 ? h265Cameras[3] : h264Cameras[10];
        await isRecordEnough(page);
        const archiveRecordOffTime = new Date();
        let contextList = await getArchiveContext("Black", [camera1, camera2, camera3, camera4]);
        await changeArchiveContext(contextList, false, "High");
        await page.waitForTimeout(10000);
        await changeArchiveContext([contextList[3]], true, "High");
        await page.waitForTimeout(5000);
        await changeArchiveContext([contextList[2]], true, "High");
        await page.waitForTimeout(5000);
        await changeArchiveContext([contextList[0], contextList[1]], true, "High");
        await createLayout([camera1, camera2, camera3, camera4], 2, 2, "Archive Gap 2");
        /* Примерная схема архивных пробелов, которая должна была получиться:
        Камера 1 -------|   ~20s   |-------
        Камера 2 -------|   ~20s   |-------
        Камера 3 -------|  ~15s  |---------
        Камера 4 -------| ~10s |-----------
        */

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        //Получаем веб-сокет объект видеостримов
        const WS = await page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        console.log(WS.url());

        //Переходим в архив
        await locators.cellTitle.nth(0).waitFor({ state: 'attached' });
        await locators.multiArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(4);

        //Выставляем время архива до пробела
        await scrollLastInterval(page);
        const currentTime = new Date();
        const firstCameraIntervals = transformISOtime(await getArchiveIntervals("Black", camera1, timeToISO(currentTime), timeToISO(archiveRecordOffTime)));
        const thirdCameraIntervals = transformISOtime(await getArchiveIntervals("Black", camera3, timeToISO(currentTime), timeToISO(archiveRecordOffTime)));
        const lastCameraIntervals = transformISOtime(await getArchiveIntervals("Black", camera4, timeToISO(currentTime), timeToISO(archiveRecordOffTime)));
        let framePromise = WS.waitForEvent("framereceived");
        await setCellTime(page, 0, firstCameraIntervals[0].end.hours, firstCameraIntervals[0].end.minutes, firstCameraIntervals[0].end.seconds - 5);
        await framePromise;

        //Кликаем на кнопку воспроизведения и ждем в течении 5 секунд, что видео нигде не останавилось
        await locators.playButton.click();
        let promiseArray = [
            cellIsPlaying(page, 0, 5, true),
            cellIsPlaying(page, 1, 5, true),
            cellIsPlaying(page, 2, 5, true),
            cellIsPlaying(page, 3, 5, true),
        ];
        await Promise.all(promiseArray);

        //Вычисляем длину пробела между последней и предпоследней камерой
        let gapStartHours = lastCameraIntervals[1].begin.hours;
        let gapStartMinutes = lastCameraIntervals[1].begin.minutes;
        let gapStartSeconds = lastCameraIntervals[1].begin.seconds;
        let gapStoptHours = thirdCameraIntervals[1].begin.hours;
        let gapStopMinutes = thirdCameraIntervals[1].begin.minutes;
        let gapStopSeconds = thirdCameraIntervals[1].begin.seconds;
        let gapLength = timeToSeconds(`${gapStoptHours}:${gapStopMinutes}:${gapStopSeconds}`) - timeToSeconds(`${gapStartHours}:${gapStartMinutes}:${gapStartSeconds}`);

        //Смотрим в течении времени пробела, видео должно играть на последней камере
        promiseArray = [
            cellIsPlaying(page, 0, gapLength, false),
            cellIsPlaying(page, 1, gapLength, false),
            cellIsPlaying(page, 2, gapLength, false),
            cellIsPlaying(page, 3, gapLength, true),
        ];
        await Promise.all(promiseArray);

        //Вычисляем длину пробела между предпоследней и первой/второй камерами
        gapStartHours = thirdCameraIntervals[1].begin.hours;
        gapStartMinutes = thirdCameraIntervals[1].begin.minutes;
        gapStartSeconds = thirdCameraIntervals[1].begin.seconds;
        gapStoptHours = firstCameraIntervals[1].begin.hours;
        gapStopMinutes = firstCameraIntervals[1].begin.minutes;
        gapStopSeconds = firstCameraIntervals[1].begin.seconds;
        gapLength = timeToSeconds(`${gapStoptHours}:${gapStopMinutes}:${gapStopSeconds}`) - timeToSeconds(`${gapStartHours}:${gapStartMinutes}:${gapStartSeconds}`);

        //Смотрим в течении времени пробела, видео должно идти на последних двух камерах
        promiseArray = [
            cellIsPlaying(page, 0, gapLength, false),
            cellIsPlaying(page, 1, gapLength, false),
            cellIsPlaying(page, 2, gapLength, true),
            cellIsPlaying(page, 3, gapLength, true),
        ];
        await Promise.all(promiseArray);

        //Смотрим в течении 5 секунд, видео должно идти на всех камерах
        promiseArray = [
            cellIsPlaying(page, 0, 5, true),
            cellIsPlaying(page, 1, 5, true),
            cellIsPlaying(page, 2, 5, true),
            cellIsPlaying(page, 3, 5, true),
        ];
        await Promise.all(promiseArray);

        //Останваливаем воспроизведение
        await locators.playButton.click();
        await isMessagesStop(page, WS);
        
        await clientNotFall(page);
    });

    test('Sound check (CLOUD-T314)', async ({ page }) => {
        const locators = new Locators(page);

        await createCamera(2, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Sound Camera", -1);
        const lastCamera = Configuration.cameras[Configuration.cameras.length - 1];
        const prelastCamera = Configuration.cameras[Configuration.cameras.length - 2];
        await createArchiveContext("Black", [prelastCamera, lastCamera], true, "High");
        await changeMicrophoneStatus(prelastCamera, true);
        await changeMicrophoneStatus(lastCamera, true);
        await addVirtualVideo([prelastCamera, lastCamera], "witcher_640", "witcher_640");
        await createLayout([prelastCamera, lastCamera], 2, 1, "Sound test");

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        //Получаем веб-сокет объект видеостримов
        const WS = await page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        console.log(WS.url());

        //Проверяем, что микрофоны отображаются
        await expect(locators.videoCellMicro.nth(0)).toBeVisible();
        await expect(locators.videoCellMicro.nth(1)).toBeVisible();

        //Переходим в архив
        await locators.cellTitle.nth(0).waitFor({ state: 'attached' });
        await locators.multiArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(2);
        await expect(locators.cellTitle.nth(0)).toContainText("Sound Camera");
        await expect(locators.cellTitle.nth(1)).toContainText("Sound Camera");
        await expect(locators.videoCellMicro).toBeHidden();

        //Устанавливаем видимый интервал в центр шкалы и скролим (приближаем)
        await scrollLastInterval(page);
        await clickToInterval(locators.lastInterval, 0.3);

        //Переходим в одиночный режим двойным кликом по первой раскладке и включаем микрофон
        await locators.gridcell.nth(0).dblclick();
        await locators.videoCellMicro.click();

        //Кликаем на кнопку воспроизведения
        await locators.playButton.click();
        const isSoundOn = await locators.videoCell.evaluate((item) => {
            const videoCell = item.querySelector('video');
            return !(videoCell!.muted);
        });
        expect(isSoundOn).toBeTruthy();
        await cellIsPlaying(page, 0, 5, true);

        //Возвращаемся на раскладку двойным кликом по камере
        await locators.gridcell.dblclick();

        //Иконок звука быть не должно
        await expect(locators.cellTitle).toHaveCount(2);
        await expect(locators.videoCellMicro).toBeHidden();
        await isMessagesStop(page, WS);
        
        await clientNotFall(page);
    });

    test('Pick layout from search tab (CLOUD-T315)', async ({ page }) => {
        const locators = new Locators(page);

        await createLayout([h264Cameras[6], h264Cameras[7]], 2, 1, "Layout 2");
        await createLayout([h264Cameras[4], h264Cameras[5]], 2, 1, "Layout 1");

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        //Получаем веб-сокет объект видеостримов
        const WS = await page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        console.log(WS.url());

        //Выбираем первую камеру на раскладке и переходим в поиск
        await locators.gridcell.nth(0).click();
        await locators.searchMode.click();
        await expect(locators.cellTitle).toHaveCount(1);
        await expect(locators.searchMode).toHaveCSS("border", /.*px solid.*/);
        await cellIsPlaying(page, 0, 5, false);

        //Выбираем первую раскладку
        await locators.expandLayoutList.click();
        await waitAnimationEnds(page, locators.layoutItems);
        await locators.firstLayout.click();
        
        //Проверяем, что попали в лайв режим и отображается две камеры с видео
        await expect(locators.liveMode).toHaveCSS("border", /.*px solid.*/);
        await Promise.all([cellIsPlaying(page, 0, 5, true), cellIsPlaying(page, 1, 5, true)]);

        //Выбираем первую камеру на раскладке и переходим в поиск
        await locators.gridcell.nth(0).click();
        await locators.searchMode.click();
        await expect(locators.cellTitle).toHaveCount(1);
        await expect(locators.searchMode).toHaveCSS("border", /.*px solid.*/);
        await cellIsPlaying(page, 0, 5, false);

        //Выбираем вторую раскладку
        await locators.expandLayoutList.click();
        await waitAnimationEnds(page, locators.layoutItems);
        await locators.secondLayout.click();
        
        //Проверяем, что попали в лайв режим и отображается две камеры с видео
        await expect(locators.liveMode).toHaveCSS("border", /.*px solid.*/);
        await Promise.all([cellIsPlaying(page, 0, 5, true), cellIsPlaying(page, 1, 5, true)]);
        
        await clientNotFall(page);
    });

    test('Frame-by-frame rewinding (CLOUD-T316)', async ({ page }) => {
        const locators = new Locators(page);

        const firstCamera = h264Cameras[4];
        const secondCamera = h265Cameras[4];
        await createLayout([firstCamera, secondCamera], 2, 1, "Frame-by-frame");
        
        await isRecordEnough(page);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        //Получаем веб-сокет объект видеостримов
        const WS = await page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        console.log(WS.url());

        //Переходим в архив
        await locators.cellTitle.nth(0).waitFor({ state: 'attached' });
        await locators.multiArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(2);

        //Устанавливаем видимый интервал в центр шкалы и скролим (приближаем)
        await scrollLastInterval(page);
        let framePromise = WS.waitForEvent("framereceived");
        await clickToInterval(locators.lastInterval, 0.5);
        await framePromise;

        //Получаем список кадров и листаем архив назад
        let frameRequest = page.waitForResponse(request => request.url().includes('archive/contents/frames'));
        await locators.nextFrameButton.click();
        let body = await (await frameRequest).json();
        console.log(body.frames);
        for (let i = 0; i < 5; i++) {
            let firstCameraPlay = waitWebSocketSentMessage(WS, ['play', firstCamera.accessPointChanged]);
            let secondCameraPlay = waitWebSocketSentMessage(WS, ['play', secondCamera.accessPointChanged]);
            await locators.nextFrameButton.click();
            let firstFrame = await firstCameraPlay;
            let secondFrame = await secondCameraPlay;
            expect(firstFrame.speed == 0).toBeTruthy();
            expect(secondFrame.speed == 0).toBeTruthy();
            console.log(firstFrame.beginTime, secondFrame.beginTime);
            expect(body.frames.includes(firstFrame.beginTime + "000", i)).toBeTruthy();
            expect(body.frames.includes(secondFrame.beginTime + "000", i)).toBeTruthy();
            await page.waitForTimeout(500);
        }

        //Перемещаем поинтер 
        framePromise = WS.waitForEvent("framereceived");
        await clickToInterval(locators.lastInterval, 0.7);
        await framePromise;

        //Получаем список кадров и листаем архив назад
        frameRequest = page.waitForResponse(request => request.url().includes('archive/contents/frames'));
        await locators.prevFrameButton.click();
        body = await (await frameRequest).json();
        console.log(body.frames);
        for (let i = 0; i < 5; i++) {
            let firstCameraPlay = waitWebSocketSentMessage(WS, ['play', firstCamera.accessPointChanged]);
            let secondCameraPlay = waitWebSocketSentMessage(WS, ['play', secondCamera.accessPointChanged]);
            await locators.prevFrameButton.click();
            let firstFrame = await firstCameraPlay;
            let secondFrame = await secondCameraPlay;
            expect(firstFrame.speed == 0).toBeTruthy();
            expect(secondFrame.speed == 0).toBeTruthy();
            console.log(firstFrame.beginTime, secondFrame.beginTime);
            expect(body.frames.includes(firstFrame.beginTime + "000", i)).toBeTruthy();
            expect(body.frames.includes(secondFrame.beginTime + "000", i)).toBeTruthy();
            await page.waitForTimeout(500);
        }

        await clientNotFall(page);
    });

    test('Interval rewinding (CLOUD-T317)', async ({ page }) => {
        const locators = new Locators(page);

        const firstCamera = h264Cameras[0];
        const secondCamera = canPlayH265 ? h265Cameras[0] : h264Cameras[1];
        await isRecordEnough(page);
        const contextList = await getArchiveContext("Black", [firstCamera, secondCamera]);
        await changeArchiveContext(contextList, false, "High");
        const archiveRecordOffTime = new Date();
        await page.waitForTimeout(10000);
        await changeArchiveContext([contextList[1]], true, "High");
        await page.waitForTimeout(5000);
        await changeArchiveContext([contextList[0]], true, "High");
        await createLayout([firstCamera, secondCamera], 1, 2, "Interval skip");

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        //Получаем веб-сокет объект видеостримов
        const WS = await page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        console.log(WS.url());

        const currentTime = new Date();
        const firstCameraIntervals = transformISOtime(await getArchiveIntervals("Black", firstCamera, timeToISO(currentTime), timeToISO(archiveRecordOffTime)));
        const secondCameraIntervals = transformISOtime(await getArchiveIntervals("Black", secondCamera, timeToISO(currentTime), timeToISO(archiveRecordOffTime)));
        
        //Переходим в архив
        await locators.cellTitle.nth(0).waitFor({ state: 'attached' });
        await locators.multiArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(2);

        //Устанавливаем видимый интервал в центр шкалы и скролим (приближаем)
        await scrollLastInterval(page);
        let framePromise = WS.waitForEvent("framereceived");
        await setCellTime(page, 0, firstCameraIntervals[0].end.hours, firstCameraIntervals[0].end.minutes, firstCameraIntervals[0].end.seconds - 5);
        await framePromise;
        await page.waitForTimeout(1000);
        await locators.nextIntervalButton.click();
        await page.waitForTimeout(1000);
        let currentPointerPosition = await locators.pointerTime.innerText();
        expect(timeToSeconds(currentPointerPosition) == timeToSeconds(`${firstCameraIntervals[1].begin.hours}:${firstCameraIntervals[1].begin.minutes}:${firstCameraIntervals[1].begin.seconds}`)).toBeTruthy();
        
        //Кликаем на кнопку воспроизведения и ждем в течении 5 секунд, что видео нигде не останавилось
        await locators.playButton.click();
        await Promise.all([cellIsPlaying(page, 0, 5, true), cellIsPlaying(page, 1, 5, true)]);

        //Останавливаем воспроизведение
        await locators.playButton.click();
        await isMessagesStop(page, WS);

        //Кликаем на кнопку перехода к предыдущему фрагменту
        await locators.prevIntervalButton.click();
        await page.waitForTimeout(1000);
        currentPointerPosition = await locators.pointerTime.innerText();
        await comparePointerPositions(`${firstCameraIntervals[0].end.hours}:${firstCameraIntervals[0].end.minutes}:${firstCameraIntervals[0].end.seconds}`, currentPointerPosition, true)

        //Выбираем вторую камеру
        await locators.gridcell.nth(1).click();
        await page.waitForTimeout(1000);
        await locators.nextIntervalButton.click();
        await page.waitForTimeout(1000);
        currentPointerPosition = await locators.pointerTime.innerText();
        expect(timeToSeconds(currentPointerPosition) == timeToSeconds(`${secondCameraIntervals[1].begin.hours}:${secondCameraIntervals[1].begin.minutes}:${secondCameraIntervals[1].begin.seconds}`)).toBeTruthy();
        
        //Кликаем на кнопку воспроизведения
        await locators.playButton.click();
        await Promise.all([cellIsPlaying(page, 0, 5, false), cellIsPlaying(page, 1, 5, true)]);

        //Останваливаем воспроизведение
        await locators.playButton.click();
        await isMessagesStop(page, WS);
        
        await clientNotFall(page);
    });

    test('Interval request check (CLOUD-T930) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        const firstCamera = h264Cameras[4];
        const secondCamera = h265Cameras[4];
        await createLayout([firstCamera, secondCamera], 2, 1, "Intervals check");
        
        await isRecordEnough(page);

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        //Получаем веб-сокет объект видеостримов
        const WS = await page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        console.log(WS.url());

        //Переходим в архив
        await locators.cellTitle.nth(0).waitFor({ state: 'attached' });
        let intervalsRequest = page.waitForResponse(request => request.url().includes(`archive/contents/intervals/${firstCamera.accessPointChanged}/20`));
        await locators.multiArchiveMode.click();
        await intervalsRequest;
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(2);
        await expect(locators.cellTitle.nth(0)).toContainText("H264");
        await expect(locators.cellTitle.nth(1)).toContainText("H265");
        await expect(locators.videoCell.nth(0)).toHaveClass(/.*VideoCell--active.*/);

        //Переходим в полноэкранный режим по первой камере и скроллим архив
        await locators.gridcell.nth(0).dblclick();
        await expect(locators.cellTitle).toHaveCount(1);
        await expect(locators.cellTitle.nth(0)).toContainText("H264");
        intervalsRequest = page.waitForResponse(request => request.url().includes(`archive/contents/intervals/${firstCamera.accessPointChanged}/20`));
        await locators.lastInterval.hover();
        await page.mouse.wheel(0, -3000);
        await intervalsRequest;
        intervalsRequest = page.waitForResponse(request => request.url().includes(`archive/contents/intervals/${firstCamera.accessPointChanged}/20`));
        await locators.lastInterval.hover();
        await page.mouse.wheel(0, 2000);
        await intervalsRequest;

        //Выходим из полноэкранного режима и скроллим архив
        await locators.gridcell.nth(0).dblclick();
        await expect(locators.cellTitle).toHaveCount(2);
        await expect(locators.cellTitle.nth(0)).toContainText("H264");
        await expect(locators.cellTitle.nth(1)).toContainText("H265");
        intervalsRequest = page.waitForResponse(request => request.url().includes(`archive/contents/intervals/${firstCamera.accessPointChanged}/20`));
        await locators.lastInterval.hover();
        await page.mouse.wheel(0, 2000);
        await intervalsRequest;

        //Выбираем вторую камеру и скроллим архив
        await locators.gridcell.nth(1).click();
        await expect(locators.videoCell.nth(1)).toHaveClass(/.*VideoCell--active.*/);
        intervalsRequest = page.waitForResponse(request => request.url().includes(`archive/contents/intervals/${secondCamera.accessPointChanged}/20`));
        await locators.lastInterval.hover();
        await page.mouse.wheel(0, -1000);
        await intervalsRequest;

        //Переходим в полноэкранный режим по второй камере и скроллим архив
        await locators.gridcell.nth(1).dblclick();
        await expect(locators.cellTitle).toHaveCount(1);
        await expect(locators.cellTitle.nth(0)).toContainText("H265");
        intervalsRequest = page.waitForResponse(request => request.url().includes(`archive/contents/intervals/${secondCamera.accessPointChanged}/20`));
        await locators.lastInterval.hover();
        await page.mouse.wheel(0, -1000);
        await intervalsRequest;
        intervalsRequest = page.waitForResponse(request => request.url().includes(`archive/contents/intervals/${secondCamera.accessPointChanged}/20`));
        await locators.lastInterval.hover();
        await page.mouse.wheel(0, 3000);
        await intervalsRequest;
        
        await clientNotFall(page);
    });

    test('Playback from the end, when archive not exists for other camera (CLOUD-T931)', async ({ page }) => {
        const locators = new Locators(page);

        await isRecordEnough(page);
        const contextList = await getArchiveContext("Black", [h264Cameras[8]]);
        await changeArchiveContext(contextList, false, "High");
        await page.waitForTimeout(10000);
        const archiveRecordOffTime = new Date();
        await createLayout([h264Cameras[7], h264Cameras[8]], 2, 1, "From the end");

        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        //Получаем веб-сокет объект видеостримов
        const WS = await page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        console.log(WS.url());
        
        //Переходим в архив
        await locators.cellTitle.nth(0).waitFor({ state: 'attached' });
        await locators.multiArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(2);
        await expect(locators.cellTitle.nth(0)).toContainText("H264");
        await expect(locators.cellTitle.nth(1)).toContainText("H264");

        //Выставляем время во время когда у первой камеры есть запись а у второй нет
        await scrollLastInterval(page);
        let framePromise = WS.waitForEvent("framereceived");
        await setCellTime(page, 0, archiveRecordOffTime.getHours(), archiveRecordOffTime.getMinutes(), archiveRecordOffTime.getSeconds());
        await framePromise;

        //Кликаем на кнопку воспроизведения
        let startPointerTime = await locators.pointerTime.innerText();
        await locators.playButton.click();
        await Promise.all([cellIsPlaying(page, 0, 7, true), cellIsPlaying(page, 1, 7, false)]);
        let endPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, endPointerTime);

        //Останваливаем воспроизведение
        await locators.playButton.click();
        await isMessagesStop(page, WS);
        
        await clientNotFall(page);
    });

    test('Alerts clearing from the archive scale (CLOUD-T932)', async ({ page }) => {
        const locators = new Locators(page);

        const firstCamera = h264Cameras[5];
        const secondCamera = h265Cameras[5];
        await createLayout([firstCamera, secondCamera], 2, 1, "Intervals check");

        await isRecordEnough(page);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        //Получаем веб-сокет объект видеостримов
        const WS = await page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        console.log(WS.url());

        //Генерируем и обрабатываем несколько тревог на первой камере
        await locators.alertReviewIcon.first().click();
        await locators.alertPanelButton.waitFor({ state: 'attached', timeout: 5000 });
        await locators.alertReviewIcon.first().click();
        await locators.alertReviewIcon.locator('button').nth(2).waitFor({ state: 'attached' });
        await locators.alertReviewIcon.locator('button').nth(0).click();
        await locators.alertPanelButton.waitFor({ state: 'detached', timeout: 5000 });
        await locators.liveMode.first().click();
        await locators.alertReviewIcon.first().click();
        await locators.alertPanelButton.waitFor({ state: 'attached', timeout: 5000 });
        await locators.alertReviewIcon.first().click();
        await locators.alertReviewIcon.locator('button').nth(2).waitFor({ state: 'attached' });
        await locators.alertReviewIcon.locator('button').nth(2).click();
        await locators.alertPanelButton.waitFor({ state: 'detached', timeout: 5000 });
        await locators.liveMode.first().click();
        
        //Выбираем раскладку
        await locators.expandLayoutList.click();
        await locators.firstLayout.click();

        //Переходим в архив
        await locators.cellTitle.nth(0).waitFor({ state: 'attached' });
        let alertsRequest = page.waitForResponse(request => request.url().includes(`archive/events/alerts/${firstCamera.accessPointChanged}/20`));
        await locators.multiArchiveMode.click();
        await alertsRequest;
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(2);
        await expect(locators.cellTitle.nth(0)).toContainText("H264");
        await expect(locators.cellTitle.nth(1)).toContainText("H265");
        await expect(locators.videoCell.nth(0)).toHaveClass(/.*VideoCell--active.*/);

        //Проверяем, что отображаются флаги тревог
        await expect(locators.alertFlag.nth(0)).toBeVisible();

        //Выбираем вторую камеру
        alertsRequest = page.waitForResponse(request => request.url().includes(`archive/events/alerts/${secondCamera.accessPointChanged}/20`));
        await locators.gridcell.nth(1).click();
        await alertsRequest;
        await expect(locators.videoCell.nth(1)).toHaveClass(/.*VideoCell--active.*/);

        //Проверяем, что флагов тревог нет
        await expect(locators.alertFlag.nth(0)).toBeHidden();    
        
        await clientNotFall(page);
    });

    test('Archive playback by keyframes (CLOUD-T933)', async ({ page }) => {
        const locators = new Locators(page);

        const firstCamera = h264Cameras[4];
        const secondCamera = canPlayH265 ? h265Cameras[4] : h264Cameras[5];
        await createLayout([firstCamera, secondCamera], 2, 1, "Only Keyframes");
        
        await isRecordEnough(page);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);

        //Получаем веб-сокет объект видеостримов
        const WS = await page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        console.log(WS.url());

        //Включаем отображение только ключевых кадров
        await locators.topMenuButton.click();
        await locators.preferences.click();
        await locators.showAllFramesPreference.uncheck();
        await locators.preferencesAccept.click();

        //Переходим в архив
        await locators.cellTitle.nth(0).waitFor({ state: 'attached' });
        await locators.multiArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(2);

        //Устанавливаем видимый интервал в центр архивной шкалы
        await scrollLastInterval(page);
        await clickToInterval(locators.lastInterval, 0.5);

        //Воспроизводим архив
        let playMessage = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        let playFrame = await playMessage;
        expect(!playFrame.keyFrames).toBeTruthy();
        expect(playFrame.entities.length).toEqual(2);

        //Ждем в течении 5 секунд, что видео идет
        await Promise.all([cellIsPlaying(page, 0, 5, true), cellIsPlaying(page, 1, 5, true)]);

        //Останваливаем воспроизведение
        await locators.playButton.click();
        await isMessagesStop(page, WS);
      
        await clientNotFall(page);
    });

    test('Archive playback with forbidden cameras (CLOUD-T965)', async ({ page }) => {
        const locators = new Locators(page);
        const testRoleName = "No_access";
        const testUserLogin = "M_Archive";
        const testUserPassword = "Admin12345";
        const testCameras = h264Cameras.slice(0, 4);

        await createRole(testRoleName);
        await setRolePermissions(testRoleName);
        await createUser(testUserLogin);
        await assignUserRole(testRoleName, testUserLogin);
        await setUserPassword(testUserLogin, testUserPassword);
        await createLayout(testCameras, 2, 2, "Without access", testRoleName);
        await setObjectPermissions(testRoleName, [testCameras[0].accessPoint], "CAMERA_ACCESS_MONITORING");
        await setObjectPermissions(testRoleName, [testCameras[1].accessPoint], "CAMERA_ACCESS_MONITORING_ON_PROTECTION");
       
        //Проверяем, что записи достаточно
        await isRecordEnough(page);
        await page.goto(clientURL);
        await authorization(page, testUserLogin, testUserPassword);

        //Получаем веб-сокет объект видеостримов
        const WS = await page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        console.log(WS.url());

        //Переходим в архив
        await locators.cellTitle.nth(0).waitFor({ state: 'attached' });
        await locators.gridcell.nth(2).click();
        await locators.multiArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(4);
        await expect(locators.videoCell.locator(locators.noSignalBanner)).toHaveCount(2);
        await expect(locators.cellContainerSVG).toHaveCount(2);
        await expect(locators.cellInfoContainer.nth(0)).toHaveText("No access to archive", { ignoreCase: false });
        await expect(locators.cellInfoContainer.nth(1)).toHaveText("No access to archive", { ignoreCase: false });
        await scrollLastInterval(page);
        await clickToInterval(locators.lastInterval, 0.5);

        //Сохраняем время поинтера перед воспроизведением и жмем на плей
        let startPointerTime = await locators.pointerTime.innerText();
        let startCommand = waitWebSocketSentMessage(WS, ['"speed":1', 'sync']);
        await locators.playButton.click();
        let wsFrame = await startCommand;
        let promiseArray = [
            cellIsPlaying(page, 0, 5, false),
            cellIsPlaying(page, 1, 5, false),
            cellIsPlaying(page, 2, 5, true),
            cellIsPlaying(page, 3, 5, true),
        ];
        await Promise.all(promiseArray);
        let lastPointerTime = await locators.pointerTime.innerText();
        await comparePointerPositions(startPointerTime, lastPointerTime);
        await expect(locators.videoCell.locator(locators.noSignalBanner)).toHaveCount(2);
        await expect(locators.cellContainerSVG).toHaveCount(2);
        await expect(locators.cellInfoContainer.nth(0)).toHaveText("No access to archive", { ignoreCase: false });
        await expect(locators.cellInfoContainer.nth(1)).toHaveText("No access to archive", { ignoreCase: false });

        //Дважды кликаем на первую камеру и проверяем, что видео остановлено
        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.gridcell.nth(0).dblclick();
        await stopCommand;
        await isMessagesStop(page, WS);
        await expect(locators.cellTitle).toHaveCount(1);
        await expect(locators.videoCell.locator(locators.noSignalBanner)).toHaveCount(1);
        await expect(locators.cellContainerSVG).toHaveCount(1);
        await expect(locators.cellInfoContainer.nth(0)).toHaveText("No access to archive", { ignoreCase: false });

        //Кликаем на кнопку воспроизведения и смотрим что баннер не исчез
        startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        wsFrame = await startCommand;
        await cellIsPlaying(page, 0, 5, false);
        await expect(locators.videoCell.locator(locators.noSignalBanner)).toHaveCount(1);
        await expect(locators.cellContainerSVG).toHaveCount(1);
        await expect(locators.cellInfoContainer.nth(0)).toHaveText("No access to archive", { ignoreCase: false });
        await isMessagesStop(page, WS);

        //Возвращаемся обратно на раскладку
        await locators.gridcell.nth(0).dblclick();
        await expect(locators.videoCell.locator(locators.noSignalBanner)).toHaveCount(2);
        await expect(locators.cellContainerSVG).toHaveCount(2);
        await expect(locators.cellInfoContainer.nth(0)).toHaveText("No access to archive", { ignoreCase: false });
        await expect(locators.cellInfoContainer.nth(1)).toHaveText("No access to archive", { ignoreCase: false });
        await expect(locators.cellImage.nth(2)).toHaveAttribute("src", /blob:.*/);
        await expect(locators.cellImage.nth(3)).toHaveAttribute("src", /blob:.*/);
        await isMessagesStop(page, WS);
        
        await clientNotFall(page);
    });

    test('Changing pointer position via digital panel in multichannel archive (CLOUD-T969)', async ({ page }) => {
        const locators = new Locators(page);
        const testCameras = h264Cameras.slice(0, 4);

        await createLayout(testCameras, 2, 2, "Digital panel test");
       
        await isRecordEnough(page);
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;

        await locators.cellTitle.nth(0).waitFor({ state: 'attached' });
        let getFrame = waitWebSocketSentMessage(WS, ['"speed":0', 'jpeg']);
        await locators.multiArchiveMode.click();
        let wsPreviousImage = await getFrame;
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(4);
        await locators.cellTimer.nth(0).click();
        for (let i = 0; i < 3; i++) {
            let getFrame = waitWebSocketSentMessage(WS, ['"speed":0', 'jpeg']);
            await locators.secondsDecrease.click();
            let wsCurrentImage = await getFrame;
            console.log(wsPreviousImage, wsCurrentImage);
            compareTwoNumbers(ISOToMilliseconds(wsPreviousImage.beginTime) - 1000, ISOToMilliseconds(wsCurrentImage.beginTime), 100);
            wsPreviousImage = wsCurrentImage;
            let exactTime = (new Date(ISOToMilliseconds(wsCurrentImage.beginTime))).toLocaleString('ru-RU').replace(/.*\, /, "");
            //кадр не всегда будет соотвествовать времени запроса, если время погранично, кадр может быть из следущей секунды, то есть запросили мы 12:00:00.950, вернулся кадр 12:00:01.050, поэтому нужна конструкция:
            let timeWithImpressision = (new Date(ISOToMilliseconds(wsCurrentImage.beginTime) + 1000)).toLocaleString('ru-RU').replace(/.*\, /, "");
            let frameTime = new RegExp(`${exactTime}|${timeWithImpressision}`);
            await expect(locators.pointerTime).toHaveText(frameTime);
            await expect(locators.cellTimer.nth(0)).toHaveText(frameTime);
            await expect(locators.cellTimer.nth(1)).toHaveText(frameTime);
            await expect(locators.cellTimer.nth(2)).toHaveText(frameTime);
            await expect(locators.cellTimer.nth(3)).toHaveText(frameTime);
        }

        await scrollLastInterval(page);
        getFrame = waitWebSocketSentMessage(WS, ['"speed":0', 'jpeg']);
        await clickToInterval(locators.lastInterval, 0.5);
        wsPreviousImage = await getFrame;
        await locators.cellTimer.nth(1).click();
        for (let i = 0; i < 3; i++) {
            let getFrame = waitWebSocketSentMessage(WS, ['"speed":0', 'jpeg']);
            await locators.secondsIncrease.click();
            let wsCurrentImage = await getFrame;
            console.log(wsPreviousImage, wsCurrentImage);
            compareTwoNumbers(ISOToMilliseconds(wsPreviousImage.beginTime) + 1000, ISOToMilliseconds(wsCurrentImage.beginTime), 100);
            wsPreviousImage = wsCurrentImage;
            let exactTime = (new Date(ISOToMilliseconds(wsCurrentImage.beginTime))).toLocaleString('ru-RU').replace(/.*\, /, "");
            let timeWithImpressision = (new Date(ISOToMilliseconds(wsCurrentImage.beginTime) + 1000)).toLocaleString('ru-RU').replace(/.*\, /, "");
            let frameTime = new RegExp(`${exactTime}|${timeWithImpressision}`);
            await expect(locators.pointerTime).toHaveText(frameTime);
            await expect(locators.cellTimer.nth(0)).toHaveText(frameTime);
            await expect(locators.cellTimer.nth(1)).toHaveText(frameTime);
            await expect(locators.cellTimer.nth(2)).toHaveText(frameTime);
            await expect(locators.cellTimer.nth(3)).toHaveText(frameTime);
        }

        await locators.gridcell.first().click();
        let currentTime = new Date();
        let seconds = (`0${currentTime.getSeconds()}`).slice(-2);
        let minutes = (`0${currentTime.getMinutes()}`).slice(-2);
        let hours = (`0${currentTime.getHours()}`).slice(-2);
        let expectedPointerTime = `${hours}:${minutes}:${seconds}`;
        await page.waitForTimeout(2000);
        await setCellTime(page, 0, hours, minutes, seconds);
        await expect(locators.pointerTime).toHaveText(expectedPointerTime);
        await expect(locators.cellTimer.nth(0)).toHaveText(expectedPointerTime);
        await expect(locators.cellTimer.nth(1)).toHaveText(expectedPointerTime);
        await expect(locators.cellTimer.nth(2)).toHaveText(expectedPointerTime);
        await expect(locators.cellTimer.nth(3)).toHaveText(expectedPointerTime);
        await isMessagesStop(page, WS);
        
        await clientNotFall(page);
    });

    test('Compression of MJPEG stream in sync playback (CLOUD-T1141)', async ({ page }) => {
        const locators = new Locators(page);

        await createCamera(2, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "MJPEG_2K", -1);
        const testCameras = Configuration.cameras.filter(item => item.displayName == "MJPEG_2K");
        await addVirtualVideo(testCameras, "MJPEG-2K", "MJPEG-2K");
        await createArchiveContext("Black", testCameras, true, "High");
        await page.waitForTimeout(5000);
        await createLayout(testCameras, 2, 1, "MJPEG width");
       
        await isRecordEnough(page);
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;

        await locators.cellTitle.nth(0).waitFor({ state: 'attached' });
        await locators.multiArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(2);
        const layoutSpace = await locators.layoutField.boundingBox();
        const startWidth = layoutSpace!.width / 2 < 750 ? 512 : 1024;
        let startCommand = waitWebSocketSentMessage(WS, ['"speed":1', 'sync', 'jpeg']);
        await locators.playButton.click();
        let wsFrame = await startCommand;
        console.log(wsFrame);
        await cellsArePlaying(page, 2, 5);
        expect(wsFrame.width).toEqual(startWidth);
        let expectedStreamWidth = 2560;
        let expectedStreamHeight = 1440;
        while (expectedStreamWidth > startWidth) {
            expectedStreamWidth = expectedStreamWidth / 2;
            expectedStreamHeight = expectedStreamHeight / 2;
        }
        let streamImage = await (await page.waitForResponse(async response => response.url().includes('blob'))).body();
        let streamDimentions = imageSize(streamImage);
        expect(streamDimentions.width).toEqual(expectedStreamWidth);
        expect(streamDimentions.height).toEqual(expectedStreamHeight);
        
        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);

        await clientNotFall(page);
    });

    test('Watching fisheye camera in archive mode (CLOUD-T1224)', async ({ page }) => {
        const locators = new Locators(page);

        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Panomorph", -1);
        const testCamera = Configuration.cameras.filter(item => item.displayName == "Panomorph")[0];
        await addVirtualVideo([testCamera], "lprusa", "tracker");
        await setPanamorphMode(testCamera.videochannelID, true);
        await createArchiveContext("Black", [testCamera], true, "High");
        await page.waitForTimeout(5000);
        await createLayout([h264Cameras[0], h264Cameras[1], h264Cameras[2], testCamera], 2, 2, "Panomorph Layout");
       
        await isRecordEnough(page);
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;

        await locators.cellTitle.nth(0).waitFor({ state: 'attached' });
        await locators.multiArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(4);
        await expect(locators.videoCell.last().locator('canvas[data-engine="three.js r155"]')).toBeVisible();

        let startCommand = waitWebSocketSentMessage(WS, ['"speed":1', 'sync', 'mp4']);
        await locators.playButton.click();
        let wsFrame = await startCommand;
        expect(wsFrame.entities.length).toEqual(4);
        await cellsArePlaying(page, 4, 7);
        await expect(locators.videoCell.last().locator('canvas[data-engine="three.js r155"]')).toBeVisible();

        let stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.gridcell.nth(3).dblclick();
        await stopCommand;
        await expect(locators.videoCell.locator('canvas[data-engine="three.js r155"]')).toBeVisible();
        startCommand = waitWebSocketSentMessage(WS, ['"speed":1']);
        await locators.playButton.click();
        wsFrame = await startCommand;
        await cellIsPlaying(page, 0, 5, true);
        await expect(locators.videoCell.locator('canvas[data-engine="three.js r155"]')).toBeVisible();
        stopCommand = waitWebSocketSentMessage(WS, ['stop', wsFrame.streamId]);
        await locators.playButton.click();
        await stopCommand;
        await isMessagesStop(page, WS);

        await clientNotFall(page);
    });

    test('Playback through EoS-frame (CLOUD-T1229)', async ({ page }) => {
        const locators = new Locators(page);

        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "EoS", -1);
        const testCamera = Configuration.cameras.filter(item => item.displayName == "EoS")[0];
        await addVirtualVideo([testCamera], "eos_short", "eos_short");
        await createArchiveContext("Black", [testCamera], true, "High");
        await page.waitForTimeout(3000);
        await createLayout([h264Cameras[0], h264Cameras[1], h264Cameras[2], testCamera], 2, 2, "EoS Layout");
       
        await isRecordEnough(page);
        const WSPromise = page.waitForEvent("websocket", ws => ws.url().includes("/ws?") && !ws.isClosed());
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        const WS = await WSPromise;
        await WSSendedMessagesTracer(WS);

        await locators.cellTitle.nth(0).waitFor({ state: 'attached' });
        await locators.multiArchiveMode.click();
        await waitAnimationEnds(page, locators.archiveBlock);
        await expect(locators.cellTitle).toHaveCount(4);
        await page.waitForTimeout(3000);

        let syncStartCommand = waitWebSocketSentMessage(WS, ['"speed":1', 'sync', 'mp4']);
        let restartCommand = waitWebSocketSentMessage(WS, ['"speed":1', testCamera.accessPointChanged, '"forward":true', 'mp4'], 60000);
        await locators.playButton.click();
        let wsSyncFrame = await syncStartCommand;
        let wsRestartFrame = await restartCommand;
        let restartedStreamStopCommand = waitWebSocketSentMessage(WS, ['stop', wsRestartFrame.streamId], 60000);
        let secondeRestartCommand = waitWebSocketSentMessage(WS, ['"speed":1', testCamera.accessPointChanged, '"forward":true', 'mp4'], 60000);
        console.log(wsSyncFrame);
        console.log(wsRestartFrame);
        expect(ISOToMilliseconds(wsRestartFrame.beginTime)).toBeGreaterThan(ISOToMilliseconds(wsSyncFrame.beginTime));
        await cellsArePlaying(page, 4, 7);
        compareTwoNumbers(timeToSeconds(await locators.cellTimer.first().innerText()), timeToSeconds(await locators.cellTimer.last().innerText()), 3);

        await restartedStreamStopCommand;
        let wsSecondRestartFrame = await secondeRestartCommand;
        console.log(wsSecondRestartFrame);
        expect(ISOToMilliseconds(wsSecondRestartFrame.beginTime)).toBeGreaterThan(ISOToMilliseconds(wsRestartFrame.beginTime));
        await cellsArePlaying(page, 4, 5);
        compareTwoNumbers(timeToSeconds(await locators.cellTimer.first().innerText()), timeToSeconds(await locators.cellTimer.last().innerText()), 3);
        let syncStopCommand = waitWebSocketSentMessage(WS, ['stop', wsSyncFrame.streamId]);
        await locators.playButton.click();
        await syncStopCommand;
        await isMessagesStop(page, WS);

        await locators.gridcell.last().click();
        await locators.x2Speed.click();
        await scrollLastInterval(page);
        await clickToInterval(locators.lastInterval, 0.2);
        syncStartCommand = waitWebSocketSentMessage(WS, ['"speed":2', 'sync', 'mp4']);
        restartCommand = waitWebSocketSentMessage(WS, ['"speed":2', testCamera.accessPointChanged, '"forward":true', 'mp4'], 60000);
        await locators.playButton.click();
        wsSyncFrame = await syncStartCommand;
        wsRestartFrame = await restartCommand;
        console.log(wsSyncFrame);
        console.log(wsRestartFrame);
        expect(ISOToMilliseconds(wsRestartFrame.beginTime)).toBeGreaterThan(ISOToMilliseconds(wsSyncFrame.beginTime));
        await cellsArePlaying(page, 4, 7);
        compareTwoNumbers(timeToSeconds(await locators.cellTimer.first().innerText()), timeToSeconds(await locators.cellTimer.last().innerText()), 3);
        syncStopCommand = waitWebSocketSentMessage(WS, ['stop', wsSyncFrame.streamId]);
        await locators.playButton.click();
        await syncStopCommand;
        await isMessagesStop(page, WS);

        await clientNotFall(page);
    });
});

async function isRecordEnough(page: Page) {
    if (!recordGenerated) {
        await page.waitForTimeout(30000);
        recordGenerated = true;
    }
}
