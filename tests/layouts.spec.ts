import { test, expect } from '@playwright/test';
import { clientURL, Configuration, alloyAllPermisions, virtualVendor, ROOT_LOGIN, ROOT_PASSWORD, isCloudTest } from '../global_variables';
import { createRole, setRolePermissions } from '../API/roles';
import { createUser, setUserPassword, assignUserRole } from '../API/users';
import { createArchive, createArchiveVolume, createArchiveContext, deleteArchive } from '../API/archives';
import { createCamera, addVirtualVideo, changeSingleCameraID, changeIPServerCameraID } from '../API/cameras';
import { createLayout, createLayoutWithSpecialCell } from '../API/layouts';
import { getHostName } from '../API/host';
import { cameraAnnihilator, layoutAnnihilator, configurationCollector, userAnnihilator, roleAnnihilator, waitAnimationEnds, authorization, logout, openCameraList, clientNotFall, closeCameraList } from "../utils/utils.js";
import { Locators } from '../locators/locators';
let cameras: any;

test.describe("Layouts. Tests without created layout", () => {

    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector();
        await deleteArchive('Black');
        await cameraAnnihilator("all");
        await layoutAnnihilator("all");
        await createCamera(8, virtualVendor, "Virtual several streams", "admin", "admin", "0.0.0.0", "80", "", "Camera", 0);
        await createCamera(2, virtualVendor, "Virtual IP server", "admin123", "admin", "0.0.0.0", "80", "", "Camera");
        await addVirtualVideo(Configuration.cameras, "lprusa", "tracker");
        await createArchive("Black");
        await createArchiveVolume("Black", 20);
        await createArchiveContext("Black", Configuration.cameras, false);
        cameras = Configuration.cameras.map(item => { return ({
            id: item.displayId,
            name: item.displayName  
        })});
    
        console.log(cameras);
    });
    
    test.beforeEach(async ({ page }) => {
        await layoutAnnihilator("all");
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
    });
    
    
    test('Creation of x1 layout (CLOUD-T229) #smoke', async ({ page }) => {
        const locators = new Locators(page);
    
        await locators.layoutMenu.click();
        await locators.x1Layout.click();
        //Проверяем, что ячейка содержит нужную камеру
        await expect(locators.cellTitle.nth(0)).toHaveText(`${cameras[0].id}.${cameras[0].name}`);
        //Сохраняем раскладку
        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Проверяем количество ячеек в созданной раскладке
        await expect(locators.cellTitle).toHaveCount(1);
        //Проверяем имя созданной раскладки
        await expect(locators.firstLayout).toContainText("New Layout");
        //Проверяем название и разрешение камеры
        await expect(locators.cellTitle).toHaveText(`${cameras[0].id}.${cameras[0].name}`);
        await expect(locators.cellStreamMenu).toContainText("Auto");
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });
    
    
    test('Creation of x4 layout (CLOUD-T230) #smoke', async ({ page }) => {
        const locators = new Locators(page);
    
        await locators.layoutMenu.click();
        await locators.x4Layout.click();
        await expect(locators.cellTitle.nth(0)).toHaveText(`${cameras[0].id}.${cameras[0].name}`);
        await expect(locators.cellTitle.nth(1)).toHaveText(`${cameras[1].id}.${cameras[1].name}`);
        await expect(locators.cellTitle.nth(2)).toHaveText(`${cameras[2].id}.${cameras[2].name}`);
        await expect(locators.cellTitle.nth(3)).toHaveText(`${cameras[3].id}.${cameras[3].name}`);

        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;

        await expect(locators.cellTitle).toHaveCount(4);
        await expect(locators.firstLayout).toContainText("New Layout");
        for (let i = 0; i < 4; i++) {
            await expect(locators.cellTitle.nth(i)).toHaveText(`${cameras[i].id}.${cameras[i].name}`);
            await expect(locators.cellStreamMenu.nth(i)).toContainText("Auto");
        }
        await clientNotFall(page);
    });
    
    
    test('Creation of x9 layout (CLOUD-T231) #smoke', async ({ page }) => {
        const locators = new Locators(page);
    
        await locators.layoutMenu.click();
        await locators.x9Layout.click();
        //Проверяем, что ячейки по диагонали содержат нужные камеры
        await expect(locators.cellTitle.nth(0)).toHaveText(`${cameras[0].id}.${cameras[0].name}`);
        await expect(locators.cellTitle.nth(4)).toHaveText(`${cameras[4].id}.${cameras[4].name}`);
        await expect(locators.cellTitle.nth(8)).toHaveText(`${cameras[8].id}.${cameras[8].name}`);

        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;

        await expect(locators.cellTitle).toHaveCount(9);
        await expect(locators.firstLayout).toContainText("New Layout");
        for (let i = 0; i < 9; i++) {
            await expect(locators.cellTitle.nth(i)).toHaveText(`${cameras[i].id}.${cameras[i].name}`);
            await expect(locators.cellStreamMenu.nth(i)).toContainText("Auto");
        }
        await clientNotFall(page);
    });
    
    
    test('Creation of x16 layout (CLOUD-T232) #smoke', async ({ page }) => {
        const locators = new Locators(page);
    
        await locators.layoutMenu.click();
        await locators.x16Layout.click();
        //Проверяем, что ячейки по диагонали содержат нужные камеры
        await expect(locators.cellTitle.nth(0)).toHaveText(`${cameras[0].id}.${cameras[0].name}`);
        await expect(locators.cellTitle.nth(5)).toHaveText(`${cameras[5].id}.${cameras[5].name}`);
        await expect(locators.cellTitle.nth(10)).toHaveText(`${cameras[10].id}.${cameras[10].name}`);
        await expect(locators.cellTitle.nth(15)).toHaveText(`${cameras[15].id}.${cameras[15].name}`);

        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;

        await expect(locators.cellTitle).toHaveCount(16);
        await expect(locators.firstLayout).toContainText("New Layout");
        for (let i = 0; i < 16; i++) {
            await expect(locators.cellTitle.nth(i)).toHaveText(`${cameras[i].id}.${cameras[i].name}`);
            await expect(locators.cellStreamMenu.nth(i)).toContainText("Auto");
        }
        await clientNotFall(page);
    });
    
    
    test('Cells size changing (CLOUD-T233)', async ({ page }) => {
        const locators = new Locators(page);
    
        await locators.layoutMenu.click();
        await locators.x9Layout.click();
        //Наводимся на первую камеру и расширяем ее вправо
        await locators.getCellLocator(page, 0).hover();
        await locators.getCellLocator(page, 0).locator(locators.rightIncrease).click();
        await expect(locators.getCellLocator(page, 1)).toBeHidden();
        //Расширяем первую ячейку вниз
        await locators.getCellLocator(page, 0).locator(locators.bottomIncrease).click();
        //Проверяем, что ячейки 4 и 5 исчезли
        await expect(locators.getCellLocator(page, 3)).toBeHidden();
        await expect(locators.getCellLocator(page, 4)).toBeHidden();
        //Наводимся на последнюю камеру и расширяем ее вверх
        await locators.getCellLocator(page, 8).hover();
        await locators.getCellLocator(page, 8).locator(locators.topIncrease).click();
        await expect(locators.getCellLocator(page, 5)).toBeHidden();
        //Наводимся на предпоследнюю камеру и расширяем ее влево
        await locators.getCellLocator(page, 7).hover();
        await locators.getCellLocator(page, 7).locator(locators.leftIncrease).click();
        await expect(locators.getCellLocator(page, 6)).toBeHidden();
        //Возвращаем расширенную ячейку в начальное состояние
        await locators.getCellLocator(page, 7).locator(locators.leftDecrease).click();
        await expect(locators.getCellLocator(page, 1).locator('h6')).toHaveText("Drag camera here");
        //Сохраняем раскладку
        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        await expect(locators.cellTitle).toHaveCount(4);
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });
    
    
    test('Cells deleting (CLOUD-T234)', async ({ page }) => {
        const locators = new Locators(page);
    
        await locators.layoutMenu.click();
        await locators.x9Layout.click();
        //Удаляем первую ячейку
        await locators.getCellLocator(page, 0).hover();
        await locators.getCellLocator(page, 0).locator('button').last().click();
        await expect(locators.getCellLocator(page, 0).locator('h6')).toHaveText("Drag camera here");
        //Удаляем ячейку посередине
        await locators.getCellLocator(page, 4).hover();
        await locators.getCellLocator(page, 4).locator('button').last().click();
        await expect(locators.getCellLocator(page, 4).locator('h6')).toHaveText("Drag camera here");
        //Удаляем последнюю ячейку
        await locators.getCellLocator(page, 8).hover();
        await locators.getCellLocator(page, 8).locator('button').last().click();
        await expect(locators.getCellLocator(page, 8).locator('h6')).toHaveText("Drag camera here");
        //Удаляем правый столбец
        await locators.getCellLocator(page, 2).hover();
        await locators.getCellLocator(page, 2).locator('button').last().click();
        await locators.getCellLocator(page, 5).hover();
        await locators.getCellLocator(page, 5).locator('button').last().click();
        //Проверяем, что последняя удаленная ячейка не отображается
        await expect(locators.getCellLocator(page, 5)).toBeHidden();
        //Удаляем нижний ряд
        await locators.getCellLocator(page, 7).hover();
        await locators.getCellLocator(page, 7).locator('button').last().click();
        await locators.getCellLocator(page, 6).hover();
        await locators.getCellLocator(page, 6).locator('button').last().click();
        //Проверяем, что последняя удаленная ячейка не отображается
        await expect(locators.getCellLocator(page, 6)).toBeHidden();
        //Сохраняем раскладку
        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        await expect(locators.cellTitle).toHaveCount(2);
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });
    
    
    test('Clear layout from empty cells (CLOUD-T236)', async ({ page }) => {
        const locators = new Locators(page);

        await locators.layoutMenu.click();
        await locators.x1Layout.click();
        await waitAnimationEnds(page, locators.layoutField);
        //Добавляем два столбца справа и ряд снизу
        await locators.expandLayoutButton.nth(2).click();
        await locators.expandLayoutButton.nth(2).click();
        await locators.expandLayoutButton.nth(3).click();
        //Проверяем новые ячейки на текст
        await expect(locators.getCellLocator(page, 1).locator('h6')).toHaveText("Drag camera here");
        await expect(locators.getCellLocator(page, 2).locator('h6')).toHaveText("Drag camera here");
        await expect(locators.getCellLocator(page, 3).locator('h6')).toHaveText("Drag camera here");
        await expect(locators.getCellLocator(page, 4).locator('h6')).toHaveText("Drag camera here");
        await expect(locators.getCellLocator(page, 5).locator('h6')).toHaveText("Drag camera here");
        //Перетаскиваем вторую камеру из списка в ячейку 3
        await openCameraList(page);
        await page.waitForTimeout(1000)
        const cell = locators.getCellLocator(page, 2);
        const camera = locators.cameraListItem.nth(1);
        await camera.dragTo(cell);
        //Проверяем что в ячейке больше нет текста
        await expect(locators.getCellLocator(page, 2).locator('h6')).toBeHidden();
        //Жмем на кнопку очистки
        await locators.cleanUpButton.click();
        await expect(locators.gridcell).toHaveCount(2);
        //Сохраняем раскладку
        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        await expect(locators.cellTitle).toHaveCount(2);
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });

    test('Creating layout with empty column (CLOUD-T1117)', async ({ page }) => {
        const locators = new Locators(page);

        await locators.layoutMenu.click();
        await locators.x4Layout.click();
        await waitAnimationEnds(page, locators.layoutField);
        //Добавляем столбец справа
        await locators.expandLayoutButton.nth(2).click();
        //Проверяем новые ячейки на текст
        await expect(locators.getCellLocator(page, 4).locator('h6')).toHaveText("Drag camera here");
        await expect(locators.getCellLocator(page, 5).locator('h6')).toHaveText("Drag camera here");
        //Сохраняем раскладку
        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        await expect(locators.cellTitle).toHaveCount(4);
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });
    
    test('Undo layout changings (CLOUD-T237)', async ({ page }) => {
        const locators = new Locators(page);

        await locators.layoutMenu.click();
        await locators.x9Layout.click();
        await waitAnimationEnds(page, locators.layoutField);
        //Удаляем две ячейки
        await locators.getCellLocator(page, 2).hover();
        await locators.getCellLocator(page, 2).locator('button').last().click();
        await locators.getCellLocator(page, 5).hover();
        await locators.getCellLocator(page, 5).locator('button').last().click();
        //Проверяем что в последней ячейке есть сообщение
        await expect(locators.getCellLocator(page, 5).locator('h6')).toHaveText("Drag camera here");
        await expect(locators.getCellLocator(page, 5).locator('.VideoCell--playing video')).toBeHidden();
        //Отменяем удаление последней ячейки и проверяем что в ней идет видео
        await locators.undoButton.click();
        await expect(locators.getCellLocator(page, 5).locator('h6')).toBeHidden();
        await expect(locators.getCellLocator(page, 5).locator('.VideoCell--playing video')).toBeVisible();
        //Переключаем разрешение на первой и второй ячейках
        await locators.cellStreamMenu.nth(0).click();
        await locators.highStream.click();
        await locators.streamsList.waitFor({state: 'detached'});
        await locators.externalBackground.waitFor({state: 'detached'});
        await expect(locators.getCellLocator(page, 0)).toContainText("High");
        await locators.cellStreamMenu.nth(1).click();
        await locators.lowStream.click();
        await locators.streamsList.waitFor({state: 'detached'});
        await locators.externalBackground.waitFor({state: 'detached'});
        await expect(locators.getCellLocator(page, 1)).toContainText("Low");
        //Дважды отменяем изменения
        await locators.undoButton.click();
        await expect(locators.getCellLocator(page, 1)).toContainText("Auto");
        await locators.undoButton.click();
        await expect(locators.getCellLocator(page, 0)).toContainText("Auto");
        //Возвращаем отмененное изменение один раз
        await locators.redoButton.click();
        await expect(locators.getCellLocator(page, 0)).toContainText("High");
        await expect(locators.getCellLocator(page, 1)).toContainText("Auto");
        //Расширяем первую камеру вправо
        await locators.getCellLocator(page, 0).hover();
        await locators.getCellLocator(page, 0).locator(locators.rightIncrease).click();
        //Проверяем что вторая ячейка исчезла
        await expect(locators.getCellLocator(page, 1)).toBeHidden();
        //Отменяем изменение
        await locators.undoButton.click();
        //Проверяем что вернулась и в ней идет видео
        await expect(locators.getCellLocator(page, 1)).toBeVisible();
        await expect(locators.getCellLocator(page, 1).locator('.VideoCell--playing video')).toBeVisible();
        //Возвращаем изменения
        await locators.redoButton.click();
        await expect(locators.getCellLocator(page, 1)).toBeHidden();
        //Сохраняем раскладку
        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        await expect(locators.cellTitle).toHaveCount(7);
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });

    test('Add cameras to cells (CLOUD-T238) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await locators.layoutMenu.click();
        await locators.x9Layout.click();
        await waitAnimationEnds(page, locators.layoutField);
        //Добавляем столбец справа
        await locators.expandLayoutButton.nth(2).click();
        //Удаляем две ячейки
        await locators.getCellLocator(page, 2).hover();
        await locators.getCellLocator(page, 2).locator('button').last().click();
        await locators.getCellLocator(page, 5).hover();
        await locators.getCellLocator(page, 5).locator('button').last().click();
        //Добавляем камеры в ячейки
        await openCameraList(page);
        await page.waitForTimeout(1000);
        let cellIDs = [2, 5, 9, 10, 11];
        for (let i = 0; i < cellIDs.length; i++) {
            let cell = locators.getCellLocator(page, cellIDs[i]);
            let camera = locators.cameraListItem.nth(i + 9);
            await camera.dragTo(cell);
            await expect(locators.getCellLocator(page, cellIDs[i]).locator('[data-testid="at-camera-title"]')).toHaveText(`${cameras[i + 9].id}.${cameras[i + 9].name}`);
            await expect(locators.getCellLocator(page, cellIDs[i]).locator('.VideoCell--playing video')).toBeVisible();
        }
        //Сохраняем раскладку
        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        await expect(locators.cellTitle).toHaveCount(12);
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });

    test('Undo camera addition to layout (CLOUD-T717)', async ({ page }) => {
        const locators = new Locators(page);

        await locators.layoutMenu.click();
        await locators.x4Layout.click();
        await openCameraList(page);
        //Перетаскиваем камеру с панели в занятую ячейку
        let source = locators.cameraListItem.nth(7);
        let target = locators.getCellLocator(page, 1);
        await source.dragTo(target);
        await expect(locators.cellTitle.nth(1)).toHaveText(`${cameras[7].id}.${cameras[7].name}`);
        await expect(locators.getCellLocator(page, 1).locator('.VideoCell--playing video')).toBeVisible();
        //Отменяем перенос
        await locators.undoButton.click();
        await expect(locators.cellTitle.nth(1)).toHaveText(`${cameras[1].id}.${cameras[1].name}`);
        await expect(locators.getCellLocator(page, 1).locator('.VideoCell--playing video')).toBeVisible();
        //Добавляем столбец справа
        await locators.expandLayoutButton.nth(2).click();
        //Перетаскиваем камеру с панели в новую ячейку
        source = locators.cameraListItem.nth(8);
        target = locators.getCellLocator(page, 5);
        await source.dragTo(target);
        await expect(locators.cellTitle.last()).toHaveText(`${cameras[8].id}.${cameras[8].name}`);
        await expect(locators.getCellLocator(page, 5).locator('.VideoCell--playing video')).toBeVisible();
        //Отменяем перенос
        await locators.undoButton.click();
        await expect(locators.getCellLocator(page, 5).locator('.VideoCell--playing video')).toBeHidden();
        await expect(locators.getCellLocator(page, 5).locator('h6')).toHaveText("Drag camera here");
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });
    
    test('Changing cells streams (CLOUD-T239) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await locators.layoutMenu.click();
        await locators.x9Layout.click();
        //Переключаем все потоки на High,
        await locators.allStreamsChanger.nth(1).click();
        for (let i = 0; i < 9; i++) {
            await expect(locators.getCellLocator(page, i)).toContainText("High");
        }
        await expect(locators.streamCounter.nth(0)).toBeHidden();
        await expect(locators.streamCounter.nth(1)).toBeVisible();
        await expect(locators.streamCounter.nth(2)).toBeHidden();
        await expect(locators.streamCounter.nth(1)).toHaveText("9");
        //Переключаем все потоки на Low,
        await locators.allStreamsChanger.nth(2).click();
        for (let i = 0; i < 9; i++) {
            await expect(locators.getCellLocator(page, i)).toContainText("Low");
        }
        await expect(locators.streamCounter.nth(0)).toBeHidden();
        await expect(locators.streamCounter.nth(1)).toBeHidden();
        await expect(locators.streamCounter.nth(2)).toBeVisible();
        await expect(locators.streamCounter.nth(2)).toHaveText("9");
        //Переключаем все потоки на Auto,
        await locators.allStreamsChanger.nth(0).click();
        for (let i = 0; i < 9; i++) {
            await expect(locators.getCellLocator(page, i)).toContainText("Auto");
        }
        await expect(locators.streamCounter.nth(0)).toBeVisible();
        await expect(locators.streamCounter.nth(1)).toBeHidden();
        await expect(locators.streamCounter.nth(2)).toBeHidden();
        await expect(locators.streamCounter.nth(0)).toHaveText("9");
        //Переключаем потоки раскладок - первый ряд High, второй Low, третий остаётся Auto
        for (let i = 0; i < 6; i++) {
            await locators.cellStreamMenu.nth(i).click();
            if (i < 3) {
                await locators.highStream.click();
                await locators.streamsList.waitFor({state: 'detached'});
                await locators.externalBackground.waitFor({state: 'detached'});
            } else if (i < 6) {
                await locators.lowStream.click();
                await locators.streamsList.waitFor({state: 'detached'});
                await locators.externalBackground.waitFor({state: 'detached'});
            }
        }
        //Проверяем что все камеры имеют нужный поток
        for (let i = 0; i < 9; i++) {
            if (i < 3) {
                await expect(locators.getCellLocator(page, i)).toContainText("High"); 
            } else if (i < 6) {
                await expect(locators.getCellLocator(page, i)).toContainText("Low");
            } else if (i < 9) {
                await expect(locators.getCellLocator(page, i)).toContainText("Auto");
            }
        }
        //Проверяем цифры на верхней панели с кнопками, отражающие сколько камер принадлежат конкретному потоку
        await expect(locators.streamCounter.nth(0)).toBeVisible();
        await expect(locators.streamCounter.nth(1)).toBeVisible();
        await expect(locators.streamCounter.nth(2)).toBeVisible();
        await expect(locators.streamCounter.nth(0)).toHaveText("3");
        await expect(locators.streamCounter.nth(1)).toHaveText("3");
        await expect(locators.streamCounter.nth(2)).toHaveText("3");
        //Сохраняем раскладку
        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Снова проверяем что все камеры имеют нужный поток
        for (let i = 0; i < 9; i++) {
            if (i < 3) {
                await expect(locators.getCellLocator(page, i)).toContainText("High"); 
            } else if (i < 6) {
                await expect(locators.getCellLocator(page, i)).toContainText("Low");
            } else if (i < 9) {
                await expect(locators.getCellLocator(page, i)).toContainText("Auto");
            }
        }
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
        //Перезагружаем страницу и вновь проверяем потоки камер
        await page.reload();
        for (let i = 0; i < 9; i++) {
            if (i < 3) {
                await expect(locators.getCellLocator(page, i)).toContainText("High"); 
            } else if (i < 6) {
                await expect(locators.getCellLocator(page, i)).toContainText("Low");
            } else if (i < 9) {
                await expect(locators.getCellLocator(page, i)).toContainText("Auto");
            }
        }
    });

    test('Create layout after stream change (CLOUD-T463)', async ({ page }) => {
        const locators = new Locators(page);

        //Проверяем что открылась первая камера
        await expect(locators.cellTitle).toHaveCount(1);
        await expect(locators.cellTitle).toHaveText(`${cameras[0].id}.${cameras[0].name}`);
        //Переключаем поток на камере и создаем раскладку
        await locators.cellStreamMenu.click();
        await locators.lowStream.click();
        await locators.layoutMenu.click();
        await locators.x4Layout.click();
        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Проверяем количество ячеек на раскладке, названия и разрешения камер
        await expect(locators.cellTitle).toHaveCount(4);
        await expect(locators.cellTitle.nth(0)).toHaveText(`${cameras[0].id}.${cameras[0].name}`);
        await expect(locators.cellTitle.nth(1)).toHaveText(`${cameras[1].id}.${cameras[1].name}`);
        await expect(locators.cellTitle.nth(2)).toHaveText(`${cameras[2].id}.${cameras[2].name}`);
        await expect(locators.cellTitle.nth(3)).toHaveText(`${cameras[3].id}.${cameras[3].name}`);
        await expect(locators.cellStreamMenu.nth(0)).toContainText("Auto");
        await expect(locators.cellStreamMenu.nth(1)).toContainText("Auto");
        await expect(locators.cellStreamMenu.nth(2)).toContainText("Auto");
        await expect(locators.cellStreamMenu.nth(3)).toContainText("Auto");
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });

    test('Create unsupported board on layout (CLOUD-T464)', async ({ page }) => {
        const locators = new Locators(page);

        await createLayoutWithSpecialCell(Configuration.cameras, { 1: "web-panel", 2: 'statistics-panel' }, 2, 2, "Special layout");
        await page.reload();

        await expect(locators.gridcell).toHaveCount(4);
        await expect(locators.cellTitle).toHaveCount(2);
        await expect(locators.getCellLocator(page, 0).locator('.VideoCell--playing video')).toBeVisible();
        await expect(locators.getCellLocator(page, 1).locator('.VideoCell--playing video')).toBeHidden();
        await expect(locators.getCellLocator(page, 2).locator('.VideoCell--playing video')).toBeHidden();
        await expect(locators.getCellLocator(page, 3).locator('.VideoCell--playing video')).toBeVisible();
        await expect(locators.getCellLocator(page, 1)).toHaveText('Board is not supported');
        await expect(locators.getCellLocator(page, 2)).toHaveText('Board is not supported');
        await expect(locators.gridcell.locator('h6')).toHaveCount(2);

        await clientNotFall(page);    
    });

    test('Displaying the correct camera ID on the layout (CLOUD-T1109)', async ({ page }) => {
        const locators = new Locators(page);
        const singelCameras = Configuration.cameras.filter(item => !item.isIpServer);
        const serverCameras = Configuration.cameras.filter(item => item.isIpServer);
        const testCamerasList = [singelCameras[0], singelCameras[1], serverCameras[0], serverCameras[1]];
        console.log('Test cameras', testCamerasList);

        await createLayout(testCamerasList, 2, 2, "Layout");
        await page.reload();

        await expect(locators.gridcell).toHaveCount(4);
        await expect(locators.cellTitle.nth(1)).toHaveText(`${testCamerasList[1]?.displayId}.${testCamerasList[1]?.displayName}`);
        await expect(locators.cellTitle.nth(2)).toHaveText(`${testCamerasList[2]?.displayId}.${testCamerasList[2]?.displayName}`);
        await changeSingleCameraID(testCamerasList[1]?.cameraBinding, "100");
        await changeIPServerCameraID(testCamerasList[2].videochannelID, "ABC");
        await page.reload();
        await expect(locators.gridcell).toHaveCount(4);
        await expect(locators.cellTitle.nth(1)).toHaveText(`100.${testCamerasList[1]?.displayName}`);
        await expect(locators.cellTitle.nth(2)).toContainText(`.ABC.${testCamerasList[2]?.displayName}`);
        await clientNotFall(page);
    });
})

test.describe("Layouts. Tests with created layout", () => {
    //эту раскладку не будем удалять
    let stableLayout;
    
    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector();
        if (Configuration.cameras.length < 16) {
            await deleteArchive('Black');
            await cameraAnnihilator("all");
            await createCamera(8, virtualVendor, "Virtual several streams", "admin", "admin", "0.0.0.0", "80", "", "Camera", 0);
            await createCamera(2, virtualVendor, "Virtual IP server", "admin123", "admin", "0.0.0.0", "80", "", "Camera");
            await addVirtualVideo(Configuration.cameras, "lprusa", "tracker");
            await createArchive("Black");
            await createArchiveVolume("Black", 20);
            await createArchiveContext("Black", Configuration.cameras, false);
        }
        await layoutAnnihilator("all");
        stableLayout = await createLayout(Configuration.cameras, 2, 2, "Test Layout");
    });
    
    test.beforeEach(async ({ page }) => {
        await configurationCollector("layouts");
        let deleteCreatedLayouts = Configuration.layouts.filter(item => item.meta.layout_id != stableLayout);
        await layoutAnnihilator(deleteCreatedLayouts);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
    });

    test('Check positions in menu (CLOUD-T350)', async ({ page }) => {
        const locators = new Locators(page);

        await locators.layoutMenu.click();
        await locators.x4Layout.click();
        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Проверяем пункты в меню веб-клиентовской раскладки
        await locators.layoutMenu.click();
        await expect(locators.layoutMenuItem.nth(1)).toHaveText('Delete/Reorder layouts');
        await expect(locators.layoutMenuItem.nth(2)).toHaveText('Edit layout');
        await expect(locators.layoutMenuItem.nth(3)).toHaveText('Copy layout');
        await expect(locators.layoutMenuItem.nth(4)).toHaveText('Use by default');
        //Закрываем меню
        await page.keyboard.press('Escape');
        //Проверяем пункты в меню GUI раскладки
        await locators.expandLayoutList.click();
        //Таймаут анимации так как ниже при клике игнорируется видимость элемента через флаг forсe, это нужно так как элемент aria-disabled="true"
        await locators.secondLayout.click();
        await locators.layoutMenu.click();
        await expect(locators.layoutMenuItem.nth(1)).toHaveText('Delete/Reorder layouts');
        await expect(locators.layoutMenuItem.nth(2)).toHaveText('Edit layout');
        await expect(locators.layoutMenuItem.nth(3)).toHaveText('Copy layout');
        await expect(locators.layoutMenuItem.nth(4)).toHaveText('Use by default');
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });

    test('Pick default layout (CLOUD-T351) #smoke', async ({ page }) => {
        const locators = new Locators(page);
        
        //Создаем x9 раскладку
        await locators.layoutMenu.click();
        await locators.x9Layout.click();
        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Создаем x1 раскладку
        await locators.layoutMenu.click();
        await locators.x1Layout.click();
        requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Назначаем раскладку 3 дефолтной
        await locators.expandLayoutList.click();
        await locators.thirdLayout.click();
        await locators.cellTitle.nth(0).waitFor({ state: 'attached', timeout: 5000 });
        await expect(locators.cellTitle).toHaveCount(4);
        await locators.layoutMenu.click();
        await locators.menuUseByDefault.click();
        //Проверяем что появилась иконка
        await locators.expandLayoutList.click();
        await expect(locators.firstLayout.locator('svg').nth(0)).toBeHidden();
        await expect(locators.secondLayout.locator('svg').nth(0)).toBeHidden();
        await expect(locators.thirdLayout.locator('svg').nth(0)).toBeVisible();
        //Перезагружаем страницу и проверяем, что открылась нужная раскладка (по количеству камер) и что иконка дефолтности висит на раскладке 3
        await page.reload();
        await locators.cellTitle.nth(0).waitFor({ state: 'attached', timeout: 5000 });
        await expect(locators.cellTitle).toHaveCount(4);
        await locators.expandLayoutList.click();
        await expect(locators.firstLayout.locator('svg').nth(0)).toBeHidden();
        await expect(locators.secondLayout.locator('svg').nth(0)).toBeHidden();
        await expect(locators.thirdLayout.locator('svg').nth(0)).toBeVisible();
        //Назначаем раскладку 2 дефолтной
        await locators.secondLayout.click();
        await locators.cellTitle.nth(0).waitFor({ state: 'attached', timeout: 5000 });
        await expect(locators.cellTitle).toHaveCount(9);
        await locators.layoutMenu.click();
        await locators.menuUseByDefault.click();
        await locators.expandLayoutList.click();
        //Проверяем что появилась иконка над второй раскладкой
        await expect(locators.firstLayout.locator('svg').nth(0)).toBeHidden();
        await expect(locators.secondLayout.locator('svg').nth(0)).toBeVisible();
        await expect(locators.thirdLayout.locator('svg').nth(0)).toBeHidden();
        //Перезагружаем страницу и проверяем, что открылась нужная раскладка (по количеству камер) и что иконка дефолтности висит на раскладке 2
        await page.reload();
        await locators.cellTitle.nth(0).waitFor({ state: 'attached', timeout: 5000 });
        await expect(locators.cellTitle).toHaveCount(9);
        await locators.expandLayoutList.click();
        await expect(locators.firstLayout.locator('svg').nth(0)).toBeHidden();
        await expect(locators.secondLayout.locator('svg').nth(0)).toBeVisible();
        await expect(locators.thirdLayout.locator('svg').nth(0)).toBeHidden();
        //Снимаем дефолтность со второй раскладки
        await locators.layoutMenu.click();
        await locators.menuNotUseByDefault.click();
        await locators.expandLayoutList.click();
        //Проверяем, что иконка дефолтности скрыта
        await expect(locators.firstLayout.locator('svg').nth(0)).toBeHidden();
        await expect(locators.secondLayout.locator('svg').nth(0)).toBeHidden();
        await expect(locators.thirdLayout.locator('svg').nth(0)).toBeHidden();
        //Перезагружаем страницу и проверяем что открылась первая раскладка
        await page.reload();
        await locators.cellTitle.nth(0).waitFor({ state: 'attached', timeout: 5000 });
        await expect(locators.cellTitle).toHaveCount(1);
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });

    test('Copying layout (CLOUD-T352) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await locators.layoutMenu.click();
        await locators.menuCopyLayout.click();
        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Проверяем количество ячеек и название созданной раскладки
        await expect(locators.cellTitle).toHaveCount(4);
        await expect(locators.firstLayout).toHaveText("Test Layout copy");
        await expect(locators.layoutItemsList).toHaveCount(2);
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });

    test('Copying layout with special symbols (CLOUD-T977)', async ({ page }) => {
        const locators = new Locators(page);

        await createLayout(Configuration.cameras, 2, 2, "?*!&43%^*&");
        await page.reload();
        await locators.layoutMenu.click();
        await locators.menuCopyLayout.click();
        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Проверяем количество ячеек и название созданной раскладки
        await expect(locators.cellTitle).toHaveCount(4);
        await expect(locators.firstLayout).toHaveText("?*!&43%^*& copy");
        await expect(locators.layoutItemsList).toHaveCount(3);
        await clientNotFall(page);
    });

    test('Layout changing (CLOUD-T354) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        //Создаем x4 раскладку
        await locators.layoutMenu.click();
        await locators.x4Layout.click();
        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Переходим в меню редактирования
        await locators.layoutMenu.click();
        await locators.menuEditLayout.click();
        //Меняем разрешение камер в нижнем ряду
        await locators.cellStreamMenu.nth(3).click();
        await locators.lowStream.click();
        await locators.streamsList.waitFor({state: 'detached'});
        await locators.externalBackground.waitFor({state: 'detached'});
        await locators.cellStreamMenu.nth(2).click();
        await locators.highStream.click();
        await locators.streamsList.waitFor({state: 'detached'});
        await locators.externalBackground.waitFor({state: 'detached'});
        //Удаляем вторую камеру с раскладки
        await locators.getCellLocator(page, 1).hover();
        await locators.getCellLocator(page, 1).locator('button').last().click();
        //Добавляем столбец справа и камеры туда
        await locators.expandLayoutButton.nth(2).click();
        await openCameraList(page);
        await locators.getCellLocator(page, 4).click();
        await locators.cameraListItem.nth(6).click();
        await locators.getCellLocator(page, 5).click();
        await locators.cameraListItem.nth(7).click();
        const cameraNames = [await locators.cameraListItem.nth(6).innerText(), await locators.cameraListItem.nth(7).innerText()];
        //Сохраняем изменения
        requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Проверяем количество активных ячеек
        await expect(locators.cellTitle).toHaveCount(5);
        //Проверяем что в новых ячейках нужные камеры
        await expect(locators.getCellLocator(page, 4)).toContainText(cameraNames[0]);
        await expect(locators.getCellLocator(page, 5)).toContainText(cameraNames[1]);
        //Проверяем потоки измененных ячеек
        await expect(locators.getCellLocator(page, 2)).toContainText("High");
        await expect(locators.getCellLocator(page, 3)).toContainText("Low");
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });

    test('Synchronous layout changing (CLOUD-T401)', async ({ page }) => {
        const locators = new Locators(page);

        //Создаем x1 раскладку
        await locators.layoutMenu.click();
        await locators.x1Layout.click();
        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Создаем x4 раскладку
        await locators.layoutMenu.click();
        await locators.x4Layout.click();
        requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Переходим в меню редактирования x4 раскладки
        await locators.layoutMenu.click();
        await locators.menuEditLayout.click();
        //Меняем разрешение камер в нижнем ряду
        await locators.cellStreamMenu.nth(3).click();
        await locators.lowStream.click();
        await locators.streamsList.waitFor({state: 'detached'});
        await locators.externalBackground.waitFor({state: 'detached'});
        await locators.cellStreamMenu.nth(2).click();
        await locators.highStream.click();
        await locators.streamsList.waitFor({state: 'detached'});
        await locators.externalBackground.waitFor({state: 'detached'});
        //Удаляем вторую камеру с раскладки
        await locators.getCellLocator(page, 1).hover();
        await locators.getCellLocator(page, 1).locator('button').last().click();
        //Выбираем раскладку x1
        await locators.expandLayoutList.click();
        await locators.secondLayout.click();
        //Добавляем столбец справа и камеру туда
        await locators.expandLayoutButton.nth(2).click();
        await openCameraList(page);
        await locators.getCellLocator(page, 1).click();
        await locators.cameraListItem.nth(7).click();
        const cameraName = await locators.cameraListItem.nth(7).innerText();
        await closeCameraList(page);
        //Сохраняем изменения
        requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Проверяем количество активных ячеек
        await expect(locators.cellTitle).toHaveCount(2);
        //Проверяем что в новой ячейке нужная камера
        await expect(locators.getCellLocator(page, 1)).toContainText(cameraName);
        //Выбираем раскладку x4
        await locators.expandLayoutList.click();
        await locators.firstLayout.click();
        //Проверям количество ячеек
        await locators.getCellLocator(page, 3).waitFor({ state: 'attached', timeout: 5000 });
        await expect(locators.cellTitle).toHaveCount(3);
        //Проверяем потоки измененных ячеек
        await expect(locators.getCellLocator(page, 2)).toContainText("High");
        await expect(locators.getCellLocator(page, 3)).toContainText("Low");
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });

    test('Layout rename (CLOUD-T355) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        //Создаем по одной раскладке через API и WEBUI
        await createLayout(Configuration.cameras, 3, 2, "New Test Layout");
        await locators.layoutMenu.click();
        await locators.x4Layout.click();
        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Мееяем название первой раскладки
        await locators.firstLayout.dblclick();
        await locators.firstLayout.locator('input').fill('Red Square');
        await locators.firstLayout.press('Enter');
        await expect(locators.firstLayout).toHaveText('Red Square');
        requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        await expect(locators.firstLayout).toHaveText('Red Square');
        //Мееяем название второй раскладки
        await locators.expandLayoutList.click();
        await waitAnimationEnds(page, locators.layoutItems);
        await locators.secondLayout.dblclick();
        await locators.secondLayout.locator('input').type(' Changed');
        requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        await expect(locators.secondLayout).toHaveText('New Test Layout Changed');
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });

    test('Layout rename partial (CLOUD-T890)', async ({ page }) => {
        const locators = new Locators(page);

        //Создаем раскладку через API
        await createLayout(Configuration.cameras, 3, 2, "New Layout");
        await page.reload();
        //Активируем поле изменения названия
        await locators.firstLayout.dblclick();
        const inputSize = await locators.firstLayout.locator('input').boundingBox();
        //Удаляем первую часть слова и пишем Changed
        await page.mouse.click(inputSize!.x + 40,  inputSize!.y + inputSize!.height / 2);
        await page.keyboard.press("Backspace");
        await page.keyboard.press("Backspace");
        await page.keyboard.press("Backspace");
        await page.keyboard.type("Changed");
        await page.keyboard.press("Enter");
        await expect(locators.firstLayout).toHaveText('Changed Layout');
        //Сохраняем раскладку и проверям, что название осталось
        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        await expect(locators.firstLayout).toHaveText('Changed Layout');
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });

    test('Accepting buttons is presented (CLOUD-T864)', async ({ page }) => {
        const locators = new Locators(page);

        //Создаем раскладку через API
        await createLayout(Configuration.cameras, 3, 2, "New Layout");
        await page.reload();
        //Активируем поле изменения названия
        await locators.firstLayout.dblclick();
        await waitAnimationEnds(page, locators.layoutItems);
        //Не меняя названия раскладки кликаем в пространство вне меню (в данно случае в середину экрана, так как #app это обобщающий блок)
        let viewCenter = await locators.layoutField.boundingBox();
        await page.mouse.click(viewCenter!.x + viewCenter!.width / 2,  viewCenter!.y + viewCenter!.height / 2);
        //Проверяем, что кнопки сохранить/отменить исчезли и поле инпута неактивно
        await expect(locators.saveChangesButton).not.toBeInViewport();
        await expect(locators.cancelChangesButton).not.toBeInViewport();
        await expect(locators.firstLayout.locator('input')).toBeHidden();
        //Снова активируем поле изменения названия
        await locators.firstLayout.dblclick();
        await waitAnimationEnds(page, locators.layoutItems);
        //Меняем название раскладки и кликаем в пространство вне меню
        await locators.firstLayout.locator('input').fill('Sergeant Billy');
        await page.mouse.click(viewCenter!.x + viewCenter!.width / 2,  viewCenter!.y + viewCenter!.height / 2);
        //Проверяем, что кнопки сохранить/отменить на месте а поле инпута неактивно
        await expect(locators.saveChangesButton).toBeInViewport();
        await expect(locators.cancelChangesButton).toBeInViewport();
        await expect(locators.firstLayout.locator('input')).toBeHidden();
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });

    test('Pick layout in filled panel (CLOUD-T374)', async ({ page }) => {
        const locators = new Locators(page);

        //Создаем несколько раскладок через API
        await createLayout(Configuration.cameras, 1, 1, "Test Layout 2");
        await createLayout(Configuration.cameras, 3, 2, "Test Layout 3");
        await createLayout(Configuration.cameras, 3, 3, "Test Layout 4");
        await createLayout(Configuration.cameras, 1, 2, "Test Layout 5");
        await page.reload();
        //Разворачиваем панель раскладок и проверяем, что последняя раскладка отображается в визуальной области
        await locators.expandLayoutList.click();
        await expect(locators.fifthLayout).toBeInViewport({ ratio: 0.7 });
        //Кликаем по последней раскладке ждем пока блок свернется и проверяем, что раскладка отображается в визуальной области, то есть список пролистался до нее
        await locators.fifthLayout.click();
        await waitAnimationEnds(page, locators.layoutItems);
        await expect(locators.fifthLayout).toBeInViewport({ ratio: 0.7 });
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });

    test('Layout search (CLOUD-T402) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        await createLayout(Configuration.cameras, 1, 1, "221B Baker Street");
        await locators.layoutMenu.click();
        await locators.x4Layout.click();
        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;

        const searchList = ["street", "e", "New", "221B Baker Street", "new layout"];
        for (let input of searchList) {
            await locators.search.fill(input);
            await locators.progressbar.waitFor({ state: 'attached', timeout: 5000 });
            await locators.progressbar.waitFor({ state: 'detached', timeout: 5000 });
            let camerasCount = await locators.layoutItemsList.count();
            if (input === "e") {
                expect(camerasCount).toBeGreaterThan(1);
            } else {
                expect(camerasCount).toEqual(1);
            }   
        }
        await clientNotFall(page);
    });

    test('Nonexistent layout search (CLOUD-T403)', async ({ page }) => {
        const locators = new Locators(page);

        await locators.layoutItemsList.waitFor({state: 'attached', timeout: 10000});
        const searchList = ["undefined", "nihill",];
        for (let input of searchList) {
            await locators.search.fill(input);
            await locators.progressbar.waitFor({ state: 'attached', timeout: 5000 });
            await locators.progressbar.waitFor({ state: 'detached', timeout: 5000 });
            let camerasCount = await locators.layoutItemsList.count();
            expect(camerasCount).toEqual(0);
        }
        await clientNotFall(page);
    });

    test('Change layouts order (CLOUD-T404) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        //Создаем несколько раскладок через API
        await createLayout(Configuration.cameras, 1, 1, "Test Layout 3");
        await createLayout(Configuration.cameras, 3, 2, "Test Layout 2");
        await page.reload();
        //Переходим в режим переопределения порядка раскладок
        await locators.layoutMenu.click();
        await locators.menuDeleteOrReorder.click();
        //Разворачиваем панель раскладок
        await locators.expandLayoutList.click();
        await waitAnimationEnds(page, locators.layoutItems);
        //Перетаскиваем вторую раскладку на место первой
        const sourceBox = await locators.secondLayout.boundingBox();
        const targetBox = await locators.firstLayout.boundingBox();
        await locators.secondLayout.hover();
        await page.mouse.down();
        await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + targetBox!.height / 2);
        await page.mouse.up();
        await waitAnimationEnds(page, locators.layoutItems);
        console.log(sourceBox, targetBox);
        await expect(locators.firstLayout).toHaveText('Test Layout 3');
        await expect(locators.secondLayout).toHaveText('Test Layout 2');
        //Сохраняем изменения
        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
        //Проверяем порядок раскладок
        await expect(locators.firstLayout).toHaveText('Test Layout 3');
        await expect(locators.secondLayout).toHaveText('Test Layout 2');
        //Перезагружаем страницу и проверяем порядок раскладок
        await page.reload();
        await expect(locators.firstLayout).toHaveText('Test Layout 3');
        await expect(locators.secondLayout).toHaveText('Test Layout 2');
    });

    test('Go to search after layout delete (CLOUD-T891)', async ({ page }) => {
        const locators = new Locators(page);

        //Создаем несколько раскладок через API
        await createLayout(Configuration.cameras, 3, 2, "Test Layout 3");
        await page.reload();
        //Переходим в режим переопределения порядка раскладок
        await locators.layoutMenu.click();
        await locators.menuDeleteOrReorder.click();
        //Удаялем первую раскладку не разворачивая блок с раскладками
        await locators.firstLayout.locator('button').last().click();
        //Сохраняем изменения
        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Пытаемся перейти в раздел поиска   
        await locators.searchMode.click();
        //Получаем сообщение с предупреждением
        await expect(locators.popUpMessage).toHaveText('Please select the camera');
        await locators.popUpMessage.waitFor({state: 'detached', timeout: 20000});
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });

    test('Delete layouts (CLOUD-T409) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        //Создаем несколько раскладок через API
        await createLayout(Configuration.cameras, 1, 1, "Test Layout 2");
        await createLayout(Configuration.cameras, 3, 2, "Test Layout 3");
        await page.reload();
        //Переходим в режим переопределения порядка раскладок
        await locators.layoutMenu.click();
        await locators.menuDeleteOrReorder.click();
        //Удаялем первую раскладку не разворачивая блок с раскладками
        await locators.firstLayout.locator('button').last().click();
        await waitAnimationEnds(page, locators.layoutItems);
        await expect(locators.layoutItemsList).toHaveCount(2);
        //Разворачиваем панель раскладок и удаляем вторую добавленную раскладку
        await locators.expandLayoutList.click();
        await waitAnimationEnds(page, locators.layoutItems);
        await locators.firstLayout.locator('button').last().click();
        await waitAnimationEnds(page, locators.layoutItems);
        await expect(locators.layoutItemsList).toHaveCount(1);
        //Сохраняем изменения
        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Проверям количество и названия раскладок
        await expect(locators.layoutItemsList).toHaveCount(1);
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });

    test('Cancel delete layouts (CLOUD-T408)', async ({ page }) => {
        const locators = new Locators(page);

        //Создаем несколько раскладок через API
        await createLayout(Configuration.cameras, 1, 1, "Test Layout 2");
        await createLayout(Configuration.cameras, 3, 2, "Test Layout 3");
        await page.reload();
        //Переходим в режим переопределения порядка раскладок
        await locators.layoutMenu.click();
        await locators.menuDeleteOrReorder.click();
        //Разворачиваем панель раскладок и удаляем две раскладки добавленную раскладку
        await locators.expandLayoutList.click();
        await waitAnimationEnds(page, locators.layoutItems);
        await locators.firstLayout.locator('button').last().click();
        await waitAnimationEnds(page, locators.layoutItems);
        await expect(locators.layoutItemsList).toHaveCount(2);
        await locators.firstLayout.locator('button').last().click();
        await waitAnimationEnds(page, locators.layoutItems);
        await expect(locators.layoutItemsList).toHaveCount(1);
        //Слушаем запросы, чтобы при отмене не отсылался запрос на изменение раскладки
        let requestNotSent = true;
        page.on("request", request => {
            if(request.url().includes(`/v1/layouts?`)) {
                requestNotSent = false;
            }
        });
        await locators.cancelChangesButton.click();
        //Проверям количество и названия раскладок
        await locators.thirdLayout.waitFor({ state: 'attached', timeout: 5000 });
        await expect(locators.layoutItemsList).toHaveCount(3);
        await expect(locators.firstLayout).toHaveText('Test Layout 3');
        await expect(locators.secondLayout).toHaveText('Test Layout 2');
        //Проверяем, что запрос на раскладки не был отправлен
        expect(requestNotSent).toBeTruthy();
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });

    test('Cancel change layouts order (CLOUD-T407)', async ({ page }) => {
        const locators = new Locators(page);

        //Создаем несколько раскладок через API
        await createLayout(Configuration.cameras, 1, 1, "Test Layout 2");
        await createLayout(Configuration.cameras, 3, 2, "Test Layout 3");
        await page.reload();
        //Переходим в режим переопределения порядка раскладок
        await locators.layoutMenu.click();
        await locators.menuDeleteOrReorder.click();
        //Разворачиваем панель раскладок
        await locators.expandLayoutList.click();
        await waitAnimationEnds(page, locators.layoutItems);
        //Перетаскиваем вторую раскладку на место первой
        const sourceBox = await locators.secondLayout.boundingBox();
        const targetBox = await locators.firstLayout.boundingBox();
        await locators.secondLayout.hover();
        await page.mouse.down();
        await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + targetBox!.height / 2);
        await page.mouse.up();
        await waitAnimationEnds(page, locators.layoutItems);
        console.log(sourceBox, targetBox);
        await expect(locators.firstLayout).toHaveText('Test Layout 2');
        await expect(locators.secondLayout).toHaveText('Test Layout 3');
        //Слушаем запросы, чтобы при отмене не отсылался запрос на изменение раскладки
        let requestNotSent = true;
        page.on("request", request => {
            if(request.url().includes(`/v1/layouts?`)) {
                requestNotSent = false;
            }
        });
        await locators.cancelChangesButton.click();
        //Проверяем порядок раскладок
        await expect(locators.firstLayout).toHaveText('Test Layout 3');
        await expect(locators.secondLayout).toHaveText('Test Layout 2');
        //Проверяем, что запрос на раскладки не был отправлен
        expect(requestNotSent).toBeTruthy();
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });

    test('Cancel layout changing (CLOUD-T405) #smoke', async ({ page }) => {
        const locators = new Locators(page);

        //Переходим в меню редактирования
        await locators.layoutMenu.click();
        await locators.menuEditLayout.click();
        //Меняем разрешение камер в нижнем ряду
        await locators.cellStreamMenu.nth(3).click();
        await locators.lowStream.click();
        await locators.streamsList.waitFor({state: 'detached'});
        await locators.externalBackground.waitFor({state: 'detached'});
        await locators.cellStreamMenu.nth(2).click();
        await locators.highStream.click();
        await locators.streamsList.waitFor({state: 'detached'});
        await locators.externalBackground.waitFor({state: 'detached'});
        //Удаляем вторую камеру с раскладки
        await locators.getCellLocator(page, 1).hover();
        await locators.getCellLocator(page, 1).locator('button').last().click();
        //Добавляем столбец справа и камеры туда
        await locators.expandLayoutButton.nth(2).click();
        await openCameraList(page);
        await locators.getCellLocator(page, 4).click();
        await locators.cameraListItem.nth(9).click();
        await locators.getCellLocator(page, 5).click();
        await locators.cameraListItem.nth(10).click();
        //Слушаем запросы, чтобы при отмене не отсылался запрос на изменение раскладки
        let requestNotSent = true;
        page.on("request", request => {
            if(request.url().includes(`/v1/layouts?`)) {
                requestNotSent = false;
            }
        });
        await locators.cancelChangesButton.click();
        //Проверяем количество активных ячеек
        await expect(locators.cellTitle).toHaveCount(4);
        //Проверяем потоки ячеек
        await expect(locators.getCellLocator(page, 0)).toContainText("Auto");
        await expect(locators.getCellLocator(page, 1)).toContainText("Auto");
        await expect(locators.getCellLocator(page, 2)).toContainText("Auto");
        await expect(locators.getCellLocator(page, 3)).toContainText("Auto");
        //Проверяем, что запрос на раскладки не был отправлен
        expect(requestNotSent).toBeTruthy();
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });

    test('Cancel layout rename (CLOUD-T406)', async ({ page }) => {
        const locators = new Locators(page);

        await locators.firstLayout.waitFor({ state: 'visible', timeout: 30000 });
        //Активируем поле для изменения названия, но сразу отменяем действие
        await locators.firstLayout.dblclick();
        let requestNotSent = true;
        page.on("request", request => {
            if(request.url().includes(`/v1/layouts?`)) {
                requestNotSent = false;
            }
        });
        await locators.cancelChangesButton.click();
        //Проверяем, что запрос на раскладки не был отправлен
        expect(requestNotSent).toBeTruthy();
        await expect(locators.firstLayout).toHaveText('Test Layout');
        await expect(locators.saveChangesButton).not.toBeInViewport();
        await expect(locators.cancelChangesButton).not.toBeInViewport();
        //Редактируем название раскладки и отменяем изменения
        await locators.firstLayout.dblclick();
        await locators.firstLayout.locator('input').fill('Red Square');
        await locators.cancelChangesButton.click();
        //Проверяем, что запрос на раскладки не был отправлен
        expect(requestNotSent).toBeTruthy();
        await expect(locators.firstLayout).toHaveText('Test Layout');
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });
})

test.describe("Layouts. Tests with different users", () => {
    const testUserLogin = 'Layout_test';
    const testUserPassword = 'Admin1234';
    const layoutChangingForbid = { feature_access: alloyAllPermisions.feature_access.filter(permission => permission != "FEATURE_ACCESS_CHANGING_LAYOUTS") };
    const layoutTabForbid = { feature_access: alloyAllPermisions.feature_access.filter(permission => permission != "FEATURE_ACCESS_LAYOUTS_TAB") };

    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector();
        if (Configuration.cameras.length < 16) {
            await deleteArchive('Black');
            await cameraAnnihilator("all");
            await createCamera(8, virtualVendor, "Virtual several streams", "admin", "admin", "0.0.0.0", "80", "", "Camera", 0);
            await createCamera(2, virtualVendor, "Virtual IP server", "admin123", "admin", "0.0.0.0", "80", "", "Camera");
            await addVirtualVideo(Configuration.cameras, "lprusa", "tracker");
            await createArchive("Black");
            await createArchiveVolume("Black", 20);
            await createArchiveContext("Black", Configuration.cameras, false);
        }
        await layoutAnnihilator("all");
        await roleAnnihilator("all");
        await userAnnihilator("all");
        await createRole("Layouts");
        await setRolePermissions("Layouts");
        await createUser(testUserLogin);
        await assignUserRole("Layouts", testUserLogin);
        await setUserPassword(testUserLogin, testUserPassword);
    });
    
    test.beforeEach(async ({ page }) => {
        await configurationCollector("layouts");
        await layoutAnnihilator("all");
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
    });

    test('Full layout sharing (CLOUD-T410) #smoke', async ({ page }) => {
        test.skip(isCloudTest, "Test is skipped for cloud");
        const locators = new Locators(page);

        //Создаем полную x9 раскладку в UI
        await locators.layoutMenu.click();
        await locators.x9Layout.click();
        //Переключаем потоки раскладок - первый ряд High, второй Low, третий остаётся Auto
        for (let i = 0; i < 6; i++) {
            await locators.cellStreamMenu.nth(i).click();
            if (i < 3) {
                await locators.highStream.click();
                await locators.streamsList.waitFor({state: 'detached'});
                await locators.externalBackground.waitFor({state: 'detached'});
            } else if (i < 6) {
                await locators.lowStream.click();
                await locators.streamsList.waitFor({state: 'detached'});
                await locators.externalBackground.waitFor({state: 'detached'});
            }
        }
        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Меняем название и сохраняем
        await locators.firstLayout.dblclick();
        await locators.firstLayout.locator('input').fill('Shared full');
        requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Переходим в меню редактирования раскладки
        await locators.layoutMenu.click();
        await locators.menuEditLayout.click();
        //Получаем координаты кнопки Save, понадобится чтобы закрыть меню раскладки
        await waitAnimationEnds(page, locators.streamGroup);
        let saveButton = await locators.saveChangesButton.boundingBox();
        //Раздаем раскладку роли Layouts
        await locators.layoutMenu.click();
        await locators.menuShareLayout.hover();
        await locators.webpage.getByRole('menuitem', { name: 'Layouts', exact: true }).click();
        //Закрываем меню таким образом, так как aria-hidden="true"
        await page.mouse.click(saveButton!.x + saveButton!.width / 2, saveButton!.y + saveButton!.height / 2);
        //Сохраняем изменения
        requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
        //Авторизуемся пользователем Layout User
        await logout(page);
        let layoutRequest = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await authorization(page, testUserLogin, testUserPassword);
        //Раскладка не всегда успевает создасться у пользователя, поэтому иногда приходится перезагружаться
        let body = await (await layoutRequest).json();
        if (body?.items.length == 0) {
            await page.waitForTimeout(3000);
            await page.reload();
        }
        //Проверяем количество ячеек
        await expect(locators.cellTitle).toHaveCount(9);
        //Проверяем название раскладки
        await expect(locators.firstLayout).toHaveText('Shared full');
        //Проверяем наличие иконки расшаренности
        await expect(locators.firstLayout.locator('svg').nth(1)).toBeVisible();
        //Проверяем что все камеры имеют нужный поток и видео в них идет
        for (let i = 0; i < 9; i++) {
            if (i < 3) {
                await expect(locators.getCellLocator(page, i)).toContainText("High"); 
            } else if (i < 6) {
                await expect(locators.getCellLocator(page, i)).toContainText("Low");
            } else if (i < 9) {
                await expect(locators.getCellLocator(page, i)).toContainText("Auto");
            }
            await expect(locators.getCellLocator(page, i).locator('.VideoCell--playing video')).toBeVisible();
        }
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });

    test('Layout sharing without one cell (CLOUD-T411)', async ({ page }) => {
        test.skip(isCloudTest, "Test is skipped for cloud");
        const locators = new Locators(page);

        //Создаем полную x9 раскладку в UI
        await locators.layoutMenu.click();
        await locators.x9Layout.click();
        //Удаляем последнюю камеру
        await locators.getCellLocator(page, 8).hover();
        await locators.getCellLocator(page, 8).locator('button').last().click();
        //Сохраняем раскладку
        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Меняем название и сохраняем
        await locators.firstLayout.dblclick();
        await locators.firstLayout.locator('input').fill('Deleted cell');
        requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Переходим в меню редактирования раскладки
        await locators.layoutMenu.click();
        await locators.menuEditLayout.click();
        //Получаем координаты кнопки Save, понадобится чтобы закрыть меню раскладки
        await waitAnimationEnds(page, locators.streamGroup);
        let saveButton = await locators.saveChangesButton.boundingBox();
        //Раздаем раскладку роли Layouts
        await locators.layoutMenu.click();
        await locators.menuShareLayout.hover();
        await locators.webpage.getByRole('menuitem', { name: 'Layouts', exact: true }).click();
        //Закрываем меню таким образом, так как aria-hidden="true"
        await page.mouse.click(saveButton!.x + saveButton!.width / 2, saveButton!.y + saveButton!.height / 2);
        //Сохраняем изменения
        requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
        //Авторизуемся пользователем Layout User
        await logout(page);
        let layoutRequest = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await authorization(page, testUserLogin, testUserPassword);
        //Раскладка не всегда успевает создасться у пользователя, поэтому иногда приходится перезагружаться
        let body = await (await layoutRequest).json();
        if (body?.items.length == 0) {
            await page.waitForTimeout(3000);
            await page.reload();
        }
        //Проверяем количество ячеек
        await expect(locators.cellTitle).toHaveCount(8);
        //Проверяем, что видео в ячейках идет
        for (let i = 0; i < 9; i++) {
            if (i == 8) {
                await expect(locators.getCellLocator(page, i).locator('.VideoCell--playing video')).toBeHidden();
            } else {
                await expect(locators.getCellLocator(page, i).locator('.VideoCell--playing video')).toBeVisible();
            }
        }
        //Проверяем название раскладки
        await expect(locators.firstLayout).toHaveText('Deleted cell');
        //Проверяем наличие иконки расшаренности
        await expect(locators.firstLayout.locator('svg').nth(1)).toBeVisible();
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });

    test('Positions in shared layout menu (CLOUD-T412)', async ({ page }) => {
        test.skip(isCloudTest, "Test is skipped for cloud");
        const locators = new Locators(page);

        //Создаем полную x4 раскладку в UI
        await locators.layoutMenu.click();
        await locators.x4Layout.click();
        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Меняем название и сохраняем
        await locators.firstLayout.dblclick();
        await locators.firstLayout.locator('input').fill('Shared 2');
        requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Переходим в меню редактирования раскладки
        await locators.layoutMenu.click();
        await locators.menuEditLayout.click();
        //Получаем координаты кнопки Save, понадобится чтобы закрыть меню раскладки
        await waitAnimationEnds(page, locators.streamGroup);
        let saveButton = await locators.saveChangesButton.boundingBox();
        //Раздаем раскладку роли Layouts
        await locators.layoutMenu.click();
        await locators.menuShareLayout.hover();
        await locators.webpage.getByRole('menuitem', { name: 'Layouts', exact: true }).click();
        //Закрываем меню таким образом, так как aria-hidden="true"
        await page.mouse.click(saveButton!.x + saveButton!.width / 2, saveButton!.y + saveButton!.height / 2);
        //Сохраняем изменения
        requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Авторизуемся пользователем Layout User
        await logout(page);
        let layoutRequest = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await authorization(page, testUserLogin, testUserPassword);
        //Раскладка не всегда успевает создасться у пользователя, поэтому иногда приходится перезагружаться
        let body = await (await layoutRequest).json();
        if (body?.items.length == 0) {
            await page.waitForTimeout(3000);
            await page.reload();
        }
        //Проверяем количество ячеек
        await expect( locators.cellTitle).toHaveCount(4);
        //Проверяем пункты в меню раскладки
        await locators.layoutMenu.click();
        await expect(locators.layoutMenuItem.nth(1)).toHaveText('Delete/Reorder layouts');
        await expect(locators.layoutMenuItem.nth(2)).toHaveText('Copy layout');
        await expect(locators.layoutMenuItem.nth(3)).toHaveText('Use by default');
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });

    test('Delete shared layout (CLOUD-T413) #smoke', async ({ page }) => {
        test.skip(isCloudTest, "Test is skipped for cloud");
        const locators = new Locators(page);

        //Создаем полную x4 раскладку в UI
        await locators.layoutMenu.click();
        await locators.x4Layout.click();
        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Меняем название и сохраняем
        await locators.firstLayout.dblclick();
        await locators.firstLayout.locator('input').fill('Shared 3');
        requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Переходим в меню редактирования раскладки
        await locators.layoutMenu.click();
        await locators.menuEditLayout.click();
        //Получаем координаты кнопки Save, понадобится чтобы закрыть меню раскладки
        await waitAnimationEnds(page, locators.streamGroup);
        let saveButton = await locators.saveChangesButton.boundingBox();
        //Раздаем раскладку роли Layouts
        await locators.layoutMenu.click();
        await locators.menuShareLayout.hover();
        await locators.webpage.getByRole('menuitem', { name: 'Layouts', exact: true }).click();
        //Закрываем меню таким образом, так как aria-hidden="true"
        await page.mouse.click(saveButton!.x + saveButton!.width / 2, saveButton!.y + saveButton!.height / 2);
        //Сохраняем изменения
        requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Авторизуемся пользователем Layout User
        await logout(page);
        let layoutRequest = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await authorization(page, testUserLogin, testUserPassword);
        //Раскладка не всегда успевает создасться у пользователя, поэтому иногда приходится перезагружаться
        let body = await (await layoutRequest).json();
        if (body?.items.length == 0) {
            await page.waitForTimeout(3000);
            await page.reload();
        }
        //Проверяем количество ячеек
        await expect(locators.cellTitle).toHaveCount(4);
        //Удаляем раскладку
        await locators.layoutMenu.click();
        await locators.menuDeleteOrReorder.click();
        await locators.firstLayout.locator('button').last().click();
        await waitAnimationEnds(page, locators.layoutItems);
        await expect(locators.layoutItemsList).toHaveCount(0);
        //Сохраняем изменения
        requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Проверям количество раскладок
        await expect(locators.layoutItemsList).toHaveCount(0);
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
        //Авторизуемся пользователем root
        await logout(page);
        layoutRequest = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        //Ждем запрос раскладок и проверяем их количество
        await layoutRequest;
        await expect(locators.layoutItemsList).toHaveCount(1);
        //Проверяем видео в них
        for (let i = 0; i < 4; i++) {
            await expect(locators.getCellLocator(page, i).locator('.VideoCell--playing video')).toBeVisible();
        }
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });

    test('Layout changing access (CLOUD-T414)', async ({ page }) => {
        test.skip(isCloudTest, "Test is skipped for cloud");
        const locators = new Locators(page);

        //Авторизуемся пользователем Layout User
        await logout(page);
        await authorization(page, testUserLogin, testUserPassword);
        //Создаем полную x4 раскладку в UI
        await locators.layoutMenu.click();
        await locators.x4Layout.click();
        let requestPromise = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await locators.saveChangesButton.click();
        await requestPromise;
        //Меняем права роли
        await setRolePermissions("Layouts", layoutChangingForbid);
        //Проверяем количество раскладок
        let layoutRequest = page.waitForResponse(request => request.url().includes(`/v1/layouts?`));
        await page.reload();
        await layoutRequest;
        await expect(locators.layoutItemsList).toHaveCount(1);
        //Проверяем пункты в меню раскладки
        await locators.layoutMenu.click();
        await expect(locators.layoutMenuItem).toHaveCount(1);
        await expect(locators.menuUseByDefault).toBeVisible();
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });

    test('Layout access forbid (CLOUD-T415)', async ({ page }) => {
        test.skip(isCloudTest, "Test is skipped for cloud");
        const locators = new Locators(page);

        await setRolePermissions("Layouts", layoutTabForbid);
        //Авторизуемся пользователем Layout User
        await logout(page);
        await authorization(page, testUserLogin, testUserPassword);
        //Проверяем количество раскладок
        await expect(locators.cellTitle).toHaveCount(1);
        await expect(locators.layoutItemsList).toHaveCount(0);
        //Проверяем что меню раскладок скрыто
        await expect(locators.layoutMenu).toBeHidden();
        //Проверяем, что веб-клиент не упал
        await clientNotFall(page);
    });
});