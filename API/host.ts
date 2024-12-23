import { serverURL, setGlobalHostName, ROOT_AUTH } from '../global_variables';

export async function getHostName() {
    let request = await fetch(`${serverURL}/hosts`, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        }
    });

    let hosts = await request.json();
    setGlobalHostName(hosts);
    return hosts[0];
}