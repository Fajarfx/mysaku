// ==========================================
// --- GUARD HALAMAN SELAMA MODE TUTORIAL ----
// ==========================================
// Dipasang di <head> semua halaman SELAIN index.html (chat), SEBELUM konten lain dimuat,
// supaya kalau user masih di tengah tutorial dan mencoba buka Laporan/Riwayat/Utang/Pengaturan
// lewat URL langsung, bookmark, atau tombol back, mereka langsung dilempar balik ke chat --
// bukan malah bisa mengintip/mengutak-atik halaman itu di tengah alur panduan.
//
// Dibaca langsung dari localStorage (bukan variabel onboardingStep dari script.js) karena
// file ini harus jalan PALING AWAL, sebelum script.js sempat dimuat di halaman non-chat.
//
// Definisi "sedang tutorial": belum pernah menyelesaikan tutorial (mysaku_onboarding_completed
// bukan 'true'), DAN belum ditandai skip/selesai untuk sesi berjalan ini.
(function () {
    var completed = localStorage.getItem('mysaku_onboarding_completed') === 'true';
    var skipped = localStorage.getItem('mysaku_onboarding_skipped') === 'true';
    var finished = localStorage.getItem('mysaku_onboarding_finished') === 'true';

    var stillOnboarding = !completed && !skipped && !finished;

    if (stillOnboarding) {
        // Simpan pesan singkat supaya begitu balik ke chat, user tahu kenapa dialihkan.
        try {
            sessionStorage.setItem('mysaku_blocked_redirect', '1');
        } catch (e) { /* abaikan kalau sessionStorage tidak tersedia */ }
        window.location.replace('/index.html');
    }
})();
