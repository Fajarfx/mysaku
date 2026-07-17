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

function addMessage(text, sender, isImage = false, imageUrl = '', transactionData = null, pairId = null) {
    const now = Date.now();
    const currentDateLabel = formatDateLabel(now);
    // PASTIKAN pairId digunakan. Jika null, buat baru.
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

    // Simpan ID yang sama (pairId)
    row.dataset.timestamp = now;
    row.dataset.uniqueId = uniqueId;

    if (transactionData) {
        row.dataset.type = transactionData.type;
        row.dataset.amount = transactionData.amount;
        if (transactionData.id) {
            row.dataset.transactionId = transactionData.id;
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
                document.getElementById('saldoPopup').classList.remove('hidden');
                document.getElementById('saldoPopup').classList.add('flex');
                setTimeout(() => {
                    document.getElementById('saldoPopupInput').focus();
                }, 100);
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

        // --- 2. Rollback saldo ---
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

        // --- 1. Rollback saldo ---
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
    
    // --- SATU ID UNTUK USER & BOT ---
    const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    addMessage(caption, 'user', true, imagePreview.src, transactionData, pairId);
    saveChatMessage(caption, 'user', true, imagePreview.src, transactionData ? transactionData.id : null, pairId);
    
    closeAllMenus();
    setTimeout(() => {
        let botReply;
        if (caption === '') {
            botReply = "Terima kasih fotonya! Aku sudah catat dokumentasi ini.";
        } else {
            botReply = getBotResponse(caption);
        }
        addMessage(botReply, 'bot', false, '', null, pairId);
        saveChatMessage(botReply, 'bot', false, '', null, pairId);
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

    if (lowerText.includes('cek saldo') || lowerText.includes('sisa uang') || lowerText.includes('saldo saya')) {
        if (currentBalance === null) return `❌ Saldo belum tercatat. Set saldo awal dulu: "Saldo awal 2jt"`;
        else return `💰 Saldo kamu: <b>Rp ${new Intl.NumberFormat('id-ID').format(currentBalance)}</b>`;
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

    // --- LOGIKA PARSER TRANSAKSI ---
    const result = parseTransaction(inputText);
    if (!result.success) return result.message;
    
    const d = result.data;
    const formattedAmount = new Intl.NumberFormat('id-ID').format(d.amount);
    const typeLabel = d.type === 'pemasukan' ? '📈 Pemasukan' : '📉 Pengeluaran';
    let responseText = `✅ Berhasil mencatat ${d.type}!<br>📌 <b>${typeLabel}</b><br>💰 Rp ${formattedAmount}<br>📂 ${d.category}<br>💳 ${d.wallet}`;

    if (currentBalance === null) {
        if (d.type === 'pengeluaran') {
            responseText += `<br><br>⚠️ <b>Saldo kamu belum diatur!</b><br>Saat ini saldo kamu negatif: <b>Rp ${new Intl.NumberFormat('id-ID').format(-d.amount)}</b>`;
            responseText += `<br><br><i>Untuk melanjutkan, atur saldo awal kamu sekarang.</i><br><br>`;
            responseText += `<button class="btn-set-saldo-modal px-6 py-2 bg-[#0028B3] text-white rounded-full text-sm font-medium shadow-md">Atur Saldo Awal</button>`;
        }
    } 
    else if (currentBalance !== null && currentBalance < 0) {
        if (d.type === 'pengeluaran') {
            return `⛔ <b>Transaksi sementara dibatasi.</b><br><br>
            Saldo kamu saat ini masih negatif: <b>Rp ${new Intl.NumberFormat('id-ID').format(currentBalance)}</b>.<br><br>
            <i>Yuk, atur saldo awal kamu dulu agar bisa kembali mencatat transaksi!</i><br><br>
            <button class="btn-set-saldo-modal px-6 py-2 bg-[#0028B3] text-white rounded-full text-sm font-medium shadow-md">Atur Saldo Awal</button>
            <br><br>
            <span style="font-size: 12px; color: #6a7fa8;">💡 Atau ketik manual: <i>"saldo awal [nominal]"</i></span>`;
        }
    } 
    else {
        responseText += `<br><br>💼 Sisa Saldo: <b>Rp ${new Intl.NumberFormat('id-ID').format(currentBalance)}</b>`;
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

function saveChatMessage(text, sender, isImage = false, imageUrl = '', transactionId = null, uniqueId = null) {
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
        transactionId: transactionId
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
                    document.getElementById('saldoPopup').classList.remove('hidden');
                    document.getElementById('saldoPopup').classList.add('flex');
                    setTimeout(() => {
                        document.getElementById('saldoPopupInput').focus();
                    }, 100);
                };
            }
        }
    });
    chatArea.scrollTop = chatArea.scrollHeight;
}

// --- 7. Fungsi Kirim Pesan Utama ---
// --- 7. Fungsi Kirim Pesan Utama ---
// --- 7. Fungsi Kirim Pesan Utama ---
function sendMessage() {
    const text = userInput.value.trim();
    if (text === '') return;

    const lowerText = text.toLowerCase();

    const isBlocked = (currentBalance !== null && currentBalance < 0);
    const isExpense = lowerText.includes('beli') || lowerText.includes('bayar') || lowerText.includes('makan') || lowerText.includes('transport') || lowerText.includes('tagihan') || lowerText.includes('bensin') || lowerText.includes('-');
    
    if (isBlocked && isExpense && !lowerText.includes('saldo awal') && !lowerText.includes('set saldo')) {
        alert(`⛔ Transaksi ditolak!\nSaldo kamu masih negatif: Rp ${new Intl.NumberFormat('id-ID').format(currentBalance)}\n\nSilakan atur saldo awal terlebih dahulu.`);
        return;
    }

    if (lowerText.includes('saldo awal') || lowerText.includes('set saldo')) {
        const isFirstTimeSetup = (currentBalance === null || currentBalance < 0);
        
        if (!isFirstTimeSetup) {
            addMessage(text, 'user', false, '', null);
            saveChatMessage(text, 'user', false, '');
            userInput.value = '';
            setTimeout(() => {
                const botReply = `❌ Saldo awal sudah pernah diset dan saldo kamu sudah positif. Gunakan "Terima gaji".`;
                const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                addMessage(botReply, 'bot', false, '', null, pairId);
                saveChatMessage(botReply, 'bot', false, '', null, pairId);
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
                saveChatMessage(botReply, 'bot', false, '', null, pairId);
            }, 1000);
            return;
        }

        if (currentBalance === null) {
            updateBalance(amount);
        } else {
            updateBalance(currentBalance + amount);
        }

        const transactionData = { type: 'pemasukan', amount: amount, category: 'Saldo Awal', wallet: 'Kas', rawText: text, date: Date.now() };
        const newId = saveTransactionToHistory(transactionData);

        // --- SATU ID UNTUK USER & BOT ---
        const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        addMessage(text, 'user', false, '', { ...transactionData, id: newId }, pairId);
        saveChatMessage(text, 'user', false, '', newId, pairId);
        userInput.value = '';

        setTimeout(() => {
            const botReply = `✅ Saldo awal sebesar <b>Rp ${new Intl.NumberFormat('id-ID').format(amount)}</b> berhasil dicatat.`;
            addMessage(botReply, 'bot', false, '', null, pairId);
            saveChatMessage(botReply, 'bot', false, '', null, pairId);
        }, 1000);
        return;
    }

    // --- TRANSAKSI BIASA ---
    const result = parseTransaction(text);
    let transactionData = null;
    let newId = null;

    if (result.success) {
        transactionData = result.data;
        newId = saveTransactionToHistory(transactionData);

        // --- INI LOGIKA KALKULASI SALDO ANDA (TIDAK DIUBAH) ---
        if (transactionData.type === 'pemasukan') {
            currentBalance = (currentBalance || 0) + transactionData.amount;
        } else if (transactionData.type === 'pengeluaran') {
            currentBalance = (currentBalance || 0) - transactionData.amount;
        }
        localStorage.setItem('mysaku_balance', currentBalance.toString());
    }
    
    const pairId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    addMessage(text, 'user', false, '', { ...transactionData, id: newId }, pairId);
    saveChatMessage(text, 'user', false, '', newId, pairId);
    
    userInput.value = '';
    setTimeout(() => {
        const botReply = getBotResponse(text);
        addMessage(botReply, 'bot', false, '', null, pairId);
        saveChatMessage(botReply, 'bot', false, '', null, pairId);
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

// Hanya tampilkan sambutan jika belum ada pesan sama sekali
if (chatArea.children.length === 0) {
    addMessage("Halo! Aku Mysaku, asisten keuanganmu. 👋<br><br>Ketik <b>'bantuan'</b> untuk melihat daftar perintah.", 'bot');
}

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

// ==========================================
// --- LOGIKA POPUP SALDO AWAL ---------------
// ==========================================

const popup = document.getElementById('saldoPopup');
const popupInput = document.getElementById('saldoPopupInput');
const popupOk = document.getElementById('saldoPopupOk');
const popupCancel = document.getElementById('saldoPopupCancel');

popupOk.onclick = () => {
    const val = popupInput.value.trim();
    if (val === '') {
        alert('Silakan masukkan nominal saldo awal.');
        return;
    }

    popup.classList.add('hidden');
    popup.classList.remove('flex');
    
    userInput.value = `saldo awal ${val}`;
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