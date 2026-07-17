// --- 1. Inisialisasi Elemen DOM ---
const chatArea = document.getElementById('chatArea');
const userInput = document.getElementById('userInput');
const btnSend = document.getElementById('btnSend');

const overlay = document.getElementById('overlay');
const ctxMenu = document.getElementById('ctxMenu');
const bottomSheet = document.getElementById('bottomSheet');

const btnHamburger = document.getElementById('btnHamburger');
const btnSelectFile = document.getElementById('btnSelectFile');
const fileInput = document.getElementById('fileInput');
const btnSendPhoto = document.getElementById('btnSendPhoto');
const imagePreview = document.getElementById('imagePreview');
const captionInput = document.getElementById('captionInput');

const editBtn = document.getElementById('editBtn');
const deleteBtn = document.getElementById('deleteBtn');

let selectedMessageElement = null;
let lastMessageDate = null;

// --- 2. Fungsi Dasar Chat ---
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

    if (transactionData) {
        row.dataset.type = transactionData.type;
        row.dataset.amount = transactionData.amount;
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

// --- 3. Logika Long Press ---
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
    let x = event.clientX || event.touches[0].clientX;
    let y = event.clientY || event.touches[0].clientY;

    ctxMenu.style.left = x + 'px';
    ctxMenu.style.top = y + 'px';
    ctxMenu.classList.add('active');
    overlay.classList.add('active');

    const menuWidth = ctxMenu.offsetWidth;
    const windowWidth = window.innerWidth;
    if (x + menuWidth > windowWidth) {
        ctxMenu.style.left = (windowWidth - menuWidth - 10) + 'px';
    }
}

editBtn.onclick = () => {
    const bubble = selectedMessageElement.querySelector('.bubble.user');
    if(bubble && !bubble.querySelector('img')) {
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
        const currentUserRow = selectedMessageElement;
        let nextElement = currentUserRow.nextElementSibling;
        if (nextElement && nextElement.classList.contains('message-row') && nextElement.classList.contains('bot')) {
            nextElement.remove();
        }
        userInput.value = bubble.innerText;
        userInput.focus();
        selectedMessageElement.remove();
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

// --- 4. Logika Upload Foto ---
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
    let transactionData = null;
    if (caption !== '') {
        const result = parseTransaction(caption);
        if (result.success) {
            transactionData = result.data;
            saveTransactionToHistory(transactionData);
        }
    }
    addMessage(caption, 'user', true, imagePreview.src, transactionData);
    saveChatMessage(caption, 'user', true, imagePreview.src);
    
    closeAllMenus();
    setTimeout(() => {
        let botReply;
        if (caption === '') {
            botReply = "Terima kasih fotonya! Aku sudah catat dokumentasi ini.";
        } else {
            botReply = getBotResponse(caption);
        }
        addMessage(botReply, 'bot');
        saveChatMessage(botReply, 'bot', false, '');
    }, 1000);
};

// --- 5. Fungsi Utility ---
function closeAllMenus() {
    ctxMenu.classList.remove('active');
    bottomSheet.classList.remove('active');
    overlay.classList.remove('active');
}
overlay.onclick = closeAllMenus;

// --- 6. Logika AI Bot & Parser ---

function getBotResponse(inputText) {
    const lowerText = inputText.toLowerCase();
    
    // --- FITUR BANTUAN ---
    if (lowerText.includes('bantuan') || lowerText.includes('help') || lowerText.includes('menu') || lowerText.includes('panduan')) {
        return `<b>📖 Panduan Menggunakan Mysaku</b><br><br>
        <b>1. 💰 Mencatat Saldo Awal</b><br><i>Contoh:</i> "Saldo awal 2jt"<br>
        <b>2. 📈 Mencatat Pemasukan</b><br><i>Contoh:</i> "Gaji 3jt"<br>
        <b>3. 📉 Mencatat Pengeluaran</b><br><i>Contoh:</i> "Beli nasi 20rb"<br>
        <b>4. 💳 Menentukan Dompet</b><br><i>Contoh:</i> "Bayar bensin 50rb pakai bca"<br>
        <b>5. 💵 Cek Saldo</b><br><i>Ketik:</i> "Cek saldo"<br>
        <b>6. 💰 Cek Utang</b><br><i>Ketik:</i> "Cek utang"<br>
        <hr><i>💡 Tip: Gunakan 20rb, 2.5jt, Rp 50.000</i>`;
    }

    // --- CEK SALDO ---
    if (lowerText.includes('cek saldo') || lowerText.includes('sisa uang') || lowerText.includes('saldo saya')) {
        if (currentBalance === null) return `❌ Saldo belum tercatat. Set saldo awal dulu: "Saldo awal 2jt"`;
        else return `💰 Saldo kamu: <b>Rp ${new Intl.NumberFormat('id-ID').format(currentBalance)}</b>`;
    }

    // --- CEK UTANG ---
    if (lowerText.includes('cek utang') || lowerText.includes('total utang')) {
        const debt = localStorage.getItem('mysaku_debt') ? parseFloat(localStorage.getItem('mysaku_debt')) : 0;
        return `💰 Total Utang Kamu Saat Ini: <b>Rp ${new Intl.NumberFormat('id-ID').format(debt)}</b>`;
    }

    // --- PRIORITAS TERTINGGI: SET SALDO AWAL ---
    // Bagian ini HARUS dijalankan SEBELUM parser transaksi
    if (lowerText.includes('saldo awal') || lowerText.includes('set saldo')) {
        const amount = parseAmount(inputText);
        if (amount) {
            updateBalance(amount);
            return `✅ Saldo awal tercatat <b>Rp ${new Intl.NumberFormat('id-ID').format(amount)}</b>.`;
        } else {
            return `❌ Format tidak valid. Contoh: "Saldo awal 2jt"`;
        }
    }

    // --- UTANG / BAYAR UTANG ---
    if (lowerText.includes('utang') || lowerText.includes('hutang')) {
        const amount = parseAmount(inputText);
        if (!amount) return `❌ Format tidak valid. Contoh: <i>"Utang ke Andi 200rb"</i>`;
        
        let debt = localStorage.getItem('mysaku_debt') ? parseFloat(localStorage.getItem('mysaku_debt')) : 0;
        if (lowerText.includes('bayar utang') || lowerText.includes('bayar hutang')) {
            if (amount > debt) return `❌ Maaf, total utang kamu hanya <b>Rp ${new Intl.NumberFormat('id-ID').format(debt)}</b>.`;
            debt -= amount;
            localStorage.setItem('mysaku_debt', debt.toString());
            return `✅ Berhasil bayar utang Rp ${new Intl.NumberFormat('id-ID').format(amount)}.<br>💳 Sisa Utang: <b>Rp ${new Intl.NumberFormat('id-ID').format(debt)}</b>`;
        } else {
            debt += amount;
            localStorage.setItem('mysaku_debt', debt.toString());
            return `✅ Berhasil catat utang Rp ${new Intl.NumberFormat('id-ID').format(amount)}.<br>💳 Total Utang: <b>Rp ${new Intl.NumberFormat('id-ID').format(debt)}</b>`;
        }
    }

    // --- LOGIKA PARSER TRANSAKSI (Pemasukan / Pengeluaran Biasa) ---
    const result = parseTransaction(inputText);
    if (!result.success) return result.message;
    
    const d = result.data;
    const formattedAmount = new Intl.NumberFormat('id-ID').format(d.amount);
    const typeLabel = d.type === 'pemasukan' ? '📈 Pemasukan' : '📉 Pengeluaran';
    let responseText = `✅ Berhasil mencatat ${d.type}!<br>📌 <b>${typeLabel}</b><br>💰 Rp ${formattedAmount}<br>📂 ${d.category}<br>💳 ${d.wallet}`;
    
    if (currentBalance !== null) {
        let newBalance = d.type === 'pemasukan' ? currentBalance + d.amount : currentBalance - d.amount;
        updateBalance(newBalance);
        responseText += `<br><br>💼 Sisa Saldo: <b>Rp ${new Intl.NumberFormat('id-ID').format(newBalance)}</b>`;
    } else {
        responseText += `<br><br><i>⚠️ Saldo awal belum diset. Ketik "Saldo awal 2jt".</i>`;
    }
    return responseText;
}

// ==========================================
// --- FITUR PENYIMPANAN RIWAYAT TRANSAKSI ---
// ==========================================

function getTransactionHistory() {
    const data = localStorage.getItem('mysaku_history');
    return data ? JSON.parse(data) : [];
}

function saveTransactionToHistory(transactionData) {
    const history = getTransactionHistory();
    const newEntry = {
        id: Date.now(),
        ...transactionData,
        date: new Date().toISOString()
    };
    history.unshift(newEntry);
    localStorage.setItem('mysaku_history', JSON.stringify(history));
}

// ==========================================
// --- SIMPAN & MUAT ULANG CHAT MESSAGES ---
// ==========================================

function saveChatMessage(text, sender, isImage = false, imageUrl = '') {
    let messages = localStorage.getItem('mysaku_chat_messages');
    messages = messages ? JSON.parse(messages) : [];
    
    messages.push({
        text: text,
        sender: sender,
        isImage: isImage,
        imageUrl: imageUrl,
        timestamp: Date.now()
    });

    if (messages.length > 50) messages = messages.slice(-50);
    localStorage.setItem('mysaku_chat_messages', JSON.stringify(messages));
}

function loadChatMessages() {
    const messages = localStorage.getItem('mysaku_chat_messages');
    if (!messages) return;

    const parsed = JSON.parse(messages);
    parsed.forEach(msg => {
        const row = document.createElement('div');
        row.className = `message-row ${msg.sender}`;
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper';
        const bubble = document.createElement('div');
        bubble.className = `bubble ${msg.sender}`;

        if (msg.isImage && msg.imageUrl) {
            const img = document.createElement('img');
            img.src = msg.imageUrl;
            img.className = 'chat-image';
            bubble.appendChild(img);
            if (msg.text && msg.text.trim() !== '') {
                const textNode = document.createElement('span');
                textNode.innerHTML = msg.text;
                bubble.appendChild(document.createElement('br'));
                bubble.appendChild(textNode);
            }
        } else {
            bubble.innerHTML = msg.text;
        }

        wrapper.appendChild(bubble);
        row.appendChild(wrapper);
        chatArea.appendChild(row);
    });
    chatArea.scrollTop = chatArea.scrollHeight;
}


// --- 7. Fungsi Kirim Pesan Utama ---
// --- 7. Fungsi Kirim Pesan Utama ---
function sendMessage() {
    const text = userInput.value.trim();
    if (text === '') return;

    const lowerText = text.toLowerCase();

    // --- PERBAIKAN PENTING: SALDO AWAL HANYA SEKALI ---
    if (lowerText.includes('saldo awal') || lowerText.includes('set saldo')) {
        // Cek apakah saldo awal sudah pernah diset sebelumnya
        const isFirstTimeSetup = (currentBalance === null);

        if (!isFirstTimeSetup) {
            // Jika sudah ada saldo, tolak perintah ini
            addMessage(text, 'user', false, '', null);
            saveChatMessage(text, 'user', false, '');
            userInput.value = '';
            setTimeout(() => {
                const botReply = `❌ Saldo awal sudah pernah diset sebelumnya. Untuk menambah uang, gunakan perintah <b>"Terima gaji"</b> atau <b>"Terima uang"</b>.`;
                addMessage(botReply, 'bot');
                saveChatMessage(botReply, 'bot', false, '');
            }, 1000);
            return;
        }

        // --- Jika ini pertama kali (Saldo awal masih null) ---
        const amount = parseAmount(text);
        if (!amount) {
            addMessage(text, 'user', false, '', null);
            saveChatMessage(text, 'user', false, '');
            userInput.value = '';
            setTimeout(() => {
                const botReply = `❌ Format tidak valid. Contoh: "Saldo awal 2jt"`;
                addMessage(botReply, 'bot');
                saveChatMessage(botReply, 'bot', false, '');
            }, 1000);
            return;
        }

        // Simpan saldo
        updateBalance(amount);

        // Catat sebagai pemasukan pertama (agar muncul di grafik & riwayat)
        const transactionData = {
            type: 'pemasukan',
            amount: amount,
            category: 'Saldo Awal',
            wallet: 'Kas',
            rawText: text,
            date: Date.now()
        };
        saveTransactionToHistory(transactionData);

        // Tampilkan di chat
        addMessage(text, 'user', false, '', transactionData);
        saveChatMessage(text, 'user', false, '');
        userInput.value = '';

        setTimeout(() => {
            const botReply = `✅ Selamat datang di MySaku!<br>Saldo awal sebesar <b>Rp ${new Intl.NumberFormat('id-ID').format(amount)}</b> berhasil dicatat.<br><br>💡 Mulai sekarang, gunakan perintah <b>"Terima gaji"</b> atau <b>"Terima uang"</b> untuk mencatat pemasukan.`;
            addMessage(botReply, 'bot');
            saveChatMessage(botReply, 'bot', false, '');
        }, 1000);

        return; // Hentikan eksekusi di sini
    }
    // --- AKHIR PERBAIKAN SALDO AWAL ---

    // --- Logika Normal untuk Transaksi Lainnya ---
    const result = parseTransaction(text);
    let transactionData = null;
    if (result.success) {
        transactionData = result.data;
        saveTransactionToHistory(transactionData);
    }
    addMessage(text, 'user', false, '', transactionData);
    saveChatMessage(text, 'user', false, '');
    
    userInput.value = '';
    setTimeout(() => {
        const botReply = getBotResponse(text);
        addMessage(botReply, 'bot');
        saveChatMessage(botReply, 'bot', false, '');
    }, 1000);
}

btnSend.onclick = sendMessage;
userInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') sendMessage();
});

// --- 8. Inisialisasi Awal ---
document.addEventListener('DOMContentLoaded', function() {
    loadChatMessages();
});

addMessage("Halo! Aku Mysaku, asisten keuanganmu. 👋<br><br>Ketik <b>'bantuan'</b> untuk melihat daftar perintah.", 'bot');

// ==========================================
// --- MODUL PARSER KEUANGAN ---
// ==========================================

function parseAmount(text) {
    let clean = text.toLowerCase().trim();
    let match = clean.match(/([0-9,\.]+)\s*(m|milyar|miliar)/i);
    if (match) {
        let num = parseFloat(match[1].replace(/\./g, '').replace(/,/g, '.'));
        return num * 1000000000;
    }
    match = clean.match(/([0-9,\.]+)\s*(jt|juta)/i);
    if (match) {
        let num = parseFloat(match[1].replace(/\./g, '').replace(/,/g, '.'));
        return num * 1000000;
    }
    match = clean.match(/([0-9,\.]+)\s*(rb|ribu|k)/i);
    if (match) {
        let num = parseFloat(match[1].replace(/\./g, '').replace(/,/g, '.'));
        return num * 1000;
    }
    match = clean.match(/(?:rp\s*)?([0-9,\.]+)/i);
    if (match) {
        let numStr = match[1].replace(/\./g, '').replace(/,/g, '');
        return parseFloat(numStr);
    }
    return null;
}

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

let itemDictionary = { 'bakso aci': 'Makanan', 'indomie': 'Makanan', 'pertalite': 'Transportasi' };

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
// --- MODUL MANAJEMEN SALDO ---
// ==========================================
let currentBalance = localStorage.getItem('mysaku_balance') ? parseFloat(localStorage.getItem('mysaku_balance')) : null;

function updateBalance(newBalance) {
    currentBalance = newBalance;
    localStorage.setItem('mysaku_balance', currentBalance.toString());
    return currentBalance;
}

// ==========================================
// --- MODUL MANAJEMEN UTANG -----------------
// ==========================================

let currentDebt = localStorage.getItem('mysaku_debt') ? parseFloat(localStorage.getItem('mysaku_debt')) : 0;

function updateDebt(newDebt) {
    currentDebt = newDebt;
    localStorage.setItem('mysaku_debt', currentDebt.toString());
    return currentDebt;
}