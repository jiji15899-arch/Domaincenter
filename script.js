// 설정: Worker API URL을 여기에 입력하세요
const API_URL = 'https://your-worker.your-subdomain.workers.dev';

// DOM 요소
const domainInput = document.getElementById('domain-name');
const ns1Input = document.getElementById('nameserver1');
const ns2Input = document.getElementById('nameserver2');
const emailInput = document.getElementById('email');
const checkBtn = document.getElementById('check-btn');
const registerBtn = document.getElementById('register-btn');
const statusDiv = document.getElementById('status');

let isAvailable = false;

// 도메인 입력 시 소문자 변환 및 유효성 검사
domainInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    isAvailable = false;
    registerBtn.disabled = true;
});

// 상태 메시지 표시 함수
function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type} show`;
}

// 도메인 유효성 검사
function validateDomain(domain) {
    if (domain.length < 3) {
        return '도메인 이름은 최소 3자 이상이어야 합니다.';
    }
    if (domain.length > 63) {
        return '도메인 이름은 최대 63자까지 가능합니다.';
    }
    if (domain.startsWith('-') || domain.endsWith('-')) {
        return '도메인 이름은 하이픈(-)으로 시작하거나 끝날 수 없습니다.';
    }
    if (!/^[a-z0-9-]+$/.test(domain)) {
        return '영문 소문자, 숫자, 하이픈(-)만 사용 가능합니다.';
    }
    return null;
}

// 네임서버 유효성 검사
function validateNameserver(ns) {
    const nsPattern = /^([a-z0-9-]+\.)+[a-z]{2,}$/i;
    return nsPattern.test(ns);
}

// 이메일 유효성 검사
function validateEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
}

// 도메인 사용 가능 여부 확인
checkBtn.addEventListener('click', async () => {
    const domain = domainInput.value.trim();
    
    const validationError = validateDomain(domain);
    if (validationError) {
        showStatus(validationError, 'error');
        return;
    }

    checkBtn.disabled = true;
    checkBtn.textContent = '확인 중...';
    
    try {
        const response = await fetch(`${API_URL}/check`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ domain })
        });

        const data = await response.json();

        if (data.available) {
            showStatus(`✅ "${domain}" 도메인을 사용할 수 있습니다!`, 'success');
            isAvailable = true;
            registerBtn.disabled = false;
        } else {
            showStatus(`❌ "${domain}" 도메인은 이미 사용 중입니다. 다른 이름을 선택해주세요.`, 'error');
            isAvailable = false;
            registerBtn.disabled = true;
        }
    } catch (error) {
        showStatus('❌ 서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
        console.error('Error:', error);
    } finally {
        checkBtn.disabled = false;
        checkBtn.textContent = '도메인 확인';
    }
});

// 도메인 발급
registerBtn.addEventListener('click', async () => {
    const domain = domainInput.value.trim();
    const ns1 = ns1Input.value.trim();
    const ns2 = ns2Input.value.trim();
    const email = emailInput.value.trim();

    // 유효성 검사
    const validationError = validateDomain(domain);
    if (validationError) {
        showStatus(validationError, 'error');
        return;
    }

    if (!validateNameserver(ns1) || !validateNameserver(ns2)) {
        showStatus('네임서버 형식이 올바르지 않습니다. (예: ns1.example.com)', 'error');
        return;
    }

    if (!validateEmail(email)) {
        showStatus('이메일 형식이 올바르지 않습니다.', 'error');
        return;
    }

    if (!isAvailable) {
        showStatus('먼저 도메인 사용 가능 여부를 확인해주세요.', 'warning');
        return;
    }

    registerBtn.disabled = true;
    registerBtn.textContent = '발급 중...';
    showStatus('⏳ 도메인을 발급하고 있습니다. 잠시만 기다려주세요...', 'info');

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                domain,
                nameservers: [ns1, ns2],
                email
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showStatus(
                `🎉 축하합니다! "${domain}.yourdomain.com" 도메인이 성공적으로 발급되었습니다!\n\n` +
                `네임서버가 설정되었습니다:\n` +
                `- ${ns1}\n` +
                `- ${ns2}\n\n` +
                `DNS 전파까지 최대 24-48시간이 소요될 수 있습니다.`,
                'success'
            );
            
            // 폼 초기화
            domainInput.value = '';
            ns1Input.value = '';
            ns2Input.value = '';
            emailInput.value = '';
            isAvailable = false;
        } else {
            showStatus(`❌ 발급 실패: ${data.message || '알 수 없는 오류가 발생했습니다.'}`, 'error');
            registerBtn.disabled = false;
        }
    } catch (error) {
        showStatus('❌ 서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
        console.error('Error:', error);
        registerBtn.disabled = false;
    } finally {
        registerBtn.textContent = '도메인 발급';
    }
});
