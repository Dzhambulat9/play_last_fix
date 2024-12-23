import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { imageSize } from 'image-size';

export function exchangeIndexCredentials(username, password) {
    let file = readFileSync("C:/Program Files/AxxonSoft/AxxonNext/public_html/0/index.html", 'utf8');
    let exchangeLogin = file.replace(/window.login = '\w*';/, `window.login = '${username}';`);
    let exchangePassword = exchangeLogin.replace(/window.pass = '\w*';/, `window.pass = '${password}';`);
    writeFileSync("C:/Program Files/AxxonSoft/AxxonNext/public_html/0/index.html", exchangePassword, 'utf8');
    console.log("index.html was changed".green);
}

export function getFileSize(path) {
    const stat = statSync(path);
    return stat.size;
}

export function getBase64(fileName) {
    return readFileSync(`./test_data/${fileName}`, { encoding: "base64" });
}


export function getImageParams(fileName) {
    let params = {
        width: 0,
        height: 0,
        size: 0
    }

    const imageByteSize = statSync(`./test_data/${fileName}`);
    const imagePixelSize = imageSize(`./test_data/${fileName}`);
    params.size = imageByteSize.size;
    params.height = imagePixelSize.height;
    params.width = imagePixelSize.width;
    return params;
}