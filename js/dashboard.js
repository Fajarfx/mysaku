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
                <p class="text-xs text-chat-secondary">${item.wallet || 'Cash'}</p>
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
                <span class="font-medium text-[#1a2236]">${item.wallet || 'Cash'}</span>
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

    // --- Ekspor ke Excel (CSV) sesuai filter yang sedang aktif ---
    const exportBtn = document.getElementById('exportExcelBtn');
    if (exportBtn) {
        exportBtn.onclick = exportRiwayatToExcel;
    }
}

function exportRiwayatToExcel() {
    const history = getHistory();
    const filtered = applyRiwayatFilters(history);

    if (filtered.length === 0) {
        alert('Tidak ada transaksi untuk diekspor (sesuai filter yang sedang aktif).');
        return;
    }

    const headers = ['Tanggal', 'Waktu', 'Tipe', 'Kategori', 'Dompet', 'Catatan', 'Nominal'];
    const rows = filtered.map(item => {
        const d = new Date(item.date);
        return [
            d.toLocaleDateString('id-ID'),
            d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            item.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
            item.category || 'Lainnya',
            item.wallet || 'Cash',
            (item.rawText || '').replace(/"/g, '""'),
            item.amount
        ];
    });

    let csv = headers.join(';') + '\n';
    rows.forEach(row => {
        csv += row.map(val => `"${val}"`).join(';') + '\n';
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const todayStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `mysaku-riwayat-${todayStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
                <span class="font-medium text-[#1a2236]">${item.wallet || 'Cash'}</span>
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


