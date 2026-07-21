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
// Catatan: script.js dimuat SEBELUM onboarding.js, jadi baca localStorage langsung di sini
// (belum bisa panggil isOnboardingCompleted()/loadOnboardingProgress() dari onboarding.js).
// Ini WAJIB konsisten dengan onboardingStep/onboardingSkipped yang di-restore di onboarding.js,
// supaya kalau user pindah halaman lalu balik lagi ke tengah tutorial, statusnya tidak balik ke awal.
let onboardingFinished = (localStorage.getItem('mysaku_onboarding_completed') === 'true') ||
    (localStorage.getItem('mysaku_onboarding_finished') === 'true');

// ==========================================
// --- MODUL MULTI-DOMPET --------------------
// ==========================================
// Dompet sekarang DINAMIS -- user bisa tambah/hapus dompet sendiri dari halaman Laporan.
// Daftar dompet disimpan di localStorage ('mysaku_wallets') supaya persist & bisa diedit.
// DEFAULT_WALLETS tetap dipertahankan sebagai daftar bawaan awal (dipakai saat pertama kali
// install atau saat reset data / tutorial).

const DEFAULT_WALLETS = ['Cash', 'BCA', 'DANA', 'GoPay', 'OVO', 'Mandiri'];

// Ambil daftar dompet yang sedang ada (custom + bawaan yang belum dihapus user)
function getWallets() {
    const raw = localStorage.getItem('mysaku_wallets');
    if (!raw) {
        // Belum pernah diatur -> pakai daftar bawaan & simpan supaya konsisten ke depannya
        localStorage.setItem('mysaku_wallets', JSON.stringify(DEFAULT_WALLETS));
        return DEFAULT_WALLETS.slice();
    }
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_WALLETS.slice();
    } catch (e) {
        return DEFAULT_WALLETS.slice();
    }
}

function saveWallets(list) {
    localStorage.setItem('mysaku_wallets', JSON.stringify(list));
}

function getWalletKey(walletName) {
    return walletName === 'Cash' ? 'mysaku_balance' : 'mysaku_wallet_' + walletName;
}

// Fungsi untuk mengambil dompet aktif
function getActiveWallet() {
    const active = localStorage.getItem('mysaku_active_wallet') || 'Cash';
    // Jaga-jaga kalau dompet aktif ternyata sudah dihapus user -> fallback ke dompet pertama yang ada
    const wallets = getWallets();
    if (wallets.includes(active)) return active;
    const fallback = wallets[0] || 'Cash';
    localStorage.setItem('mysaku_active_wallet', fallback);
    return fallback;
}

// Fungsi untuk mengambil saldo dompet tertentu
function getWalletBalance(walletName) {
    const val = localStorage.getItem(getWalletKey(walletName));
    return val ? parseFloat(val) : 0;
}

// Fungsi untuk menyimpan saldo ke dompet tertentu
function setWalletBalance(walletName, newBalance) {
    localStorage.setItem(getWalletKey(walletName), newBalance.toString());
}

// Cek apakah dompet ini SUDAH PERNAH diatur saldo awalnya (beda dengan saldo = 0)
function isWalletInitialized(walletName) {
    return localStorage.getItem(getWalletKey(walletName)) !== null;
}

// Cocokkan nama dompet yang diketik user (tidak peduli huruf besar/kecil) ke nama resmi yang ada
function resolveWalletName(rawName) {
    if (!rawName) return null;
    const found = getWallets().find(w => w.toLowerCase() === rawName.toLowerCase());
    return found || null;
}

// --- Tambah dompet baru (dipanggil dari UI di halaman Laporan) ---
function addWallet(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return { success: false, message: 'Nama dompet tidak boleh kosong.' };
    if (trimmed.length > 20) return { success: false, message: 'Nama dompet maksimal 20 karakter.' };

    const wallets = getWallets();
    if (wallets.some(w => w.toLowerCase() === trimmed.toLowerCase())) {
        return { success: false, message: 'Dompet dengan nama itu sudah ada.' };
    }

    wallets.push(trimmed);
    saveWallets(wallets);
    return { success: true };
}

// --- Hapus dompet ---
// Riwayat transaksi/utang yang sudah tercatat di dompet ini TETAP DISIMPAN (tidak dihapus),
// hanya saja dompetnya sendiri dikeluarkan dari daftar dompet aktif. Baris riwayat lama akan
// otomatis ditandai "(dompet dihapus)" saat ditampilkan karena nama dompetnya sudah tidak ada
// lagi di getWallets() -- lihat isDeletedWallet() di dashboard.js.
function deleteWallet(name) {
    let wallets = getWallets();
    if (wallets.length <= 1) {
        return { success: false, message: 'Minimal harus ada 1 dompet.' };
    }
    if (!wallets.includes(name)) {
        return { success: false, message: 'Dompet tidak ditemukan.' };
    }

    wallets = wallets.filter(w => w !== name);
    saveWallets(wallets);

    // Bersihkan data saldo dompet itu sendiri (bukan riwayat transaksinya -- itu tetap disimpan)
    localStorage.removeItem(getWalletKey(name));

    // Kalau dompet yang dihapus adalah dompet aktif, pindah ke dompet pertama yang tersisa
    const activeWallet = localStorage.getItem('mysaku_active_wallet');
    if (activeWallet === name) {
        localStorage.setItem('mysaku_active_wallet', wallets[0]);
    }

    return { success: true };
}

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

function addMessage(text, sender, isImage = false, imageUrl = '', transactionData = null, pairId = null) {
    const now = Date.now();
    const currentDateLabel = formatDateLabel(now);
    const uniqueId = pairId || (Date.now() + '-' + Math.random().toString(36).substr(2, 9));

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

    // Simpan timestamp & ID unik
    row.dataset.timestamp = now;
    row.dataset.uniqueId = uniqueId;

    if (transactionData) {
        row.dataset.type = transactionData.type;
        row.dataset.amount = transactionData.amount;
        if (transactionData.id) {
            row.dataset.transactionId = transactionData.id;
        }
        if (transactionData.wallet) {
            row.dataset.wallet = transactionData.wallet;
        }
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

    // --- PASANG EVENT LISTENER TOMBOL SAAT PESAN BARU DIBUAT ---
    if (sender === 'bot' && text && text.includes('btn-set-saldo-modal')) {
        const btn = row.querySelector('.btn-set-saldo-modal');
        if (btn) {
            btn.onclick = (e) => {
                e.stopPropagation();
                saldoPopupMode = 'awal';
                document.getElementById('saldoPopup').classList.remove('hidden');
                document.getElementById('saldoPopup').classList.add('flex');
                setTimeout(() => {
                    document.getElementById('saldoPopupInput').focus();
                }, 100);
            };
        }
    }
    if (sender === 'bot' && text && text.includes('btn-tambah-saldo-modal')) {
        const tambahBtn = row.querySelector('.btn-tambah-saldo-modal');
        if (tambahBtn) {
            tambahBtn.onclick = (e) => {
                e.stopPropagation();
                saldoPopupMode = 'tambah';
                document.getElementById('saldoPopup').classList.remove('hidden');
                document.getElementById('saldoPopup').classList.add('flex');
                setTimeout(() => {
                    document.getElementById('saldoPopupInput').focus();
                }, 100);
            };
        }
    }
    if (sender === 'bot' && text && text.includes('btn-cancel-wallet')) {
        const cancelBtn = row.querySelector('.btn-cancel-wallet');
        if (cancelBtn) {
            cancelBtn.onclick = (e) => {
                e.stopPropagation();
                bubble.innerHTML = '↩️ Transaksi dibatalkan.';
            };
        }
    }
    if (sender === 'bot' && text && text.includes('btn-jatuh-tempo-ya')) {
        const yaBtn = row.querySelector('.btn-jatuh-tempo-ya');
        if (yaBtn) {
            yaBtn.onclick = (e) => {
                e.stopPropagation();
                openJatuhTempoPopup();
            };
        }
    }
    if (sender === 'bot' && text && text.includes('btn-jatuh-tempo-tidak')) {
        const tidakBtn = row.querySelector('.btn-jatuh-tempo-tidak');
        if (tidakBtn) {
            tidakBtn.onclick = (e) => {
                e.stopPropagation();
                bubble.innerHTML = '👌 Oke, tanpa jatuh tempo.';
                finalizeDebtRecord(null);
            };
        }
    }

    attachLongPressEvent(row, sender);
    return row;
}

// --- 3. Logika Long Press ---
function attachLongPressEvent(element, sender) {
    let pressTimer;
    const showMenu = (e) => {
        clearTimeout(pressTimer);
        pressTimer = setTimeout(() => {
            if(sender === 'user') {
                const timestampAttr = element.dataset.timestamp;
                if (timestampAttr) {
                    const msgTime = parseInt(timestampAttr);
                    const now = Date.now();
                    const diffMinutes = (now - msgTime) / (1000 * 60);
                    const diffHours = diffMinutes / 60;
                    
                    let allowEdit = false;
                    let allowDelete = false;

                    if (diffHours <= 5) allowEdit = true;
                    if (diffMinutes <= 2) allowDelete = true;

                    showContextMenu(e, element, allowEdit, allowDelete);
                    return;
                }
            }
        }, 600);
    };
    const hideMenu = () => clearTimeout(pressTimer);

    element.addEventListener('mousedown', showMenu);
    element.addEventListener('mouseup', hideMenu);
    element.addEventListener('mouseleave', hideMenu);
    element.addEventListener('touchstart', showMenu);
    element.addEventListener('touchend', hideMenu);
}

function showContextMenu(event, element, allowEdit = false, allowDelete = false) {
    closeAllMenus();
    selectedMessageElement = element;
    let x = event.clientX || event.touches[0].clientX;
    let y = event.clientY || event.touches[0].clientY;

    ctxMenu.style.left = x + 'px';
    ctxMenu.style.top = y + 'px';
    ctxMenu.classList.add('active');
    overlay.classList.add('active');

    document.getElementById('editBtn').style.display = allowEdit ? 'block' : 'none';
    document.getElementById('deleteBtn').style.display = allowDelete ? 'block' : 'none';

    const menuWidth = ctxMenu.offsetWidth;
    const windowWidth = window.innerWidth;
    if (x + menuWidth > windowWidth) {
        ctxMenu.style.left = (windowWidth - menuWidth - 10) + 'px';
    }
}

editBtn.onclick = () => {
    const bubble = selectedMessageElement.querySelector('.bubble.user');
    if(bubble && !bubble.querySelector('img')) {

        // --- 1. Hapus riwayat lama ---
        const oldTransactionId = selectedMessageElement.dataset.transactionId;
        if (oldTransactionId) {
            let history = getTransactionHistory();
            const filteredHistory = history.filter(item => item.id != oldTransactionId);
            localStorage.setItem('mysaku_history', JSON.stringify(filteredHistory));
        }

        // --- 2. Rollback saldo ke DOMPET AKTIF ---
        const activeWallet = getActiveWallet();
        const oldType = selectedMessageElement.dataset.type;
        const oldAmount = parseFloat(selectedMessageElement.dataset.amount);

        if (oldType && !isNaN(oldAmount)) {
            const currentBal = getWalletBalance(activeWallet);
            let newBalance;
            if (oldType === 'pemasukan') {
                newBalance = currentBal - oldAmount;
            } else {
                newBalance = currentBal + oldAmount;
            }
            setWalletBalance(activeWallet, newBalance);
            // Sync ke variabel global
            currentBalance = newBalance;
        }

        // --- 3. Hapus bot dari layar ---
        const currentUserRow = selectedMessageElement;
        let nextElement = currentUserRow.nextElementSibling;
        if (nextElement && nextElement.classList.contains('message-row') && nextElement.classList.contains('bot')) {
            nextElement.remove();
        }

        // --- 4. Hapus user & bot dari localStorage ---
        const oldUniqueId = selectedMessageElement.dataset.uniqueId;
        let messages = localStorage.getItem('mysaku_chat_messages');
        if (messages) {
            let parsed = JSON.parse(messages);
            let finalMessages = parsed.filter(msg => msg.uniqueId !== oldUniqueId);
            localStorage.setItem('mysaku_chat_messages', JSON.stringify(finalMessages));
        }

        // --- 5. Isi input dengan teks lama, user tinggal kirim ulang ---
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
        const oldTransactionId = selectedMessageElement.dataset.transactionId;
        const currentUserRow = selectedMessageElement;
        let nextElement = currentUserRow.nextElementSibling;
        const oldUniqueId = selectedMessageElement.dataset.uniqueId;

        // --- 1. Rollback saldo ke DOMPET AKTIF ---
        const activeWallet = getActiveWallet();
        const oldType = selectedMessageElement.dataset.type;
        const oldAmount = parseFloat(selectedMessageElement.dataset.amount);

        if (oldType && !isNaN(oldAmount)) {
            const currentBal = getWalletBalance(activeWallet);
            let newBalance;
            if (oldType === 'pemasukan') {
                newBalance = currentBal - oldAmount;
            } else {
                newBalance = currentBal + oldAmount;
            }
            setWalletBalance(activeWallet, newBalance);
            // Sync ke variabel global
            currentBalance = newBalance;
        }

        // --- 2. Hapus riwayat transaksi ---
        if (oldTransactionId) {
            let history = getTransactionHistory();
            const filteredHistory = history.filter(item => item.id != oldTransactionId);
            localStorage.setItem('mysaku_history', JSON.stringify(filteredHistory));
        }

        // --- 3. Hapus bot dari layar ---
        if (nextElement && nextElement.classList.contains('message-row') && nextElement.classList.contains('bot')) {
            nextElement.remove();
        }

        // --- 4. Hapus user & bot dari localStorage ---
        let messages = localStorage.getItem('mysaku_chat_messages');
        if (messages) {
            let parsed = JSON.parse(messages);
            let finalMessages = parsed.filter(msg => msg.uniqueId !== oldUniqueId);
            localStorage.setItem('mysaku_chat_messages', JSON.stringify(finalMessages));
        }

        // --- 5. Hapus user dari layar ---
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
            const newId = saveTransactionToHistory(transactionData);
            transactionData.id = newId;
        }
    }
    
    const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    addMessage(caption, 'user', true, imagePreview.src, transactionData, pairId);
    saveChatMessage(caption, 'user', true, imagePreview.src, transactionData ? transactionData.id : null, pairId, transactionData ? transactionData.type : null, transactionData ? transactionData.amount : null);
    
    closeAllMenus();
    setTimeout(() => {
        let botReply;
        if (caption === '') {
            botReply = "Terima kasih fotonya! Aku sudah catat dokumentasi ini.";
        } else {
            botReply = getBotResponse(caption);
        }
        addMessage(botReply, 'bot', false, '', null, pairId);
        saveChatMessage(botReply, 'bot', false, '', null, pairId, null, null);
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
function getBotResponse(inputText, walletName) {
    const lowerText = inputText.toLowerCase();

    // --- PANDUAN ONBOARDING ---
    if (lowerText.includes('panduan') || lowerText.includes('mulai') || lowerText.includes('onboarding')) {
        // Reset status sebelum memulai
        onboardingSkipped = false;
        onboardingStep = 0;
        onboardingFinished = false;
        saveOnboardingProgress();
        setTimeout(() => startOnboarding(), 300);
        return `👌 Oke, siap-siap ya... <i>(Ketik 'lewati' kapan aja kalau mau langsung pakai aplikasinya.)</i>`;
    }

    if (lowerText.includes('lewati') || lowerText.includes('skip')) {
        onboardingStep = -999;
        onboardingSkipped = true;
        onboardingFinished = true;
        saveOnboardingProgress();
        markOnboardingCompleted();
        return `✅ Panduan dilewati. Kamu bisa memulai panduan lagi kapan saja dengan mengetik <i>'panduan'</i>.`;
    }
    // --- AKHIR PANDUAN ---

    if (lowerText.includes('bantuan') || lowerText.includes('help') || lowerText.includes('menu') || lowerText.includes('panduan')) {
        return `<b>📖 Panduan Menggunakan Mysaku</b><br><br>
        <b>1. 💰 Mencatat Saldo Awal</b><br><i>Contoh:</i> "Saldo awal 2jt"<br>
        <b>2. ➕ Tambah Saldo</b><br><i>Contoh:</i> "Tambah saldo 500k"<br>
        <b>3. 📈 Mencatat Pemasukan</b><br><i>Contoh:</i> "Gaji 3jt"<br>
        <b>4. 📉 Mencatat Pengeluaran</b><br><i>Contoh:</i> "Beli nasi 20k"<br>
        <b>5. 💳 Menentukan Dompet</b><br><i>Contoh:</i> "Bayar bensin 50k pakai bca"<br>
        <b>6. 💵 Cek Saldo</b><br><i>Ketik:</i> "Cek saldo"<br>
        <b>7. 💰 Cek Utang</b><br><i>Ketik:</i> "Cek utang"<br>
        <hr><i>💡 Tip: Gunakan 20k, 2.5jt, Rp 50.000</i>`;
    }

    if (lowerText.includes('cek saldo') || lowerText.includes('sisa uang') || lowerText.includes('saldo saya')) {
        const activeWallet = getActiveWallet();
        const bal = getWalletBalance(activeWallet);
        return `💰 Saldo dompet <b>${activeWallet}</b>: <b>Rp ${new Intl.NumberFormat('id-ID').format(bal)}</b>`;
    }

    if (lowerText.includes('cek utang') || lowerText.includes('total utang')) {
        const debt = localStorage.getItem('mysaku_debt') ? parseFloat(localStorage.getItem('mysaku_debt')) : 0;
        return `💰 Total Utang Kamu Saat Ini: <b>Rp ${new Intl.NumberFormat('id-ID').format(debt)}</b>`;
    }

    if (lowerText.includes('saldo awal') || lowerText.includes('set saldo')) {
        const amount = parseAmount(inputText);
        if (amount) {
            if (currentBalance === null) {
                updateBalance(amount);
            } else {
                updateBalance(currentBalance + amount);
            }
            return `✅ Saldo awal tercatat <b>Rp ${new Intl.NumberFormat('id-ID').format(amount)}</b>.`;
        } else {
            return `❌ Format tidak valid. Contoh: "Saldo awal 2jt"`;
        }
    }

    // --- UTANG / BAYAR UTANG ---
    // Catatan: path ini dipakai kalau transaksi hutang dikirim lewat keterangan foto
    // (lihat btnSendPhoto), bukan chat teks biasa (itu ditangani lebih awal di sendMessage()).
    if (lowerText.includes('utang') || lowerText.includes('hutang')) {
        const amount = parseAmount(inputText);
        if (!amount) return `❌ Format tidak valid. Contoh: <i>"hutang ke Andi 200k"</i>`;

        let debt = localStorage.getItem('mysaku_debt') ? parseFloat(localStorage.getItem('mysaku_debt')) : 0;
        const activeWallet = walletName || getActiveWallet();

        if (lowerText.includes('bayar utang') || lowerText.includes('bayar hutang')) {
            if (amount > debt) return `❌ Maaf, total utang kamu hanya <b>Rp ${new Intl.NumberFormat('id-ID').format(debt)}</b>.`;

            const walletBal = getWalletBalance(activeWallet);
            const walletInitialized = isWalletInitialized(activeWallet);
            if (!walletInitialized || walletBal < amount) {
                return `❌ <b>Saldo dompet "${activeWallet}" tidak mencukupi untuk bayar utang!</b><br><br>
                💳 Saldo saat ini: <b>Rp ${new Intl.NumberFormat('id-ID').format(walletBal)}</b><br>
                💰 Dibutuhkan: <b>Rp ${new Intl.NumberFormat('id-ID').format(amount)}</b><br><br>
                <i>Yuk, tambah saldo dulu atau ganti dompet.</i>`;
            }

            debt -= amount;
            localStorage.setItem('mysaku_debt', debt.toString());
            updateBalance(getWalletBalance(activeWallet) - amount);
            saveDebtEntry({
                id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                type: 'bayar',
                amount: amount,
                person: extractDebtPerson(inputText),
                wallet: activeWallet,
                rawText: inputText,
                date: new Date().toISOString(),
                remainingDebtAfter: debt
            });

            return `✅ Berhasil bayar utang <b>Rp ${new Intl.NumberFormat('id-ID').format(amount)}</b> dari dompet <b>${activeWallet}</b>.<br>💳 Sisa Utang: <b>Rp ${new Intl.NumberFormat('id-ID').format(debt)}</b>`;
        }

        debt += amount;
        localStorage.setItem('mysaku_debt', debt.toString());
        updateBalance(getWalletBalance(activeWallet) + amount);
        saveDebtEntry({
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            type: 'utang',
            amount: amount,
            person: extractDebtPerson(inputText),
            wallet: activeWallet,
            rawText: inputText,
            date: new Date().toISOString(),
            dueDate: null,
            remainingDebtAfter: debt
        });

        return `✅ Berhasil mencatat hutang sebesar <b>Rp ${new Intl.NumberFormat('id-ID').format(amount)}</b> masuk ke dompet <b>${activeWallet}</b>.<br>💳 Total Utang: <b>Rp ${new Intl.NumberFormat('id-ID').format(debt)}</b>`;
    }

    // --- LOGIKA PARSER TRANSAKSI ---
    const result = parseTransaction(inputText);
    if (!result.success) return result.message;

    const d = result.data;
    const formattedAmount = new Intl.NumberFormat('id-ID').format(d.amount);
    const typeLabel = d.type === 'pemasukan' ? '📈 Pemasukan' : '📉 Pengeluaran';
    const walletForDisplay = walletName || getActiveWallet();
    const walletBal = getWalletBalance(walletForDisplay);
    const walletWasInitialized = isWalletInitialized(walletForDisplay);

    let responseText = `✅ Berhasil mencatat ${d.type}!<br>📌 <b>${typeLabel}</b><br>💰 Rp ${formattedAmount}<br>📂 ${d.category}<br>💳 ${walletForDisplay}`;

    if (!walletWasInitialized) {
        if (d.type === 'pengeluaran') {
            responseText += `<br><br>⚠️ <b>Saldo dompet ${walletForDisplay} belum diatur!</b><br>Saat ini saldo kamu negatif: <b>Rp ${new Intl.NumberFormat('id-ID').format(-d.amount)}</b>`;
            responseText += `<br><br><i>Untuk melanjutkan, atur saldo awal kamu sekarang.</i><br><br>`;
            responseText += `<button class="btn-set-saldo-modal px-6 py-2 bg-[#0028B3] text-white rounded-full text-sm font-medium shadow-md">Atur Saldo Awal</button>`;
        }
    } 
    else if (walletBal < 0) {
        if (d.type === 'pengeluaran') {
            return `⛔ <b>Transaksi sementara dibatasi.</b><br><br>
            Saldo dompet <b>${walletForDisplay}</b> negatif: <b>Rp ${new Intl.NumberFormat('id-ID').format(walletBal)}</b>.<br><br>
            <i>Yuk, atur saldo awal dompet ini dulu!</i><br><br>
            <button class="btn-set-saldo-modal px-6 py-2 bg-[#0028B3] text-white rounded-full text-sm font-medium shadow-md">Atur Saldo Awal</button>
            <br><br>
            <span style="font-size: 12px; color: #6a7fa8;">💡 Atau ketik manual: <i>"saldo awal [nominal]"</i></span>`;
        }
    } 
    else {
        responseText += `
<br><br>
<i class="fa-solid fa-wallet" style="color:#16a34a; margin-right:6px;"></i>
Sisa Saldo Dompet <b>${walletForDisplay}</b>: <b>Rp ${new Intl.NumberFormat('id-ID').format(walletBal)}</b>`;
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
        id: Date.now() + Math.floor(Math.random() * 1000),
        ...transactionData,
        date: new Date().toISOString()
    };
    history.unshift(newEntry);
    localStorage.setItem('mysaku_history', JSON.stringify(history));
    return newEntry.id;
}

// ==========================================
// --- SIMPAN & MUAT ULANG CHAT MESSAGES ---
// ==========================================

function saveChatMessage(text, sender, isImage = false, imageUrl = '', transactionId = null, uniqueId = null, transactionType = null, transactionAmount = null) {
    let messages = localStorage.getItem('mysaku_chat_messages');
    messages = messages ? JSON.parse(messages) : [];
    
    const uid = uniqueId || (Date.now() + '-' + Math.random().toString(36).substr(2, 9));
    
    messages.push({
        uniqueId: uid,
        text: text,
        sender: sender,
        isImage: isImage,
        imageUrl: imageUrl,
        timestamp: Date.now(),
        transactionId: transactionId,
        transactionType: transactionType,
        transactionAmount: transactionAmount
    });

    if (messages.length > 50) messages = messages.slice(-50);
    localStorage.setItem('mysaku_chat_messages', JSON.stringify(messages));
}

function loadChatMessages() {
    const messages = localStorage.getItem('mysaku_chat_messages');
    if (!messages) return;

    const parsed = JSON.parse(messages);
    let lastLoadedDate = null;

    parsed.forEach(msg => {
        const msgDate = new Date(msg.timestamp);
        const currentDateLabel = formatDateLabel(msg.timestamp);

        if (lastLoadedDate !== currentDateLabel && lastLoadedDate !== null) {
            const dividerRow = document.createElement('div');
            dividerRow.className = 'date-divider';
            dividerRow.innerHTML = `<span>${currentDateLabel}</span>`;
            chatArea.appendChild(dividerRow);
        }
        if (lastLoadedDate === null) {
            lastLoadedDate = currentDateLabel;
        }

        const row = document.createElement('div');
        row.className = `message-row ${msg.sender}`;
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper';
        const bubble = document.createElement('div');
        bubble.className = `bubble ${msg.sender}`;

        row.dataset.timestamp = msg.timestamp;
        row.dataset.uniqueId = msg.uniqueId;
        if (msg.transactionId) {
            row.dataset.transactionId = msg.transactionId;
        }
        if (msg.transactionType) {
            row.dataset.type = msg.transactionType;
        }
        if (msg.transactionAmount) {
            row.dataset.amount = msg.transactionAmount;
        }
        if (msg.wallet) {
            row.dataset.wallet = msg.wallet;
        }

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

        const timeElement = document.createElement('div');
        timeElement.className = 'message-time';
        timeElement.innerText = msgDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        wrapper.appendChild(bubble);
        wrapper.appendChild(timeElement);
        row.appendChild(wrapper);
        chatArea.appendChild(row);
        attachLongPressEvent(row, msg.sender);

        if (msg.sender === 'bot' && msg.text && msg.text.includes('btn-set-saldo-modal')) {
            const btn = row.querySelector('.btn-set-saldo-modal');
            if (btn) {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    saldoPopupMode = 'awal';
                    document.getElementById('saldoPopup').classList.remove('hidden');
                    document.getElementById('saldoPopup').classList.add('flex');
                    setTimeout(() => {
                        document.getElementById('saldoPopupInput').focus();
                    }, 100);
                };
            }
        }
        if (msg.sender === 'bot' && msg.text && msg.text.includes('btn-tambah-saldo-modal')) {
            const tambahBtn = row.querySelector('.btn-tambah-saldo-modal');
            if (tambahBtn) {
                tambahBtn.onclick = (e) => {
                    e.stopPropagation();
                    saldoPopupMode = 'tambah';
                    document.getElementById('saldoPopup').classList.remove('hidden');
                    document.getElementById('saldoPopup').classList.add('flex');
                    setTimeout(() => {
                        document.getElementById('saldoPopupInput').focus();
                    }, 100);
                };
            }
        }
        if (msg.sender === 'bot' && msg.text && msg.text.includes('btn-cancel-wallet')) {
            const cancelBtn = row.querySelector('.btn-cancel-wallet');
            if (cancelBtn) {
                cancelBtn.onclick = (e) => {
                    e.stopPropagation();
                    bubble.innerHTML = '↩️ Transaksi dibatalkan.';
                };
            }
        }
        if (msg.sender === 'bot' && msg.text && msg.text.includes('btn-jatuh-tempo-ya')) {
            const yaBtn = row.querySelector('.btn-jatuh-tempo-ya');
            if (yaBtn) {
                yaBtn.onclick = (e) => {
                    e.stopPropagation();
                    openJatuhTempoPopup();
                };
            }
        }
        if (msg.sender === 'bot' && msg.text && msg.text.includes('btn-jatuh-tempo-tidak')) {
            const tidakBtn = row.querySelector('.btn-jatuh-tempo-tidak');
            if (tidakBtn) {
                tidakBtn.onclick = (e) => {
                    e.stopPropagation();
                    bubble.innerHTML = '👌 Oke, tanpa jatuh tempo.';
                    finalizeDebtRecord(null);
                };
            }
        }
    });
    chatArea.scrollTop = chatArea.scrollHeight;
}

// --- 7. Fungsi Kirim Pesan Utama ---
function sendMessage() {
    const text = userInput.value.trim();
    if (text === '') return;

    // LOG STATUS ONBOARDING SEBELUM PROSES
    console.log('📊 [sendMessage] Status: step=' + onboardingStep + ', skipped=' + onboardingSkipped + ', finished=' + onboardingFinished + ', text="' + text + '"');

    if (/^\d+$/.test(text.replace(/[.,]/g, ''))) {
        alert('⚠️ Format tidak valid. Mohon sertakan kata kerja (misal: "beli nasi 20k" atau "terima gaji 3jt").');
        return;
    }

    const lowerText = text.toLowerCase();

    let targetWallet = getActiveWallet();
    const walletMatch = text.match(/\s(?:pakai|ke|via)\s+(\w+)/i);
    if (walletMatch) {
        const resolved = resolveWalletName(walletMatch[1]);
        if (resolved) targetWallet = resolved;
    }

    // --- DETEKSI KEMAJUAN ONBOARDING ---
    // HANYA JALAN JIKA SEDANG DALAM MODE TUTORIAL (step 0,1,2,3,4)
    if (onboardingStep === 0 || onboardingStep === 1 || onboardingStep === 2 || onboardingStep === 3 || onboardingStep === 4) {
        // Pastikan tidak dalam mode skipped atau finished
        if (!onboardingSkipped && !onboardingFinished) {
            console.log('📌 [TUTORIAL] Onboarding step:', onboardingStep, 'Text:', lowerText);

            let isCorrectCommand = false;

            // STEP 0: Set Saldo Awal
            if (onboardingStep === 0) {
                isCorrectCommand = lowerText.includes('saldo awal') || lowerText.includes('set saldo');
                if (isCorrectCommand) {
                    onboardingStep++;
                    saveOnboardingProgress();
                    console.log('➡️ Step 0 → 1');
                    setTimeout(() => {
                        sendOnboardingStep();
                    }, 1500);
                    // Lanjut jatuh ke logika SALDO AWAL di bawah supaya benar-benar tercatat
                } else {
                    // Bukan perintah yang sesuai step ini -- jangan diproses sebagai transaksi apapun
                    const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                    addMessage(text, 'user', false, '', null, pairId);
                    saveChatMessage(text, 'user', false, '', null, pairId, null, null);
                    userInput.value = '';
                    setTimeout(() => {
                        const reminder = `💡 <b>Langkah 1: Atur Saldo Awal</b><br><br>
                        Kamu harus mengatur saldo awal dulu sebelum melanjutkan.<br><br>
                        Ketik: <i>"saldo awal 1jt"</i> atau klik tombol di bawah.<br><br>
                        <button class="btn-set-saldo-modal px-6 py-2 bg-[#0028B3] text-white rounded-full text-sm font-medium shadow-md">🪙 Set Saldo Awal</button>`;
                        addMessage(reminder, 'bot', false, '', null, pairId);
                        saveChatMessage(reminder, 'bot', false, '', null, pairId, null, null);
                    }, 1000);
                    return;
                }
            }
            // STEP 1: Pemasukan
            else if (onboardingStep === 1) {
                isCorrectCommand = lowerText.includes('terima') || lowerText.includes('gaji') || lowerText.includes('bonus');
                if (isCorrectCommand) {
                    onboardingStep++;
                    saveOnboardingProgress();
                    console.log('➡️ Step 1 → 2');
                    setTimeout(() => {
                        sendOnboardingStep();
                    }, 1500);
                } else {
                    const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                    addMessage(text, 'user', false, '', null, pairId);
                    saveChatMessage(text, 'user', false, '', null, pairId, null, null);
                    userInput.value = '';
                    setTimeout(() => {
                        const reminder = `💡 <b>Langkah 2: Catat Pemasukan</b><br><br>
                        Kamu harus mencatat pemasukan dulu sebelum melanjutkan.<br><br>
                        Contoh: ketik <i>"terima gaji 3jt"</i>`;
                        addMessage(reminder, 'bot', false, '', null, pairId);
                        saveChatMessage(reminder, 'bot', false, '', null, pairId, null, null);
                    }, 1000);
                    return;
                }
            }
            // STEP 2: Pengeluaran
            else if (onboardingStep === 2) {
                isCorrectCommand = lowerText.includes('beli') || lowerText.includes('bayar') || lowerText.includes('makan') || lowerText.includes('minum') || lowerText.includes('transport');
                if (isCorrectCommand) {
                    onboardingStep++;
                    saveOnboardingProgress();
                    console.log('➡️ Step 2 → 3');
                    setTimeout(() => {
                        sendOnboardingStep();
                    }, 1500);
                } else {
                    const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                    addMessage(text, 'user', false, '', null, pairId);
                    saveChatMessage(text, 'user', false, '', null, pairId, null, null);
                    userInput.value = '';
                    setTimeout(() => {
                        const reminder = `💡 <b>Langkah 3: Catat Pengeluaran</b><br><br>
                        Kamu harus mencatat pengeluaran dulu sebelum melanjutkan.<br><br>
                        Contoh: ketik <i>"beli nasi 20k"</i> atau <i>"bayar listrik 150k"</i>`;
                        addMessage(reminder, 'bot', false, '', null, pairId);
                        saveChatMessage(reminder, 'bot', false, '', null, pairId, null, null);
                    }, 1000);
                    return;
                }
            }
            // STEP 3: Ganti Dompet
            else if (onboardingStep === 3) {
                const walletMatch2 = text.match(/\s(?:ke|pakai|via)\s+(\w+)/i);
                const resolved2 = walletMatch2 ? resolveWalletName(walletMatch2[1]) : null;
                isCorrectCommand = !!resolved2;
                if (isCorrectCommand) {
                    onboardingStep++;
                    saveOnboardingProgress();
                    console.log('➡️ Step 3 → 4 (dompet terdeteksi: ' + resolved2 + ')');
                    setTimeout(() => {
                        sendOnboardingStep();
                    }, 2000);
                } else {
                    const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                    addMessage(text, 'user', false, '', null, pairId);
                    saveChatMessage(text, 'user', false, '', null, pairId, null, null);
                    userInput.value = '';
                    setTimeout(() => {
                        const reminder = `💡 <b>Langkah 4: Ganti Dompet (Opsional)</b><br><br>
                        Kamu harus menyebut dompet tujuan untuk menyelesaikan langkah ini.<br><br>
                        Contoh: ketik <i>"gaji 5jt ke bca"</i> atau <i>"beli makan 20k pakai dana"</i>`;
                        addMessage(reminder, 'bot', false, '', null, pairId);
                        saveChatMessage(reminder, 'bot', false, '', null, pairId, null, null);
                    }, 1000);
                    return;
                }
            }
            // STEP 4: Catat Utang
            else if (onboardingStep === 4) {
                const isCekUtang = lowerText.includes('cek utang') || lowerText.includes('cek hutang') || lowerText.includes('total utang') || lowerText.includes('total hutang');
                isCorrectCommand = (lowerText.includes('utang') || lowerText.includes('hutang')) && !isCekUtang;
                if (isCorrectCommand) {
                    // Jangan langsung lompat ke pesan penutup di sini -- pencatatan utang
                    // masih menunggu user menjawab pertanyaan jatuh tempo (Ya/Tidak).
                    // Step baru benar-benar naik & pesan penutup baru dikirim setelah
                    // finalizeDebtRecord()/pembayaran utang selesai (lihat advanceOnboardingAfterDebt()).
                    console.log('⏳ Step 4: utang sedang diproses, menunggu konfirmasi jatuh tempo sebelum lanjut ke step 5.');
                    // Lanjut jatuh ke logika UTANG di bawah supaya benar-benar tercatat
                } else {
                    const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                    addMessage(text, 'user', false, '', null, pairId);
                    saveChatMessage(text, 'user', false, '', null, pairId, null, null);
                    userInput.value = '';
                    setTimeout(() => {
                        const reminder = `💡 <b>Langkah 5: Catat Utang</b><br><br>
                        Kamu harus mencatat utang dulu sebelum melanjutkan.<br><br>
                        Contoh: ketik <i>"hutang ke Andi 100rb"</i>`;
                        addMessage(reminder, 'bot', false, '', null, pairId);
                        saveChatMessage(reminder, 'bot', false, '', null, pairId, null, null);
                    }, 1000);
                    return;
                }
            }
        } else {
            console.log('💬 [REAL MODE] Onboarding step=' + onboardingStep + ' tapi skipped/finished=true, transaksi normal.');
        }
    } else {
        // Mode REAL (bukan tutorial) - onboardingStep = -999 atau nilai negatif lainnya
        console.log('💬 [REAL MODE] Onboarding tidak aktif (step=' + onboardingStep + '), memproses transaksi normal.');
    }

    // --- TAMBAH SALDO ---
    if (lowerText.includes('tambah saldo')) {
        const amount = parseAmount(text);
        if (!amount) {
            addMessage(text, 'user', false, '', null);
            saveChatMessage(text, 'user', false, '');
            userInput.value = '';
            setTimeout(() => {
                const botReply = `❌ Format tidak valid. Contoh: "Tambah saldo 500k"`;
                const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                addMessage(botReply, 'bot', false, '', null, pairId);
                saveChatMessage(botReply, 'bot', false, '', null, pairId, null, null);
            }, 1000);
            return;
        }

        const walletBalBefore = getWalletBalance(targetWallet);
        const newBalance = walletBalBefore + amount;
        setWalletBalance(targetWallet, newBalance);
        currentBalance = getWalletBalance(getActiveWallet());

        const transactionData = { type: 'pemasukan', amount: amount, category: 'Tambah Saldo', wallet: targetWallet, rawText: text, date: Date.now() };
        const newId = saveTransactionToHistory(transactionData);

        const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        addMessage(text, 'user', false, '', { ...transactionData, id: newId }, pairId);
        saveChatMessage(text, 'user', false, '', newId, pairId, transactionData.type, transactionData.amount);
        userInput.value = '';

        setTimeout(() => {
            const botReply = `✅ Berhasil menambah saldo <b>Rp ${new Intl.NumberFormat('id-ID').format(amount)}</b> ke dompet <b>${targetWallet}</b>.<br>💰 Saldo sekarang: <b>Rp ${new Intl.NumberFormat('id-ID').format(newBalance)}</b>`;
            addMessage(botReply, 'bot', false, '', null, pairId);
            saveChatMessage(botReply, 'bot', false, '', null, pairId, null, null);
        }, 1000);
        return;
    }

    // --- SALDO AWAL ---
    if (lowerText.includes('saldo awal') || lowerText.includes('set saldo')) {
        const walletBalBefore = getWalletBalance(targetWallet);
        const walletInitialized = isWalletInitialized(targetWallet);
        const isFirstTimeSetup = (!walletInitialized || walletBalBefore < 0);

        if (!isFirstTimeSetup) {
            addMessage(text, 'user', false, '', null);
            saveChatMessage(text, 'user', false, '');
            userInput.value = '';
            setTimeout(() => {
                const botReply = `❌ Saldo dompet <b>${targetWallet}</b> sudah pernah diset dan saldo sudah positif. Gunakan <i>"tambah saldo [nominal]"</i> untuk menambah saldo.`;
                const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                addMessage(botReply, 'bot', false, '', null, pairId);
                saveChatMessage(botReply, 'bot', false, '', null, pairId, null, null);
            }, 1000);
            return;
        }

        const amount = parseAmount(text);
        if (!amount) {
            addMessage(text, 'user', false, '', null);
            saveChatMessage(text, 'user', false, '');
            userInput.value = '';
            setTimeout(() => {
                const botReply = `❌ Format tidak valid. Contoh: "Saldo awal 2jt"`;
                const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                addMessage(botReply, 'bot', false, '', null, pairId);
                saveChatMessage(botReply, 'bot', false, '', null, pairId, null, null);
            }, 1000);
            return;
        }

        const newBalance = walletBalBefore + amount;
        setWalletBalance(targetWallet, newBalance);
        currentBalance = getWalletBalance(getActiveWallet());

        const transactionData = { type: 'pemasukan', amount: amount, category: 'Saldo Awal', wallet: targetWallet, rawText: text, date: Date.now() };
        const newId = saveTransactionToHistory(transactionData);

        const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        addMessage(text, 'user', false, '', { ...transactionData, id: newId }, pairId);
        saveChatMessage(text, 'user', false, '', newId, pairId, transactionData.type, transactionData.amount);
        userInput.value = '';

        setTimeout(() => {
            const botReply = `✅ Saldo awal <b>Rp ${new Intl.NumberFormat('id-ID').format(amount)}</b> berhasil diatur untuk dompet <b>${targetWallet}</b>.<br>💰 Saldo sekarang: <b>Rp ${new Intl.NumberFormat('id-ID').format(newBalance)}</b>`;
            addMessage(botReply, 'bot', false, '', null, pairId);
            saveChatMessage(botReply, 'bot', false, '', null, pairId, null, null);
        }, 1000);
        return;
    }


// --- PERINTAH UTANG (kecuali "cek utang" / "total utang" -> itu bukan pencatatan, tapi cuma cek nominal) ---
    if ((lowerText.includes('utang') || lowerText.includes('hutang')) && !lowerText.includes('cek utang') && !lowerText.includes('cek hutang') && !lowerText.includes('total utang') && !lowerText.includes('total hutang')) {
        const amount = parseAmount(text);

        if (!amount) {
            const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            addMessage(text, 'user', false, '', null, pairId);
            saveChatMessage(text, 'user', false, '', null, pairId, null, null);
            userInput.value = '';
            setTimeout(() => {
                const botReply = `❌ Format tidak valid. Contoh: <i>"hutang ke Andi 200k"</i>`;
                addMessage(botReply, 'bot', false, '', null, pairId);
                saveChatMessage(botReply, 'bot', false, '', null, pairId, null, null);
            }, 1000);
            return;
        }

        const isBayarUtang = lowerText.includes('bayar utang') || lowerText.includes('bayar hutang');

        if (isBayarUtang) {
            const debtNow = currentDebt;
            const targetPerson = extractDebtPerson(text);

            // --- Kalau user menyebut nama orang, cari dulu apakah ada hutang ke orang itu ---
            if (targetPerson) {
                const outstanding = getOutstandingDebtForPerson(targetPerson);

                if (outstanding <= 0) {
                    const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                    addMessage(text, 'user', false, '', null, pairId);
                    saveChatMessage(text, 'user', false, '', null, pairId, null, null);
                    userInput.value = '';
                    setTimeout(() => {
                        const botReply = `❌ Hutang ke <b>${targetPerson}</b> tidak ditemukan. Silakan cek di riwayat hutang.`;
                        addMessage(botReply, 'bot', false, '', null, pairId);
                        saveChatMessage(botReply, 'bot', false, '', null, pairId, null, null);
                    }, 1000);
                    return;
                }

                if (amount > outstanding) {
                    const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                    addMessage(text, 'user', false, '', null, pairId);
                    saveChatMessage(text, 'user', false, '', null, pairId, null, null);
                    userInput.value = '';
                    setTimeout(() => {
                        const botReply = `❌ Maaf, hutang ke <b>${targetPerson}</b> cuma <b>Rp ${new Intl.NumberFormat('id-ID').format(outstanding)}</b>.`;
                        addMessage(botReply, 'bot', false, '', null, pairId);
                        saveChatMessage(botReply, 'bot', false, '', null, pairId, null, null);
                    }, 1000);
                    return;
                }
            } else if (amount > debtNow) {
                const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                addMessage(text, 'user', false, '', null, pairId);
                saveChatMessage(text, 'user', false, '', null, pairId, null, null);
                userInput.value = '';
                setTimeout(() => {
                    const botReply = `❌ Maaf, total utang kamu hanya <b>Rp ${new Intl.NumberFormat('id-ID').format(debtNow)}</b>.`;
                    addMessage(botReply, 'bot', false, '', null, pairId);
                    saveChatMessage(botReply, 'bot', false, '', null, pairId, null, null);
                }, 1000);
                return;
            }

            const walletBal = getWalletBalance(targetWallet);
            const walletInitialized = isWalletInitialized(targetWallet);

            // Saldo tidak cukup kalau: dompetnya belum pernah diisi sama sekali (otomatis 0),
            // ATAU sudah diisi tapi nominalnya kurang dari yang mau dibayarkan.
            // (Sebelumnya kondisi ini keliru: dompet yang BELUM diinisialisasi malah lolos validasi.)
            if (!walletInitialized || walletBal < amount) {
                const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                addMessage(text, 'user', false, '', null, pairId);
                saveChatMessage(text, 'user', false, '', null, pairId, null, null);
                userInput.value = '';
                setTimeout(() => {
                    const botReply = `❌ <b>Saldo dompet "${targetWallet}" tidak mencukupi untuk bayar utang!</b><br><br>
                    💳 Saldo saat ini: <b>Rp ${new Intl.NumberFormat('id-ID').format(walletBal)}</b><br>
                    💰 Dibutuhkan: <b>Rp ${new Intl.NumberFormat('id-ID').format(amount)}</b><br><br>
                    <i>Silakan tambah saldo dompet ini dulu, atau ganti ke dompet lain yang saldonya cukup.</i><br><br>
                    <button class="btn-tambah-saldo-modal px-6 py-2 bg-[#0028B3] text-white rounded-full text-sm font-medium shadow-md">➕ Tambah Saldo</button>
                    <button class="btn-cancel-wallet px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm shadow-md ml-2">✖ Batal</button>`;
                    addMessage(botReply, 'bot', false, '', null, pairId);
                    saveChatMessage(botReply, 'bot', false, '', null, pairId, null, null);
                }, 1000);
                return;
            }

            const newDebt = debtNow - amount;
            updateDebt(newDebt);
            setWalletBalance(targetWallet, walletBal - amount);
            currentBalance = getWalletBalance(getActiveWallet());
            saveDebtEntry({
                id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                type: 'bayar',
                amount: amount,
                person: targetPerson,
                wallet: targetWallet,
                rawText: text,
                date: new Date().toISOString(),
                remainingDebtAfter: newDebt
            });

            const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            addMessage(text, 'user', false, '', null, pairId);
            saveChatMessage(text, 'user', false, '', null, pairId, null, null);
            userInput.value = '';
            setTimeout(() => {
                const personLine = targetPerson ? ` ke <b>${targetPerson}</b>` : '';
                const botReply = `✅ Berhasil bayar utang${personLine} <b>Rp ${new Intl.NumberFormat('id-ID').format(amount)}</b> dari dompet <b>${targetWallet}</b>.<br>💳 Sisa Utang: <b>Rp ${new Intl.NumberFormat('id-ID').format(newDebt)}</b>`;
                addMessage(botReply, 'bot', false, '', null, pairId);
                saveChatMessage(botReply, 'bot', false, '', null, pairId, null, null);

                // Kalau sedang tutorial step 5 (catat utang), lanjutkan setelah pelunasan berhasil
                advanceOnboardingAfterDebt();
            }, 1000);
            return;
        }

        // --- Jangan langsung dicatat -- tanya dulu soal jatuh tempo ---
        pendingDebtEntry = {
            amount: amount,
            person: extractDebtPerson(text),
            wallet: targetWallet,
            rawText: text
        };

        const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        addMessage(text, 'user', false, '', null, pairId);
        saveChatMessage(text, 'user', false, '', null, pairId, null, null);
        userInput.value = '';
        setTimeout(() => {
            const botReply = `📅 Oke, hutang <b>Rp ${new Intl.NumberFormat('id-ID').format(amount)}</b>${pendingDebtEntry.person ? ' ke <b>' + pendingDebtEntry.person + '</b>' : ''} akan dicatat.<br><br>
            Apakah hutang ini punya tanggal jatuh tempo?<br><br>
            <button class="btn-jatuh-tempo-ya px-5 py-2 bg-[#0028B3] text-white rounded-full text-sm font-medium shadow-md">✅ Ya, ada</button>
            <button class="btn-jatuh-tempo-tidak px-5 py-2 bg-gray-200 text-gray-700 rounded-full text-sm shadow-md ml-2">❌ Tidak ada</button>`;
            addMessage(botReply, 'bot', false, '', null, pairId);
            saveChatMessage(botReply, 'bot', false, '', null, pairId, null, null);
        }, 1000);
        return;
    }

    // --- TRANSAKSI BIASA ---
    const result = parseTransaction(text);
    let transactionData = null;
    let newId = null;

    if (result.success) {
        transactionData = result.data;
        transactionData.wallet = targetWallet;

        const currentBal = getWalletBalance(targetWallet);
        const walletInitialized = isWalletInitialized(targetWallet);

        if (transactionData.type === 'pengeluaran' && walletInitialized && currentBal < transactionData.amount) {
            const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            const botReply = `❌ <b>Saldo dompet "${targetWallet}" tidak mencukupi!</b><br><br>
            💳 Saldo saat ini: <b>Rp ${new Intl.NumberFormat('id-ID').format(currentBal)}</b><br>
            💰 Dibutuhkan: <b>Rp ${new Intl.NumberFormat('id-ID').format(transactionData.amount)}</b><br><br>
            <button class="btn-tambah-saldo-modal px-6 py-2 bg-[#0028B3] text-white rounded-full text-sm font-medium shadow-md">➕ Tambah Saldo</button>
            <button class="btn-cancel-wallet px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm shadow-md ml-2">✖ Batal</button>`;
            addMessage(botReply, 'bot', false, '', null, pairId);
            saveChatMessage(botReply, 'bot', false, '', null, pairId, null, null);
            return;
        }

        newId = saveTransactionToHistory(transactionData);
        transactionData.id = newId;

        let newBalance;
        if (transactionData.type === 'pemasukan') {
            newBalance = currentBal + transactionData.amount;
        } else {
            newBalance = currentBal - transactionData.amount;
        }
        setWalletBalance(targetWallet, newBalance);
        currentBalance = getWalletBalance(getActiveWallet());
    }

    const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    addMessage(text, 'user', false, '', transactionData ? { ...transactionData, id: newId } : null, pairId);
    saveChatMessage(text, 'user', false, '', newId, pairId, transactionData ? transactionData.type : null, transactionData ? transactionData.amount : null);

    userInput.value = '';
    setTimeout(() => {
        const botReply = getBotResponse(text, targetWallet);
        addMessage(botReply, 'bot', false, '', null, pairId);
        saveChatMessage(botReply, 'bot', false, '', null, pairId, null, null);

        // CEK STATUS ONBOARDING SETELAH BOT REPLY
        console.log('🔍 Status setelah transaksi - step:', onboardingStep, 'selesai:', onboardingFinished, 'skipped:', onboardingSkipped);
    }, 1000);
}

// ==========================================
// --- MODUL UTANG (helper, di-scope global) ---
// ==========================================
// Catatan: fungsi-fungsi ini SEBELUMNYA berada di dalam sendMessage(), sehingga
// pendingDebtEntry & finalizeDebtRecord ter-redeclare tiap kali sendMessage() dipanggil
// dan tidak bisa diakses dari luar (mis. dari listener tombol popup jatuh tempo).
// Akibatnya klik "OK" di popup tanggal tidak pernah benar-benar mencatat hutangnya.
// Sekarang di-scope di level modul supaya konsisten diakses dari mana saja.

// Menyimpan sementara detail hutang yang lagi ditanya jatuh temponya (menunggu user pilih Ya/Tidak)
let pendingDebtEntry = null;

// Benar-benar mencatat hutang ke localStorage + update saldo dompet + total utang.
// Dipanggil setelah user menjawab pertanyaan jatuh tempo (baik pilih Ya maupun Tidak).
function finalizeDebtRecord(dueDate) {
    if (!pendingDebtEntry) return;
    const { amount, person, wallet, rawText } = pendingDebtEntry;

    const newDebt = currentDebt + amount;
    updateDebt(newDebt);
    setWalletBalance(wallet, getWalletBalance(wallet) + amount);
    currentBalance = getWalletBalance(getActiveWallet());
    saveDebtEntry({
        id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        type: 'utang',
        amount: amount,
        person: person,
        wallet: wallet,
        rawText: rawText,
        date: new Date().toISOString(),
        dueDate: dueDate || null,
        remainingDebtAfter: newDebt
    });

    const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const dueDateLine = dueDate ? `<br>📅 Jatuh tempo: <b>${formatTanggalIndonesia(dueDate)}</b>` : '';
    const botReply = `✅ Berhasil mencatat hutang sebesar <b>Rp ${new Intl.NumberFormat('id-ID').format(amount)}</b> masuk ke dompet <b>${wallet}</b>.<br>💳 Total Utang: <b>Rp ${new Intl.NumberFormat('id-ID').format(newDebt)}</b>${dueDateLine}`;
    addMessage(botReply, 'bot', false, '', null, pairId);
    saveChatMessage(botReply, 'bot', false, '', null, pairId, null, null);

    pendingDebtEntry = null;

    // Kalau ini terjadi di tengah tutorial step 5 (catat utang), baru sekarang lanjut ke pesan penutup --
    // supaya "Ya, ada" (nunggu tanggal) tidak bentrok/tabrakan sama pesan akhir tutorial.
    advanceOnboardingAfterDebt();
}

function formatTanggalIndonesia(isoDateStr) {
    const d = new Date(isoDateStr);
    return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// ditampilkan sebagai daftar di halaman utang.html - mysaku_debt cuma simpan angka total,
// tidak cukup untuk menampilkan riwayat detail per orang/tanggal.
//
// PENTING: hutang & pembayaran hutang MENGUBAH SALDO DOMPET (nambah saat berutang, ngurang
// saat bayar), jadi ini juga harus tercatat di mysaku_history (riwayat transaksi utama) --
// bukan cuma di mysaku_debt_history (yang cuma dipakai halaman utang.html). Satu fungsi ini
// jadi titik pusat penyimpanan supaya semua pemanggil (catat hutang baru / bayar hutang,
// baik dari sendMessage maupun getBotResponse) otomatis konsisten.
function saveDebtEntry(entry) {
    const history = JSON.parse(localStorage.getItem('mysaku_debt_history') || '[]');
    history.unshift(entry);
    localStorage.setItem('mysaku_debt_history', JSON.stringify(history));

    const isNewDebt = entry.type === 'utang';
    const personLabel = entry.person ? ` ke/dari ${entry.person}` : '';
    saveTransactionToHistory({
        type: isNewDebt ? 'pemasukan' : 'pengeluaran',
        amount: entry.amount,
        category: isNewDebt ? 'Utang' : 'Bayar Utang',
        wallet: entry.wallet,
        rawText: entry.rawText || (isNewDebt ? `Utang${personLabel}` : `Bayar utang${personLabel}`),
        debtEntryId: entry.id
    });

    return entry.id;
}

// Coba tebak nama orang dari kalimat ("hutang ke Andi 100rb" / "bayar hutang ke Andi 50rb").
// Kalau kata setelah ke/dari/sama ternyata nama dompet (bca, dana, dst), abaikan -- itu bukan nama orang.
function extractDebtPerson(text) {
    const match = text.match(/\b(?:ke|dari|sama)\s+([A-Za-z]+)/i);
    if (!match) return null;
    const word = match[1];
    if (resolveWalletName(word)) return null;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

// Hitung sisa hutang yang masih outstanding ke satu orang tertentu, berdasarkan
// mysaku_debt_history (jumlah semua entri 'utang' ke orang itu dikurangi semua 'bayar' ke orang itu).
// Dipakai supaya "bayar hutang ke Andi" bisa tahu apakah memang ada hutang ke Andi sebelum melunasi.
function getOutstandingDebtForPerson(person) {
    if (!person) return 0;
    const history = JSON.parse(localStorage.getItem('mysaku_debt_history') || '[]');
    const target = person.toLowerCase();
    let total = 0;
    history.forEach(item => {
        if (!item.person || item.person.toLowerCase() !== target) return;
        if (item.type === 'utang') total += item.amount;
        else if (item.type === 'bayar') total -= item.amount;
    });
    return Math.max(0, total);
}

// Kalau lagi di tengah tutorial step 5 (index 4) dan pencatatan/pelunasan utang baru saja
// benar-benar selesai (bukan cuma "diketik"), baru lanjutkan ke pesan penutup tutorial.
function advanceOnboardingAfterDebt() {
    if (typeof onboardingStep === 'undefined') return;
    if (onboardingStep !== 4 || onboardingSkipped || onboardingFinished) return;

    onboardingStep++;
    saveOnboardingProgress();
    console.log('🎉 Onboarding SELESAI! Step 4 → 5 (utang benar-benar tercatat)');
    setTimeout(() => {
        sendOnboardingStep();
    }, 1200);
}

btnSend.onclick = sendMessage;
userInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') sendMessage();
});

// --- 8. Inisialisasi Awal ---
document.addEventListener('DOMContentLoaded', function() {
    loadChatMessages();

    if (chatArea.children.length === 0) {
        if (!isOnboardingCompleted()) {
            // Benar-benar user baru & belum pernah menyelesaikan/melewati tutorial -> WAJIB mulai tutorial
            startOnboarding();
        } else {
            // Sudah pernah selesai/lewati sebelumnya, tapi entah kenapa histori chat kosong (mis. dibersihkan manual)
            addMessage("Halo! Aku Mysaku, asisten keuanganmu. 👋<br><br>Ketik <b>'bantuan'</b> untuk melihat daftar perintah.", 'bot');
        }
    }

    // Cek pengingat jatuh tempo utang (cuma kalau tutorial sudah selesai, biar tidak ganggu alur onboarding)
    if (isOnboardingCompleted()) {
        setTimeout(checkDebtDueReminders, 1200);
    }
});

// ==========================================
// --- PENGINGAT JATUH TEMPO UTANG ---
// ==========================================
// Dicek tiap kali halaman chat dibuka (maksimal 1x per hari per entri utang, supaya
// tidak spam pesan yang sama berulang-ulang tiap kali user buka aplikasi).
function checkDebtDueReminders() {
    const history = JSON.parse(localStorage.getItem('mysaku_debt_history') || '[]');
    const remindedLog = JSON.parse(localStorage.getItem('mysaku_debt_reminded') || '{}');
    const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Hitung sisa utang per orang, supaya utang yang sudah lunas tidak diingatkan lagi
    const outstandingByPerson = {};
    history.forEach(item => {
        if (!item.person) return;
        const key = item.person.toLowerCase();
        if (!(key in outstandingByPerson)) outstandingByPerson[key] = 0;
        if (item.type === 'utang') outstandingByPerson[key] += item.amount;
        else if (item.type === 'bayar') outstandingByPerson[key] -= item.amount;
    });

    const now = new Date();
    const dueSoonMs = 3 * 24 * 60 * 60 * 1000; // ingatkan mulai H-3

    const dueEntries = history.filter(item => {
        if (item.type !== 'utang' || !item.dueDate) return false;
        const key = item.person ? item.person.toLowerCase() : null;
        const stillOwed = key ? (outstandingByPerson[key] || 0) > 0 : true;
        if (!stillOwed) return false;

        // Sudah pernah diingatkan hari ini untuk entri ini? skip.
        if (remindedLog[item.id] === todayKey) return false;

        const due = new Date(item.dueDate);
        return (due.getTime() - now.getTime()) <= dueSoonMs;
    });

    if (dueEntries.length === 0) return;

    // Urutkan dari yang paling mendesak (paling telat / paling dekat jatuh temponya)
    dueEntries.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    const lines = dueEntries.map(item => {
        const due = new Date(item.dueDate);
        const diffDays = Math.ceil((due - now) / (24 * 60 * 60 * 1000));
        const personLabel = item.person ? ` ke <b>${item.person}</b>` : '';
        const amountLabel = `<b>Rp ${new Intl.NumberFormat('id-ID').format(item.amount)}</b>`;
        let statusLabel;
        if (diffDays < 0) {
            statusLabel = `⚠️ <b>Telat ${Math.abs(diffDays)} hari</b>`;
        } else if (diffDays === 0) {
            statusLabel = `⚠️ <b>Jatuh tempo hari ini</b>`;
        } else {
            statusLabel = `⏰ Jatuh tempo ${diffDays} hari lagi (${formatTanggalIndonesia(item.dueDate)})`;
        }
        return `• Hutang${personLabel} ${amountLabel} — ${statusLabel}`;
    });

    const botReply = `🔔 <b>Pengingat Jatuh Tempo Utang</b><br><br>${lines.join('<br>')}<br><br>Ketik <i>"bayar hutang [nominal] ke [nama]"</i> untuk melunasi.`;

    const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    addMessage(botReply, 'bot', false, '', null, pairId);
    saveChatMessage(botReply, 'bot', false, '', null, pairId, null, null);

    // Tandai semua entri ini sudah diingatkan hari ini
    dueEntries.forEach(item => {
        remindedLog[item.id] = todayKey;
    });
    localStorage.setItem('mysaku_debt_reminded', JSON.stringify(remindedLog));
}

// ==========================================
// --- MODUL PARSER KEUANGAN ---
// ==========================================

function parseAmount(text) {
    let clean = text.toLowerCase().trim();
    
    // Deteksi milyar
    let match = clean.match(/([0-9,\.]+)\s*(m|milyar|miliar)/i);
    if (match) {
        let num = parseFloat(match[1].replace(/\./g, '').replace(/,/g, '.'));
        return num * 1000000000;
    }
    
    // Deteksi juta (jt / juta)
    match = clean.match(/([0-9,\.]+)\s*(jt|juta)/i);
    if (match) {
        let num = parseFloat(match[1].replace(/\./g, '').replace(/,/g, '.'));
        return num * 1000000;
    }
    
    // Deteksi ribu (k / rb / ribu)
    match = clean.match(/([0-9,\.]+)\s*(k|rb|ribu)/i);
    if (match) {
        let num = parseFloat(match[1].replace(/\./g, '').replace(/,/g, '.'));
        return num * 1000;
    }
    
    // Deteksi angka biasa (Rp 50000)
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
    'Cash': ['kas', 'tunai', 'cash', 'uang'],
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
    return 'Cash';
}

// Item bawaan aplikasi + item kustom yang ditambahkan user lewat halaman Pengaturan
// (disimpan di localStorage 'mysaku_item_dictionary' oleh pengaturan.js). Dibaca ulang
// setiap parsing transaksi supaya perubahan di halaman Pengaturan langsung berlaku di chat.
const DEFAULT_ITEM_DICTIONARY = { 'bakso aci': 'Makanan', 'indomie': 'Makanan', 'pertalite': 'Transportasi' };

function getItemDictionary() {
    let custom = {};
    try {
        custom = JSON.parse(localStorage.getItem('mysaku_item_dictionary') || '{}');
    } catch (e) {
        custom = {};
    }
    return { ...DEFAULT_ITEM_DICTIONARY, ...custom };
}

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
        return { success: false, message: "Maaf, saya tidak menemukan nominal uangnya. Coba contoh: 'beli nasi 20k'" };
    }
    const type = determineTransactionType(userText);
    let category = 'Lainnya';
    const textLower = userText.toLowerCase();
    for (const [item, cat] of Object.entries(getItemDictionary())) {
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
    localStorage.setItem('mysaku_balance', newBalance.toString());
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

// ==========================================
// --- LOGIKA POPUP SALDO (AWAL / TAMBAH) ----
// ==========================================

const popup = document.getElementById('saldoPopup');
const popupInput = document.getElementById('saldoPopupInput');
const popupOk = document.getElementById('saldoPopupOk');
const popupCancel = document.getElementById('saldoPopupCancel');

let saldoPopupMode = 'awal';

popupOk.onclick = () => {
    const val = popupInput.value.trim();
    if (val === '') {
        alert('Silakan masukkan nominal saldo.');
        return;
    }

    popup.classList.add('hidden');
    popup.classList.remove('flex');

    // CEK APAKAH SEDANG DALAM MODE TUTORIAL
    const isTutorialMode = !onboardingSkipped && !onboardingFinished && (onboardingStep === 0 || onboardingStep === 1 || onboardingStep === 2 || onboardingStep === 3 || onboardingStep === 4);
    
    if (isTutorialMode) {
        // Mode tutorial - kirim sebagai perintah tutorial
        userInput.value = saldoPopupMode === 'tambah' ? `tambah saldo ${val}` : `saldo awal ${val}`;
    } else {
        // Mode real - kirim sebagai perintah normal
        userInput.value = saldoPopupMode === 'tambah' ? `tambah saldo ${val}` : `saldo awal ${val}`;
    }
    
    sendMessage();
    popupInput.value = '';
};

popupCancel.onclick = () => {
    popup.classList.add('hidden');
    popup.classList.remove('flex');
    popupInput.value = '';
};

popup.onclick = (e) => {
    if (e.target === popup) {
        popup.classList.add('hidden');
        popup.classList.remove('flex');
        popupInput.value = '';
    }
};

// ==========================================
// --- LOGIKA POPUP TANGGAL JATUH TEMPO ------
// ==========================================
// Catatan: elemen HTML popup ini (#jatuhTempoPopup, #jatuhTempoPopupInput, dst) perlu
// ditambahkan di index.html. Kalau elemennya belum ada, fungsi ini akan diam-diam gagal
// (dicek pakai null-check) supaya tidak bikin error di halaman lain yang belum diupdate.

function openJatuhTempoPopup() {
    const popup = document.getElementById('jatuhTempoPopup');
    const input = document.getElementById('jatuhTempoPopupInput');
    if (!popup || !input) {
        console.warn('⚠️ Elemen popup jatuh tempo (#jatuhTempoPopup) belum ada di HTML.');
        return;
    }
    popup.classList.remove('hidden');
    popup.classList.add('flex');
    // Default tanggal minimal = hari ini
    const today = new Date().toISOString().split('T')[0];
    input.min = today;
    input.value = today;
    setTimeout(() => input.focus(), 100);
}

function closeJatuhTempoPopup() {
    const popup = document.getElementById('jatuhTempoPopup');
    if (!popup) return;
    popup.classList.add('hidden');
    popup.classList.remove('flex');
}

document.addEventListener('DOMContentLoaded', () => {
    const jtPopup = document.getElementById('jatuhTempoPopup');
    const jtInput = document.getElementById('jatuhTempoPopupInput');
    const jtOk = document.getElementById('jatuhTempoPopupOk');
    const jtCancel = document.getElementById('jatuhTempoPopupCancel');
    if (!jtPopup || !jtInput || !jtOk || !jtCancel) return;

    jtOk.onclick = () => {
        const val = jtInput.value;
        if (!val) {
            alert('Silakan pilih tanggal jatuh tempo.');
            return;
        }
        closeJatuhTempoPopup();
        finalizeDebtRecord(val);
    };

    jtCancel.onclick = () => {
        closeJatuhTempoPopup();
        // Batal pilih tanggal -> anggap tidak ada jatuh tempo, tetap catat hutangnya
        finalizeDebtRecord(null);
    };

    jtPopup.onclick = (e) => {
        if (e.target === jtPopup) {
            closeJatuhTempoPopup();
            finalizeDebtRecord(null);
        }
    };
});



// --- OVERRIDE: Redirect updateBalance & getBalance ke dompet aktif ---
const originalUpdateBalance = updateBalance;
updateBalance = function(newBalance) {
    const active = getActiveWallet();
    setWalletBalance(active, newBalance);
    currentBalance = newBalance;
    return newBalance;
};

const originalGetBalance = getBalance;
getBalance = function() {
    const active = getActiveWallet();
    return getWalletBalance(active);
};