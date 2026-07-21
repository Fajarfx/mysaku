// ==========================================
// --- DASHBOARD LOGIC REAL-TIME (FINAL) ---
// ==========================================

// --- Daftar Dompet (DINAMIS) ---
// Dompet bisa ditambah/dihapus sendiri oleh user (lihat halaman Laporan -> daftar dompet).
// Daftar bawaan dipakai hanya sebagai fallback saat 'mysaku_wallets' belum pernah diisi.
const DEFAULT_WALLETS = ['Cash', 'BCA', 'DANA', 'GoPay', 'OVO', 'Mandiri'];

function getWallets() {
    const raw = localStorage.getItem('mysaku_wallets');
    if (!raw) {
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

// --- Fungsi Baca Data ---
function getActiveWallet() {
    const active = localStorage.getItem('mysaku_active_wallet') || 'Cash';
    const wallets = getWallets();
    if (wallets.includes(active)) return active;
    const fallback = wallets[0] || 'Cash';
    localStorage.setItem('mysaku_active_wallet', fallback);
    return fallback;
}

function getWalletBalance(walletName) {
    const val = localStorage.getItem(getWalletKey(walletName));
    return val ? parseFloat(val) : 0;
}

function setWalletBalance(walletName, newBalance) {
    localStorage.setItem(getWalletKey(walletName), newBalance.toString());
}

// Nama dompet yang PERNAH dipakai di riwayat transaksi/utang tapi sudah tidak ada lagi
// di daftar dompet aktif (karena dihapus user). Dipakai untuk menandai "(dompet dihapus)".
function isDeletedWallet(walletName) {
    if (!walletName) return false;
    return !getWallets().includes(walletName);
}

function walletDisplayName(walletName) {
    const name = walletName || 'Cash';
    return isDeletedWallet(name) ? `${name} (dompet dihapus)` : name;
}

// --- Tambah / Hapus Dompet ---
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
    localStorage.removeItem(getWalletKey(name));

    const activeWallet = localStorage.getItem('mysaku_active_wallet');
    if (activeWallet === name) {
        localStorage.setItem('mysaku_active_wallet', wallets[0]);
    }

    return { success: true };
}

function getTotalAllWallets() {
    let total = 0;
    getWallets().forEach(w => {
        total += getWalletBalance(w);
    });
    return total;
}

function getHistory() {
    const hist = localStorage.getItem('mysaku_history');
    return hist ? JSON.parse(hist) : [];
}

function formatRupiah(amount) {
    return 'Rp' + amount.toLocaleString('id-ID');
}

function formatTanggalLabel(dateString) {
    const date = new Date(dateString);
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    return days[date.getDay()];
}

function formatDateDisplay(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now - date) / (1000 * 60 * 60 * 24);

    let prefix = "";
    if (diff < 1) prefix = "Hari ini, ";
    else if (diff < 2) prefix = "Kemarin, ";
    else {
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        prefix = days[date.getDay()] + ", ";
    }
    return prefix + date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatFullDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatFullTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
}

// Beberapa transaksi mungkin punya foto/dokumentasi terlampir (field imageUrl/photo/foto - jaga-jaga nama field beda)
function getTransactionImage(item) {
    return item.imageUrl || item.photo || item.foto || item.image || null;
}

// --- Render 1 baris transaksi (dipakai di preview laporan.html & daftar penuh riwayat.html) ---
function renderTransactionRow(item) {
    const isIncome = item.type === 'pemasukan';
    const bgClass = isIncome ? 'bg-[#f0f5fe] border-[#b3c8f0]' : 'bg-[#fff5f5] border-[#ffcdcd]';
    const iconBg = isIncome ? 'bg-[#e6edfb]' : 'bg-[#ffe0e0]';
    const textColor = isIncome ? 'text-[#0028B3]' : 'text-[#FF4444]';
    const icon = isIncome ? 'arrow_downward' : 'arrow_upward'; // bawah = pemasukan, atas = pengeluaran
    const nominalStr = isIncome ? `+${formatRupiah(item.amount)}` : `-${formatRupiah(item.amount)}`;
    const nominalColor = isIncome ? 'text-[#0028B3]' : 'text-[#FF4444]';
    const category = item.category || 'Lainnya';
    const hasPhoto = !!getTransactionImage(item);

    return `
        <div class="flex items-center gap-3 p-3 rounded-2xl ${bgClass} border transaction-enter cursor-pointer active:scale-[0.98] transition" data-tx-id="${item.id}">
            <div class="w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center ${textColor} flex-shrink-0">
                <span class="material-symbols-outlined text-xl">${icon}</span>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-[#1a2236] truncate">${item.rawText || item.category}</p>
                <p class="text-xs text-chat-secondary">${formatDateDisplay(item.date)} • ${category}${hasPhoto ? ' • 📷' : ''}</p>
            </div>
            <div class="text-right flex-shrink-0">
                <p class="text-sm font-semibold ${nominalColor}">${nominalStr}</p>
                <p class="text-xs text-chat-secondary">${walletDisplayName(item.wallet)}</p>
            </div>
        </div>
    `;
}

// Pasang event delegation supaya klik baris transaksi (di container manapun) membuka detail
function attachTransactionClickHandler(container) {
    if (!container) return;
    container.addEventListener('click', (e) => {
        const row = e.target.closest('[data-tx-id]');
        if (!row) return;
        const id = row.getAttribute('data-tx-id');
        openTransactionDetail(id);
    });
}

// --- Modal Detail Transaksi (dipakai di laporan.html & riwayat.html) ---
function openTransactionDetail(id) {
    const modal = document.getElementById('txDetailModal');
    const sheet = document.getElementById('txDetailSheet');
    const body = document.getElementById('txDetailBody');
    if (!modal || !body) return;

    const history = getHistory();
    // id transaksi disimpan sebagai number (Date.now() + random), tapi dataset selalu string
    const item = history.find(h => String(h.id) === String(id));
    if (!item) return;

    const isIncome = item.type === 'pemasukan';
    const typeLabel = isIncome ? 'Pemasukan' : 'Pengeluaran';
    const iconBg = isIncome ? 'bg-[#e6edfb]' : 'bg-[#ffe0e0]';
    const textColor = isIncome ? 'text-[#0028B3]' : 'text-[#FF4444]';
    const icon = isIncome ? 'arrow_downward' : 'arrow_upward'; // bawah = pemasukan, atas = pengeluaran
    const nominalStr = isIncome ? `+${formatRupiah(item.amount)}` : `-${formatRupiah(item.amount)}`;
    const photo = getTransactionImage(item);

    body.innerHTML = `
        <div class="text-center">
            <div class="mx-auto w-14 h-14 rounded-full ${iconBg} flex items-center justify-center ${textColor} mb-3">
                <span class="material-symbols-outlined text-3xl">${icon}</span>
            </div>
            <p class="text-2xl font-bold ${textColor}">${nominalStr}</p>
            <p class="text-sm text-chat-secondary mt-1">${typeLabel}</p>
        </div>

        <div class="mt-5 space-y-3 text-sm">
            <div class="flex justify-between">
                <span class="text-chat-secondary">Kategori</span>
                <span class="font-medium text-[#1a2236]">${item.category || 'Lainnya'}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-chat-secondary">Dompet</span>
                <span class="font-medium text-[#1a2236]">${walletDisplayName(item.wallet)}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-chat-secondary">Tanggal</span>
                <span class="font-medium text-[#1a2236]">${formatFullDate(item.date)}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-chat-secondary">Waktu</span>
                <span class="font-medium text-[#1a2236]">${formatFullTime(item.date)}</span>
            </div>
            ${item.rawText ? `
            <div class="pt-3 border-t border-[#eef3fe]">
                <p class="text-chat-secondary mb-1">Catatan</p>
                <p class="font-medium text-[#1a2236]">${item.rawText}</p>
            </div>` : ''}
        </div>

        ${photo ? `
        <div class="mt-4">
            <p class="text-xs text-chat-secondary mb-2">📷 Foto/Dokumentasi</p>
            <img src="${photo}" alt="Dokumentasi transaksi" class="w-full max-h-72 object-contain rounded-xl border border-[#d6e0f5] bg-[#f8fafd]" />
        </div>` : ''}
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        sheet.classList.remove('translate-y-full');
        sheet.classList.add('translate-y-0');
    }, 10);
}

function closeTransactionDetail() {
    const modal = document.getElementById('txDetailModal');
    const sheet = document.getElementById('txDetailSheet');
    if (!modal || !sheet) return;
    sheet.classList.remove('translate-y-0');
    sheet.classList.add('translate-y-full');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

function setupTransactionDetailModal() {
    const modal = document.getElementById('txDetailModal');
    const closeBtn = document.getElementById('closeTxDetail');
    if (!modal) return;

    if (closeBtn) closeBtn.onclick = closeTransactionDetail;
    modal.onclick = (e) => {
        if (e.target === modal) closeTransactionDetail();
    };
}

// ==========================================
// --- LOGIKA HALAMAN LAPORAN (`laporan.html`) ---
// ==========================================

let laporanPreviewState = { mode: 'semua', category: null };

function setupLaporanPreviewFilters() {
    const btnSemua = document.getElementById('filterPreviewSemua');
    const btnDompet = document.getElementById('filterPreviewDompet');
    const btnKategori = document.getElementById('filterPreviewKategori');
    const chipContainer = document.getElementById('previewKategoriChips');
    if (!btnSemua || !btnDompet || !btnKategori) return;

    const buttons = [btnSemua, btnDompet, btnKategori];
    function setActiveButton(activeBtn) {
        buttons.forEach(b => {
            b.classList.remove('bg-[#0028B3]', 'text-white');
            b.classList.add('bg-[#eef3fe]', 'text-[#5a6f9a]');
        });
        activeBtn.classList.remove('bg-[#eef3fe]', 'text-[#5a6f9a]');
        activeBtn.classList.add('bg-[#0028B3]', 'text-white');
    }

    btnSemua.onclick = () => {
        laporanPreviewState = { mode: 'semua', category: null };
        setActiveButton(btnSemua);
        if (chipContainer) chipContainer.classList.add('hidden');
        renderLaporan();
    };

    btnDompet.onclick = () => {
        laporanPreviewState = { mode: 'dompet', category: null };
        setActiveButton(btnDompet);
        if (chipContainer) chipContainer.classList.add('hidden');
        renderLaporan();
    };

    btnKategori.onclick = () => {
        setActiveButton(btnKategori);
        if (!chipContainer) return;
        // Isi chip kategori dari history yang ada
        const history = getHistory();
        const categories = [...new Set(history.map(item => item.category || 'Lainnya'))];
        if (categories.length === 0) {
            chipContainer.innerHTML = `<span class="text-xs text-chat-secondary py-1">Belum ada kategori.</span>`;
        } else {
            chipContainer.innerHTML = categories.map(cat => `
                <button class="preview-cat-chip px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${laporanPreviewState.category === cat ? 'bg-[#0028B3] text-white' : 'bg-[#eef3fe] text-[#5a6f9a]'}" data-cat="${cat}">${cat}</button>
            `).join('');
        }
        chipContainer.classList.remove('hidden');
    };

    if (chipContainer) {
        chipContainer.addEventListener('click', (e) => {
            const chip = e.target.closest('.preview-cat-chip');
            if (!chip) return;
            laporanPreviewState = { mode: 'kategori', category: chip.getAttribute('data-cat') };
            renderLaporan();
            // Re-render chip highlight tanpa menutup container
            btnKategori.click();
        });
    }
}

// Menghitung & menampilkan badge tren arus kas (net = pemasukan - pengeluaran) dompet aktif,
// membandingkan bulan berjalan vs bulan sebelumnya.
// ==========================================
// --- KESEHATAN FINANSIAL (dihitung dari data transaksi user, TANPA angka hardcode) ---
// ==========================================
// Skor 0-100 dibangun dari 3 komponen yang semuanya diturunkan dari mysaku_history +
// saldo dompet + total utang -- bukan angka tetap:
//   1. Rasio Tabungan (bobot 50): (pemasukan - pengeluaran) / pemasukan pada 30 hari terakhir.
//      Menabung >=20% dari pemasukan dianggap skor penuh di komponen ini.
//   2. Rasio Utang terhadap Aset (bobot 30): total utang dibanding total saldo semua dompet.
//      Utang 0 = skor penuh; utang >= total saldo (atau saldo <=0 dengan ada utang) = skor 0.
//   3. Konsistensi Pencatatan (bobot 20): berapa hari dalam 30 hari terakhir user benar-benar
//      mencatat transaksi. Dianggap "aktif mencatat" kalau tercatat transaksi di >=15 dari 30 hari.
function calculateFinancialHealth(history, totalAssets, totalDebt) {
    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    const recent = history.filter(item => (now - new Date(item.date).getTime()) <= THIRTY_DAYS);

    if (history.length === 0) {
        return { score: null, label: 'Belum Ada Data', detail: 'Belum cukup data transaksi untuk dihitung.' };
    }

    // --- Komponen 1: Rasio Tabungan (30 hari terakhir) ---
    let income30 = 0, expense30 = 0;
    recent.forEach(item => {
        if (item.type === 'pemasukan') income30 += item.amount;
        else expense30 += item.amount;
    });

    let savingsScore;
    let savingsRatioPct = null;
    if (income30 > 0) {
        const ratio = (income30 - expense30) / income30; // bisa negatif kalau pengeluaran > pemasukan
        savingsRatioPct = Math.round(ratio * 100);
        // >=20% nabung = skor penuh, <=-20% (defisit parah) = skor 0, linear di antaranya
        const clamped = Math.max(-0.2, Math.min(0.2, ratio));
        savingsScore = ((clamped + 0.2) / 0.4) * 50;
    } else {
        // Tidak ada pemasukan tercatat 30 hari terakhir -> tidak bisa dinilai positif
        savingsScore = expense30 > 0 ? 0 : 25;
    }

    // --- Komponen 2: Rasio Utang terhadap Aset ---
    let debtScore;
    if (totalDebt <= 0) {
        debtScore = 30;
    } else if (totalAssets <= 0) {
        debtScore = 0;
    } else {
        const debtRatio = totalDebt / totalAssets;
        const clamped = Math.max(0, Math.min(1, debtRatio));
        debtScore = (1 - clamped) * 30;
    }

    // --- Komponen 3: Konsistensi Pencatatan (30 hari terakhir) ---
    const daysWithActivity = new Set(recent.map(item => new Date(item.date).toISOString().slice(0, 10))).size;
    const consistencyScore = Math.min(20, (daysWithActivity / 15) * 20);

    const totalScore = Math.round(savingsScore + debtScore + consistencyScore);
    const finalScore = Math.max(0, Math.min(100, totalScore));

    let label, dotColor;
    if (finalScore >= 75) { label = 'Sehat'; dotColor = '#22c55e'; }
    else if (finalScore >= 50) { label = 'Cukup Sehat'; dotColor = '#eab308'; }
    else if (finalScore >= 25) { label = 'Perlu Perhatian'; dotColor = '#f97316'; }
    else { label = 'Waspada'; dotColor = '#dc2626'; }

    const detailParts = [];
    if (savingsRatioPct !== null) {
        detailParts.push(savingsRatioPct >= 0
            ? `Menabung ${savingsRatioPct}% dari pemasukan bulan ini`
            : `Pengeluaran melebihi pemasukan ${Math.abs(savingsRatioPct)}% bulan ini`);
    }
    if (totalDebt > 0) {
        detailParts.push(`Utang ${formatRupiah(totalDebt)} dari total aset ${formatRupiah(totalAssets)}`);
    }
    detailParts.push(`Mencatat transaksi ${daysWithActivity} dari 30 hari terakhir`);

    return { score: finalScore, label, dotColor, detail: detailParts.join(' • ') };
}

function renderFinancialHealth(history, totalAssets, totalDebt) {
    const scoreEl = document.getElementById('financialHealthScore');
    const labelEl = document.getElementById('financialHealthLabel');
    const dotEl = document.getElementById('financialHealthDot');
    const ringEl = document.getElementById('financialHealthRing');
    const detailEl = document.getElementById('financialHealthDetail');
    if (!scoreEl || !labelEl) return;

    const result = calculateFinancialHealth(history, totalAssets, totalDebt);

    if (result.score === null) {
        scoreEl.textContent = '-';
        labelEl.textContent = result.label;
        if (dotEl) dotEl.style.background = '#94a3b8';
        if (ringEl) ringEl.style.strokeDashoffset = '175.9';
        if (detailEl) detailEl.textContent = result.detail;
        return;
    }

    scoreEl.textContent = result.score;
    labelEl.textContent = result.label;
    if (dotEl) dotEl.style.background = result.dotColor;
    if (detailEl) detailEl.textContent = result.detail;

    if (ringEl) {
        const circumference = 175.9; // 2 * PI * r(28), sama seperti nilai stroke-dasharray di HTML
        const offset = circumference - (result.score / 100) * circumference;
        ringEl.style.stroke = result.dotColor;
        ringEl.style.strokeDashoffset = offset.toString();
    }
}

function updateSaldoTrendBadge(history, activeWallet) {
    const badge = document.getElementById('saldoTrendBadge');
    const iconEl = document.getElementById('saldoTrendIcon');
    const textEl = document.getElementById('saldoTrendText');
    if (!badge || !iconEl || !textEl) return;

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonthDate = new Date(thisYear, thisMonth - 1, 1);
    const lastMonth = lastMonthDate.getMonth();
    const lastMonthYear = lastMonthDate.getFullYear();

    let netThisMonth = 0;
    let netLastMonth = 0;

    history.forEach(item => {
        if ((item.wallet || 'Cash') !== activeWallet) return;
        const d = new Date(item.date);
        const signedAmount = item.type === 'pemasukan' ? item.amount : -item.amount;

        if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
            netThisMonth += signedAmount;
        } else if (d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear) {
            netLastMonth += signedAmount;
        }
    });

    // Belum ada data pembanding bulan lalu -> tampilkan info netral, bukan persentase ngawur
    if (netLastMonth === 0) {
        iconEl.textContent = 'calendar_month';
        textEl.textContent = 'Bulan ini';
        badge.classList.remove('text-red-600', 'bg-red-50');
        return;
    }

    const change = ((netThisMonth - netLastMonth) / Math.abs(netLastMonth)) * 100;
    const rounded = Math.round(change);
    const isPositive = change >= 0;

    iconEl.textContent = isPositive ? 'trending_up' : 'trending_down';
    textEl.textContent = `${isPositive ? '+' : ''}${rounded}% bulan ini`;

    if (isPositive) {
        badge.classList.remove('text-red-600', 'bg-red-50');
    } else {
        badge.classList.add('text-red-600', 'bg-red-50');
    }
}

function renderLaporan() {
    const activeWallet = getActiveWallet();
    const saldo = getWalletBalance(activeWallet);
    const totalDompet = getTotalAllWallets();
    const history = getHistory();

    const debt = localStorage.getItem('mysaku_debt') ? parseFloat(localStorage.getItem('mysaku_debt')) : 0;

    // 1. Update Label & Saldo Dompet Aktif
    const labelEl = document.getElementById('activeWalletLabel');
    if (labelEl) labelEl.textContent = 'Dompet ' + activeWallet;

    const saldoEl = document.querySelector('.saldo-utama');
    if (saldoEl) saldoEl.textContent = formatRupiah(saldo);

    // 2. Update Total Dompet & Utang
    const dompetEl = document.getElementById('totalDompet');
    if (dompetEl) dompetEl.textContent = formatRupiah(totalDompet);

    const utangEl = document.getElementById('totalUtang');
    if (utangEl) utangEl.textContent = formatRupiah(debt);

    // 2c. Badge peringatan jatuh tempo utang (kuning) -- muncul kalau ada utang jatuh tempo <=3 hari lagi / sudah lewat
    updateUtangDueWarningBadge();

    // 2b. Hitung tren arus kas dompet aktif: bulan ini vs bulan lalu
    updateSaldoTrendBadge(history, activeWallet);

    // 2d. Kesehatan Finansial -- dihitung murni dari data transaksi user (lihat calculateFinancialHealth)
    renderFinancialHealth(history, totalDompet, debt);

 // 3. Render Bottom Sheet Daftar Dompet (bisa tambah & hapus dompet sendiri)
const walletList = document.getElementById('walletListContainer');
const modalBtn = document.getElementById('walletSelectorBtn');
const modal = document.getElementById('walletModal');
const modalContent = document.getElementById('walletModalContent');
const closeBtn = document.getElementById('closeWalletModal');
const deleteModeBtn = document.getElementById('walletDeleteModeBtn');
const addWalletBtn = document.getElementById('walletAddBtn');
const walletModalTitle = document.getElementById('walletModalTitle');
const walletDeleteConfirmBar = document.getElementById('walletDeleteConfirmBar');
const walletDeleteConfirmBtn = document.getElementById('walletDeleteConfirmBtn');
const walletDeleteCountLabel = document.getElementById('walletDeleteCountLabel');

let walletModalDeleteMode = false;
let walletsSelectedForDelete = new Set();

function closeWalletModalAnim() {
    modalContent.classList.remove('translate-y-0');
    modalContent.classList.add('translate-y-full');
    setTimeout(() => {
        modal.classList.add('hidden');
        walletModalDeleteMode = false;
        walletsSelectedForDelete = new Set();
    }, 300);
}

function renderWalletModalList() {
    const activeWallet = getActiveWallet();
    const wallets = getWallets();
    walletList.innerHTML = '';

    if (walletModalTitle) {
        walletModalTitle.textContent = walletModalDeleteMode ? 'Pilih Dompet untuk Dihapus' : 'Pilih Dompet Aktif';
    }
    if (deleteModeBtn) {
        deleteModeBtn.classList.toggle('hidden', walletModalDeleteMode);
    }
    if (addWalletBtn) {
        addWalletBtn.classList.toggle('hidden', walletModalDeleteMode);
    }
    if (walletDeleteConfirmBar) {
        walletDeleteConfirmBar.classList.toggle('hidden', !walletModalDeleteMode);
    }

    wallets.forEach(w => {
        const balance = getWalletBalance(w);

        if (walletModalDeleteMode) {
            const row = document.createElement('div');
            row.className = 'w-full px-4 py-3 rounded-xl flex justify-between items-center border border-[#d6e0f5] bg-white';
            const checked = walletsSelectedForDelete.has(w);
            row.innerHTML = `
                <label class="flex items-center gap-3 flex-1 cursor-pointer">
                    <span class="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${checked ? 'bg-[#dc2626] border-[#dc2626]' : 'border-[#d6e0f5]'}">
                        ${checked ? '<span class="material-symbols-outlined text-white text-[14px]">check</span>' : ''}
                    </span>
                    <span class="text-[#1a2236]">${w}</span>
                </label>
                <span class="text-chat-secondary text-sm">${formatRupiah(balance)}</span>
            `;
            row.querySelector('label').onclick = () => {
                if (walletsSelectedForDelete.has(w)) walletsSelectedForDelete.delete(w);
                else walletsSelectedForDelete.add(w);
                renderWalletModalList();
            };
            walletList.appendChild(row);
        } else {
            const item = document.createElement('button');
            item.className = `w-full px-4 py-3 rounded-xl text-left flex justify-between items-center transition hover:bg-[#f0f4fe] ${w === activeWallet ? 'bg-[#e6edfb] text-[#0028B3] font-semibold border border-[#b3c8f0]' : 'bg-white text-[#1a2236] border border-transparent'}`;
            item.innerHTML = `
                <span class="flex items-center gap-2">
                    ${w === activeWallet ? '<span class="material-symbols-outlined text-[#0028B3] text-[18px]">check_circle</span>' : ''}
                    ${w}
                </span>
                <span class="text-chat-secondary">${formatRupiah(balance)}</span>
            `;
            item.onclick = () => {
                localStorage.setItem('mysaku_active_wallet', w);
                closeWalletModalAnim();
                renderLaporan();
            };
            walletList.appendChild(item);
        }
    });

    if (walletModalDeleteMode && walletDeleteCountLabel) {
        walletDeleteCountLabel.textContent = walletsSelectedForDelete.size > 0
            ? `Hapus ${walletsSelectedForDelete.size} dompet terpilih`
            : 'Pilih dompet yang ingin dihapus';
    }
}

if (modalBtn && modal) {
    // Buka modal
    modalBtn.onclick = () => {
        walletModalDeleteMode = false;
        walletsSelectedForDelete = new Set();
        renderWalletModalList();

        modal.classList.remove('hidden');
        setTimeout(() => {
            modalContent.classList.remove('translate-y-full');
            modalContent.classList.add('translate-y-0');
        }, 10);
    };

    // Masuk mode hapus (tombol tempat sampah di kanan atas)
    if (deleteModeBtn) {
        deleteModeBtn.onclick = () => {
            walletModalDeleteMode = true;
            walletsSelectedForDelete = new Set();
            renderWalletModalList();
        };
    }

    // Tambah dompet baru
    if (addWalletBtn) {
        addWalletBtn.onclick = () => {
            const name = prompt('Nama dompet baru (contoh: Jenius, SeaBank, dll):');
            if (name === null) return;
            const result = addWallet(name);
            if (!result.success) {
                alert('❌ ' + result.message);
                return;
            }
            renderWalletModalList();
        };
    }

    // Konfirmasi hapus dompet terpilih -- INI PENTING karena menghapus dompet tidak bisa
    // dibatalkan begitu saja, jadi wajib ada validasi/konfirmasi eksplisit dari user dulu.
    if (walletDeleteConfirmBtn) {
        walletDeleteConfirmBtn.onclick = () => {
            if (walletsSelectedForDelete.size === 0) {
                alert('Pilih dulu dompet yang ingin dihapus.');
                return;
            }

            const namesList = Array.from(walletsSelectedForDelete).join(', ');
            const anyHasBalance = Array.from(walletsSelectedForDelete).some(w => getWalletBalance(w) !== 0);
            const warningExtra = anyHasBalance
                ? '\n\n⚠️ Sebagian dompet ini masih memiliki saldo. Riwayat transaksinya akan TETAP disimpan dan ditandai "(dompet dihapus)", tapi dompetnya sendiri tidak bisa dipakai lagi.'
                : '';
            const confirmed = confirm(`Yakin ingin menghapus dompet: ${namesList}?${warningExtra}\n\nTindakan ini tidak bisa dibatalkan.`);
            if (!confirmed) return;

            let anyFailed = false;
            walletsSelectedForDelete.forEach(w => {
                const result = deleteWallet(w);
                if (!result.success) {
                    anyFailed = true;
                    alert('❌ ' + result.message + ' (' + w + ')');
                }
            });

            walletModalDeleteMode = false;
            walletsSelectedForDelete = new Set();
            renderWalletModalList();
            renderLaporan();
        };
    }

    // Tutup modal
    closeBtn.onclick = closeWalletModalAnim;

    // Klik di luar area modal
    modal.onclick = (e) => {
        if (e.target === modal) closeWalletModalAnim();
    };
}

    // 4. Preview 3 Transaksi Terbaru (dengan filter Semua / Dompet / Kategori)
    const previewContainer = document.getElementById('previewRiwayatLaporan');
    if (previewContainer) {
        let filteredHistory = history;

        if (laporanPreviewState.mode === 'dompet') {
            filteredHistory = history.filter(item => (item.wallet || 'Cash') === activeWallet);
        } else if (laporanPreviewState.mode === 'kategori' && laporanPreviewState.category) {
            filteredHistory = history.filter(item => (item.category || 'Lainnya') === laporanPreviewState.category);
        }

        const latest3 = filteredHistory.slice(0, 3);
        if (latest3.length === 0) {
            previewContainer.innerHTML = `<p class="text-center text-chat-secondary text-sm py-2">Belum ada transaksi.</p>`;
        } else {
            previewContainer.innerHTML = latest3.map(renderTransactionRow).join('');
        }
    }

    // 5. Grafik Statistik Bulanan (7 Hari)
    const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recent = history.filter(item => new Date(item.date) >= sevenDaysAgo);

    let dailyData = {};
    days.forEach(day => dailyData[day] = { income: 0, expense: 0 });

    recent.forEach(item => {
        const dayLabel = formatTanggalLabel(item.date);
        if (dailyData[dayLabel]) {
            if (item.type === 'pemasukan') dailyData[dayLabel].income += item.amount;
            else dailyData[dayLabel].expense += item.amount;
        }
    });

    let maxTotal = 0;
    days.forEach(day => {
        const total = dailyData[day].income + dailyData[day].expense;
        if (total > maxTotal) maxTotal = total;
    });
    if (maxTotal === 0) maxTotal = 1;

    days.forEach(day => {
        const data = dailyData[day];
        const incomePct = (data.income / maxTotal) * 100;
        const expensePct = (data.expense / maxTotal) * 100;

        const barIncome = document.getElementById('bar-income-' + day);
        if (barIncome) barIncome.style.width = incomePct + '%';

        const labelIncome = document.getElementById('label-income-' + day);
        if (labelIncome) labelIncome.textContent = data.income > 0 ? `+${formatRupiah(data.income)}` : 'Rp0';

        const barExpense = document.getElementById('bar-expense-' + day);
        if (barExpense) barExpense.style.width = expensePct + '%';

        const labelExpense = document.getElementById('label-expense-' + day);
        if (labelExpense) labelExpense.textContent = data.expense > 0 ? `-${formatRupiah(data.expense)}` : 'Rp0';
    });

    // 6. Alokasi Kategori (Pie Chart Dinamis)
    let catTotals = {};
    let totalExpense = 0;

    history.forEach(item => {
        if (item.type === 'pengeluaran') {
            const cat = item.category || 'Lainnya';
            if (!catTotals[cat]) catTotals[cat] = 0;
            catTotals[cat] += item.amount;
            totalExpense += item.amount;
        }
    });

    const pieChart = document.getElementById('pieChart');
    const catList = document.getElementById('kategoriList');

    if (pieChart && catList) {
        catList.innerHTML = '';
        
        if (totalExpense === 0) {
            pieChart.style.background = '#eef3fe';
            catList.innerHTML = `<p class="text-center text-chat-secondary text-sm py-4">Belum ada pengeluaran.</p>`;
        } else {
            const colors = ['#0028B3', '#FF6B35', '#b3c8f0', '#FF4444', '#4CAF50', '#FFC107', '#9C27B0', '#00BCD4'];
            let conicString = '';
            let currentAngle = 0;
            let i = 0;

            for (const [cat, total] of Object.entries(catTotals)) {
                const percent = (total / totalExpense) * 100;
                const color = colors[i % colors.length];
                
                conicString += `${color} ${currentAngle.toFixed(1)}% ${(currentAngle + percent).toFixed(1)}%, `;
                currentAngle += percent;

                catList.innerHTML += `
                    <div class="flex justify-between items-center text-sm py-1">
                        <span class="flex items-center gap-2">
                            <span class="w-3 h-3 rounded-full" style="background: ${color};"></span>
                            ${cat}
                        </span>
                        <span class="font-medium" style="color: ${color};">${percent.toFixed(0)}%</span>
                    </div>
                `;
                i++;
            }

            conicString = conicString.replace(/, $/, '');
            pieChart.style.background = `conic-gradient(${conicString})`;
        }
    }
}

// ==========================================
// --- LOGIKA HALAMAN RIWAYAT (`riwayat.html`) ---
// ==========================================

let riwayatState = { days: 7, filter: 'semua', search: '' };

function applyRiwayatFilters(history) {
    let list = history;

    // 1. Filter rentang tanggal
    if (riwayatState.days !== 'semua') {
        const ms = riwayatState.days * 24 * 60 * 60 * 1000;
        const now = Date.now();
        list = list.filter(item => (now - new Date(item.date).getTime()) <= ms);
    }

    // 2. Filter tipe / kategori
    if (riwayatState.filter === 'pemasukan') {
        list = list.filter(item => item.type === 'pemasukan');
    } else if (riwayatState.filter === 'pengeluaran') {
        list = list.filter(item => item.type === 'pengeluaran');
    } else if (riwayatState.filter !== 'semua') {
        list = list.filter(item => (item.category || 'Lainnya').toLowerCase().includes(riwayatState.filter));
    }

    // 3. Pencarian teks bebas (catatan, kategori, dompet)
    const q = riwayatState.search.trim().toLowerCase();
    if (q !== '') {
        list = list.filter(item =>
            (item.rawText || '').toLowerCase().includes(q) ||
            (item.category || '').toLowerCase().includes(q) ||
            (item.wallet || '').toLowerCase().includes(q)
        );
    }

    return list;
}

function setupRiwayatFilters() {
    // --- Filter Tanggal ---
    const dateButtons = document.querySelectorAll('.date-btn');
    dateButtons.forEach(btn => {
        btn.onclick = () => {
            const val = btn.getAttribute('data-hari');
            riwayatState.days = val === 'semua' ? 'semua' : parseInt(val);

            dateButtons.forEach(b => {
                b.classList.remove('date-btn-active');
                b.classList.add('date-btn-inactive');
            });
            btn.classList.remove('date-btn-inactive');
            btn.classList.add('date-btn-active');

            renderRiwayat();
        };
    });

    // --- Filter Tipe / Kategori ---
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.onclick = () => {
            riwayatState.filter = btn.getAttribute('data-filter');

            filterButtons.forEach(b => {
                b.classList.remove('btn-filter-active', 'bg-[#0028B3]', 'bg-[#FF4444]', 'text-white');
                b.classList.add('btn-filter-inactive');
            });
            btn.classList.remove('btn-filter-inactive');

            const colorType = btn.getAttribute('data-filter-color');
            if (colorType === 'income') {
                btn.classList.add('bg-[#0028B3]', 'text-white');
            } else if (colorType === 'expense') {
                btn.classList.add('bg-[#FF4444]', 'text-white');
            } else {
                btn.classList.add('btn-filter-active');
            }

            renderRiwayat();
        };
    });

    // --- Pencarian ---
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            riwayatState.search = searchInput.value;
            renderRiwayat();
        });
    }

    // --- Klik transaksi untuk lihat detail ---
    attachTransactionClickHandler(document.getElementById('transaksiList'));

    // --- Ekspor ke Excel (.xlsx asli, per bulan) ---
    const exportBtn = document.getElementById('exportExcelBtn');
    if (exportBtn) {
        exportBtn.onclick = openExportMonthModal;
    }

    const closeExportBtn = document.getElementById('closeExportMonthModal');
    const exportModal = document.getElementById('exportMonthModal');
    if (closeExportBtn) closeExportBtn.onclick = closeExportMonthModal;
    if (exportModal) {
        exportModal.onclick = (e) => { if (e.target === exportModal) closeExportMonthModal(); };
    }
}

// ==========================================
// --- EKSPOR RIWAYAT KE EXCEL (.xlsx), PER BULAN ---
// ==========================================
// Diminta: ekspor tidak lagi "semua data sekaligus" -- user pilih SATU bulan lebih dulu,
// baru file .xlsx untuk bulan itu saja yang diunduh. Tampilan file juga dirapikan
// (header berwarna, lebar kolom otomatis, format angka Rupiah, sheet ringkasan terpisah)
// memakai SheetJS (window.XLSX, di-load lewat CDN di riwayat.html).

const MONTH_NAMES_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function getAvailableExportMonths(history) {
    const map = new Map(); // key "YYYY-MM" -> { year, month, count }
    history.forEach(item => {
        const d = new Date(item.date);
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        if (!map.has(key)) {
            map.set(key, { year: d.getFullYear(), month: d.getMonth(), count: 0 });
        }
        map.get(key).count++;
    });
    return Array.from(map.entries())
        .map(([key, val]) => ({ key, ...val }))
        .sort((a, b) => (a.key < b.key ? 1 : -1)); // terbaru dulu
}

function openExportMonthModal() {
    const modal = document.getElementById('exportMonthModal');
    const sheet = document.getElementById('exportMonthSheet');
    const listEl = document.getElementById('exportMonthList');
    if (!modal || !listEl) return;

    const history = getHistory();
    const months = getAvailableExportMonths(history);

    if (months.length === 0) {
        listEl.innerHTML = `<p class="text-center text-chat-secondary text-sm py-6">Belum ada transaksi untuk diekspor.</p>`;
    } else {
        listEl.innerHTML = months.map(m => `
            <button class="export-month-btn w-full px-4 py-3 rounded-xl text-left flex justify-between items-center border border-[#d6e0f5] bg-white hover:bg-[#f0f4fe] transition" data-key="${m.key}">
                <span class="font-medium text-[#1a2236]">${MONTH_NAMES_ID[m.month]} ${m.year}</span>
                <span class="text-xs text-chat-secondary">${m.count} transaksi</span>
            </button>
        `).join('');

        listEl.querySelectorAll('.export-month-btn').forEach(btn => {
            btn.onclick = () => {
                const [year, month] = btn.getAttribute('data-key').split('-').map(Number);
                exportMonthToExcel(year, month - 1, history);
                closeExportMonthModal();
            };
        });
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
        sheet.classList.remove('translate-y-full');
        sheet.classList.add('translate-y-0');
    }, 10);
}

function closeExportMonthModal() {
    const modal = document.getElementById('exportMonthModal');
    const sheet = document.getElementById('exportMonthSheet');
    if (!modal || !sheet) return;
    sheet.classList.remove('translate-y-0');
    sheet.classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function exportMonthToExcel(year, monthIndex, historyOverride) {
    if (typeof XLSX === 'undefined') {
        alert('Gagal memuat modul Excel. Pastikan kamu terhubung ke internet lalu coba lagi.');
        return;
    }

    const history = historyOverride || getHistory();
    const monthItems = history.filter(item => {
        const d = new Date(item.date);
        return d.getFullYear() === year && d.getMonth() === monthIndex;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    if (monthItems.length === 0) {
        alert('Tidak ada transaksi pada bulan yang dipilih.');
        return;
    }

    const monthLabel = `${MONTH_NAMES_ID[monthIndex]} ${year}`;

    // --- Sheet 1: Ringkasan ---
    let totalIncome = 0, totalExpense = 0;
    const byCategory = {};
    monthItems.forEach(item => {
        if (item.type === 'pemasukan') totalIncome += item.amount;
        else totalExpense += item.amount;
        const cat = item.category || 'Lainnya';
        byCategory[cat] = (byCategory[cat] || 0) + (item.type === 'pengeluaran' ? item.amount : 0);
    });

    const summaryRows = [
        ['Laporan Keuangan MySaku'],
        [monthLabel],
        [],
        ['Ringkasan', ''],
        ['Total Pemasukan', totalIncome],
        ['Total Pengeluaran', totalExpense],
        ['Arus Kas Bersih', totalIncome - totalExpense],
        ['Jumlah Transaksi', monthItems.length],
        [],
        ['Pengeluaran per Kategori', ''],
        ...Object.entries(byCategory)
            .filter(([, v]) => v > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, val]) => [cat, val])
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet['!cols'] = [{ wch: 28 }, { wch: 18 }];
    summarySheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
        { s: { r: 9, c: 0 }, e: { r: 9, c: 1 } }
    ];
    styleExportHeaderCell(summarySheet, 'A1', { bold: true, size: 16, color: '0028B3' });
    styleExportHeaderCell(summarySheet, 'A2', { bold: true, size: 11, color: '6a7fa8' });
    styleExportHeaderCell(summarySheet, 'A4', { bold: true, fill: 'E6EDFB', color: '0028B3' });
    styleExportHeaderCell(summarySheet, 'A10', { bold: true, fill: 'E6EDFB', color: '0028B3' });
    ['B5', 'B6', 'B7'].forEach(cell => { if (summarySheet[cell]) summarySheet[cell].z = '#,##0'; });
    for (let r = 11; r <= summaryRows.length; r++) {
        const cell = 'B' + r;
        if (summarySheet[cell]) summarySheet[cell].z = '#,##0';
    }

    // --- Sheet 2: Detail Transaksi ---
    const detailHeader = ['Tanggal', 'Waktu', 'Tipe', 'Kategori', 'Dompet', 'Catatan', 'Nominal (Rp)'];
    const detailRows = monthItems.map(item => {
        const d = new Date(item.date);
        return [
            d.toLocaleDateString('id-ID'),
            d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            item.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
            item.category || 'Lainnya',
            walletDisplayName(item.wallet),
            item.rawText || '',
            item.type === 'pemasukan' ? item.amount : -item.amount
        ];
    });

    const detailSheet = XLSX.utils.aoa_to_sheet([detailHeader, ...detailRows]);
    detailSheet['!cols'] = [
        { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 32 }, { wch: 16 }
    ];
    detailSheet['!autofilter'] = { ref: `A1:G${detailRows.length + 1}` };

    // Header row styling
    detailHeader.forEach((_, i) => {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
        styleExportHeaderCell(detailSheet, cellRef, { bold: true, fill: '0028B3', color: 'FFFFFF' });
    });
    // Format kolom nominal + warna merah untuk pengeluaran (nilai negatif)
    for (let r = 1; r <= detailRows.length; r++) {
        const cellRef = 'G' + (r + 1);
        if (detailSheet[cellRef]) {
            detailSheet[cellRef].z = '#,##0;[Red]-#,##0';
        }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan');
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detail Transaksi');

    const fileMonth = String(monthIndex + 1).padStart(2, '0');
    XLSX.writeFile(workbook, `mysaku-riwayat-${year}-${fileMonth}.xlsx`);
}

// Helper kecil untuk styling sel (pakai xlsx-js-style, bukan xlsx community biasa yang
// tidak mendukung styling sama sekali)
function styleExportHeaderCell(sheet, cellRef, { bold, size, color, fill } = {}) {
    if (!sheet[cellRef]) sheet[cellRef] = { t: 's', v: '' };
    sheet[cellRef].s = {
        font: { bold: !!bold, sz: size || 12, color: { rgb: color || '1A2236' } },
        fill: fill ? { patternType: 'solid', fgColor: { rgb: fill } } : undefined
    };
}

function renderRiwayat() {
    const history = getHistory();
    const filtered = applyRiwayatFilters(history);
    const container = document.getElementById('transaksiList');
    const emptyState = document.getElementById('emptyState');

    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        document.getElementById('totalTransaksi').textContent = '0';
        document.getElementById('totalNominal').textContent = 'Rp0';
        document.getElementById('totalPemasukan').textContent = 'Rp0';
        document.getElementById('totalPengeluaran').textContent = 'Rp0';
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    document.getElementById('totalTransaksi').textContent = filtered.length;

    let total = 0, pemasukan = 0, pengeluaran = 0;
    filtered.forEach(item => {
        total += item.amount;
        if (item.type === 'pemasukan') pemasukan += item.amount;
        else pengeluaran += item.amount;
    });
    document.getElementById('totalNominal').textContent = 'Rp' + total.toLocaleString('id-ID');
    document.getElementById('totalPemasukan').textContent = 'Rp' + pemasukan.toLocaleString('id-ID');
    document.getElementById('totalPengeluaran').textContent = 'Rp' + pengeluaran.toLocaleString('id-ID');

    container.innerHTML = filtered.map(renderTransactionRow).join('');
}

// ==========================================
// --- LOGIKA HALAMAN DAFTAR HUTANG (`utang.html`) ---
// ==========================================

function getDebtHistory() {
    const data = localStorage.getItem('mysaku_debt_history');
    return data ? JSON.parse(data) : [];
}

// Tampilkan badge kuning di kartu "Total Utang" (Laporan) kalau ada utang yang
// jatuh tempo dalam <=3 hari atau sudah lewat jatuh tempo dan belum lunas.
function updateUtangDueWarningBadge() {
    const badge = document.getElementById('utangDueWarningBadge');
    const countEl = document.getElementById('utangDueWarningCount');
    if (!badge || !countEl) return;

    const history = getDebtHistory();

    // Hitung sisa utang per orang supaya yang sudah lunas tidak dianggap masih jatuh tempo
    const outstandingByPerson = {};
    history.forEach(item => {
        if (!item.person) return;
        const key = item.person.toLowerCase();
        if (!(key in outstandingByPerson)) outstandingByPerson[key] = 0;
        if (item.type === 'utang') outstandingByPerson[key] += item.amount;
        else if (item.type === 'bayar') outstandingByPerson[key] -= item.amount;
    });

    const now = new Date();
    const dueSoonMs = 3 * 24 * 60 * 60 * 1000;

    const dueCount = history.filter(item => {
        if (item.type !== 'utang' || !item.dueDate) return false;
        const key = item.person ? item.person.toLowerCase() : null;
        const stillOwed = key ? (outstandingByPerson[key] || 0) > 0 : true;
        if (!stillOwed) return false;
        const due = new Date(item.dueDate);
        return (due.getTime() - now.getTime()) <= dueSoonMs;
    }).length;

    if (dueCount > 0) {
        countEl.textContent = dueCount;
        badge.classList.remove('hidden');
        badge.classList.add('flex');
    } else {
        badge.classList.add('hidden');
        badge.classList.remove('flex');
    }
}

let utangFilterState = 'semua';

function renderDebtRow(item) {
    const isUtangBaru = item.type === 'utang';
    const bgClass = isUtangBaru ? 'bg-[#fff5f5] border-[#ffcdcd]' : 'bg-[#f0f5fe] border-[#b3c8f0]';
    const iconBg = isUtangBaru ? 'bg-[#ffe0e0]' : 'bg-[#e6edfb]';
    const textColor = isUtangBaru ? 'text-[#FF4444]' : 'text-[#0028B3]';
    const icon = isUtangBaru ? 'arrow_upward' : 'arrow_downward';
    const nominalStr = (isUtangBaru ? '+' : '-') + formatRupiah(item.amount);
    const label = isUtangBaru ? 'Utang Baru' : 'Pelunasan';
    const personLabel = item.person ? ` • ${item.person}` : '';
    const dueLabel = item.dueDate ? ` • ⏰ jatuh tempo ${new Date(item.dueDate).toLocaleDateString('id-ID')}` : '';

    return `
        <div class="flex items-center gap-3 p-3 rounded-2xl ${bgClass} border transaction-enter cursor-pointer active:scale-[0.98] transition" data-debt-id="${item.id}">
            <div class="w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center ${textColor} flex-shrink-0">
                <span class="material-symbols-outlined text-xl">${icon}</span>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-[#1a2236] truncate">${item.rawText}</p>
                <p class="text-xs text-chat-secondary truncate">${formatDateDisplay(item.date)}${personLabel}${dueLabel}</p>
            </div>
            <div class="text-right flex-shrink-0">
                <p class="text-sm font-semibold ${textColor}">${nominalStr}</p>
                <p class="text-xs text-chat-secondary">${label}</p>
            </div>
        </div>
    `;
}

function renderUtangPage() {
    const debtHistory = getDebtHistory();
    const debtNow = localStorage.getItem('mysaku_debt') ? parseFloat(localStorage.getItem('mysaku_debt')) : 0;

    let filtered = debtHistory;
    if (utangFilterState !== 'semua') {
        filtered = debtHistory.filter(item => item.type === utangFilterState);
    }

    const sisaEl = document.getElementById('sisaUtangAktif');
    if (sisaEl) sisaEl.textContent = formatRupiah(debtNow);

    let totalDibayar = 0;
    debtHistory.forEach(item => {
        if (item.type === 'bayar') totalDibayar += item.amount;
    });
    const dibayarEl = document.getElementById('totalDibayar');
    if (dibayarEl) dibayarEl.textContent = formatRupiah(totalDibayar);

    const totalEl = document.getElementById('totalEntriUtang');
    if (totalEl) totalEl.textContent = filtered.length;

    const container = document.getElementById('utangList');
    const emptyState = document.getElementById('emptyStateUtang');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }
    if (emptyState) emptyState.classList.add('hidden');
    container.innerHTML = filtered.map(renderDebtRow).join('');
}

function openDebtDetail(id) {
    const modal = document.getElementById('debtDetailModal');
    const sheet = document.getElementById('debtDetailSheet');
    const body = document.getElementById('debtDetailBody');
    if (!modal || !body) return;

    const history = getDebtHistory();
    const item = history.find(h => String(h.id) === String(id));
    if (!item) return;

    const isUtangBaru = item.type === 'utang';
    const textColor = isUtangBaru ? 'text-[#FF4444]' : 'text-[#0028B3]';
    const iconBg = isUtangBaru ? 'bg-[#ffe0e0]' : 'bg-[#e6edfb]';
    const icon = isUtangBaru ? 'arrow_upward' : 'arrow_downward';
    const nominalStr = (isUtangBaru ? '+' : '-') + formatRupiah(item.amount);
    const label = isUtangBaru ? 'Utang Baru' : 'Pelunasan Utang';

    body.innerHTML = `
        <div class="text-center">
            <div class="mx-auto w-14 h-14 rounded-full ${iconBg} flex items-center justify-center ${textColor} mb-3">
                <span class="material-symbols-outlined text-3xl">${icon}</span>
            </div>
            <p class="text-2xl font-bold ${textColor}">${nominalStr}</p>
            <p class="text-sm text-chat-secondary mt-1">${label}</p>
        </div>

        <div class="mt-5 space-y-3 text-sm">
            ${item.person ? `
            <div class="flex justify-between">
                <span class="text-chat-secondary">Nama</span>
                <span class="font-medium text-[#1a2236]">${item.person}</span>
            </div>` : ''}
            <div class="flex justify-between">
                <span class="text-chat-secondary">Dompet</span>
                <span class="font-medium text-[#1a2236]">${walletDisplayName(item.wallet)}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-chat-secondary">Tanggal</span>
                <span class="font-medium text-[#1a2236]">${formatFullDate(item.date)}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-chat-secondary">Waktu</span>
                <span class="font-medium text-[#1a2236]">${formatFullTime(item.date)}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-chat-secondary">Sisa Utang Setelah Ini</span>
                <span class="font-medium text-[#1a2236]">${formatRupiah(item.remainingDebtAfter || 0)}</span>
            </div>
            ${item.dueDate ? `
            <div class="flex justify-between">
                <span class="text-chat-secondary">⏰ Jatuh Tempo</span>
                <span class="font-medium text-[#d32f2f]">${formatFullDate(item.dueDate)}</span>
            </div>` : ''}
            <div class="pt-3 border-t border-[#eef3fe]">
                <p class="text-chat-secondary mb-1">Catatan</p>
                <p class="font-medium text-[#1a2236]">${item.rawText}</p>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        sheet.classList.remove('translate-y-full');
        sheet.classList.add('translate-y-0');
    }, 10);
}

function closeDebtDetail() {
    const modal = document.getElementById('debtDetailModal');
    const sheet = document.getElementById('debtDetailSheet');
    if (!modal || !sheet) return;
    sheet.classList.remove('translate-y-0');
    sheet.classList.add('translate-y-full');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

function setupUtangPage() {
    const buttons = document.querySelectorAll('.utang-filter-btn');
    buttons.forEach(btn => {
        btn.onclick = () => {
            utangFilterState = btn.getAttribute('data-filter');
            buttons.forEach(b => {
                b.classList.remove('btn-filter-active');
                b.classList.add('btn-filter-inactive');
            });
            btn.classList.remove('btn-filter-inactive');
            btn.classList.add('btn-filter-active');
            renderUtangPage();
        };
    });

    const listContainer = document.getElementById('utangList');
    if (listContainer) {
        listContainer.addEventListener('click', (e) => {
            const row = e.target.closest('[data-debt-id]');
            if (!row) return;
            openDebtDetail(row.getAttribute('data-debt-id'));
        });
    }

    const closeBtn = document.getElementById('closeDebtDetail');
    const modal = document.getElementById('debtDetailModal');
    if (closeBtn) closeBtn.onclick = closeDebtDetail;
    if (modal) modal.onclick = (e) => { if (e.target === modal) closeDebtDetail(); };
}

// ==========================================
// --- EKSEKUSI SAAT HALAMAN DIMUAT ---
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('laporan.html')) {
        renderLaporan();
        setupLaporanPreviewFilters();
        attachTransactionClickHandler(document.getElementById('previewRiwayatLaporan'));
    }

    if (window.location.pathname.includes('riwayat.html')) {
        renderRiwayat();
        setupRiwayatFilters();
    }

    if (window.location.pathname.includes('utang.html')) {
        renderUtangPage();
        setupUtangPage();
    }

    setupTransactionDetailModal();
});


