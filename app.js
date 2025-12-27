// 설정 (여기서 도메인 확장자와 GitHub 저장소 정보를 설정하세요)
const CONFIG = {
    domainExtension: '.com', // 원하는 확장자로 변경
    githubRepo: 'jiji15899-arch/free-domains, // GitHub 저장소 (예: 'john/free-domains')
};

// 페이지 로드 시 도메인 확장자 표시
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('domainExtension').textContent = CONFIG.domainExtension;
});

// 폼 제출 처리
document.getElementById('domainForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const resultDiv = document.getElementById('result');
    const submitBtn = e.target.querySelector('.btn-submit');
    
    // 버튼 비활성화
    submitBtn.disabled = true;
    submitBtn.textContent = '처리 중...';
    
    // 폼 데이터 수집
    const formData = {
        subdomain: document.getElementById('subdomain').value.toLowerCase().trim(),
        email: document.getElementById('email').value.trim(),
        ns1: document.getElementById('ns1').value.trim(),
        ns2: document.getElementById('ns2').value.trim(),
        purpose: document.getElementById('purpose').value.trim(),
    };
    
    // 도메인 유효성 검사
    if (!validateSubdomain(formData.subdomain)) {
        showResult('error', '도메인 이름은 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.');
        submitBtn.disabled = false;
        submitBtn.textContent = '도메인 신청하기';
        return;
    }
    
    // 네임서버 유효성 검사
    if (!validateNameserver(formData.ns1) || !validateNameserver(formData.ns2)) {
        showResult('error', '올바른 네임서버 형식을 입력해주세요.');
        submitBtn.disabled = false;
        submitBtn.textContent = '도메인 신청하기';
        return;
    }
    
    try {
        // GitHub Issue 생성
        await createGitHubIssue(formData);
        
        showResult('success', 
            `✅ 신청이 완료되었습니다!<br><br>
            <strong>${formData.subdomain}${CONFIG.domainExtension}</strong><br><br>
            검토 후 24시간 이내에 발급될 예정입니다.<br>
            신청 상태는 <a href="https://github.com/${CONFIG.githubRepo}/issues" target="_blank">GitHub Issues</a>에서 확인하실 수 있습니다.`
        );
        
        // 폼 초기화
        e.target.reset();
        
    } catch (error) {
        console.error('Error:', error);
        showResult('error', 
            `❌ 신청 중 오류가 발생했습니다.<br>
            직접 <a href="https://github.com/${CONFIG.githubRepo}/issues/new" target="_blank">GitHub Issue</a>를 생성해주세요.`
        );
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '도메인 신청하기';
    }
});

// 도메인 이름 유효성 검사
function validateSubdomain(subdomain) {
    const regex = /^[a-z0-9-]+$/;
    return regex.test(subdomain) && 
           !subdomain.startsWith('-') && 
           !subdomain.endsWith('-') &&
           subdomain.length >= 3 &&
           subdomain.length <= 63;
}

// 네임서버 유효성 검사
function validateNameserver(ns) {
    const regex = /^[a-z0-9.-]+\.[a-z]{2,}$/i;
    return regex.test(ns);
}

// 결과 메시지 표시
function showResult(type, message) {
    const resultDiv = document.getElementById('result');
    resultDiv.className = `result ${type}`;
    resultDiv.innerHTML = message;
    resultDiv.classList.remove('hidden');
    
    // 결과로 스크롤
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// GitHub Issue 생성
async function createGitHubIssue(formData) {
    const issueTitle = `[도메인 신청] ${formData.subdomain}${CONFIG.domainExtension}`;
    const issueBody = `
## 도메인 신청 정보

- **도메인**: ${formData.subdomain}${CONFIG.domainExtension}
- **이메일**: ${formData.email}
- **네임서버 1**: ${formData.ns1}
- **네임서버 2**: ${formData.ns2}
- **사용 목적**: ${formData.purpose || '미입력'}
- **신청 일시**: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}

---

/approve - 승인 및 자동 DNS 설정
/reject - 거부
    `.trim();
    
    // GitHub Issue 생성 URL (새 탭에서 열기)
    const issueUrl = `https://github.com/${CONFIG.githubRepo}/issues/new?title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(issueBody)}`;
    
    // 새 탭에서 Issue 페이지 열기
    window.open(issueUrl, '_blank');
    
    // Promise를 반환하여 비동기 흐름 유지
    return new Promise((resolve) => {
        setTimeout(resolve, 1000);
    });
}
