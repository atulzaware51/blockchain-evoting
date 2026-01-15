// ===== GLOBAL STATE =====
let currentUser = null;
let currentRole = null;
let otpTimer = null;
let generatedOTP = null;
let sidebarOpen = true;
let electionConfig = {
    name: '',
    startDate: null,
    endDate: null,
    selectedParties: [],
    isActive: false
};

// ===== MOCK DATABASE =====
const mockDatabase = {
    approvedParties: [
        { id: 1, name: "Progressive Alliance", candidate: "Alice Johnson", symbol: "fa-star", approved: true, selectedForElection: false },
        { id: 2, name: "Unity Party", candidate: "Bob Martinez", symbol: "fa-flag", approved: true, selectedForElection: false },
        { id: 3, name: "People's Choice", candidate: "Carol Davis", symbol: "fa-heart", approved: true, selectedForElection: false },
        { id: 4, name: "Future Forward", candidate: "David Chen", symbol: "fa-tree", approved: true, selectedForElection: false }
    ],
    pendingParties: [
        { id: 5, name: "Green Earth Party", candidate: "Emily Watson", symbol: "fa-leaf", email: "greenearth@example.com", approved: false }
    ],
    validDomains: ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'example.com']
};

// ===== EMAIL VALIDATION =====
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { valid: false, message: 'Invalid email format' };
    }
    
    const domain = email.split('@')[1];
    if (!mockDatabase.validDomains.includes(domain)) {
        return { valid: false, message: `Email domain "${domain}" is not recognized` };
    }
    
    const commonTypos = { 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'yahooo.com': 'yahoo.com' };
    if (commonTypos[domain]) {
        return { valid: false, message: `Did you mean ${email.replace(domain, commonTypos[domain])}?` };
    }
    
    return { valid: true, message: 'Email is valid' };
}

function showEmailValidation(inputId, isValid, message) {
    const inputElement = document.getElementById(inputId);
    let validationDiv = inputElement.parentElement.querySelector('.email-validation');
    
    if (!validationDiv) {
        validationDiv = document.createElement('div');
        validationDiv.className = 'email-validation';
        inputElement.parentElement.appendChild(validationDiv);
    }
    
    if (isValid === null) {
        validationDiv.style.display = 'none';
        return;
    }
    
    validationDiv.style.display = 'flex';
    validationDiv.className = `email-validation ${isValid ? 'valid' : 'invalid'}`;
    validationDiv.innerHTML = `<i class="fas fa-${isValid ? 'check-circle' : 'exclamation-circle'}"></i><span>${message}</span>`;
}

// ===== PARTICLE EFFECT =====
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.size = Math.random() * 2 + 1;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    }
    draw() {
        ctx.fillStyle = 'rgba(30, 58, 138, 0.4)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function initParticles() {
    particles = [];
    for (let i = 0; i < 40; i++) particles.push(new Particle());
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach(p2 => {
            const dx = p1.x - p2.x, dy = p1.y - p2.y, dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
                ctx.strokeStyle = `rgba(30, 58, 138, ${0.15 * (1 - dist / 120)})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        });
    });
    requestAnimationFrame(animateParticles);
}

window.addEventListener('resize', () => { resizeCanvas(); initParticles(); });
resizeCanvas();
initParticles();
animateParticles();

// ===== NAVIGATION =====
function navigateTo(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const targetView = document.getElementById(viewId);
    if (targetView) targetView.classList.add('active');
    
    document.querySelectorAll('.nav-item, .sidebar-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-view') === viewId) item.classList.add('active');
    });
    
    if (viewId === 'voter-dashboard') { loadActiveCandidates(); startElectionCountdown(); }
    else if (viewId === 'admin-dashboard' && currentRole === 'conductor') loadPendingApprovals();
    
    const navMenu = document.getElementById('navMenu'), hamburger = document.getElementById('hamburger');
    if (navMenu.classList.contains('mobile-open')) {
        navMenu.classList.remove('mobile-open');
        hamburger.classList.remove('active');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar'), mainContent = document.getElementById('mainContent'), toggleBtn = document.getElementById('toggleSidebar');
    sidebarOpen = !sidebarOpen;
    if (sidebarOpen) {
        sidebar.classList.remove('hidden');
        mainContent.classList.remove('expanded');
        toggleBtn.classList.remove('shifted');
    } else {
        sidebar.classList.add('hidden');
        mainContent.classList.add('expanded');
        toggleBtn.classList.add('shifted');
    }
}

function toggleMobileMenu() {
    document.getElementById('hamburger').classList.toggle('active');
    document.getElementById('navMenu').classList.toggle('mobile-open');
}

// ===== LOGIN =====
function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value.trim(), role = document.getElementById('userRole').value;
    
    if (!email || !role) { alert('Please fill in all fields'); return; }
    
    const validation = validateEmail(email);
    if (!validation.valid) {
        showEmailValidation('email', false, validation.message);
        alert('⚠️ ' + validation.message);
        return;
    }
    
    showEmailValidation('email', true, validation.message);
    currentRole = role;
    currentUser = { email, role };
    generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    showOTPModal(email, generatedOTP);
    setTimeout(() => { navigateTo('otp'); startOTPTimer(); }, 1000);
}

// ===== OTP MODAL =====
function showOTPModal(email, otp) {
    document.getElementById('otpEmailDisplay').textContent = email;
    document.getElementById('otpCodeDisplay').textContent = otp;
    document.getElementById('otpModal').classList.add('active');
}

function closeOTPModal() {
    document.getElementById('otpModal').classList.remove('active');
}

// ===== OTP =====
function startOTPTimer() {
    let timeLeft = 90;
    const timerElement = document.getElementById('otpTimer');
    if (otpTimer) clearInterval(otpTimer);
    otpTimer = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60), seconds = timeLeft % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        if (timeLeft <= 0) { clearInterval(otpTimer); timerElement.textContent = 'Expired'; timerElement.style.color = '#b91c1c'; }
        timeLeft--;
    }, 1000);
}

function moveToNext(current, nextId) {
    if (current.value.length === 1 && nextId) document.getElementById(nextId).focus();
}

function verifyOTP() {
    const otp = ['otp1', 'otp2', 'otp3', 'otp4', 'otp5', 'otp6'].map(id => document.getElementById(id).value).join('');
    if (otp.length !== 6) { alert('Please enter the complete 6-digit OTP'); return; }
    if (otp === generatedOTP) {
        clearInterval(otpTimer);
        if (currentRole === 'voter') navigateTo('voter-dashboard');
        else if (currentRole === 'conductor') showElectionConfigModal();
        else if (currentRole === 'party') navigateTo('party-registration');
    } else {
        alert('❌ Invalid OTP. Please check the OTP displayed in the popup.');
        ['otp1', 'otp2', 'otp3', 'otp4', 'otp5', 'otp6'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('otp1').focus();
    }
}

function resendOTP() {
    generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    showOTPModal(currentUser.email, generatedOTP);
    clearInterval(otpTimer);
    startOTPTimer();
    ['otp1', 'otp2', 'otp3', 'otp4', 'otp5', 'otp6'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('otp1').focus();
}

// ===== ELECTION CONFIG =====
function showElectionConfigModal() {
    const modal = document.getElementById('electionConfigModal'), partyList = document.getElementById('partySelectionList');
    partyList.innerHTML = '';
    mockDatabase.approvedParties.forEach(party => {
        const item = document.createElement('div');
        item.className = 'party-checkbox-item';
        item.innerHTML = `<input type="checkbox" id="party-${party.id}" value="${party.id}">
            <label for="party-${party.id}"><i class="fas ${party.symbol}"></i> ${party.name} - ${party.candidate}</label>`;
        partyList.appendChild(item);
    });
    
    const now = new Date(), startDate = new Date(now.getTime() + 3600000), endDate = new Date(now.getTime() + 604800000);
    document.getElementById('electionStartDate').value = startDate.toISOString().slice(0, 16);
    document.getElementById('electionEndDate').value = endDate.toISOString().slice(0, 16);
    modal.classList.add('active');
}

function saveElectionConfig(event) {
    event.preventDefault();
    const electionName = document.getElementById('electionName').value;
    const startDate = new Date(document.getElementById('electionStartDate').value);
    const endDate = new Date(document.getElementById('electionEndDate').value);
    const selectedPartyIds = [];
    
    mockDatabase.approvedParties.forEach(party => {
        const checkbox = document.getElementById(`party-${party.id}`);
        if (checkbox && checkbox.checked) { selectedPartyIds.push(party.id); party.selectedForElection = true; }
        else party.selectedForElection = false;
    });
    
    if (selectedPartyIds.length === 0) { alert('Please select at least one party'); return; }
    if (startDate >= endDate) { alert('End date must be after start date'); return; }
    
    electionConfig = { name: electionName, startDate, endDate, selectedParties: selectedPartyIds, isActive: true };
    document.getElementById('electionConfigModal').classList.remove('active');
    alert(`✅ Election "${electionName}" configured!\nStart: ${startDate.toLocaleString()}\nEnd: ${endDate.toLocaleString()}\nParties: ${selectedPartyIds.length}`);
    navigateTo('admin-dashboard');
}

// ===== CANDIDATES =====
function loadActiveCandidates() {
    const container = document.getElementById('candidatesList');
    if (!container) return;
    container.innerHTML = '';
    
    const activeCandidates = mockDatabase.approvedParties.filter(p => p.approved && p.selectedForElection);
    if (activeCandidates.length === 0) {
        container.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">
            <i class="fas fa-info-circle empty-icon"></i><h3>No Active Election</h3>
            <p>There are currently no active elections. Please check back later.</p></div>`;
        return;
    }
    
    activeCandidates.forEach((c, i) => {
        const card = document.createElement('div');
        card.className = 'candidate-card';
        card.style.animationDelay = `${i * 0.1}s`;
        card.innerHTML = `<div class="candidate-avatar"><i class="fas ${c.symbol}"></i></div>
            <h3 class="candidate-name">${c.candidate}</h3><p class="candidate-party">${c.name}</p>
            <button class="btn btn-primary" onclick="castVote(${c.id}, '${c.candidate}', '${c.name}')">
                <i class="fas fa-vote-yea"></i><span>VOTE</span></button>`;
        container.appendChild(card);
    });
}

function loadPendingApprovals() {
    const table = document.querySelector('.approval-table');
    if (!table) return;
    table.querySelectorAll('.table-row').forEach(r => r.remove());
    mockDatabase.pendingParties.forEach(p => {
        const row = document.createElement('div');
        row.className = 'table-row';
        row.innerHTML = `<div>${p.name}</div><div>Party</div><div><span class="badge badge-warning">Pending</span></div>
            <div class="action-buttons">
                <button class="btn btn-success btn-sm" onclick="approveParty(${p.id})"><i class="fas fa-check"></i> Approve</button>
                <button class="btn btn-danger btn-sm" onclick="rejectParty(${p.id})"><i class="fas fa-times"></i> Reject</button></div>`;
        table.appendChild(row);
    });
}

// ===== VOTING =====
function castVote(candidateId, candidateName, partyName) {
    if (confirm(`Vote for:\n\n${candidateName}\n${partyName}\n\n⚠️ Cannot be undone.`)) {
        const hash = generateTransactionHash();
        document.getElementById('transactionHash').textContent = hash;
        navigateTo('vote-confirmation');
        createConfetti();
    }
}

function generateTransactionHash() {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 64; i++) hash += chars[Math.floor(Math.random() * chars.length)];
    return hash;
}

function copyHash() {
    const hash = document.getElementById('transactionHash').textContent;
    navigator.clipboard.writeText(hash).then(() => {
        const btn = event.target.closest('.copy-hash-btn');
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> COPIED!';
        btn.style.background = '#047857';
        setTimeout(() => { btn.innerHTML = orig; btn.style.background = ''; }, 2000);
    });
}

// ===== CONFETTI =====
function createConfetti() {
    const colors = ['#1e3a8a', '#d97706', '#047857', '#b91c1c'];
    for (let i = 0; i < 100; i++) {
        setTimeout(() => {
            const c = document.createElement('div');
            c.style.cssText = `position:fixed;left:${Math.random()*100}vw;top:-10px;width:${Math.random()*10+5}px;height:${Math.random()*10+5}px;background:${colors[Math.floor(Math.random()*colors.length)]};border-radius:${Math.random()>0.5?'50%':'0'};z-index:9999;pointer-events:none`;
            document.body.appendChild(c);
            const dur = Math.random() * 3 + 2, rot = Math.random() * 720 - 360;
            c.animate([{transform:'translateY(0) rotate(0deg)',opacity:1},{transform:`translateY(100vh) rotate(${rot}deg)`,opacity:0}],{duration:dur*1000,easing:'cubic-bezier(0.25,0.46,0.45,0.94)'});
            setTimeout(() => c.remove(), dur * 1000);
        }, i * 30);
    }
}

// ===== COUNTDOWN =====
function startElectionCountdown() {
    if (!electionConfig.isActive || !electionConfig.endDate) {
        const el = document.getElementById('electionCountdown');
        if (el) el.textContent = 'No Active Election';
        return;
    }
    const el = document.getElementById('electionCountdown');
    if (!el) return;
    setInterval(() => {
        const timeLeft = Math.floor((electionConfig.endDate.getTime() - new Date().getTime()) / 1000);
        if (timeLeft <= 0) { el.textContent = 'ENDED'; return; }
        const h = Math.floor(timeLeft / 3600), m = Math.floor((timeLeft % 3600) / 60), s = timeLeft % 60;
        el.textContent = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    }, 1000);
}

// ===== ADMIN =====
function approveParty(id) {
    const party = mockDatabase.pendingParties.find(p => p.id === id);
    if (!party) return;
    if (confirm(`Approve "${party.name}"?`)) {
        party.approved = true;
        mockDatabase.approvedParties.push(party);
        mockDatabase.pendingParties = mockDatabase.pendingParties.filter(p => p.id !== id);
        alert(`✅ ${party.name} approved!`);
        loadPendingApprovals();
    }
}

function rejectParty(id) {
    const party = mockDatabase.pendingParties.find(p => p.id === id);
    if (!party) return;
    if (confirm(`Reject "${party.name}"?`)) {
        mockDatabase.pendingParties = mockDatabase.pendingParties.filter(p => p.id !== id);
        alert(`❌ ${party.name} rejected.`);
        loadPendingApprovals();
    }
}

function approveItem(name) { alert(`✅ ${name} approved!`); }
function rejectItem(name) { if(confirm(`Reject ${name}?`)) alert(`❌ ${name} rejected.`); }

// ===== PARTY REGISTRATION =====
function handlePartyRegistration(event) {
    event.preventDefault();
    const name = document.getElementById('partyName').value;
    const candidate = document.getElementById('candidateName').value;
    const symbol = document.getElementById('partySymbol').value;
    const email = document.getElementById('partyEmail').value;
    
    const validation = validateEmail(email);
    if (!validation.valid) {
        showEmailValidation('partyEmail', false, validation.message);
        alert('⚠️ ' + validation.message);
        return;
    }
    
    mockDatabase.pendingParties.push({ id: Date.now(), name, candidate, symbol, email, approved: false });
    alert(`✅ Registration Successful!\n\nParty: ${name}\nCandidate: ${candidate}\n\nSubmitted for approval.`);
    event.target.reset();
    navigateTo('landing');
}

// ===== VERIFY =====
function verifyTransaction() {
    const hash = document.getElementById('verifyHash').value.trim();
    if (!hash) { alert('Enter a transaction hash'); return; }
    if (hash.length < 10 || !hash.startsWith('0x')) { alert('Enter valid hash (starts with 0x)'); return; }
    const result = document.getElementById('verifyResult');
    if (result) result.classList.remove('hidden');
}

// ===== LOGOUT =====
function logout() {
    if (confirm('Logout?')) {
        currentUser = null;
        currentRole = null;
        if (otpTimer) clearInterval(otpTimer);
        navigateTo('landing');
    }
}

// ===== SCROLL =====
window.addEventListener('scroll', () => {
    const btn = document.getElementById('scrollToTop');
    btn.classList.toggle('visible', window.pageYOffset > 300);
});
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

// ===== EMAIL VALIDATION LISTENERS =====
document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('email'), partyEmail = document.getElementById('partyEmail');
    if (emailInput) {
        emailInput.addEventListener('input', e => {
            const email = e.target.value.trim();
            if (email.length > 5 && email.includes('@')) {
                const v = validateEmail(email);
                showEmailValidation('email', v.valid, v.message);
            } else showEmailValidation('email', null, '');
        });
    }
    if (partyEmail) {
        partyEmail.addEventListener('input', e => {
            const email = e.target.value.trim();
            if (email.length > 5 && email.includes('@')) {
                const v = validateEmail(email);
                showEmailValidation('partyEmail', v.valid, v.message);
            } else showEmailValidation('partyEmail', null, '');
        });
    }
});

// ===== RESIZE =====
window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) document.getElementById('sidebar').classList.remove('mobile-open');
});

// ===== KEYBOARD =====
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        const nav = document.getElementById('navMenu'), ham = document.getElementById('hamburger');
        if (nav.classList.contains('mobile-open')) { nav.classList.remove('mobile-open'); ham.classList.remove('active'); }
        document.querySelectorAll('.otp-modal').forEach(m => m.classList.remove('active'));
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); toggleSidebar(); }
});

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 BlockVote Initialized\n📧 Email validation\n🔐 OTP modal\n✅ Party approval');
    if (window.innerWidth <= 1024) {
        document.getElementById('sidebar').classList.add('hidden');
        document.getElementById('toggleSidebar').classList.add('shifted');
        sidebarOpen = false;
    }
    navigateTo('landing');
});