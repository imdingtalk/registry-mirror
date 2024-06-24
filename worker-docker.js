
//参考 https://mp.weixin.qq.com/s/9yAN9wj152vZNMZb1ReXqA

'use strict';

const hub_host = 'registry-1.docker.io';
const auth_url = 'https://auth.docker.io';
const workers_url = 'https://你的域名';
const install_url = 'https://get.docker.com';
const PREFLIGHT_INIT = {
    status: 204,
    headers: new Headers({
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,PUT,PATCH,TRACE,DELETE,HEAD,OPTIONS',
        'access-control-max-age': '1728000',
    }),
};

function makeRes(body, status = 200, headers = {}) {
    headers['access-control-allow-origin'] = '*';
    return new Response(body, { status, headers });
}

function newUrl(urlStr) {
    try {
        return new URL(urlStr);
    } catch (err) {
        return null;
    }
}

function getCurrentBeijingTime() {
    const now = new Date();

    return now.toLocaleTimeString("zh-CN", { timeZone: 'Asia/Shanghai' });
}

addEventListener('fetch', e => {
    const ret = fetchHandler(e).catch(err => makeRes('cfworker error:\n' + err.stack, 502));
    e.respondWith(ret);
});

async function fetchHandler(e) {
    const url = new URL(e.request.url);
    const getReqHeader = (key) => e.request.headers.get(key);

    if (url.pathname === '/') {
        const currentBeijingTime = getCurrentBeijingTime();
        return makeRes(`Current Beijing Time: ${currentBeijingTime}`);
    } else if (url.pathname === '/token') {
        const token_parameter = {
            headers: {
                'Host': 'auth.docker.io',
                'User-Agent': getReqHeader("User-Agent"),
                'Accept': getReqHeader("Accept"),
                'Accept-Language': getReqHeader("Accept-Language"),
                'Accept-Encoding': getReqHeader("Accept-Encoding"),
                'Connection': 'keep-alive',
                'Cache-Control': 'max-age=0',
            }
        };
        const token_url = auth_url + url.pathname + url.search;
        return fetch(new Request(token_url, e.request), token_parameter);
    } else if (url.pathname === '/install') {
        return proxy(newUrl(install_url), { method: 'GET', headers: new Headers({ 'access-control-allow-origin': '*' }) });
    }

    url.hostname = hub_host;
    const parameter = {
        headers: {
            'Host': hub_host,
            'User-Agent': getReqHeader("User-Agent"),
            'Accept': getReqHeader("Accept"),
            'Accept-Language': getReqHeader("Accept-Language"),
            'Accept-Encoding': getReqHeader("Accept-Encoding"),
            'Connection': 'keep-alive',
            'Cache-Control': 'max-age=0',
        },
        cacheTtl: 3600,
    };

    if (e.request.headers.has("Authorization")) {
        parameter.headers.Authorization = getReqHeader("Authorization");
    }

    const original_response = await fetch(new Request(url, e.request), parameter);
    const original_response_clone = original_response.clone();
    const original_text = original_response_clone.body;
    const response_headers = original_response.headers;
    const new_response_headers = new Headers(response_headers);
    const status = original_response.status;

    if (new_response_headers.get("Www-Authenticate")) {
        const auth = new_response_headers.get("Www-Authenticate");
        const re = new RegExp(auth_url, 'g');
        new_response_headers.set("Www-Authenticate", response_headers.get("Www-Authenticate").replace(re, workers_url));
    }

    if (new_response_headers.get("Location")) {
        return httpHandler(e.request, new_response_headers.get("Location"));
    }

    return new Response(original_text, { status, headers: new_response_headers });
}

function httpHandler(req, pathname) {
    const reqHdrRaw = req.headers;

    if (req.method === 'OPTIONS' && reqHdrRaw.has('access-control-request-headers')) {
        return new Response(null, PREFLIGHT_INIT);
    }

    const reqHdrNew = new Headers(reqHdrRaw);
    const urlObj = newUrl(pathname);

    const reqInit = {
        method: req.method,
        headers: reqHdrNew,
        redirect: 'follow',
        body: req.body,
    };

    return proxy(urlObj, reqInit);
}

async function proxy(urlObj, reqInit, rawLen = '') {
    const res = await fetch(urlObj.href, reqInit);
    const resHdrNew = new Headers(res.headers);

    if (rawLen) {
        const newLen = res.headers.get('content-length') || '';
        if (rawLen !== newLen) {
            return makeRes(res.body, 400, {
                '--error': `bad len: ${newLen}, expected: ${rawLen}`,
                'access-control-expose-headers': '--error',
            });
        }
    }

    resHdrNew.set('access-control-expose-headers', '*');
    resHdrNew.set('access-control-allow-origin', '*');
    resHdrNew.set('Cache-Control', 'max-age=1500');
    resHdrNew.delete('content-security-policy');
    resHdrNew.delete('content-security-policy-report-only');
    resHdrNew.delete('clear-site-data');

    return new Response(res.body, { status: res.status, headers: resHdrNew });
}
