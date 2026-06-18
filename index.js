require('dotenv').config(); // <-- BARIS BARU: Wajib ada untuk membaca file .env

const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const cors = require('cors');

const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000; // Mengambil port dari .env

// Middleware
app.use(cors());
app.use(express.json()); // Supaya API bisa membaca input data berbentuk JSON

// ==========================================
// KONFIGURASI KONEKSI DATABASE CLOUD AIVEN (VERSI AMAN)
// ==========================================
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        ca: fs.readFileSync(path.join(__dirname, 'ca.pem')),
        rejectUnauthorized: false
    }
});

// Melakukan Tes Koneksi ke Database
db.connect((err) => {
    if (err) {
        console.error('Gagal terhubung ke database:', err.message);
        return;
    }
    console.log('✅ Berhasil terhubung ke database MySQL toko_komputer (Aiven Cloud)!');
});

// Endpoint Halaman Depan (Tes API)
app.get('/', (req, res) => {
    res.send('Selamat datang di API Toko Komputer 🚀');
});

// ==========================================
// API ENDPOINT UNTUK LOGIN
// ==========================================
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // Cek ke database apakah username dan password cocok
    const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
    db.query(query, [username, password], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        // Jika data ditemukan (username & password benar)
        if (results.length > 0) {
            // Buatkan "Karcis Token" menggunakan secret dari .env
            const token = jwt.sign(
                { id: results[0].id, username: username }, 
                process.env.JWT_SECRET, 
                { expiresIn: '1h' }     // Token hangus dalam 1 jam
            );

            res.json({
                pesan: "Login Berhasil!",
                token: token
            });
        } else {
            // Jika salah
            res.status(401).json({ pesan: "Gagal: Username atau Password salah!" });
        }
    });
});
// ==========================================

// ==========================================
// MIDDLEWARE "SATPAM" JWT
// ==========================================
const satpamToken = (req, res, next) => {
    // Ambil token dari header Postman/Browser yang dikirim user
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formatnya harus: "Bearer <token>"

    // Jika user tidak bawa token sama sekali
    if (!token) {
        return res.status(401).json({ pesan: "Akses Ditolak: Anda belum login (Token tidak ada)!" });
    }

    // Jika bawa token, cek apakah tokennya asli buatan sistem kita menggunakan secret dari .env
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ pesan: "Akses Ditolak: Token palsu atau sudah kadaluarsa!" });
        
        req.user = user;
        next(); // Karcis valid, silakan lewat!
    });
};

// Pasang Satpam untuk SEMUA endpoint di bawah ini
app.use(satpamToken);
// ==========================================

// ==========================================
// CRUD DATA MASTER 1: TABEL KATEGORI
// ==========================================
app.get('/api/kategori', (req, res) => {
    const query = 'SELECT * FROM kategori';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Berhasil mengambil data kategori", data: results });
    });
});

app.post('/api/kategori', (req, res) => {
    const { nama_kategori } = req.body || {}; 
    const query = 'INSERT INTO kategori (nama_kategori) VALUES (?)';
    db.query(query, [nama_kategori], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Kategori berhasil ditambahkan!", id_baru: results.insertId });
    });
});

app.put('/api/kategori/:id', (req, res) => {
    const { id } = req.params;
    const { nama_kategori } = req.body || {};
    const query = 'UPDATE kategori SET nama_kategori = ? WHERE id_kategori = ?';
    db.query(query, [nama_kategori, id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Kategori berhasil diupdate!" });
    });
});

app.delete('/api/kategori/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM kategori WHERE id_kategori = ?';
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Kategori berhasil dihapus!" });
    });
});


// ==========================================
// CRUD DATA MASTER 2: TABEL PRODUK
// ==========================================
app.get('/api/produk', (req, res) => {
    db.query('SELECT * FROM produk', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Berhasil mengambil data produk", data: results });
    });
});

app.post('/api/produk', (req, res) => {
    const { nama_produk, harga, stok, id_kategori } = req.body || {};
    const query = 'INSERT INTO produk (nama_produk, harga, stok, id_kategori) VALUES (?, ?, ?, ?)';
    db.query(query, [nama_produk, harga, stok, id_kategori], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Produk berhasil ditambahkan!" });
    });
});

app.put('/api/produk/:id', (req, res) => {
    const { id } = req.params;
    const { nama_produk, harga, stok, id_kategori } = req.body || {};
    const query = 'UPDATE produk SET nama_produk = ?, harga = ?, stok = ?, id_kategori = ? WHERE id_produk = ?';
    db.query(query, [nama_produk, harga, stok, id_kategori, id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Produk berhasil diperbarui!" });
    });
});

app.delete('/api/produk/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM produk WHERE id_produk = ?';
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Produk berhasil dihapus!" });
    });
});


// ==========================================
// CRUD DATA MASTER 3: TABEL PELANGGAN
// ==========================================
app.get('/api/pelanggan', (req, res) => {
    db.query('SELECT * FROM pelanggan', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Berhasil mengambil data pelanggan", data: results });
    });
});

app.post('/api/pelanggan', (req, res) => {
    const { nama, email, telepon, alamat } = req.body || {};
    const query = 'INSERT INTO pelanggan (nama, email, telepon, alamat) VALUES (?, ?, ?, ?)';
    db.query(query, [nama, email, telepon, alamat], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Pelanggan berhasil ditambahkan!" });
    });
});

app.put('/api/pelanggan/:id', (req, res) => {
    const { id } = req.params;
    const { nama, email, telepon, alamat } = req.body || {};
    const query = 'UPDATE pelanggan SET nama = ?, email = ?, telepon = ?, alamat = ? WHERE id_pelanggan = ?';
    db.query(query, [nama, email, telepon, alamat, id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Pelanggan berhasil diperbarui!" });
    });
});

app.delete('/api/pelanggan/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM pelanggan WHERE id_pelanggan = ?';
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Pelanggan berhasil dihapus!" });
    });
});


// ==========================================
// CRUD DATA TRANSAKSIONAL 1: TABEL PESANAN
// ==========================================
app.get('/api/pesanan', (req, res) => {
    db.query('SELECT * FROM pesanan', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Berhasil mengambil data pesanan", data: results });
    });
});

// CREATE: Menambah pesanan baru (DENGAN FIX SATPAM PENGAMAN STOK KERANJANG & POTONG OTOMATIS)
app.post('/api/pesanan', async (req, res) => {
    const { id_pelanggan, tanggal_pesanan, total_bayar, keranjang } = req.body || {};

    // Jika tidak ada isi keranjang belanja, simpan nota transaksi kosong
    if (!keranjang || keranjang.length === 0) {
        const queryPesanan = 'INSERT INTO pesanan (id_pelanggan, tanggal_pesanan, total_bayar) VALUES (?, ?, ?)';
        db.query(queryPesanan, [id_pelanggan, tanggal_pesanan, total_bayar], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            return res.json({ 
                pesan: "Pesanan berhasil ditambahkan (tanpa rincian barang)!", 
                id_pesanan_baru: results.insertId 
            });
        });
        return;
    }

    // Mengonversi koneksi biasa menjadi versi Promise agar mendukung operasi async awat di dalam looping
    const dbPromise = db.promise();

    try {
        // LANGKAH 1: Lakukan validasi stok untuk setiap produk di dalam keranjang
        for (const item of keranjang) {
            const [rows] = await dbPromise.query('SELECT stok, nama_produk FROM produk WHERE id_produk = ?', [item.id_produk]);
            
            if (rows.length === 0) {
                return res.status(404).json({ error: `Produk dengan ID ${item.id_produk} tidak ditemukan!` });
            }

            const produk = rows[0];
            
            // JIKA ADA SATU SAJA BARANG YANG MELEBIHI STOK, BLOKIR SELURUH TRANSAKSI
            if (item.jumlah > produk.stok) {
                return res.status(400).json({ 
                    error: `Stok tidak cukup! [${produk.nama_produk}] hanya sisa ${produk.stok}, tetapi kamu memesan ${item.jumlah}. Transaksi otomatis dibatalkan!` 
                });
            }
        }

        // LANGKAH 2: Jika seluruh item lolos verifikasi stok, buat nota induk di tabel pesanan
        const queryPesanan = 'INSERT INTO pesanan (id_pelanggan, tanggal_pesanan, total_bayar) VALUES (?, ?, ?)';
        const [pesananResult] = await dbPromise.query(queryPesanan, [id_pelanggan, tanggal_pesanan, total_bayar]);
        const id_pesanan_baru = pesananResult.insertId;

        // LANGKAH 3: Masukkan rincian barang ke tabel detail_pesanan sekalian kurangi stok produk terkait
        for (const item of keranjang) {
            const queryDetail = 'INSERT INTO detail_pesanan (id_pesanan, id_produk, jumlah, subtotal) VALUES (?, ?, ?, ?)';
            await dbPromise.query(queryDetail, [id_pesanan_baru, item.id_produk, item.jumlah, item.subtotal]);

            const queryUpdateStok = 'UPDATE produk SET stok = stok - ? WHERE id_produk = ?';
            await dbPromise.query(queryUpdateStok, [item.jumlah, item.id_produk]);
        }

        res.json({ 
            pesan: "Pesanan dan rincian belanja berhasil ditambahkan otomatis, serta stok berhasil dipotong!", 
            id_pesanan_baru: id_pesanan_baru 
        });

    } catch (error) {
        console.error("Terjadi masalah pada sistem transaksi pesanan:", error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/pesanan/:id', (req, res) => {
    const { id } = req.params;
    const { id_pelanggan, tanggal_pesanan, total_bayar } = req.body || {};
    const query = 'UPDATE pesanan SET id_pelanggan = ?, tanggal_pesanan = ?, total_bayar = ? WHERE id_pesanan = ?';
    db.query(query, [id_pelanggan, tanggal_pesanan, total_bayar, id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Data pesanan berhasil diperbarui!" });
    });
});

app.delete('/api/pesanan/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM pesanan WHERE id_pesanan = ?';
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Data pesanan berhasil dihapus!" });
    });
});


// ==========================================
// CRUD DATA TRANSAKSIONAL 2: DETAIL PESANAN
// ==========================================

// READ DETAIL BERDASARKAN ID PESANAN (DENGAN SQL JOIN UNTUK NAMA PRODUK)
app.get('/api/detail_pesanan/by_pesanan/:id_pesanan', (req, res) => {
    const { id_pesanan } = req.params;
    const query = `
        SELECT detail_pesanan.*, produk.nama_produk 
        FROM detail_pesanan 
        JOIN produk ON detail_pesanan.id_produk = produk.id_produk 
        WHERE detail_pesanan.id_pesanan = ?
    `;
    
    db.query(query, [id_pesanan], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Berhasil mengambil detail", data: results });
    });
});

// 1. READ: Menampilkan semua detail pesanan (DENGAN SQL JOIN UNTUK NAMA PRODUK)
app.get('/api/detail_pesanan', (req, res) => {
    const query = `
        SELECT detail_pesanan.*, produk.nama_produk 
        FROM detail_pesanan 
        JOIN produk ON detail_pesanan.id_produk = produk.id_produk
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Berhasil mengambil data detail pesanan", data: results });
    });
});

// 2. CREATE: Menambah detail pesanan baru (DENGAN PENGAMAN STOK & POTONG OTOMATIS)
app.post('/api/detail_pesanan', (req, res) => {
    const { id_pesanan, id_produk, jumlah, subtotal } = req.body || {};

    const queryCekStok = 'SELECT stok, nama_produk FROM produk WHERE id_produk = ?';
    db.query(queryCekStok, [id_produk], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Produk tidak ditemukan!' });

        const produk = results[0];
        const stokTersedia = produk.stok;

        if (jumlah > stokTersedia) {
            return res.status(400).json({ 
                error: `Stok tidak cukup! [${produk.nama_produk}] hanya sisa ${stokTersedia}, tetapi kamu memesan ${jumlah}.` 
            });
        }

        const queryInsert = 'INSERT INTO detail_pesanan (id_pesanan, id_produk, jumlah, subtotal) VALUES (?, ?, ?, ?)';
        db.query(queryInsert, [id_pesanan, id_produk, jumlah, subtotal], (err, insertResults) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: err.message });
            }

            const queryUpdateStok = 'UPDATE produk SET stok = stok - ? WHERE id_produk = ?';
            db.query(queryUpdateStok, [jumlah, id_produk], (updateErr) => {
                if (updateErr) console.error('Gagal mengurangi stok:', updateErr.message);
                
                res.json({ pesan: "Detail pesanan berhasil ditambahkan dan stok dipotong!" });
            });
        });
    });
});

// 3. UPDATE: Mengubah detail pesanan
app.put('/api/detail_pesanan/:id', (req, res) => {
    const { id } = req.params;
    const { id_pesanan, id_produk, jumlah, subtotal } = req.body || {};
    const query = 'UPDATE detail_pesanan SET id_pesanan = ?, id_produk = ?, jumlah = ?, subtotal = ? WHERE id_detail = ?';
    
    db.query(query, [id_pesanan, id_produk, jumlah, subtotal, id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Detail pesanan berhasil diperbarui!" });
    });
});

// 4. DELETE: Menghapus detail pesanan
app.delete('/api/detail_pesanan/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM detail_pesanan WHERE id_detail = ?';
    
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Detail pesanan berhasil dihapus!" });
    });
});


// ==========================================
// STATISTIC DATA TRANSAKSIONAL
// ==========================================
app.get('/api/statistik', (req, res) => {
    const query = `
        SELECT 
            COUNT(id_pesanan) AS total_transaksi,
            SUM(total_bayar) AS total_pendapatan
        FROM pesanan
    `;
    
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ 
            pesan: "Berhasil mengambil statistik toko", 
            statistik: results[0] 
        });
    });
});


// ==========================================
// MENJALANKAN SERVER API
// ==========================================
app.listen(port, () => {
    console.log(`✅ Server API berjalan di http://localhost:${port}`);
});