// ==========================================
// --- HALAMAN PENGATURAN (pengaturan.js) ---
// ==========================================

// ==========================================
// --- 1. KATEGORI & ITEM ---
// ==========================================

// Data default
const DEFAULT_CATEGORIES = ['Makanan', 'Transportasi', 'Tagihan', 'Belanja', 'Hiburan', 'Kesehatan', 'Lainnya'];

// Data item default (dari script.js)
const DEFAULT_ITEMS = {
    'Makanan': ['makan', 'nasi', 'bakso', 'mie', 'ayam', 'kopi', 'minum', 'snack'],
    'Transportasi': ['bensin', 'gojek', 'grab', 'ojek', 'parkir', 'tol', 'bbm'],
    'Tagihan': ['tagihan', 'listrik', 'air', 'internet', 'wifi', 'telepon'],
    'Belanja': ['belanja', 'baju', 'sepatu', 'tas', 'elektronik'],
    'Hiburan': ['nonton', 'film', 'bioskop', 'game', 'netflix'],
    'Kesehatan': ['obat', 'dokter', 'rumah sakit', 'vitamin'],
    'Lainnya': []
};

// Fungsi untuk mengambil data dari localStorage
function getCategories() {
    const data = localStorage.getItem('mysaku_categories');
    return data ? JSON.parse(data) : [...DEFAULT_CATEGORIES];
}

function getItems() {
    const data = localStorage.getItem('mysaku_items');
    return data ? JSON.parse(data) : JSON.parse(JSON.stringify(DEFAULT_ITEMS));
}

function saveCategories(categories) {
    localStorage.setItem('mysaku_categories', JSON.stringify(categories));
}

function saveItems(items) {
    localStorage.setItem('mysaku_items', JSON.stringify(items));
}

// ==========================================
// --- 2. RENDER KATEGORI & ITEM ---
// ==========================================

function renderCategories() {
    const container = document.getElementById('categoryList');
    if (!container) return;

    const categories = getCategories();
    const items = getItems();

    if (categories.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-sm text-chat-secondary">
                Belum ada kategori. Tambahkan sekarang!
            </div>
        `;
        return;
    }

    let html = '';
    categories.forEach(category => {
        const categoryItems = items[category] || [];
        html += `
            <div class="p-3 rounded-xl border border-[#d6e0f5] bg-[#f8fafd]">
                <div class="flex items-center justify-between mb-2">
                    <span class="category-tag">${category}</span>
                    <div class="flex gap-2">
                        <button class="text-xs text-[#0028B3] font-medium hover:underline add-item-btn" data-category="${category}">
                            + Item
                        </button>
                        <button class="text-xs text-[#dc2626] font-medium hover:underline delete-category-btn" data-category="${category}">
                            Hapus
                        </button>
                    </div>
                </div>
                <div class="flex flex-wrap gap-1.5">
                    ${categoryItems.length > 0 
                        ? categoryItems.map(item => `
                            <span class="item-tag flex items-center gap-1">
                                ${item}
                                <span class="text-[10px] text-chat-secondary cursor-pointer hover:text-[#dc2626] delete-item-btn" data-category="${category}" data-item="${item}">×</span>
                            </span>
                        `).join('')
                        : '<span class="text-xs text-chat-secondary">Belum ada item</span>'
                    }
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // Event listener untuk tombol tambah item
    document.querySelectorAll('.add-item-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const category = this.dataset.category;
            openItemModal(category);
        });
    });

    // Event listener untuk hapus kategori
    document.querySelectorAll('.delete-category-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const category = this.dataset.category;
            if (confirm(`Hapus kategori "${category}" dan semua item di dalamnya?`)) {
                deleteCategory(category);
            }
        });
    });

    // Event listener untuk hapus item
    document.querySelectorAll('.delete-item-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const category = this.dataset.category;
            const item = this.dataset.item;
            if (confirm(`Hapus item "${item}" dari kategori "${category}"?`)) {
                deleteItem(category, item);
            }
        });
    });
}

// ==========================================
// --- 3. CRUD KATEGORI ---
// ==========================================

function addCategory(name) {
    const categories = getCategories();
    if (categories.includes(name)) {
        alert('Kategori sudah ada!');
        return false;
    }
    categories.push(name);
    saveCategories(categories);
    
    // Tambahkan ke items
    const items = getItems();
    items[name] = [];
    saveItems(items);
    
    renderCategories();
    return true;
}

function deleteCategory(name) {
    let categories = getCategories();
    categories = categories.filter(c => c !== name);
    saveCategories(categories);
    
    const items = getItems();
    delete items[name];
    saveItems(items);
    
    renderCategories();
}

// ==========================================
// --- 4. CRUD ITEM ---
// ==========================================

function addItem(category, itemName) {
    const items = getItems();
    if (!items[category]) {
        alert('Kategori tidak ditemukan!');
        return false;
    }
    if (items[category].includes(itemName)) {
        alert('Item sudah ada di kategori ini!');
        return false;
    }
    items[category].push(itemName);
    saveItems(items);
    renderCategories();
    return true;
}

function deleteItem(category, itemName) {
    const items = getItems();
    if (!items[category]) return;
    items[category] = items[category].filter(i => i !== itemName);
    saveItems(items);
    renderCategories();
}

// ==========================================
// --- 5. MODAL KATEGORI ---
// ==========================================

function openCategoryModal() {
    const modal = document.getElementById('categoryModal');
    const input = document.getElementById('categoryNameInput');
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
    input.value = '';
    input.focus();
}

function closeCategoryModal() {
    const modal = document.getElementById('categoryModal');
    modal.style.display = 'none';
    modal.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', function() {
    const addBtn = document.getElementById('addCategoryBtn');
    const modal = document.getElementById('categoryModal');
    const cancelBtn = document.getElementById('cancelCategoryBtn');
    const saveBtn = document.getElementById('saveCategoryBtn');
    const input = document.getElementById('categoryNameInput');

    if (addBtn) {
        addBtn.addEventListener('click', openCategoryModal);
    }

    cancelBtn.addEventListener('click', closeCategoryModal);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeCategoryModal();
    });

    saveBtn.addEventListener('click', function() {
        const name = input.value.trim();
        if (!name) {
            alert('Masukkan nama kategori!');
            return;
        }
        if (addCategory(name)) {
            closeCategoryModal();
        }
    });

    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') saveBtn.click();
    });
});

// ==========================================
// --- 6. MODAL ITEM ---
// ==========================================

function openItemModal(category) {
    const modal = document.getElementById('itemModal');
    const select = document.getElementById('itemCategorySelect');
    const input = document.getElementById('itemNameInput');
    
    // Isi dropdown kategori
    const categories = getCategories();
    select.innerHTML = '<option value="">Pilih kategori...</option>';
    categories.forEach(c => {
        const option = document.createElement('option');
        option.value = c;
        option.textContent = c;
        if (c === category) option.selected = true;
        select.appendChild(option);
    });
    
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
    input.value = '';
    input.focus();
}

function closeItemModal() {
    const modal = document.getElementById('itemModal');
    modal.style.display = 'none';
    modal.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('itemModal');
    const cancelBtn = document.getElementById('cancelItemBtn');
    const saveBtn = document.getElementById('saveItemBtn');
    const input = document.getElementById('itemNameInput');
    const select = document.getElementById('itemCategorySelect');

    cancelBtn.addEventListener('click', closeItemModal);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeItemModal();
    });

    saveBtn.addEventListener('click', function() {
        const name = input.value.trim().toLowerCase();
        const category = select.value;
        
        if (!name) {
            alert('Masukkan nama item!');
            return;
        }
        if (!category) {
            alert('Pilih kategori!');
            return;
        }
        if (addItem(category, name)) {
            closeItemModal();
        }
    });

    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') saveBtn.click();
    });
});

// ==========================================
// --- 7. TOGGLE SWITCHES ---
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    // Dark Mode
    const darkToggle = document.getElementById('darkModeToggle');
    if (darkToggle) {
        const isDark = localStorage.getItem('mysaku_dark_mode') === 'true';
        if (isDark) darkToggle.classList.add('active');
        
        darkToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            const isActive = this.classList.contains('active');
            localStorage.setItem('mysaku_dark_mode', isActive);
            document.documentElement.classList.toggle('dark', isActive);
        });
    }

    // Notifikasi
    const notifToggle = document.getElementById('notifToggle');
    if (notifToggle) {
        const notifEnabled = localStorage.getItem('mysaku_notifications') !== 'false';
        if (notifEnabled) notifToggle.classList.add('active');
        
        notifToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            localStorage.setItem('mysaku_notifications', this.classList.contains('active'));
        });
    }
});

// ==========================================
// --- 8. RESET ---
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    // Reset Tutorial
    const resetBtn = document.getElementById('resetTutorialBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            if (confirm('Reset panduan onboarding?')) {
                localStorage.removeItem('mysaku_onboarding_completed');
                alert('✅ Panduan telah direset.');
            }
        });
    }

    // Hapus Semua Data
    const deleteBtn = document.getElementById('deleteAllDataBtn');
    const modal = document.getElementById('deleteModal');
    const cancelBtn = document.getElementById('cancelDeleteBtn');
    const confirmBtn = document.getElementById('confirmDeleteBtn');

    if (deleteBtn && modal) {
        deleteBtn.addEventListener('click', function() {
            modal.style.display = 'flex';
            modal.classList.remove('hidden');
        });

        cancelBtn.addEventListener('click', function() {
            modal.style.display = 'none';
            modal.classList.add('hidden');
        });

        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
                modal.classList.add('hidden');
            }
        });

        confirmBtn.addEventListener('click', function() {
            const keys = Object.keys(localStorage).filter(k => k.startsWith('mysaku_'));
            keys.forEach(k => localStorage.removeItem(k));
            localStorage.setItem('mysaku_active_wallet', 'Cash');
            modal.style.display = 'none';
            modal.classList.add('hidden');
            alert('✅ Semua data telah dihapus.');
            location.reload();
        });
    }
});

// ==========================================
// --- 9. INISIALISASI ---
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    renderCategories();
    console.log('⚙️ Halaman Pengaturan siap!');
});

// ==========================================
// --- 10. SYNC DENGAN PARSER (script.js) ---
// ==========================================

// Fungsi untuk update itemDictionary di script.js
function syncItemDictionary() {
    const items = getItems();
    const dictionary = {};
    for (const [category, itemList] of Object.entries(items)) {
        itemList.forEach(item => {
            dictionary[item] = category;
        });
    }
    // Simpan ke localStorage untuk digunakan di script.js
    localStorage.setItem('mysaku_item_dictionary', JSON.stringify(dictionary));
}

// Panggil setiap kali ada perubahan
const originalAddItem = addItem;
addItem = function(category, itemName) {
    const result = originalAddItem(category, itemName);
    if (result) syncItemDictionary();
    return result;
};

const originalDeleteItem = deleteItem;
deleteItem = function(category, itemName) {
    originalDeleteItem(category, itemName);
    syncItemDictionary();
};

// Inisialisasi sync
syncItemDictionary();