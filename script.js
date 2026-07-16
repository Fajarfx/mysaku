// --- 1. Inisialisasi Elemen DOM ---
const chatArea = document.getElementById('chatArea');
const userInput = document.getElementById('userInput');
const btnSend = document.getElementById('btnSend');

// Menu & Overlay
const overlay = document.getElementById('overlay');
const ctxMenu = document.getElementById('ctxMenu');
const bottomSheet = document.getElementById('bottomSheet');
const topMenu = document.getElementById('topMenu');

// Tombol-tombol
const btnHamburger = document.getElementById('btnHamburger');
const btnTopMenu = document.getElementById('btnTopMenu');
const btnSelectFile = document.getElementById('btnSelectFile');
const fileInput = document.getElementById('fileInput');
const btnSendPhoto = document.getElementById('btnSendPhoto');
const imagePreview = document.getElementById('imagePreview');
const captionInput = document.getElementById('captionInput');

// Tombol Context Menu
const editBtn = document.getElementById('editBtn');
const deleteBtn = document.getElementById('deleteBtn');

// State (Variabel global)
let selectedMessageElement = null;
let lastMessageDate = null; // Untuk penanda tanggal


// --- 2. Fungsi Dasar Chat (Menambah Pesan + Tanggal & Jam) ---
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(timestamp) {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    date.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    yesterday.setHours(0,0,0,0);

    if (date.getTime() === today.getTime()) return "Hari Ini";
    if (date.getTime() === yesterday.getTime()) return "Kemarin";
    return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function addMessage(text, sender, isImage = false, imageUrl = '', transactionData = null) {
    const now = Date.now();
    const currentDateLabel = formatDateLabel(now);

    // Cek hari berganti
    if (lastMessageDate !== currentDateLabel) {
        const dividerRow = document.createElement('div');
        dividerRow.className = 'date-divider';
        dividerRow.innerHTML = `<span>${currentDateLabel}</span>`;
        chatArea.appendChild(dividerRow);
        lastMessageDate = currentDateLabel;
    }

    const row = document.createElement('div');
    row.className = `message-row ${sender}`;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper';

    const bubble = document.createElement('div');
    bubble.className = `bubble ${sender}`;

    // --- SIMPAN DATA TRANSAKSI KE ATTRIBUT HTML ---
    if (transactionData) {
        row.dataset.type = transactionData.type;     // 'pemasukan' atau 'pengeluaran'
        row.dataset.amount = transactionData.amount; // Nominal asli (angka)
    }

    if(isImage && imageUrl) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.className = 'chat-image';
        bubble.appendChild(img);
        if(text && text.trim() !== '') {
            const textNode = document.createElement('span');
            textNode.innerHTML = text;
            bubble.appendChild(document.createElement('br'));
            bubble.appendChild(textNode);
        }
    } else {
        bubble.innerHTML = text;
    }

    const timeElement = document.createElement('div');
    timeElement.className = 'message-time';
    timeElement.innerText = formatTime(now);

    wrapper.appendChild(bubble);
    wrapper.appendChild(timeElement);
    row.appendChild(wrapper);
    
    chatArea.appendChild(row);
    chatArea.scrollTop = chatArea.scrollHeight;

    attachLongPressEvent(row, sender);
    return row;
}


// --- 3. Logika Long Press (Tekan & Tahan) ---
function attachLongPressEvent(element, sender) {
    let pressTimer;
    const showMenu = (e) => {
        clearTimeout(pressTimer);
        pressTimer = setTimeout(() => {
            if(sender === 'user') showContextMenu(e, element);
        }, 600);
    };
    const hideMenu = () => clearTimeout(pressTimer);

    element.addEventListener('mousedown', showMenu);
    element.addEventListener('mouseup', hideMenu);
    element.addEventListener('mouseleave', hideMenu);
    element.addEventListener('touchstart', showMenu);
    element.addEventListener('touchend', hideMenu);
}

function showContextMenu(event, element) {
    closeAllMenus();
    selectedMessageElement = element;
    
    // Ambil posisi klik (mouse atau touch)
    let x = event.clientX || event.touches[0].clientX;
    let y = event.clientY || event.touches[0].clientY;

    // Tampilkan menu dulu agar kita bisa ukur lebarnya
    ctxMenu.style.left = x + 'px';
    ctxMenu.style.top = y + 'px';
    ctxMenu.classList.add('active');
    overlay.classList.add('active');

    // --- PERBAIKAN POSISI AGAR TIDAK TERPOTONG (Mobile Friendly) ---
    // Ambil lebar menu setelah ditampilkan
    const menuWidth = ctxMenu.offsetWidth;
    const windowWidth = window.innerWidth;

    // Jika posisi klik + lebar menu melebihi batas layar kanan
    if (x + menuWidth > windowWidth) {
        // Geser menu ke kiri agar muat di layar
        ctxMenu.style.left = (windowWidth - menuWidth - 10) + 'px'; // -10 px untuk padding sedikit
    }
}

editBtn.onclick = () => {
    const bubble = selectedMessageElement.querySelector('.bubble.user');
    if(bubble && !bubble.querySelector('img')) {
        
        // --- 1. ROLLBACK SALDO (Kembalikan saldo sebelum transaksi ini) ---
        const oldType = selectedMessageElement.dataset.type;
        const oldAmount = parseFloat(selectedMessageElement.dataset.amount);

        if (currentBalance !== null && oldType && !isNaN(oldAmount)) {
            if (oldType === 'pemasukan') {
                currentBalance = currentBalance - oldAmount;
            } else if (oldType === 'pengeluaran') {
                currentBalance = currentBalance + oldAmount;
            }
            localStorage.setItem('mysaku_balance', currentBalance.toString());
        }

        // --- 2. HAPUS BALASAN BOT SEBELUMNYA ---
        // Ambil elemen pesan user saat ini
        const currentUserRow = selectedMessageElement;
        // Cari elemen pesan bot yang berada tepat SETELAH pesan user ini di DOM
        let nextElement = currentUserRow.nextElementSibling;

        // Jika elemen berikutnya ada, dan itu adalah pesan bot (bukan tanggal), hapus!
        if (nextElement && nextElement.classList.contains('message-row') && nextElement.classList.contains('bot')) {
            nextElement.remove();
        }

        // --- 3. PROSES EDIT PESAN USER ---
        userInput.value = bubble.innerText;
        userInput.focus();
        selectedMessageElement.remove(); // Hapus pesan user lama
        closeAllMenus();
        
    } else {
        alert('Tidak bisa mengedit pesan berisi gambar.');
        closeAllMenus();
    }
};

deleteBtn.onclick = () => {
    if(confirm('Hapus pesan ini?')) {
        selectedMessageElement.remove();
        closeAllMenus();
    }
};


// --- 4. Logika Upload Foto (Bottom Sheet) ---
function openBottomSheet() {
    closeAllMenus();
    bottomSheet.classList.add('active');
    overlay.classList.add('active');
    fileInput.value = '';
    imagePreview.style.display = 'none';
    captionInput.value = '';
}

btnHamburger.onclick = openBottomSheet;
btnSelectFile.onclick = () => fileInput.click();

fileInput.onchange = (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
};

btnSendPhoto.onclick = () => {
    if(imagePreview.style.display === 'none') {
        alert('Silakan pilih foto terlebih dahulu!');
        return;
    }

    const caption = captionInput.value.trim();
    
    // Parsing teks jika ada
    let transactionData = null;
    if (caption !== '') {
        const result = parseTransaction(caption);
        if (result.success) {
            transactionData = result.data;
        }
    }

    // Tampilkan pesan user dengan data transaksi
    addMessage(caption, 'user', true, imagePreview.src, transactionData);
    closeAllMenus();

    setTimeout(() => {
        if (caption === '') {
            addMessage("Terima kasih fotonya! Aku sudah catat dokumentasi ini.", 'bot');
        } else {
            const botReply = getBotResponse(caption);
            addMessage(botReply, 'bot');
        }
    }, 1000);
};
    

// --- 5. Logika Menu Kanan Atas (⋮) ---
btnTopMenu.onclick = () => {
    closeAllMenus();
    topMenu.classList.toggle('active');
    if(topMenu.classList.contains('active')) overlay.classList.add('active');
};

document.getElementById('aboutApp').onclick = () => {
    alert('Mysaku v1.0\nAsisten Keuangan Pintar');
    closeAllMenus();
};
document.getElementById('settings').onclick = () => {
    alert('Fitur ini akan segera hadir!');
    closeAllMenus();
};


// --- 6. Fungsi Utility (Tutup Semua Menu) ---
function closeAllMenus() {
    ctxMenu.classList.remove('active');
    bottomSheet.classList.remove('active');
    topMenu.classList.remove('active');
    overlay.classList.remove('active');
}

overlay.onclick = closeAllMenus;


// --- 7. Logika AI Bot & Parser (SATU-SATUNYA FUNGSI getBotResponse) ---
function getBotResponse(inputText) {
    const lowerText = inputText.toLowerCase();

    // --- FITUR BANTUAN ---
    if (lowerText.includes('bantuan') || lowerText.includes('help') || lowerText.includes('menu') || lowerText.includes('panduan')) {
        return `
        <b>📖 Panduan Menggunakan Mysaku</b><br><br>
        
        <b>1. 💰 Mencatat Saldo Awal</b><br>
        <i>Contoh:</i> "Saldo awal 2jt"<br>
        <i>Contoh:</i> "Set saldo 500rb"<br><br>

        <b>2. 📈 Mencatat Pemasukan (Uang Masuk)</b><br>
        <i>Contoh:</i> "Gaji 3jt"<br>
        <i>Contoh:</i> "Terima bonus 500rb"<br>
        <i>Contoh:</i> "Jualan 200rb"<br><br>

        <b>3. 📉 Mencatat Pengeluaran (Uang Keluar)</b><br>
        <i>Contoh:</i> "Beli nasi padang 20rb"<br>
        <i>Contoh:</i> "Isi bensin 50k"<br>
        <i>Contoh:</i> "Bayar listrik 150rb"<br><br>

        <b>4. 💳 Menentukan Dompet (Opsional)</b><br>
        <i>Contoh:</i> "Bayar bensin 50rb <b>pakai bca</b>"<br>
        <i>Contoh:</i> "Transfer <b>dana</b> 100rb"<br><br>

        <b>5. 💵 Cek Saldo Saat Ini</b><br>
        <i>Ketik:</i> "Cek saldo" atau "Sisa uang"<br><br>

        <b>6. 📸 Upload Bukti Transaksi</b><br>
        Klik icon <b>≡</b> di pojok kiri bawah.<br><br>

        <hr>
        <i>💡 Tip: Sistem otomatis membaca nominal (20rb, 2.5jt, Rp 50.000).</i>
        `;
    }

    // --- CEK SALDO ---
    if (lowerText.includes('cek saldo') || lowerText.includes('sisa uang') || lowerText.includes('saldo saya')) {
        if (currentBalance === null) {
            return `❌ Saldo kamu belum tercatat nih.<br>Silakan set saldo awal dulu dengan format:<br><b>"Saldo awal [nominal]"</b>.<br>Contoh: <i>"Saldo awal 2jt"</i>`;
        } else {
            return `💰 Saldo kamu saat ini: <b>Rp ${new Intl.NumberFormat('id-ID').format(currentBalance)}</b>`;
        }
    }

    // --- SET SALDO AWAL ---
    if (lowerText.includes('saldo awal') || lowerText.includes('set saldo')) {
        const amount = parseAmount(inputText);
        if (amount) {
            updateBalance(amount);
            return `✅ Berhasil! Saldo awal kamu tercatat sebesar <b>Rp ${new Intl.NumberFormat('id-ID').format(amount)}</b>.<br><br>Sekarang kamu bisa mulai mencatat pengeluaran/pemasukan. Ketik <b>"bantuan"</b> untuk lihat panduan.`;
        } else {
            return `❌ Format tidak valid. Coba ketik: <i>"Saldo awal 2jt"</i> atau <i>"Set saldo 500rb"</i>.`;
        }
    }

    // --- LOGIKA PARSER TRANSAKSI ---
    const result = parseTransaction(inputText);
    if (!result.success) {
        return result.message; // Jika tidak ada nominal
    }

    // --- PROSES MUTASI SALDO ---
    const d = result.data;
    const formattedAmount = new Intl.NumberFormat('id-ID').format(d.amount);
    const typeLabel = d.type === 'pemasukan' ? '📈 Pemasukan' : '📉 Pengeluaran';
    
    let responseText = `✅ Berhasil mencatat ${d.type}!<br><br>
    📌 <b>${typeLabel}</b><br>
    💰 Rp ${formattedAmount}<br>
    📂 Kategori: ${d.category}<br>
    💳 Dompet: ${d.wallet}`;

    if (currentBalance !== null) {
        let newBalance;
        if (d.type === 'pemasukan') {
            newBalance = currentBalance + d.amount;
        } else {
            newBalance = currentBalance - d.amount;
        }
        updateBalance(newBalance);
        responseText += `<br><br>💼 Sisa Saldo Sekarang: <b>Rp ${new Intl.NumberFormat('id-ID').format(newBalance)}</b>`;
    } else {
        responseText += `<br><br><i>⚠️ (Catatan: Saldo awal belum diset, total saldo tidak bisa dihitung. Ketik "Saldo awal 2jt" untuk mengaturnya).</i>`;
    }

    return responseText;
}


// --- 8. Fungsi Kirim Pesan Utama ---
function sendMessage() {
    const text = userInput.value.trim();
    if (text === '') return;

    // Parsing teks untuk mendapatkan data transaksi
    const result = parseTransaction(text);
    let transactionData = null;
    if (result.success) {
        transactionData = result.data; // Ambil data type & amount
    }

    // Tampilkan pesan dengan data transaksi tersimpan
    addMessage(text, 'user', false, '', transactionData);
    userInput.value = '';

    setTimeout(() => {
        const botReply = getBotResponse(text);
        addMessage(botReply, 'bot');
    }, 1000);
}

btnSend.onclick = sendMessage;
userInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') sendMessage();
});


// --- 9. Inisialisasi Awal (Pesan Sambutan) ---
addMessage("Halo! Aku Mysaku, asisten keuanganmu. 👋<br><br>Ketik <b>'bantuan'</b> untuk melihat daftar perintah yang bisa aku pahami.", 'bot');


// ==========================================
// --- MODUL PARSER KEUANGAN (OFFLINE) -------
// ==========================================

// --- MODUL PARSER 1: parseAmount ---
function parseAmount(text) {
    let clean = text.toLowerCase().trim();

    // 1. Deteksi Milyaran
    let match = clean.match(/([0-9,\.]+)\s*(m|milyar|miliar)/i);
    if (match) {
        let num = parseFloat(match[1].replace(/\./g, '').replace(/,/g, '.'));
        return num * 1000000000;
    }

    // 2. Deteksi Jutaan
    match = clean.match(/([0-9,\.]+)\s*(jt|juta)/i);
    if (match) {
        let num = parseFloat(match[1].replace(/\./g, '').replace(/,/g, '.'));
        return num * 1000000;
    }

    // 3. Deteksi Ribuan
    match = clean.match(/([0-9,\.]+)\s*(rb|ribu|k)/i);
    if (match) {
        let num = parseFloat(match[1].replace(/\./g, '').replace(/,/g, '.'));
        return num * 1000;
    }

    // 4. Deteksi Rupiah / Angka Biasa
    match = clean.match(/(?:rp\s*)?([0-9,\.]+)/i);
    if (match) {
        let numStr = match[1].replace(/\./g, '').replace(/,/g, '');
        return parseFloat(numStr);
    }

    return null;
}

// --- MODUL PARSER 2 & 3: Kategori & Wallet ---
const CATEGORY_KEYWORDS = {
    'Makanan': ['makan', 'nasi', 'bakso', 'mie', 'ayam', 'soto', 'pecel', 'sate', 'kopi', 'teh', 'snack', 'minum'],
    'Transportasi': ['bensin', 'gojek', 'grab', 'ojek', 'taxi', 'parkir', 'tol', 'bbm', 'pulsa', 'servis motor'],
    'Tagihan': ['tagihan', 'listrik', 'air', 'internet', 'wifi', 'telepon', 'bpjs', 'asuransi', 'kartu kredit'],
    'Belanja': ['belanja', 'baju', 'sepatu', 'tas', 'elektronik', 'hp', 'laptop'],
    'Hiburan': ['nonton', 'film', 'bioskop', 'game', 'netflix', 'spotify', 'konser'],
    'Kesehatan': ['obat', 'dokter', 'rumah sakit', 'klinik', 'vitamin'],
    'Gaji': ['gaji', 'salary', 'upah', 'honor', 'thr', 'bonus', 'terima']
};

const WALLET_KEYWORDS = {
    'Kas': ['kas', 'tunai', 'cash', 'uang'],
    'DANA': ['dana'],
    'GoPay': ['gopay', 'go pay', 'go-pay'],
    'OVO': ['ovo'],
    'Bank BCA': ['bca'],
    'Bank Mandiri': ['mandiri']
};

function parseCategory(text, type) {
    const clean = text.toLowerCase();
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        for (const kw of keywords) {
            if (clean.includes(kw)) {
                return category;
            }
        }
    }
    return type === 'pemasukan' ? 'Lainnya (Pemasukan)' : 'Lainnya';
}

function parseWallet(text) {
    const clean = text.toLowerCase();
    for (const [wallet, keywords] of Object.entries(WALLET_KEYWORDS)) {
        for (const kw of keywords) {
            if (clean.includes(kw)) {
                return wallet;
            }
        }
    }
    return 'Kas';
}

// --- MODUL PARSER UTAMA ---
let itemDictionary = {
    'bakso aci': 'Makanan',
    'indomie': 'Makanan',
    'pertalite': 'Transportasi'
};

function determineTransactionType(text) {
    const clean = text.toLowerCase();
    const incomeKeywords = ['gaji', 'bonus', 'jual', 'investasi', 'terima', 'masuk', '+'];
    const expenseKeywords = ['beli', 'bayar', 'makan', 'transport', 'tagihan', 'bensin', '-'];

    for (let kw of incomeKeywords) if (clean.includes(kw)) return 'pemasukan';
    for (let kw of expenseKeywords) if (clean.includes(kw)) return 'pengeluaran';
    return 'pengeluaran';
}

function parseTransaction(userText) {
    const amount = parseAmount(userText);
    if (!amount) {
        return { success: false, message: "Maaf, saya tidak menemukan nominal uangnya. Coba contoh: 'beli nasi 20rb'" };
    }

    const type = determineTransactionType(userText);
    let category = 'Lainnya';
    const textLower = userText.toLowerCase();
    
    for (const [item, cat] of Object.entries(itemDictionary)) {
        if (textLower.includes(item)) {
            category = cat;
            break;
        }
    }
    if (category === 'Lainnya') {
        category = parseCategory(userText, type);
    }

    const wallet = parseWallet(userText);

    return {
        success: true,
        data: {
            type: type,
            amount: amount,
            category: category,
            wallet: wallet,
            rawText: userText,
            date: Date.now()
        }
    };
}


// ==========================================
// --- MODUL MANAJEMEN SALDO -----------------
// ==========================================

let currentBalance = localStorage.getItem('mysaku_balance') ? parseFloat(localStorage.getItem('mysaku_balance')) : null;

function updateBalance(newBalance) {
    currentBalance = newBalance;
    localStorage.setItem('mysaku_balance', currentBalance.toString());
    return currentBalance;
}