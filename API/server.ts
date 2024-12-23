import { serverURL, hostName, ROOT_AUTH } from '../global_variables';
import { green, blue, yellow, red } from 'colors';

export let currentPort = "80";
export let currentPrefix = "";

export async function getServerConfig() {
    let body = {
        "method": "axxonsoft.bl.config.ConfigurationService.ListUnits",
        "data": {
            "unit_uids": [
                `hosts/${hostName}/HttpServer.0`
            ]
        }
    };

    let request = await fetch(`${serverURL}:${currentPort}${currentPrefix}/grpc`, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        },
        method: "POST",
        body: JSON.stringify(body)
    });

    if (request.ok) {
        console.log(`Server information has been provided.`.green);
    } else console.log(`Error: Server information hasn't been provided.`.red);
};


export async function setServerConfig(props: { id: string, [key: string]: any }[]) {

    let body = {
        "method": "axxonsoft.bl.config.ConfigurationService.ChangeConfig",
        "data": {
            "changed": [
                {
                    "uid": `hosts/${hostName}/HttpServer.0`,
                    "type": "HttpServer",
                    "properties": props
                }
            ]
        }
    };

    let request = await fetch(`${serverURL}:${currentPort}${currentPrefix}/grpc`, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        },
        method: "POST",
        body: JSON.stringify(body)
    });

    // currentPrefix = prefix;
    // currentPort = port;
    // console.log(currentPort, currentPrefix);
    console.log(`Attempt server configuration change`.yellow);

    await waitForServerEnable();
};

export async function waitForServerEnable() {
    for (let i = 1; i <= 24; i++) {

        try {
            let request = await fetch(`${serverURL}/product/version`, {
                headers: {
                    "Authorization": `Basic ${ROOT_AUTH}`,
                }
            });
            console.log('Server is ready'.green, await request.json());
            break;

        } catch(err) {
            console.log(`Try #${i}. Server can't handle request, error code: ${err}`.red);
        }

        let wait = ms => new Promise(resolve => setTimeout(resolve, ms));
        await wait(5000);
    }
};


/*[
    {
        "id": "enabled",
        "name": "Включить",
        "description": "Включить web-сервер.",
        "category": "",
        "type": "bool",
        "readonly": false,
        "internal": false,
        "attributes": [],
        "value_bool": true
    },
    {
        "id": "Port",
        "name": "Порт",
        "description": "Порт, по которому доступен web-сервер.",
        "category": "",
        "type": "string",
        "readonly": false,
        "internal": false,
        "attributes": [],
        "value_string": "80"
    },
    {
        "id": "Prefix",
        "name": "URL-путь",
        "description": "Префикс, добавляемый к адресу сервера.",
        "category": "",
        "type": "string",
        "readonly": false,
        "internal": false,
        "attributes": [],
        "value_string": "/"
    },
    {
        "id": "RtspPort",
        "name": "RTSP порт",
        "description": "Порт для передачи данных по протоколу RTSP.",
        "category": "",
        "type": "string",
        "readonly": false,
        "internal": false,
        "attributes": [],
        "value_string": "554"
    },
    {
        "id": "RtspOverHttpPort",
        "name": "RTSP/HTTP порт",
        "description": "Порт для передачи данных по протоколу RTSP через HTTP-туннель.",
        "category": "",
        "type": "string",
        "readonly": false,
        "internal": false,
        "attributes": [],
        "value_string": "8554"
    },
    {
        "id": "SSLPort",
        "name": "SSL-порт",
        "description": "SSL-порт",
        "category": "",
        "type": "string",
        "readonly": false,
        "internal": false,
        "attributes": [],
        "value_string": "443"
    },
    {
        "id": "CertificateFile",
        "name": "Файл сертификата",
        "description": "Путь к файлу SSL-сертификата.",
        "category": "",
        "type": "FilePathType",
        "readonly": false,
        "internal": false,
        "attributes": [
            {
                "file_path": {}
            }
        ],
        "value_string": ""
    },
    {
        "id": "PrivateKeyFile",
        "name": "Файл приватного ключа",
        "description": "Путь к файлу приватного ключа SSL.",
        "category": "",
        "type": "FilePathType",
        "readonly": false,
        "internal": false,
        "attributes": [
            {
                "file_path": {}
            }
        ],
        "value_string": ""
    },
    {
        "id": "enable_CORS",
        "name": "Включить CORS",
        "description": "Включить механизм совместноего использование ресурсов",
        "category": "",
        "type": "bool",
        "readonly": false,
        "internal": false,
        "attributes": [],
        "value_bool": false
    },
    {
        "id": "recode_video_stream",
        "name": "Включить перекодировку видеопотока",
        "description": "",
        "category": "",
        "type": "bool",
        "readonly": false,
        "internal": false,
        "attributes": [],
        "value_bool": true
    }
]
*/