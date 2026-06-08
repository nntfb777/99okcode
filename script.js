
const API_URL = "https://99okcode-backend.nntfb777.workers.dev/a/c/claim";
const SITE_KEY = "0x4AAAAAAC_GK-Biwm6cKwbX";

let widgetId = null;
let currentUser = '';
let currentCode = '';
function getCanvasFp() {
    let canvasData = "err";
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 200;
        canvas.height = 50;
        
        ctx.textBaseline = "top";
        ctx.font = "16px 'Arial'";
        ctx.fillStyle = "#f60";
        ctx.fillRect(10, 10, 50, 20);
        ctx.fillStyle = "#069";
        // Giữ nguyên thông số vẽ "79k" của sếp
        ctx.fillText("79k", 15, 12);
        
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
        ctx.fillText("79k", 17, 14);

        canvasData = canvas.toDataURL();
    } catch (e) {
        canvasData = "err_canvas";
    }
    const screen = window.screen.width + "x" + window.screen.height + "-" + window.screen.colorDepth;
    const cpu = navigator.hardwareConcurrency || "0";
    const gpu = (function() {
        try {
            const gl = document.createElement('canvas').getContext('webgl');
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        } catch(e) { return "no-gpu"; }
    })();

    const raw = `${canvasData}|${screen}|${cpu}|${gpu}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
        hash = ((hash << 5) - hash) + raw.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(16);
}

function handleClaim() {
    currentUser = document.getElementById('username').value.trim();
    currentCode = document.getElementById('rewardCode').value.trim();

    if (!currentUser || !currentCode) {
        showResult(false, "Quý khách vui lòng nhập đầy đủ tên hội viên và mã quà tặng!");
        return;
    }

    const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{1,14}$/;
    if (!usernameRegex.test(currentUser)) {
        showResult(false, "Tên đăng nhập không hợp lệ!");
        return;
    }

    // 3. Quy tắc Mã Code (Chữ và số, ít hơn 10 ký tự, không ký tự đặc biệt)
    const codeRegex = /^[a-zA-Z0-9]{1,14}$/;
    if (!codeRegex.test(currentCode)) {
        showResult(false, "Mã quà tặng không hợp lệ!");
        return;
    }

    document.getElementById('captcha-popup').style.display = 'flex';

    if (widgetId !== null) {
        turnstile.reset(widgetId);
    } else {
        widgetId = turnstile.render('#captcha-container', {
            sitekey: SITE_KEY,
            theme: 'light',
            callback: function(token) {
                document.getElementById('captcha-popup').style.display = 'none';
                executeFinalClaim(token);
            },
            'error-callback': function(err) {
                document.getElementById('captcha-popup').style.display = 'none';
                showResult(false, "Lỗi xác thực Captcha! Vui lòng thử lại.");
            }
        });
    }
}

// HÀM BỔ SUNG: Gửi dữ liệu về backend
async function executeFinalClaim(token) {
    const canvasFp = getCanvasFp();
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json',
                            'X-Site-ID': '99ok' 
            },
            body: JSON.stringify({
                username: currentUser,
                code: currentCode,
                captchaToken: token,
                canvasFp: canvasFp
            })
        });

        const result = await response.json();
        if (result.success) {
            showResult(true, "Thành công", result.data);
            document.getElementById('rewardCode').value = ''; 
        } else {
            showResult(false, result.message);
        }
    } catch (err) {
        showResult(false, "Lỗi kết nối máy chủ Cloudflare!");
    }
}

function closeResultPopup() {
    document.getElementById('result-popup').style.display = 'none';
}

function showResult(isSuccess, message, data = null) {
    const popup = document.getElementById('result-popup');
    const icon = document.getElementById('result-icon');
    const title = document.getElementById('result-title');
    const content = document.getElementById('result-content');

    popup.style.display = 'flex';

    if (isSuccess) {
        icon.innerHTML = '<i class="fa-solid fa-circle-check text-6xl text-green-500"></i>';
        title.innerText = "Nhập Mã Thành Công";
        title.className = "text-2xl font-black text-green-600 uppercase mb-2";
        content.innerHTML = `
            <div class="flex justify-between"><span>Hội viên:</span><span class="font-bold text-gray-800">${data.username}</span></div>
            <div class="flex justify-between"><span>Mã quà:</span><span class="font-mono font-bold text-blue-600">${data.code}</span></div>
            <div class="flex justify-between"><span>Thời gian:</span><span class="font-bold text-gray-800">${data.time}</span></div>
            <p class="text-[14px] text-center text-gray-400 mt-2 font-bold">* Phần thưởng sẽ được phân phối trong vòng 30 phút tiếp theo </p>
            <p class="text-[10px] text-center text-gray-400 mt-2 italic">* Quý khách vui lòng chụp màn hình để đối chiếu</p>
        `;
    } else {
        icon.innerHTML = '<i class="fa-solid fa-circle-xmark text-6xl text-red-500 animate-pulse"></i>';
        title.innerText = "Thất Bại";
        title.className = "text-2xl font-black text-red-600 uppercase mb-2";
        content.innerHTML = `<p class="text-center py-2 font-medium text-red-500">${message}</p>`;
    }
}