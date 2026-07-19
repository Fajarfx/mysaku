// ==========================================
// --- DASHBOARD LOGIC REAL-TIME (FINAL) ---
// ==========================================

// --- Daftar Dompet yang Tersedia ---
const WALLETS = ['Cash', 'BCA', 'DANA', 'GoPay', 'OVO', 'Mandiri'];

// --- Fungsi Baca Data ---
function getActiveWallet() {
    return localStorage.getItem('mysaku_active_wallet') || 'Cash';
}

function getWalletBalance(walletName) {
    if (walletName === 'Cash') {
        return parseFloat(localStorage.getItem('mysaku_balance') || 0);
    }
    const key = 'mysaku_wallet_' + walletName;
    const val = localStorage.getItem(key);
    return val ? parseFloat(val) : 0;
}

function getTotalAllWallets() {
    let total = 0;
    WALLETS.forEach(w => {
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

// ==========================================
// --- LOGIKA HALAMAN LAPORAN (`laporan.html`) ---
// ==========================================

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

 // 3. Render Bottom Sheet Daftar Dompet
const walletList = document.getElementById('walletListContainer');
const modalBtn = document.getElementById('walletSelectorBtn');
const modal = document.getElementById('walletModal');
const modalContent = document.getElementById('walletModalContent');
const closeBtn = document.getElementById('closeWalletModal');

if (modalBtn && modal) {
    // Buka modal
    modalBtn.onclick = () => {
        // Render daftar dompet
        walletList.innerHTML = '';
        WALLETS.forEach(w => {
            const balance = getWalletBalance(w);
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
                modalContent.classList.remove('translate-y-0');
                modalContent.classList.add('translate-y-full');
                setTimeout(() => {
                    modal.classList.add('hidden');
                }, 300);
                renderLaporan();
            };
            walletList.appendChild(item);
        });

        // Tampilkan modal dengan animasi
        modal.classList.remove('hidden');
        setTimeout(() => {
            modalContent.classList.remove('translate-y-full');
            modalContent.classList.add('translate-y-0');
        }, 10);
    };

    // Tutup modal
    closeBtn.onclick = () => {
        modalContent.classList.remove('translate-y-0');
        modalContent.classList.add('translate-y-full');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    };

    // Klik di luar area modal
    modal.onclick = (e) => {
        if (e.target === modal) {
            modalContent.classList.remove('translate-y-0');
            modalContent.classList.add('translate-y-full');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        }
    };
}

    // 4. Preview 3 Transaksi Terbaru
    const previewContainer = document.getElementById('previewRiwayatLaporan');
    if (previewContainer) {
        const latest3 = history.slice(0, 3);
        if (latest3.length === 0) {
            previewContainer.innerHTML = `<p class="text-center text-chat-secondary text-sm py-2">Belum ada transaksi.</p>`;
        } else {
            let html = '';
            latest3.forEach(item => {
                const isIncome = item.type === 'pemasukan';
                const bgClass = isIncome ? 'bg-[#f0f5fe] border-[#b3c8f0]' : 'bg-[#fff5f5] border-[#ffcdcd]';
                const iconBg = isIncome ? 'bg-[#e6edfb]' : 'bg-[#ffe0e0]';
                const textColor = isIncome ? 'text-[#0028B3]' : 'text-[#FF4444]';
                const icon = isIncome ? 'payments' : 'restaurant';
                const nominalStr = isIncome ? `+${formatRupiah(item.amount)}` : `-${formatRupiah(item.amount)}`;
                const nominalColor = isIncome ? 'text-[#0028B3]' : 'text-[#FF4444]';
                const category = item.category || 'Lainnya';

                html += `
                    <div class="flex items-center gap-3 p-3 rounded-2xl ${bgClass} border transaction-enter">
                        <div class="w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center ${textColor} flex-shrink-0">
                            <span class="material-symbols-outlined text-xl">${icon}</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-[#1a2236]">${item.rawText || item.category}</p>
                            <p class="text-xs text-chat-secondary">${formatDateDisplay(item.date)} • ${category}</p>
                        </div>
                        <div class="text-right flex-shrink-0">
                            <p class="text-sm font-semibold ${nominalColor}">${nominalStr}</p>
                            <p class="text-xs text-chat-secondary">${item.wallet || 'Cash'}</p>
                        </div>
                    </div>
                `;
            });
            previewContainer.innerHTML = html;
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

function renderRiwayat() {
    const history = getHistory();
    const container = document.getElementById('transaksiList');
    const emptyState = document.getElementById('emptyState');
    
    if (!container) return;

    if (history.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        document.getElementById('totalTransaksi').textContent = '0';
        document.getElementById('totalNominal').textContent = 'Rp0';
        document.getElementById('totalPemasukan').textContent = 'Rp0';
        document.getElementById('totalPengeluaran').textContent = 'Rp0';
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    document.getElementById('totalTransaksi').textContent = history.length;

    let total = 0, pemasukan = 0, pengeluaran = 0;
    history.forEach(item => {
        total += item.amount;
        if (item.type === 'pemasukan') pemasukan += item.amount;
        else pengeluaran += item.amount;
    });
    document.getElementById('totalNominal').textContent = 'Rp' + total.toLocaleString('id-ID');
    document.getElementById('totalPemasukan').textContent = 'Rp' + pemasukan.toLocaleString('id-ID');
    document.getElementById('totalPengeluaran').textContent = 'Rp' + pengeluaran.toLocaleString('id-ID');

    let html = '';
    history.forEach(item => {
        const isIncome = item.type === 'pemasukan';
        const bgClass = isIncome ? 'bg-[#f0f5fe] border-[#b3c8f0]' : 'bg-[#fff5f5] border-[#ffcdcd]';
        const iconBg = isIncome ? 'bg-[#e6edfb]' : 'bg-[#ffe0e0]';
        const textColor = isIncome ? 'text-[#0028B3]' : 'text-[#FF4444]';
        const icon = isIncome ? 'payments' : 'restaurant';
        const nominalStr = isIncome ? `+${formatRupiah(item.amount)}` : `-${formatRupiah(item.amount)}`;
        const nominalColor = isIncome ? 'text-[#0028B3]' : 'text-[#FF4444]';

        html += `
            <div class="flex items-center gap-3 p-3 rounded-2xl ${bgClass} border transaction-enter">
                <div class="w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center ${textColor} flex-shrink-0">
                    <span class="material-symbols-outlined text-xl">${icon}</span>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-[#1a2236]">${item.rawText || item.category}</p>
                    <p class="text-xs text-chat-secondary">${formatDateDisplay(item.date)} • ${item.category || 'Lainnya'}</p>
                </div>
                <div class="text-right flex-shrink-0">
                    <p class="text-sm font-semibold ${nominalColor}">${nominalStr}</p>
                    <p class="text-xs text-chat-secondary">${item.wallet || 'Cash'}</p>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// ==========================================
// --- EKSEKUSI SAAT HALAMAN DIMUAT ---
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('laporan.html')) {
        renderLaporan();
    }
    
    if (window.location.pathname.includes('riwayat.html')) {
        renderRiwayat();
    }
});