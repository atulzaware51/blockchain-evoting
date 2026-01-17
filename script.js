// ===== BLOCKCHAIN VOTING SYSTEM - COMPLETE LOGIC =====
// Using localStorage as database (no Ganache required for demo)

// ===== GLOBAL STATE =====
let currentUser = null;
let currentRole = null; // 'voter', 'conductor'
let generatedOTP = null;
let otpTimer = null;
let sidebarOpen = true;

// ===== DATABASE INITIALIZATION =====
function initDatabase() {
    if (!localStorage.getItem('voters')) {
        localStorage.setItem('voters', JSON.stringify([]));
    }
    if (!localStorage.getItem('parties')) {
        localStorage.setItem('parties', JSON.stringify([]));
    }
    if (!localStorage.getItem('elections')) {
        localStorage.setItem('elections', JSON.stringify([]));
    }
    if (!localStorage.getItem('votes')) {
        localStorage.setItem('votes', JSON.stringify([]));
    }
    if (!localStorage.getItem('notifications')) {
        localStorage.setItem('notifications', JSON.stringify([]));
    }
}

// ===== HELPER FUNCTIONS =====
function generateId(prefix) {
    return prefix + Date.now() + Math.floor(Math.random() * 1000);
}

function generateSecretKey() {
    const chars = '0123456789abcdef';
    let key = '0x';
    for (let i = 0; i < 64; i++) {
        key += chars[Math.floor(Math.random() * chars.length)];
    }
    return key;
}

function generateTransactionHash() {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 64; i++) {
        hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
}

function calculateAge(dob) {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

// ===== NOTIFICATION SYSTEM =====
function addNotification(message, type = 'info') {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    notifications.push({
        id: generateId('N'),
        message,
        type,
        timestamp: new Date().toISOString(),
        read: false
    });
    localStorage.setItem('notifications', JSON.stringify(notifications));
}

function showConductorNotifications() {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    const unread = notifications.filter(n => !n.read);
    
    if (unread.length > 0) {
        const banner = document.getElementById('notificationBanner');
        const text = document.getElementById('notificationText');
        if (banner && text) {
            text.textContent = `You have ${unread.length} new notification(s)!`;
            banner.style.display = 'flex';
        }
    }
}

function clearNotifications() {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    notifications.forEach(n => n.read = true);
    localStorage.setItem('notifications', JSON.stringify(notifications));
    
    const banner = document.getElementById('notificationBanner');
    if (banner) banner.style.display = 'none';
}

// ===== PARTICLE ANIMATION =====
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
    
    // Load specific view content
    if (viewId === 'voter-profile' && currentUser) loadVoterProfile();
    if (viewId === 'voter-dashboard') loadVotingPage();
    if (viewId === 'conductor-dashboard') loadConductorDashboard();
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    const navMenu = document.getElementById('navMenu'), hamburger = document.getElementById('hamburger');
    if (navMenu.classList.contains('mobile-open')) {
        navMenu.classList.remove('mobile-open');
        hamburger.classList.remove('active');
    }
}

function showRoleSelection() {
    navigateTo('role-selection');
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const toggleBtn = document.getElementById('toggleSidebar');
    
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

function updateSidebar() {
    const sidebar = document.getElementById('sidebarNav');
    
    if (currentUser && currentRole === 'voter') {
        sidebar.innerHTML = `
            <li class="sidebar-item" onclick="navigateTo('landing')" data-view="landing">
                <i class="fas fa-home"></i><span>Home</span>
            </li>
            <li class="sidebar-item active" onclick="navigateTo('voter-profile')" data-view="voter-profile">
                <i class="fas fa-user"></i><span>My Profile</span>
            </li>
            <li class="sidebar-item" onclick="navigateTo('voter-dashboard')" data-view="voter-dashboard">
                <i class="fas fa-vote-yea"></i><span>Vote</span>
            </li>
            <li class="sidebar-item" onclick="logout()">
                <i class="fas fa-sign-out-alt"></i><span>Logout</span>
            </li>
        `;
    } else if (currentUser && currentRole === 'conductor') {
        sidebar.innerHTML = `
            <li class="sidebar-item" onclick="navigateTo('landing')" data-view="landing">
                <i class="fas fa-home"></i><span>Home</span>
            </li>
            <li class="sidebar-item active" onclick="navigateTo('conductor-dashboard')" data-view="conductor-dashboard">
                <i class="fas fa-th-large"></i><span>Dashboard</span>
            </li>
            <li class="sidebar-item" onclick="logout()">
                <i class="fas fa-sign-out-alt"></i><span>Logout</span>
            </li>
        `;
    } else {
        sidebar.innerHTML = `
            <li class="sidebar-item active" onclick="navigateTo('landing')" data-view="landing">
                <i class="fas fa-home"></i><span>Home</span>
            </li>
            <li class="sidebar-item" onclick="showRoleSelection()" data-view="role-selection">
                <i class="fas fa-user-plus"></i><span>Register/Login</span>
            </li>
        `;
    }
}

// ===== VOTER REGISTRATION =====
function handleVoterRegistration(event) {
    event.preventDefault();
    
    const name = document.getElementById('voterName').value.trim();
    const email = document.getElementById('voterEmail').value.trim();
    const voterId = document.getElementById('voterIdNumber').value.trim();
    const dob = document.getElementById('voterDOB').value;
    
    // Check age
    const age = calculateAge(dob);
    if (age < 18) {
        alert('❌ You must be at least 18 years old to register as a voter.');
        return;
    }
    
    // Check if already registered
    const voters = JSON.parse(localStorage.getItem('voters') || '[]');
    const existing = voters.find(v => v.email === email || v.voterId === voterId);
    if (existing) {
        alert('❌ This email or voter ID is already registered!');
        return;
    }
    
    // Create voter
    const newVoter = {
        id: generateId('V'),
        name,
        email,
        voterId,
        dob,
        secretKey: generateSecretKey(),
        approved: false,
        eligibleToVote: false,
        hasVoted: false,
        voteTransactionHash: null,
        registeredAt: new Date().toISOString()
    };
    
    voters.push(newVoter);
    localStorage.setItem('voters', JSON.stringify(voters));
    
    // Add notification for conductor
    addNotification(`New voter registration: ${name} (${email})`, 'info');
    
    alert(`✅ Registration Successful!\n\nName: ${name}\nVoter ID: ${voterId}\n\nYour application has been submitted for approval. You will be notified once approved by the election conductor.`);
    
    event.target.reset();
    navigateTo('voter-login');
}

// ===== VOTER LOGIN =====
function handleVoterLogin(event) {
    event.preventDefault();
    
    const loginId = document.getElementById('voterLoginId').value.trim();
    const voters = JSON.parse(localStorage.getItem('voters') || '[]');
    
    const voter = voters.find(v => v.email === loginId || v.voterId === loginId);
    
    if (!voter) {
        alert('❌ Voter not found! Please register first.');
        return;
    }
    
    // Generate OTP
    generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    currentUser = voter;
    currentRole = 'voter';
    
    showOTPModal(generatedOTP);
    navigateTo('otp-verify');
    startOTPTimer();
}

// ===== OTP MODAL =====
function showOTPModal(otp) {
    document.getElementById('otpCodeDisplay').textContent = otp;
    document.getElementById('otpModal').classList.add('active');
}

function closeOTPModal() {
    document.getElementById('otpModal').classList.remove('active');
}

// ===== OTP VERIFICATION =====
function startOTPTimer() {
    let timeLeft = 90;
    const timerElement = document.getElementById('otpTimer');
    if (otpTimer) clearInterval(otpTimer);
    
    otpTimer = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(otpTimer);
            timerElement.textContent = 'Expired';
            timerElement.style.color = '#b91c1c';
        }
        timeLeft--;
    }, 1000);
}

function moveToNext(current, nextId) {
    if (current.value.length === 1 && nextId) {
        document.getElementById(nextId).focus();
    }
}

function verifyOTP() {
    const otp = ['otp1', 'otp2', 'otp3', 'otp4', 'otp5', 'otp6']
        .map(id => document.getElementById(id).value).join('');
    
    if (otp.length !== 6) {
        alert('Please enter the complete 6-digit OTP');
        return;
    }
    
    if (otp === generatedOTP) {
        clearInterval(otpTimer);
        updateSidebar();
        
        if (currentRole === 'voter') {
            navigateTo('voter-profile');
        } else if (currentRole === 'conductor') {
            navigateTo('conductor-dashboard');
        }
    } else {
        alert('❌ Invalid OTP. Please check the code and try again.');
        ['otp1', 'otp2', 'otp3', 'otp4', 'otp5', 'otp6'].forEach(id => {
            document.getElementById(id).value = '';
        });
        document.getElementById('otp1').focus();
    }
}

function resendOTP() {
    generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    showOTPModal(generatedOTP);
    clearInterval(otpTimer);
    startOTPTimer();
    ['otp1', 'otp2', 'otp3', 'otp4', 'otp5', 'otp6'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('otp1').focus();
}

// ===== VOTER PROFILE =====
function loadVoterProfile() {
    if (!currentUser) return;
    
    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profileVoterId').textContent = currentUser.voterId;
    document.getElementById('profileSecretKey').textContent = currentUser.secretKey;
    document.getElementById('profileRegDate').textContent = new Date(currentUser.registeredAt).toLocaleDateString();
    
    // Eligibility status
    const eligibilityEl = document.getElementById('profileEligibility');
    if (currentUser.approved && currentUser.eligibleToVote) {
        eligibilityEl.innerHTML = '<span class="badge badge-success">✓ Eligible to Vote</span>';
    } else if (currentUser.approved && !currentUser.eligibleToVote) {
        eligibilityEl.innerHTML = '<span class="badge badge-warning">⏳ Approved, Waiting for Election</span>';
    } else {
        eligibilityEl.innerHTML = '<span class="badge badge-error">⏳ Pending Approval</span>';
    }
    
    // Voting status
    const votingStatusEl = document.getElementById('profileVotingStatus');
    const voteHashRow = document.getElementById('voteHashRow');
    const voteHashEl = document.getElementById('profileVoteHash');
    
    if (currentUser.hasVoted) {
        votingStatusEl.innerHTML = '<span class="badge badge-success">✓ Vote Cast</span>';
        voteHashRow.style.display = 'flex';
        voteHashEl.textContent = currentUser.voteTransactionHash || 'N/A';
    } else {
        votingStatusEl.innerHTML = '<span class="badge badge-warning">Not Voted Yet</span>';
        voteHashRow.style.display = 'none';
    }
}

function copySecretKey() {
    const key = document.getElementById('profileSecretKey').textContent;
    navigator.clipboard.writeText(key).then(() => {
        alert('✅ Secret key copied to clipboard!');
    });
}

// ===== VOTING PAGE =====
function loadVotingPage() {
    const container = document.getElementById('candidatesList');
    const infoEl = document.getElementById('electionInfo');
    
    if (!currentUser) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-user-times empty-icon"></i><h3>Please Login</h3><p>You need to login as a voter to cast your vote.</p></div>';
        return;
    }
    
    // Check if voter has already voted
    if (currentUser.hasVoted) {
        container.innerHTML = `
            <div class="already-voted-message">
                <i class="fas fa-check-circle"></i>
                <h2>You Have Already Voted!</h2>
                <p>Thank you for participating in the democratic process.</p>
                <p><strong>Transaction Hash:</strong></p>
                <code style="word-break: break-all; font-size: 0.9rem;">${currentUser.voteTransactionHash}</code>
                <div class="mt-3">
                    <button class="btn btn-primary" onclick="navigateTo('voter-profile')">
                        <i class="fas fa-user"></i> View Profile
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    // Check if voter is approved and eligible
    if (!currentUser.approved || !currentUser.eligibleToVote) {
        container.innerHTML = `
            <div class="not-eligible-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h2>Not Eligible to Vote</h2>
                <p>${!currentUser.approved ? 'Your voter registration is pending approval by the election conductor.' : 'No active election at this time.'}</p>
                <div class="mt-2">
                    <button class="btn btn-primary" onclick="navigateTo('voter-profile')">
                        <i class="fas fa-user"></i> View Profile
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    // Get active election
    const elections = JSON.parse(localStorage.getItem('elections') || '[]');
    const activeElection = elections.find(e => e.status === 'active');
    
    if (!activeElection) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times empty-icon"></i>
                <h3>No Active Election</h3>
                <p>There are no active elections at this time. Please check back later.</p>
            </div>
        `;
        return;
    }
    
    // Show election info
    infoEl.innerHTML = `
        <div class="card" style="max-width: 600px; margin: 0 auto var(--space-lg);">
            <h3 style="color: var(--navy-primary); margin-bottom: var(--space-sm);">${activeElection.name}</h3>
            <p class="text-muted">Ends: ${new Date(activeElection.endDate).toLocaleString()}</p>
        </div>
    `;
    
    // Load candidates (approved parties in this election)
    const parties = JSON.parse(localStorage.getItem('parties') || '[]');
    const candidates = parties.filter(p => activeElection.parties.includes(p.id));
    
    container.innerHTML = '';
    candidates.forEach(party => {
        const card = document.createElement('div');
        card.className = 'candidate-card';
        card.innerHTML = `
            <div class="candidate-avatar"><i class="fas ${party.symbol}"></i></div>
            <h3 class="candidate-name">${party.candidate}</h3>
            <p class="candidate-party">${party.name}</p>
            <p class="text-muted mb-2"><strong>Position:</strong> ${party.position}</p>
            <button class="btn btn-primary" onclick="castVote('${party.id}', '${party.name}', '${party.candidate}')">
                <i class="fas fa-vote-yea"></i> <span>VOTE</span>
            </button>
        `;
        container.appendChild(card);
    });
}

// ===== CAST VOTE =====
function castVote(partyId, partyName, candidateName) {
    if (!confirm(`Confirm your vote for:\n\n${candidateName}\n${partyName}\n\n⚠️ This action cannot be undone!`)) {
        return;
    }
    
    const hash = generateTransactionHash();
    const elections = JSON.parse(localStorage.getItem('elections') || '[]');
    const activeElection = elections.find(e => e.status === 'active');
    
    // Record vote (encrypted - conductor cannot see who voted for whom)
    const votes = JSON.parse(localStorage.getItem('votes') || '[]');
    votes.push({
        id: generateId('VOTE'),
        electionId: activeElection.id,
        voterSecretKey: currentUser.secretKey, // NOT voter ID!
        transactionHash: hash,
        timestamp: new Date().toISOString(),
        // Party is encrypted in real blockchain - here we store for demo
        encryptedPartyId: btoa(partyId) // Simple encoding for demo
    });
    localStorage.setItem('votes', JSON.stringify(votes));
    
    // Update voter record
    const voters = JSON.parse(localStorage.getItem('voters') || '[]');
    const voterIndex = voters.findIndex(v => v.id === currentUser.id);
    voters[voterIndex].hasVoted = true;
    voters[voterIndex].voteTransactionHash = hash;
    localStorage.setItem('voters', JSON.stringify(voters));
    
    currentUser.hasVoted = true;
    currentUser.voteTransactionHash = hash;
    
    // Show confirmation
    document.getElementById('transactionHash').textContent = hash;
    navigateTo('vote-confirmation');
    createConfetti();
}

function copyHash() {
    const hash = document.getElementById('transactionHash').textContent;
    navigator.clipboard.writeText(hash).then(() => {
        alert('✅ Transaction hash copied!');
    });
}

function createConfetti() {
    const colors = ['#1e3a8a', '#d97706', '#047857', '#b91c1c'];
    for (let i = 0; i < 100; i++) {
        setTimeout(() => {
            const c = document.createElement('div');
            c.style.cssText = `position:fixed;left:${Math.random()*100}vw;top:-10px;width:${Math.random()*10+5}px;height:${Math.random()*10+5}px;background:${colors[Math.floor(Math.random()*colors.length)]};border-radius:${Math.random()>0.5?'50%':'0'};z-index:9999;pointer-events:none`;
            document.body.appendChild(c);
            const dur = Math.random() * 3 + 2;
            c.animate([{transform:'translateY(0)',opacity:1},{transform:'translateY(100vh)',opacity:0}],{duration:dur*1000});
            setTimeout(() => c.remove(), dur * 1000);
        }, i * 30);
    }
}

// ===== PARTY REGISTRATION =====
function handlePartyRegistration(event) {
    event.preventDefault();
    
    const name = document.getElementById('partyName').value.trim();
    const candidate = document.getElementById('candidateName').value.trim();
    const position = document.getElementById('candidatePosition').value.trim();
    const symbol = document.getElementById('partySymbol').value;
    const email = document.getElementById('partyEmail').value.trim();
    
    const parties = JSON.parse(localStorage.getItem('parties') || '[]');
    const existing = parties.find(p => p.name === name || p.email === email);
    
    if (existing) {
        alert('❌ Party name or email already registered!');
        return;
    }
    
    const newParty = {
        id: generateId('P'),
        name,
        candidate,
        position,
        symbol,
        email,
        approved: false,
        registeredAt: new Date().toISOString()
    };
    
    parties.push(newParty);
    localStorage.setItem('parties', JSON.stringify(parties));
    
    addNotification(`New party registration: ${name} - ${candidate} for ${position}`, 'info');
    
    alert(`✅ Party Registration Successful!\n\nParty: ${name}\nCandidate: ${candidate}\nPosition: ${position}\n\nYour application has been submitted for approval.`);
    
    event.target.reset();
    navigateTo('landing');
}

// ===== CONDUCTOR LOGIN =====
function handleConductorLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('conductorEmail').value;
    const password = document.getElementById('conductorPassword').value;
    
    if (email === 'admin@election.gov' && password === 'admin123') {
        currentUser = { email, role: 'conductor' };
        currentRole = 'conductor';
        generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
        
        showOTPModal(generatedOTP);
        navigateTo('otp-verify');
        startOTPTimer();
    } else {
        alert('❌ Invalid credentials!');
    }
}

// ===== CONDUCTOR DASHBOARD =====
function loadConductorDashboard() {
    const voters = JSON.parse(localStorage.getItem('voters') || '[]');
    const parties = JSON.parse(localStorage.getItem('parties') || '[]');
    
    document.getElementById('statApprovedVoters').textContent = voters.filter(v => v.approved).length;
    document.getElementById('statPendingVoters').textContent = voters.filter(v => !v.approved).length;
    document.getElementById('statApprovedParties').textContent = parties.filter(p => p.approved).length;
    document.getElementById('statPendingParties').textContent = parties.filter(p => !p.approved).length;
    
    showConductorNotifications();
    switchTab('voters');
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    const content = document.getElementById('tabContent');
    
    if (tab === 'voters') {
        showVoterApprovals(content);
    } else if (tab === 'parties') {
        showPartyApprovals(content);
    } else if (tab === 'elections') {
        showElectionCreation(content);
    } else if (tab === 'votes') {
        showVoteRecords(content);
    }
}

function showVoterApprovals(container) {
    const voters = JSON.parse(localStorage.getItem('voters') || '[]');
    const pending = voters.filter(v => !v.approved);
    
    let html = '<h3 style="margin-bottom: var(--space-lg);">Pending Voter Approvals</h3>';
    
    if (pending.length === 0) {
        html += '<div class="empty-state"><i class="fas fa-check-circle empty-icon"></i><h3>No Pending Approvals</h3><p>All voters have been processed.</p></div>';
    } else {
        html += '<div class="approval-table">';
        html += '<div class="approval-table-header"><div>Name</div><div>Voter ID</div><div>Email</div><div>Age</div><div>Actions</div></div>';
        
        pending.forEach(voter => {
            const age = calculateAge(voter.dob);
            html += `
                <div class="approval-table-row">
                    <div>${voter.name}</div>
                    <div>${voter.voterId}</div>
                    <div>${voter.email}</div>
                    <div>${age} years</div>
                    <div class="action-buttons">
                        <button class="btn btn-success btn-sm" onclick="approveVoter('${voter.id}')">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="rejectVoter('${voter.id}')">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
    }
    
    container.innerHTML = html;
}

function approveVoter(voterId) {
    const voters = JSON.parse(localStorage.getItem('voters') || '[]');
    const index = voters.findIndex(v => v.id === voterId);
    
    if (index !== -1) {
        voters[index].approved = true;
        
        // Check if there's an active election
        const elections = JSON.parse(localStorage.getItem('elections') || '[]');
        const activeElection = elections.find(e => e.status === 'active');
        voters[index].eligibleToVote = !!activeElection;
        
        localStorage.setItem('voters', JSON.stringify(voters));
        alert(`✅ Voter ${voters[index].name} approved!`);
        loadConductorDashboard();
    }
}

function rejectVoter(voterId) {
    if (!confirm('Are you sure you want to reject this voter?')) return;
    
    const voters = JSON.parse(localStorage.getItem('voters') || '[]');
    const filtered = voters.filter(v => v.id !== voterId);
    localStorage.setItem('voters', JSON.stringify(filtered));
    
    alert('❌ Voter rejected and removed.');
    loadConductorDashboard();
}

function showPartyApprovals(container) {
    const parties = JSON.parse(localStorage.getItem('parties') || '[]');
    const pending = parties.filter(p => !p.approved);
    
    let html = '<h3 style="margin-bottom: var(--space-lg);">Pending Party Approvals</h3>';
    
    if (pending.length === 0) {
        html += '<div class="empty-state"><i class="fas fa-check-circle empty-icon"></i><h3>No Pending Approvals</h3><p>All parties have been processed.</p></div>';
    } else {
        html += '<div class="approval-table">';
        html += '<div class="approval-table-header"><div>Party Name</div><div>Candidate</div><div>Position</div><div>Email</div><div>Actions</div></div>';
        
        pending.forEach(party => {
            html += `
                <div class="approval-table-row">
                    <div><i class="fas ${party.symbol}"></i> ${party.name}</div>
                    <div>${party.candidate}</div>
                    <div>${party.position}</div>
                    <div>${party.email}</div>
                    <div class="action-buttons">
                        <button class="btn btn-success btn-sm" onclick="approveParty('${party.id}')">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="rejectParty('${party.id}')">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
    }
    
    container.innerHTML = html;
}

function approveParty(partyId) {
    const parties = JSON.parse(localStorage.getItem('parties') || '[]');
    const index = parties.findIndex(p => p.id === partyId);
    
    if (index !== -1) {
        parties[index].approved = true;
        localStorage.setItem('parties', JSON.stringify(parties));
        alert(`✅ Party ${parties[index].name} approved!`);
        loadConductorDashboard();
    }
}

function rejectParty(partyId) {
    if (!confirm('Are you sure you want to reject this party?')) return;
    
    const parties = JSON.parse(localStorage.getItem('parties') || '[]');
    const filtered = parties.filter(p => p.id !== partyId);
    localStorage.setItem('parties', JSON.stringify(filtered));
    
    alert('❌ Party rejected and removed.');
    loadConductorDashboard();
}

function showElectionCreation(container) {
    const parties = JSON.parse(localStorage.getItem('parties') || '[]');
    const approvedParties = parties.filter(p => p.approved);
    
    let html = '<h3 style="margin-bottom: var(--space-lg);">Create New Election</h3>';
    html += '<div class="election-form"><form onsubmit="createElection(event)">';
    html += '<div class="form-group"><label class="form-label">Election Name</label><input type="text" class="form-input" id="electionName" placeholder="e.g., General Election 2026" required></div>';
    html += '<div class="form-group"><label class="form-label">Start Date</label><input type="datetime-local" class="form-input" id="electionStart" required></div>';
    html += '<div class="form-group"><label class="form-label">End Date</label><input type="datetime-local" class="form-input" id="electionEnd" required></div>';
    
    html += '<div class="form-group"><label class="form-label">Select Parties to Include</label><div class="party-checkbox-list">';
    
    if (approvedParties.length === 0) {
        html += '<p class="text-muted">No approved parties available. Please approve parties first.</p>';
    } else {
        approvedParties.forEach(party => {
            html += `
                <div class="party-checkbox-item">
                    <input type="checkbox" id="party-${party.id}" value="${party.id}">
                    <label for="party-${party.id}"><i class="fas ${party.symbol}"></i> ${party.name} - ${party.candidate} (${party.position})</label>
                </div>
            `;
        });
    }
    
    html += '</div></div>';
    html += '<button type="submit" class="btn btn-primary btn-block"><i class="fas fa-plus"></i> Create Election</button>';
    html += '</form></div>';
    
    // Show existing elections
    const elections = JSON.parse(localStorage.getItem('elections') || '[]');
    if (elections.length > 0) {
        html += '<h3 style="margin-top: var(--space-2xl); margin-bottom: var(--space-lg);">Existing Elections</h3>';
        elections.forEach(election => {
            const statusBadge = election.status === 'active' ? 'badge-success' : election.status === 'completed' ? 'badge-error' : 'badge-warning';
            html += `
                <div class="card mb-2">
                    <h4>${election.name} <span class="badge ${statusBadge}">${election.status.toUpperCase()}</span></h4>
                    <p class="text-muted">Start: ${new Date(election.startDate).toLocaleString()}</p>
                    <p class="text-muted">End: ${new Date(election.endDate).toLocaleString()}</p>
                    <p class="text-muted">Parties: ${election.parties.length}</p>
                    ${election.status === 'pending' ? `<button class="btn btn-success mt-2" onclick="activateElection('${election.id}')"><i class="fas fa-play"></i> Activate Election</button>` : ''}
                </div>
            `;
        });
    }
    
    container.innerHTML = html;
}

function createElection(event) {
    event.preventDefault();
    
    const name = document.getElementById('electionName').value;
    const startDate = document.getElementById('electionStart').value;
    const endDate = document.getElementById('electionEnd').value;
    
    const parties = JSON.parse(localStorage.getItem('parties') || '[]');
    const selectedParties = [];
    
    parties.forEach(party => {
        const checkbox = document.getElementById(`party-${party.id}`);
        if (checkbox && checkbox.checked) {
            selectedParties.push(party.id);
        }
    });
    
    if (selectedParties.length === 0) {
        alert('❌ Please select at least one party!');
        return;
    }
    
    if (new Date(startDate) >= new Date(endDate)) {
        alert('❌ End date must be after start date!');
        return;
    }
    
    const newElection = {
        id: generateId('E'),
        name,
        startDate,
        endDate,
        parties: selectedParties,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    
    const elections = JSON.parse(localStorage.getItem('elections') || '[]');
    elections.push(newElection);
    localStorage.setItem('elections', JSON.stringify(elections));
    
    alert(`✅ Election "${name}" created successfully!\n\nClick "Activate Election" to make it live.`);
    loadConductorDashboard();
}

function activateElection(electionId) {
    if (!confirm('Are you sure you want to activate this election? This will allow voters to start casting votes.')) return;
    
    const elections = JSON.parse(localStorage.getItem('elections') || '[]');
    
    // Deactivate all other elections
    elections.forEach(e => {
        if (e.status === 'active') e.status = 'completed';
    });
    
    // Activate this election
    const index = elections.findIndex(e => e.id === electionId);
    if (index !== -1) {
        elections[index].status = 'active';
        localStorage.setItem('elections', JSON.stringify(elections));
        
        // Mark all approved voters as eligible
        const voters = JSON.parse(localStorage.getItem('voters') || '[]');
        voters.forEach(v => {
            if (v.approved) v.eligibleToVote = true;
        });
        localStorage.setItem('voters', JSON.stringify(voters));
        
        alert('✅ Election activated! Voters can now cast their votes.');
        loadConductorDashboard();
    }
}

function showVoteRecords(container) {
    const votes = JSON.parse(localStorage.getItem('votes') || '[]');
    const voters = JSON.parse(localStorage.getItem('voters') || '[]');
    
    let html = '<h3 style="margin-bottom: var(--space-lg);">Vote Records</h3>';
    html += `<p class="text-muted mb-3">Total Votes Cast: <strong>${votes.length}</strong></p>`;
    html += '<p class="info-box mb-3"><i class="fas fa-lock"></i> For privacy, individual vote choices are encrypted. Only vote counts are visible.</p>';
    
    if (votes.length === 0) {
        html += '<div class="empty-state"><i class="fas fa-vote-yea empty-icon"></i><h3>No Votes Yet</h3><p>No votes have been cast in any election.</p></div>';
    } else {
        votes.forEach(vote => {
            html += `
                <div class="vote-record-item">
                    <div class="vote-timestamp"><i class="fas fa-clock"></i> ${new Date(vote.timestamp).toLocaleString()}</div>
                    <div class="vote-hash"><i class="fas fa-fingerprint"></i> ${vote.transactionHash}</div>
                    <div><span class="badge badge-success">Verified</span></div>
                </div>
            `;
        });
    }
    
    container.innerHTML = html;
}

// ===== LOGOUT =====
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        currentUser = null;
        currentRole = null;
        if (otpTimer) clearInterval(otpTimer);
        updateSidebar();
        navigateTo('landing');
    }
}

// ===== SCROLL TO TOP =====
window.addEventListener('scroll', () => {
    const btn = document.getElementById('scrollToTop');
    btn.classList.toggle('visible', window.pageYOffset > 300);
});

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== RESPONSIVE =====
window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) {
        document.getElementById('sidebar').classList.remove('mobile-open');
    }
});

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        const nav = document.getElementById('navMenu');
        const ham = document.getElementById('hamburger');
        if (nav.classList.contains('mobile-open')) {
            nav.classList.remove('mobile-open');
            ham.classList.remove('active');
        }
        document.querySelectorAll('.otp-modal').forEach(m => m.classList.remove('active'));
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        toggleSidebar();
    }
});

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 BlockVote System Initialized');
    console.log('📊 Using localStorage (no Ganache required)');
    console.log('🔐 Blockchain simulation active');
    
    initDatabase();
    
    if (window.innerWidth <= 1024) {
        document.getElementById('sidebar').classList.add('hidden');
        document.getElementById('toggleSidebar').classList.add('shifted');
        sidebarOpen = false;
    }
    
    navigateTo('landing');
});
