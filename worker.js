// ============================================
// Cloudflare Workers - 도메인 발급 API
// ============================================

// 설정 (환경 변수로 설정할 값들)
const CLOUDFLARE_API_TOKEN = 'YOUR_CLOUDFLARE_API_TOKEN'; // Cloudflare API Token
const CLOUDFLARE_ZONE_ID = 'YOUR_ZONE_ID'; // 도메인의 Zone ID
const BASE_DOMAIN = 'yourdomain.com'; // 당신의 기본 도메인

// CORS 헤더
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    // CORS preflight 처리
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
        if (path === '/check' && request.method === 'POST') {
            return await handleCheck(request);
        } else if (path === '/register' && request.method === 'POST') {
            return await handleRegister(request);
        } else {
            return jsonResponse({ error: 'Not Found' }, 404);
        }
    } catch (error) {
        console.error('Error:', error);
        return jsonResponse({ error: 'Internal Server Error', message: error.message }, 500);
    }
}

// 도메인 사용 가능 여부 확인
async function handleCheck(request) {
    const { domain } = await request.json();

    if (!domain || !isValidDomain(domain)) {
        return jsonResponse({ error: '유효하지 않은 도메인 이름입니다.' }, 400);
    }

    const fullDomain = `${domain}.${BASE_DOMAIN}`;
    
    // Cloudflare DNS 레코드 확인
    const exists = await checkDNSRecordExists(fullDomain);

    return jsonResponse({
        available: !exists,
        domain: fullDomain
    });
}

// 도메인 발급
async function handleRegister(request) {
    const { domain, nameservers, email } = await request.json();

    // 유효성 검사
    if (!domain || !isValidDomain(domain)) {
        return jsonResponse({ error: '유효하지 않은 도메인 이름입니다.' }, 400);
    }

    if (!nameservers || nameservers.length < 2) {
        return jsonResponse({ error: '최소 2개의 네임서버가 필요합니다.' }, 400);
    }

    if (!email || !isValidEmail(email)) {
        return jsonResponse({ error: '유효하지 않은 이메일 주소입니다.' }, 400);
    }

    const fullDomain = `${domain}.${BASE_DOMAIN}`;

    // 도메인 중복 확인
    const exists = await checkDNSRecordExists(fullDomain);
    if (exists) {
        return jsonResponse({ 
            success: false, 
            message: '이미 사용 중인 도메인입니다.' 
        }, 409);
    }

    // NS 레코드 생성
    const nsCreated = await createNSRecords(fullDomain, nameservers);
    
    if (!nsCreated) {
        return jsonResponse({ 
            success: false, 
            message: 'DNS 레코드 생성에 실패했습니다.' 
        }, 500);
    }

    // 도메인 정보 저장 (KV 스토리지 사용 시)
    // await DOMAINS.put(fullDomain, JSON.stringify({
    //     domain: fullDomain,
    //     nameservers,
    //     email,
    //     createdAt: new Date().toISOString()
    // }));

    return jsonResponse({
        success: true,
        domain: fullDomain,
        nameservers,
        message: '도메인이 성공적으로 발급되었습니다.'
    });
}

// DNS 레코드 존재 여부 확인
async function checkDNSRecordExists(domain) {
    const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records?name=${domain}&type=NS`,
        {
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/json',
            }
        }
    );

    const data = await response.json();
    return data.result && data.result.length > 0;
}

// NS 레코드 생성
async function createNSRecords(domain, nameservers) {
    try {
        for (const ns of nameservers) {
            const response = await fetch(
                `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        type: 'NS',
                        name: domain,
                        content: ns,
                        ttl: 3600, // 1시간
                        proxied: false
                    })
                }
            );

            const data = await response.json();
            
            if (!data.success) {
                console.error('NS record creation failed:', data);
                return false;
            }
        }
        return true;
    } catch (error) {
        console.error('Error creating NS records:', error);
        return false;
    }
}

// 도메인 유효성 검사
function isValidDomain(domain) {
    const pattern = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
    return pattern.test(domain) && domain.length >= 3 && domain.length <= 63;
}

// 이메일 유효성 검사
function isValidEmail(email) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
}

// JSON 응답 생성
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
        }
    });
                      }
