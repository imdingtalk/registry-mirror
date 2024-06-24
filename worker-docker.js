'use strict';
//参考 https://mp.weixin.qq.com/s/9yAN9wj152vZNMZb1ReXqA
const HUB_HOST = 'registry-1.docker.io';
const HUB_DOCKER_URL = 'https://hub.docker.com';
const GET_DOCKER_URL = 'https://get.docker.com';
const AUTH_URL = 'https://auth.docker.io';
const WORKERS_URL = 'https://自己的域名';
const PREFLIGHT_INIT = {
    status: 204,
    headers: new Headers({
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,PUT,PATCH,TRACE,DELETE,HEAD,OPTIONS',
        'access-control-max-age': '1728000',
    }),
};

addEventListener('fetch', event => {
    event.respondWith(fetchHandler(event).catch(err => {
        console.error('Fetch handler error:', err);
        return makeRes(`cfworker error:\n${err.stack}`, 502);
    }));
});

async function fetchHandler(event) {
    const { request } = event;
    const { url, headers, method } = request;
    const requestUrl = new URL(url);

    console.log('Handling request for:', requestUrl.pathname);

    if (requestUrl.pathname === '/token') {
        return fetchToken(request);
    } else if (requestUrl.pathname.startsWith('/auth') || requestUrl.pathname.startsWith('/v2') || requestUrl.pathname.startsWith('/api')) {
        return proxy(new URL(HUB_DOCKER_URL + requestUrl.pathname + requestUrl.search), request);
    } else if (requestUrl.pathname === '/install') {
        return proxy(new URL(GET_DOCKER_URL), request);
    }

    const proxyUrl = new URL(url);
    proxyUrl.hostname = HUB_HOST;

    try {
        const response = await fetch(new Request(proxyUrl, request), getRequestOptions(headers));
        const responseClone = response.clone();
        const responseBody = responseClone.body;
        const newHeaders = new Headers(response.headers);

        if (newHeaders.has('Www-Authenticate')) {
            newHeaders.set('Www-Authenticate', newHeaders.get('Www-Authenticate').replace(new RegExp(AUTH_URL, 'g'), WORKERS_URL));
        }

        if (newHeaders.has('Location')) {
            return httpHandler(request, newHeaders.get('Location'));
        }

        return new Response(responseBody, { status: response.status, headers: newHeaders });
    } catch (err) {
        console.error('Error in proxying request:', err);
        return makeRes(`Error in proxying request:\n${err.stack}`, 502);
    }
}

function fetchToken(request) {
    const tokenUrl = `${AUTH_URL}${new URL(request.url).pathname}${new URL(request.url).search}`;
    return fetch(new Request(tokenUrl, request), getRequestOptions(request.headers, 'auth.docker.io'));
}

function getRequestOptions(headers, host = HUB_HOST) {
    const options = {
        headers: {
            'Host': host,
            'User-Agent': headers.get('User-Agent'),
            'Accept': headers.get('Accept'),
            'Accept-Language': headers.get('Accept-Language'),
            'Accept-Encoding': headers.get('Accept-Encoding'),
            'Connection': 'keep-alive',
            'Cache-Control': 'max-age=0'
        },
        cacheTtl: 3600
    };

    if (headers.has('Authorization')) {
        options.headers.Authorization = headers.get('Authorization');
    }

    return options;
}

function httpHandler(request, pathname) {
    if (request.method === 'OPTIONS' && request.headers.has('access-control-request-headers')) {
        return new Response(null, PREFLIGHT_INIT);
    }

    return proxy(new URL(pathname), {
        method: request.method,
        headers: new Headers(request.headers),
        redirect: 'follow',
        body: request.body
    });
}

async function proxy(url, originalRequest) {
    console.log('Proxying request to:', url.href);
    
    const reqInit = {
        method: originalRequest.method,
        headers: new Headers(originalRequest.headers),
        redirect: 'follow',
        body: originalRequest.body
    };

    try {
        const response = await fetch(url.href, reqInit);
        const newHeaders = new Headers(response.headers);

        newHeaders.set('access-control-expose-headers', '*');
        newHeaders.set('access-control-allow-origin', '*');
        newHeaders.set('Cache-Control', 'max-age=1500');
        newHeaders.delete('content-security-policy');
        newHeaders.delete('content-security-policy-report-only');
        newHeaders.delete('clear-site-data');

        return new Response(response.body, {
            status: response.status,
            headers: newHeaders
        });
    } catch (err) {
        console.error('Error in proxy function:', err);
        return makeRes(`Error in proxy function:\n${err.stack}`, 502);
    }
}

function makeRes(body, status = 200, headers = {}) {
    headers['access-control-allow-origin'] = '*';
    return new Response(body, { status, headers });
}
