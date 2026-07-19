// ==========================================
// --- ONBOARDING MODULE (PANDUAN USER) ------
// ==========================================

// Flag PERMANEN: true kalau user sudah pernah menyelesaikan (atau melewati) tutorial.
// Begitu true, tutorial TIDAK PERNAH otomatis muncul lagi di kunjungan berikutnya.
function isOnboardingCompleted() {
    return localStorage.getItem('mysaku_onboarding_completed') === 'true';
}
function markOnboardingCompleted() {
    localStorage.setItem('mysaku_onboarding_completed', 'true');
}

// State untuk melacak langkah panduan.
// Kalau user BELUM PERNAH menyelesaikan tutorial -> mulai dari step 0 (WAJIB jalan).
// Kalau SUDAH PERNAH selesai -> langsung nonaktif (-999), tidak akan pernah otomatis muncul lagi.
let onboardingStep = isOnboardingCompleted() ? -999 : 0;
let onboardingSkipped = isOnboardingCompleted();

const ONBOARDING_STEPS = [
    {
        title: "Langkah 1: Atur Saldo Awal",
        desc: "Agar aplikasi bisa mencatat keuangan, kamu perlu mengatur saldo awal dompet utama (Cash) terlebih dahulu.",
        example: "Contoh: ketik <i>'saldo awal 1jt'</i> atau klik tombol di bawah.",
        buttonText: "🪙 Set Saldo Awal",
        buttonAction: "btn-set-saldo-modal",
        hasButton: true
    },
    {
        title: "Langkah 2: Catat Pemasukan",
        desc: "Setelah saldo terisi, kamu bisa mencatat uang yang kamu terima (gaji, bonus, dll).",
        example: "Contoh: ketik <i>'terima gaji 3jt'</i>.",
        buttonText: "📈 Coba Pemasukan",
        buttonAction: "btn-onboarding-income",
        hasButton: false
    },
    {
        title: "Langkah 3: Catat Pengeluaran",
        desc: "Jangan lupa mencatat uang yang kamu keluarkan untuk kebutuhan sehari-hari.",
        example: "Contoh: ketik <i>'beli nasi 20k'</i> atau <i>'bayar listrik 150k'</i>.",
        buttonText: "📉 Coba Pengeluaran",
        buttonAction: "btn-onboarding-expense",
        hasButton: false
    },
    {
        title: "Langkah 4: Ganti Dompet (Opsional)",
        desc: "Kamu bisa memiliki beberapa dompet sekaligus (Cash, BCA, DANA, dll).",
        example: "Contoh: ketik <i>'gaji 5jt ke bca'</i> atau ganti dompet di halaman Laporan.",
        buttonText: "🔄 Lihat Dompet",
        buttonAction: "btn-onboarding-wallet",
        hasButton: false
    },
    {
        title: "Langkah 5: Catat Utang & Piutang",
        desc: "Mysaku juga bisa mencatat utang kamu ke orang lain. Kalau utangnya sudah dibayar, saldo dompet kamu otomatis berkurang dan catatan utang berkurang juga.",
        example: "Contoh: ketik <i>'hutang ke Andi 100rb'</i> untuk mencatat utang baru. (Nanti kalau mau melunasi, tinggal ketik <i>'bayar hutang 100rb'</i>).",
        buttonText: "",
        buttonAction: "",
        hasButton: false
    }
];

// Fungsi untuk mereset semua data aplikasi
function resetAllData() {
    console.log('🧹 Memulai reset semua data...');
    
    // Hapus semua data localStorage terkait MySaku
    const keysToRemove = [
        'mysaku_balance',
        'mysaku_active_wallet',
        'mysaku_history',
        'mysaku_chat_messages',
        'mysaku_debt'
    ];
    
    // Hapus semua dompet
    const WALLETS = ['Cash', 'BCA', 'DANA', 'GoPay', 'OVO', 'Mandiri'];
    WALLETS.forEach(w => {
        if (w === 'Cash') {
            localStorage.removeItem('mysaku_balance');
        } else {
            localStorage.removeItem('mysaku_wallet_' + w);
        }
    });
    
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
    });
    
    // Reset variabel global - PASTIKAN INI
    currentBalance = null;
    currentDebt = 0;
    onboardingStep = -999;          // SET -999 AGAR PASTI TIDAK AKTIF
    onboardingSkipped = true;
    onboardingFinished = true;
    
    // Kosongkan chat area
    chatArea.innerHTML = '';
    lastMessageDate = null;
    
    console.log('🧹 Semua data berhasil direset! Mode: REAL (bukan tutorial)');
    console.log('📊 Status onboarding: step=' + onboardingStep + ', skipped=' + onboardingSkipped + ', finished=' + onboardingFinished);
}

// Fungsi untuk memulai panduan
function startOnboarding() {
    console.log('📘 Memulai mode TUTORIAL');
    
    // Reset semua state untuk mode TUTORIAL
    onboardingStep = 0;
    onboardingSkipped = false;
    onboardingFinished = false;
    
    // Hapus chat lama
    chatArea.innerHTML = '';
    lastMessageDate = null;
    
    console.log('📊 Status onboarding: step=' + onboardingStep + ', skipped=' + onboardingSkipped + ', finished=' + onboardingFinished);

    // --- SAMBUTAN DULU, BARU MASUK LANGKAH 1 ---
    const welcomePairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const welcomeText = `👋 <b>Halo! Selamat datang di Mysaku.</b><br><br>
    Aku asisten keuangan kamu — nyatat pemasukan, pengeluaran, sampai utang, cukup lewat chat kayak gini.<br><br>
    Sebelum mulai, yuk aku pandu dulu cara pakainya, sebentar aja kok. Ikuti langkah-langkahnya ya! 😊`;
    addMessage(welcomeText, 'bot', false, '', null, welcomePairId);
    saveChatMessage(welcomeText, 'bot', false, '', null, welcomePairId, null, null);

    setTimeout(() => {
        sendOnboardingStep();
    }, 1500);
}

// Fungsi untuk mengirim langkah panduan berikutnya
function sendOnboardingStep() {
    // GUARD: Jika sudah selesai, jangan kirim lagi
    if (onboardingFinished && onboardingStep > ONBOARDING_STEPS.length) {
        console.log('⛔ Onboarding sudah selesai, skip pengiriman.');
        return;
    }
    
    if (onboardingStep >= ONBOARDING_STEPS.length) {
        // Tandai sudah selesai
        onboardingFinished = true;
        
        const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const botReply = `🎉 <b>Selamat! Kamu sudah selesai mempelajari dasar-dasar MySaku.</b><br><br>
        Sekarang kamu sudah siap mencatat keuangan pribadimu! 💪<br><br>
        <button class="btn-start-app px-6 py-2 bg-[#0028B3] text-white rounded-full text-sm font-medium shadow-md">🚀 Mulai Menggunakan</button>
        <button class="btn-restart-onboarding px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm shadow-md ml-2">🔄 Ulangi Panduan</button>`;
        addMessage(botReply, 'bot', false, '', null, pairId);
        saveChatMessage(botReply, 'bot', false, '', null, pairId, null, null);
        return;
    }

    const step = ONBOARDING_STEPS[onboardingStep];
    const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    let botReply = `📘 <b>${step.title}</b><br><br>
    ${step.desc}<br><br>
    <i>💡 ${step.example}</i>`;
    
    if (step.hasButton) {
        botReply += `<br><br><button class="${step.buttonAction} px-6 py-2 bg-[#0028B3] text-white rounded-full text-sm font-medium shadow-md">${step.buttonText}</button>`;
    } else {
        botReply += `<br><br>✍️ <b>Ketik perintah contoh di atas</b> untuk melanjutkan ke langkah berikutnya.`;
    }
    
    addMessage(botReply, 'bot', false, '', null, pairId);
    saveChatMessage(botReply, 'bot', false, '', null, pairId, null, null);
}

// --- EVENT LISTENER UNTUK TOMBOL ---
document.addEventListener('click', function(e) {
    const startBtn = e.target.closest('.btn-start-app');
    if (startBtn) {
        e.stopPropagation();
        console.log('🚀 User memilih "Mulai Menggunakan" - Reset semua data!');

        // Reset semua data praktik/latihan selama tutorial
        resetAllData();

        // Tandai PERMANEN bahwa tutorial sudah selesai -> tidak akan pernah otomatis muncul lagi
        markOnboardingCompleted();

        // Kirim pesan sambutan
        setTimeout(() => {
            addMessage("Halo! Aku Mysaku, asisten keuanganmu. 👋<br><br>Ketik <b>'bantuan'</b> untuk melihat daftar perintah.", 'bot');
        }, 300);
        return;
    }

    const restartBtn = e.target.closest('.btn-restart-onboarding');
    if (restartBtn) {
        e.stopPropagation();
        console.log('🔄 User memilih "Ulangi Panduan" - Reset semua data dan mulai ulang!');
        
        // Reset semua data
        resetAllData();
        
        // Mulai onboarding dari awal
        setTimeout(() => {
            startOnboarding();
        }, 500);
        return;
    }
});