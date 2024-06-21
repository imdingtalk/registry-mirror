'use strict'

const registryMappings = {
    'docker.io': 'registry-1.docker.io',
    'gcr.io': 'gcr.io',
    'registry.k8s.io': 'registry.k8s.io',
    'ghcr.io': 'ghcr.io',
    'quay.io': 'quay.io'
    // 添加更多的 registry 映射
};

const authMappings = {
    'docker.io': 'https://auth.docker.io',
    // 添加更多的 auth 映射
};

const workers_url = 'https://你的域名';  // 替换为你自己的域名

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

addEventListener('fetch', e => {
    const ret = fetchHandler(e)
        .catch(err => makeRes('cfworker error:\n' + err.stack, 502));
    e.respondWith(ret);
});

async function fetchHandler(e) {
    const getReqHeader = (key) => e.request.headers.get(key);
    let url = new URL(e.request.url);

    // 处理 token 请求
    if (url.pathname === '/token') {
        let registry = url.searchParams.get('service');
        let token_url = authMappings[registry] + url.pathname + url.search;

        let token_parameter = {
            headers: {
                'Host': authMappings[registry],
                'User-Agent': getReqHeader("User-Agent"),
                'Accept': getReqHeader("Accept"),
                'Accept-Language': getReqHeader("Accept-Language"),
                'Accept-Encoding': getReqHeader("Accept-Encoding"),
                'Connection': 'keep-alive',
                'Cache-Control': 'max-age=0'
            }
        };

        console.log(`Fetching token from: ${token_url}`);
        return fetch(new Request(token_url, e.request), token_parameter);
    }

    // 获取 ns 参数
    let ns = url.searchParams.get('ns');
    let registry = ns ? registryMappings[ns] : null;

    // 如果 ns 参数存在，使用 ns 参数确定 registry
    if (ns && registry) {
        url.hostname = registry;
    } 
    // 否则，根据路径中的 registry 部分确定 registry
    else {
        const matches = url.pathname.match(/^\/v2\/([^/]+)\//);
        if (matches) {
            const registryKey = matches[1];
            registry = registryMappings[registryKey];
            if (registry) {
                url.hostname = registry;
                url.pathname = url.pathname.replace(`/v2/${registryKey}`, '/v2');
            }
        }
    }

    if (!registry) {
        return makeRes('Registry not supported or ns parameter missing', 400);
    }

    let parameter = {
        headers: {
            'Host': registry,
            'User-Agent': getReqHeader("User-Agent"),
            'Accept': getReqHeader("Accept"),
            'Accept-Language': getReqHeader("Accept-Language"),
            'Accept-Encoding': getReqHeader("Accept-Encoding"),
            'Connection': 'keep-alive',
            'Cache-Control': 'max-age=0'
        },
        cacheTtl: 3600
    };

    if (e.request.headers.has("Authorization")) {
        parameter.headers.Authorization = getReqHeader("Authorization");
    }

    console.log(`Proxying request to: ${url.toString()}`);
    let original_response = await fetch(new Request(url, e.request), parameter);
    let original_response_clone = original_response.clone();
    let original_text = await original_response_clone.text();
    let response_headers = original_response.headers;
    let new_response_headers = new Headers(response_headers);
    let status = original_response.status;

    if (new_response_headers.get("Www-Authenticate")) {
        let auth = new_response_headers.get("Www-Authenticate");
        let re = new RegExp(authMappings[ns], 'g');
        new_response_headers.set("Www-Authenticate", response_headers.get("Www-Authenticate").replace(re, workers_url));
    }

    if (new_response_headers.get("Location")) {
        return httpHandler(e.request, new_response_headers.get("Location"));
    }

    let response = new Response(original_text, {
        status,
        headers: new_response_headers
    });

    return response;
}

function httpHandler(req, pathname) {
    const reqHdrRaw = req.headers;

    // 处理 CORS 预检请求
    if (req.method === 'OPTIONS' && reqHdrRaw.has('access-control-request-headers')) {
        return new Response(null, PREFLIGHT_INIT);
    }

    let rawLen = '';
    const reqHdrNew = new Headers(reqHdrRaw);
    const refer = reqHdrNew.get('referer');
    let urlStr = pathname;
    const urlObj = newUrl(urlStr);

    const reqInit = {
        method: req.method,
        headers: reqHdrNew,
        redirect: 'follow',
        body: req.body
    };

    console.log(`Handling HTTP redirect to: ${urlObj.toString()}`);
    return proxy(urlObj, reqInit, rawLen, 0);
}

async function proxy(urlObj, reqInit, rawLen) {
    const res = await fetch(urlObj.href, reqInit);
    const resHdrOld = res.headers;
    const resHdrNew = new Headers(resHdrOld);

    if (rawLen) {
        const newLen = resHdrOld.get('content-length') || '';
        const badLen = (rawLen !== newLen);
        if (badLen) {
            return makeRes(res.body, 400, {
                '--error': `bad len: ${newLen}, except: ${rawLen}`,
                'access-control-expose-headers': '--error',
            });
        }
    }

    const status = res.status;
    resHdrNew.set('access-control-expose-headers', '*');
    resHdrNew.set('access-control-allow-origin', '*');
    resHdrNew.set('Cache-Control', 'max-age=1500');
    resHdrNew.delete('content-security-policy');
    resHdrNew.delete('content-security-policy-report-only');
    resHdrNew.delete('clear-site-data');

    console.log(`Proxying final response from: ${urlObj.toString()}`);
    return new Response(res.body, {
        status,
        headers: resHdrNew
    });
}
